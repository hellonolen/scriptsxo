import type { Context } from 'hono';
import { getCapsForRole, applyOverrides, type Capability } from './caps';

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  SITE_URL: string;
  ADMIN_EMAILS?: string;
  VPS_FAX_URL?: string;
  VPS_FAX_SECRET?: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  SNS_PHARMACY_TOPIC_PREFIX: string;
  ANTHROPIC_API_KEY: string;
}

export interface CallerContext {
  memberId: string;
  email: string;
  orgId: string | undefined;
  role: string;
  isPlatformOwner: boolean;
  caps: Set<Capability>;
}

export function getSessionToken(c: Context): string | null {
  // Check Authorization header first
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  // Fall back to cookie
  const cookie = c.req.header('Cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)scriptsxo_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function resolveSession(db: D1Database, token: string): Promise<CallerContext | null> {
  const session = await db
    .prepare('SELECT * FROM sessions WHERE session_token = ? AND expires_at > ?')
    .bind(token, Date.now())
    .first<Record<string, unknown>>();

  if (!session) return null;

  const member = await db
    .prepare('SELECT * FROM members WHERE id = ?')
    .bind(session.member_id)
    .first<Record<string, unknown>>();

  if (!member) return null;

  // Update last_used_at (fire and forget)
  db.prepare('UPDATE sessions SET last_used_at = ? WHERE session_token = ?')
    .bind(Date.now(), token)
    .run()
    .catch(() => {});

  let caps = getCapsForRole(member.role as string);

  // Apply org overrides if member belongs to an org
  if (member.org_id) {
    const org = await db
      .prepare('SELECT cap_allow, cap_deny FROM organizations WHERE id = ?')
      .bind(member.org_id)
      .first<{ cap_allow: string | null; cap_deny: string | null }>();
    if (org) {
      caps = applyOverrides(
        caps,
        org.cap_allow ? JSON.parse(org.cap_allow) : null,
        org.cap_deny ? JSON.parse(org.cap_deny) : null
      );
    }
  }

  // Apply per-member overrides
  caps = applyOverrides(
    caps,
    member.cap_allow ? JSON.parse(member.cap_allow as string) : null,
    member.cap_deny ? JSON.parse(member.cap_deny as string) : null
  );

  if (member.is_platform_owner) {
    // Platform owner gets everything
    const { CAP } = await import('./caps');
    for (const cap of Object.values(CAP)) caps.add(cap);
  }

  return {
    memberId: member.id as string,
    email: member.email as string,
    orgId: member.org_id as string | undefined,
    role: member.role as string,
    isPlatformOwner: member.is_platform_owner === 1,
    caps,
  };
}

export async function requireAuth(c: Context<{ Bindings: Env }>): Promise<CallerContext> {
  const token = getSessionToken(c);
  if (!token) throw new ApiError(401, 'Authentication required');
  const caller = await resolveSession(c.env.DB, token);
  if (!caller) throw new ApiError(401, 'Session not found or expired');
  return caller;
}

export async function requireCap(c: Context<{ Bindings: Env }>, cap: Capability): Promise<CallerContext> {
  const caller = await requireAuth(c);
  if (!caller.caps.has(cap)) throw new ApiError(403, `Missing capability: ${cap}`);
  return caller;
}

export async function requireAnyCap(c: Context<{ Bindings: Env }>, caps: Capability[]): Promise<CallerContext> {
  const caller = await requireAuth(c);
  if (!caps.some(cap => caller.caps.has(cap))) throw new ApiError(403, `Missing one of: ${caps.join(', ')}`);
  return caller;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function ok(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function err(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}
