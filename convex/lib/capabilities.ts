// @ts-nocheck
/**
 * CAPABILITY SYSTEM — CONVEX SERVER MODULE
 *
 * Mirror of src/lib/capabilities.ts for server-side enforcement.
 * Cannot be a shared module — Convex and Next.js run in separate runtimes.
 *
 * KEEP IN SYNC with src/lib/capabilities.ts.
 * If you change capabilities or ROLE_CAPS there, update this file too.
 *
 * Usage in a Convex handler:
 *
 *   import { requireCap, CAP } from "../lib/capabilities";
 *
 *   export const writePrescription = mutation({
 *     args: { callerId: v.string(), ... },
 *     handler: async (ctx, args) => {
 *       await requireCap(ctx, args.callerId, CAP.RX_WRITE);
 *       // ... handler body
 *     },
 *   });
 *
 * V1 Security Model:
 *   requireCap() accepts a callerId (memberId) passed by the client,
 *   looks up the member's role in the DB, and checks the capability.
 *   This is significantly better than nothing. V2 will use Convex Auth
 *   for cryptographic identity binding so the server knows the caller.
 *
 * The callerId pattern means a malicious client could pass any memberId.
 * Mitigations for now:
 *   - Member IDs are Convex-generated, non-guessable UUIDs
 *   - Session cookie carries the email; cross-check email == member.email
 *     for extra assurance where needed
 *   - Move to Convex Auth as soon as feasible (V2)
 */

import { ConvexError } from "convex/values";

// ---------------------------------------------------------------------------
// Capability identifiers (identical to src/lib/capabilities.ts)
// ---------------------------------------------------------------------------

export const CAP = {
  VIEW_DASHBOARD: "view:dashboard",
  INTAKE_SELF: "intake:self",
  INTAKE_REVIEW: "intake:review",
  RX_VIEW: "rx:view",
  RX_WRITE: "rx:write",
  RX_SIGN: "rx:sign",
  RX_REFILL: "rx:refill",
  CONSULT_START: "consult:start",
  CONSULT_JOIN: "consult:join",
  CONSULT_HISTORY: "consult:history",
  WORKFLOW_VIEW: "workflow:view",
  WORKFLOW_MANAGE: "workflow:manage",
  MSG_VIEW: "msg:view",
  MSG_SEND: "msg:send",
  PHARMACY_QUEUE: "pharmacy:queue",
  PHARMACY_FILL: "pharmacy:fill",
  PHARMACY_VERIFY: "pharmacy:verify",
  PATIENT_VIEW: "patient:view",
  PATIENT_MANAGE: "patient:manage",
  PROVIDER_MANAGE: "provider:manage",
  REPORT_VIEW: "report:view",
  REPORT_EXPORT: "report:export",
  AUDIT_VIEW: "audit:view",
  USER_VIEW: "user:view",
  USER_MANAGE: "user:manage",
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",
  AGENTS_VIEW: "agents:view",
  AGENTS_MANAGE: "agents:manage",
  INTEGRATIONS_VIEW: "integrations:view",
  INTEGRATIONS_MANAGE: "integrations:manage",
} as const;

export type Capability = (typeof CAP)[keyof typeof CAP];

// ---------------------------------------------------------------------------
// Role type and capability bundles (identical to src/lib/capabilities.ts)
// ---------------------------------------------------------------------------

export type Role =
  | "patient"
  | "provider"
  | "nurse"
  | "pharmacy"
  | "admin"
  | "unverified";

export const ROLE_CAPS: Record<Role, Capability[]> = {
  unverified: [],
  patient: [
    CAP.VIEW_DASHBOARD,
    CAP.INTAKE_SELF,
    CAP.RX_VIEW,
    CAP.RX_REFILL,
    CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
  ],
  nurse: [
    CAP.VIEW_DASHBOARD,
    CAP.INTAKE_REVIEW,
    CAP.RX_VIEW,
    CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY,
    CAP.WORKFLOW_VIEW,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
    CAP.PATIENT_VIEW,
    CAP.PATIENT_MANAGE,
  ],
  provider: [
    CAP.VIEW_DASHBOARD,
    CAP.INTAKE_REVIEW,
    CAP.RX_VIEW,
    CAP.RX_WRITE,
    CAP.RX_SIGN,
    CAP.RX_REFILL,
    CAP.CONSULT_START,
    CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY,
    CAP.WORKFLOW_VIEW,
    CAP.WORKFLOW_MANAGE,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
    CAP.PATIENT_VIEW,
    CAP.PATIENT_MANAGE,
  ],
  pharmacy: [
    CAP.VIEW_DASHBOARD,
    CAP.RX_VIEW,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
    CAP.PHARMACY_QUEUE,
    CAP.PHARMACY_FILL,
    CAP.PHARMACY_VERIFY,
  ],
  admin: Object.values(CAP) as Capability[],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEffectiveCaps(roles: Role[]): Set<Capability> {
  const caps = new Set<Capability>();
  for (const role of roles) {
    for (const cap of ROLE_CAPS[role] ?? []) {
      caps.add(cap);
    }
  }
  return caps;
}

function hasCap(roles: Role[], cap: Capability): boolean {
  return getEffectiveCaps(roles).has(cap);
}

// ---------------------------------------------------------------------------
// Server enforcement helpers
// ---------------------------------------------------------------------------

/**
 * Look up a member's role(s) from the DB.
 * Returns ["unverified"] if the member is not found.
 */
async function getMemberRoles(ctx: any, memberId: string): Promise<Role[]> {
  try {
    const member = await ctx.db.get(memberId);
    if (!member) return ["unverified"];
    const role = member.role as Role;
    return role && role in ROLE_CAPS ? [role] : ["unverified"];
  } catch {
    return ["unverified"];
  }
}

/**
 * Returns true if the member identified by callerId has the capability.
 * Performs a DB lookup — use in mutations/queries that need fine-grained checks.
 */
export async function memberHasCap(
  ctx: any,
  callerId: string,
  cap: Capability
): Promise<boolean> {
  const roles = await getMemberRoles(ctx, callerId);
  return hasCap(roles, cap);
}

/**
 * Require a capability. Throws ConvexError with code UNAUTHORIZED or
 * FORBIDDEN if the check fails.
 *
 * Call at the top of any handler that must be capability-gated:
 *
 *   await requireCap(ctx, args.callerId, CAP.RX_WRITE);
 *
 * @param ctx      - Convex query/mutation context
 * @param callerId - memberId passed from client (session cookie)
 * @param cap      - required capability
 */
export async function requireCap(
  ctx: any,
  callerId: string | undefined,
  cap: Capability
): Promise<void> {
  if (!callerId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  const has = await memberHasCap(ctx, callerId, cap);
  if (!has) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Missing required capability: ${cap}`,
    });
  }
}

/**
 * Require ANY of the listed capabilities.
 * Useful when multiple roles can perform the same action.
 */
export async function requireAnyCap(
  ctx: any,
  callerId: string | undefined,
  caps: Capability[]
): Promise<void> {
  if (!callerId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }
  const roles = await getMemberRoles(ctx, callerId);
  const effective = getEffectiveCaps(roles);
  const hasAny = caps.some((c) => effective.has(c));
  if (!hasAny) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Missing one of: ${caps.join(", ")}`,
    });
  }
}
