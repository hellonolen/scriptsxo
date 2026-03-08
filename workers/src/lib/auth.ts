import { Env, Session, Member } from '../types';

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function getSessionToken(request: Request): string | null {
  const cookie = getCookie(request, 'scriptsxo_session');
  if (cookie) return cookie;

  const auth = request.headers.get('Authorization') ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();

  return null;
}

export async function resolveSession(request: Request, env: Env): Promise<Session | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT id, session_token, member_id, email, created_at, expires_at, last_used_at, user_agent, ip_address
     FROM sessions WHERE session_token = ? AND expires_at > ?`
  )
    .bind(token, Date.now())
    .first<{
      id: string;
      session_token: string;
      member_id: string;
      email: string;
      created_at: number;
      expires_at: number;
      last_used_at: number | null;
      user_agent: string | null;
      ip_address: string | null;
    }>();

  if (!row) return null;

  await env.DB.prepare(
    `UPDATE sessions SET last_used_at = ? WHERE id = ?`
  )
    .bind(Date.now(), row.id)
    .run();

  return {
    id: row.id,
    sessionToken: row.session_token,
    memberId: row.member_id,
    email: row.email,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at ?? undefined,
    userAgent: row.user_agent ?? undefined,
    ipAddress: row.ip_address ?? undefined,
  };
}

export async function requireSession(request: Request, env: Env): Promise<Session> {
  const session = await resolveSession(request, env);
  if (!session) {
    throw new AuthError(401, 'Authentication required');
  }
  return session;
}

export async function resolveMember(session: Session, env: Env): Promise<Member | null> {
  const row = await env.DB.prepare(
    `SELECT id, email, role, org_role, name, first_name, last_name, org_id,
            is_platform_owner, cap_allow, cap_deny, status, permissions
     FROM members WHERE email = ?`
  )
    .bind(session.email.toLowerCase())
    .first<{
      id: string;
      email: string;
      role: string;
      org_role: string | null;
      name: string;
      first_name: string | null;
      last_name: string | null;
      org_id: string | null;
      is_platform_owner: number | null;
      cap_allow: string | null;
      cap_deny: string | null;
      status: string;
      permissions: string;
    }>();

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    orgRole: row.org_role ?? undefined,
    name: row.name,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    orgId: row.org_id ?? undefined,
    isPlatformOwner: row.is_platform_owner ?? undefined,
    capAllow: row.cap_allow ?? undefined,
    capDeny: row.cap_deny ?? undefined,
    status: row.status,
    permissions: row.permissions,
  };
}

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function forbidden(message = 'Forbidden'): Response {
  return Response.json({ success: false, error: message }, { status: 403 });
}

export function unauthorized(message = 'Authentication required'): Response {
  return Response.json({ success: false, error: message }, { status: 401 });
}
