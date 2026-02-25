// @ts-nocheck
/**
 * SECURITY AUDIT HELPER
 *
 * Call logSecurityEvent() from any mutation to write an immutable audit trail
 * to the securityEvents table.  Both success AND failure must be logged.
 *
 * The securityEvents table is append-only — rows are never deleted or updated.
 *
 * Required fields every caller must supply:
 *   action        — constant string (SCREAMING_SNAKE_CASE), e.g. "ROLE_CHANGE"
 *   actorMemberId — memberId of whoever triggered the action (null = unauthenticated attempt)
 *   success       — true if the action completed, false if it was rejected/errored
 *
 * Recommended fields:
 *   targetId / targetType — what was being changed
 *   diff                  — { from, to } values for role/cap changes
 *   reason                — human-readable description or failure reason
 */

export type SecurityEventAction =
  | "PLATFORM_OWNER_SEED"
  | "PLATFORM_OWNER_GRANT_REQUESTED"
  | "PLATFORM_OWNER_GRANT_CONFIRMED"
  | "PLATFORM_OWNER_GRANT_CANCELLED"
  | "PLATFORM_OWNER_REVOKE"
  | "ROLE_CHANGE"
  | "MEMBER_CAP_OVERRIDE_CHANGE"
  | "ORG_CAP_OVERRIDE_CHANGE"
  | "PHI_EXPORT";

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
  await ctx.db.insert("securityEvents", {
    action: event.action,
    actorMemberId: event.actorMemberId ?? null,
    actorOrgId: event.actorOrgId ?? null,
    targetId: event.targetId ?? null,
    targetType: event.targetType ?? null,
    diff: event.diff ?? null,
    success: event.success,
    reason: event.reason ?? null,
    ipAddress: event.ipAddress ?? null,
    userAgent: event.userAgent ?? null,
    timestamp: Date.now(),
  });
}
