// @ts-nocheck
/**
 * SECURITY AUDIT HELPER
 *
 * Call logSecurityEvent() from any mutation to write an immutable audit trail.
 *
 * BUG-002 FIX: Events are persisted via ctx.scheduler.runAfter(0, ...) so they
 * survive transaction rollbacks. The scheduler spawns a NEW transaction for the
 * write, independent of the calling mutation. Even if the caller throws
 * ConvexError and rolls back, the audit event is still recorded.
 *
 * NOTE: This means audit events are written ASYNCHRONOUSLY (a few ms after the
 * mutation returns). They will always appear eventually, but may not be
 * immediately visible in the same read that triggered the mutation.
 */

import { internal } from "../_generated/api";

export type SecurityEventAction =
  | "PLATFORM_OWNER_SEED"
  | "PLATFORM_OWNER_GRANT_REQUESTED"
  | "PLATFORM_OWNER_GRANT_CONFIRMED"
  | "PLATFORM_OWNER_GRANT_CANCELLED"
  | "PLATFORM_OWNER_REVOKE"
  | "ROLE_CHANGE"
  | "MEMBER_CAP_OVERRIDE_CHANGE"
  | "ORG_CAP_OVERRIDE_CHANGE"
  | "PHI_EXPORT"
  | "PAYMENT_FAILED"
  | "SESSION_CREATED"
  | "SESSION_REVOKED";

export interface SecurityEventInput {
  action: SecurityEventAction | string;
  actorMemberId?: string | null;
  actorOrgId?: string | null;
  targetId?: string | null;
  targetType?: "member" | "org" | "platform" | string;
  diff?: unknown;
  success: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logSecurityEvent(
  ctx: any,
  event: SecurityEventInput
): Promise<void> {
  // Schedule the insert in a separate transaction (BUG-002 fix).
  // If the calling mutation throws and rolls back, this event still persists.
  await ctx.scheduler.runAfter(
    0,
    internal.lib.securityAuditInternal.persistSecurityEvent,
    {
      action: event.action,
      actorMemberId: event.actorMemberId ?? undefined,
      actorOrgId: event.actorOrgId ?? undefined,
      targetId: event.targetId ?? undefined,
      targetType: event.targetType ?? undefined,
      diff: event.diff ?? undefined,
      success: event.success,
      reason: event.reason ?? undefined,
      ipAddress: event.ipAddress ?? undefined,
      userAgent: event.userAgent ?? undefined,
      timestamp: Date.now(),
    }
  );
}
