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
 * ─── Enforcement model ───────────────────────────────────────────────────────
 *
 *   1. Platform owner bypass  — member.isPlatformOwner === true gets ALL caps.
 *                               This is ORTHOGONAL to roles: checked before any
 *                               role/cap logic and independent of ROLE_CAPS bundles.
 *                               Set only via platformAdmin.seed / requestPlatformOwnerGrant.
 *   2. Base bundle            — ROLE_CAPS[member.role]
 *   3. Org-level capAllow     — extra caps granted to all org members
 *   4. Member-level capAllow  — extra caps granted to this individual
 *   5. Org-level capDeny      — caps revoked from all org members (wins over allow)
 *   6. Member-level capDeny   — caps revoked from this individual (wins over allow)
 *
 *   Deny always wins: if a cap appears in both an allow list and a deny list,
 *   the cap is removed from the effective set.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   import { requireCap, requireOrgMember, CAP } from "../lib/capabilities";
 *
 *   export const writePrescription = mutation({
 *     args: { callerId: v.optional(v.id("members")), ... },
 *     handler: async (ctx, args) => {
 *       await requireCap(ctx, args.callerId, CAP.RX_WRITE);
 *       // ...
 *     },
 *   });
 *
 * ─── V1 Security Note ────────────────────────────────────────────────────────
 *
 *   requireCap() accepts a callerId (memberId) passed by the client,
 *   looks up the member's role+overrides in the DB, then checks the capability.
 *   Member IDs are Convex-generated non-guessable UUIDs. V2 will bind the
 *   caller's identity cryptographically via Convex Auth.
 */

import { ConvexError } from "convex/values";
// (no email-based bypass — platform owner is a DB flag, not a hardcoded list)

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
// Internal: build effective cap set with full override chain
// ---------------------------------------------------------------------------

/**
 * Builds the effective capability Set for a member, applying:
 *   base ROLE_CAPS → org capAllow → member capAllow → org capDeny → member capDeny
 *
 * Deny always wins — a cap in any deny list is removed regardless of allows.
 *
 * Returns empty Set if the member is not found.
 * Returns ALL caps if the member's email is a platform owner.
 */
export async function getMemberEffectiveCaps(
  ctx: any,
  memberId: string
): Promise<Set<Capability>> {
  try {
    const member = await ctx.db.get(memberId);
    if (!member) return new Set();

    // Platform owner bypass — granted only via grantPlatformOwner mutation / seed script.
    // Never derived from email or any client-supplied value.
    if (member.isPlatformOwner === true) {
      return new Set(Object.values(CAP) as Capability[]);
    }

    const role = member.role as Role;
    const base: Capability[] = role && role in ROLE_CAPS ? ROLE_CAPS[role] : [];

    // Collect org-level overrides
    let orgAllow: Set<string> = new Set();
    let orgDeny: Set<string> = new Set();
    if (member.orgId) {
      const org = await ctx.db.get(member.orgId);
      if (org) {
        orgAllow = new Set(org.capAllow ?? []);
        orgDeny = new Set(org.capDeny ?? []);
      }
    }

    // Collect member-level overrides
    const memberAllow = new Set<string>(member.capAllow ?? []);
    const memberDeny = new Set<string>(member.capDeny ?? []);

    // Build effective set
    const effective = new Set<Capability>(base);
    for (const cap of orgAllow) effective.add(cap as Capability);
    for (const cap of memberAllow) effective.add(cap as Capability);
    // Deny wins — applied last
    for (const cap of orgDeny) effective.delete(cap as Capability);
    for (const cap of memberDeny) effective.delete(cap as Capability);

    return effective;
  } catch {
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// Server enforcement helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the member identified by callerId has the capability.
 */
export async function memberHasCap(
  ctx: any,
  callerId: string,
  cap: Capability
): Promise<boolean> {
  const effective = await getMemberEffectiveCaps(ctx, callerId);
  return effective.has(cap);
}

/**
 * Require a capability. Throws ConvexError with UNAUTHORIZED or FORBIDDEN.
 *
 *   await requireCap(ctx, args.callerId, CAP.RX_WRITE);
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
  const effective = await getMemberEffectiveCaps(ctx, callerId);
  if (!effective.has(cap)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Missing required capability: ${cap}`,
    });
  }
}

/**
 * Require ANY of the listed capabilities (OR-style check).
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
  const effective = await getMemberEffectiveCaps(ctx, callerId);
  if (!caps.some((c) => effective.has(c))) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Missing one of: ${caps.join(", ")}`,
    });
  }
}

/**
 * Verify that the caller is a member of the given org — or a platform owner.
 *
 * Call before any mutation that accepts an orgId from the client:
 *
 *   await requireOrgMember(ctx, args.callerId, args.orgId);
 *
 * This prevents a user from acting on behalf of an org they don't belong to.
 */
export async function requireOrgMember(
  ctx: any,
  callerId: string | undefined,
  orgId: string
): Promise<void> {
  if (!callerId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }
  const member = await ctx.db.get(callerId);
  if (!member) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Member not found.",
    });
  }
  // Platform owners bypass org membership check
  if (member.isPlatformOwner === true) return;
  if (member.orgId !== orgId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Not a member of this organization.",
    });
  }
}
