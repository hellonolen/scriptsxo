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
  // Convex v.optional() = field may be absent; it does NOT accept null.
  // Build the record with only truthy/defined fields to satisfy the schema.
  const record: Record<string, unknown> = {
    action: event.action,
    success: event.success,
    timestamp: Date.now(),
  };
  if (event.actorMemberId != null) record.actorMemberId = event.actorMemberId;
  if (event.actorOrgId != null)    record.actorOrgId    = event.actorOrgId;
  if (event.targetId != null)      record.targetId      = event.targetId;
  if (event.targetType != null)    record.targetType    = event.targetType;
  if (event.diff != null)          record.diff          = event.diff;
  if (event.reason != null)        record.reason        = event.reason;
  if (event.ipAddress != null)     record.ipAddress     = event.ipAddress;
  if (event.userAgent != null)     record.userAgent     = event.userAgent;
  await ctx.db.insert("securityEvents", record);
}
