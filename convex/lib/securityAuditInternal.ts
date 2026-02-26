// @ts-nocheck
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Internal mutation to persist a security event.
 * Called via ctx.scheduler.runAfter(0, ...) so it runs in its OWN transaction,
 * independent of the parent mutation that may later throw and roll back.
 * This is the fix for BUG-002: failed security events are now always persisted.
 */
export const persistSecurityEvent = internalMutation({
  args: {
    action: v.string(),
    actorMemberId: v.optional(v.string()),
    actorOrgId: v.optional(v.string()),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.string()),
    diff: v.optional(v.any()),
    success: v.boolean(),
    reason: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const record: Record<string, unknown> = {
      action: args.action,
      success: args.success,
      timestamp: args.timestamp,
    };
    if (args.actorMemberId != null) record.actorMemberId = args.actorMemberId;
    if (args.actorOrgId != null) record.actorOrgId = args.actorOrgId;
    if (args.targetId != null) record.targetId = args.targetId;
    if (args.targetType != null) record.targetType = args.targetType;
    if (args.diff != null) record.diff = args.diff;
    if (args.reason != null) record.reason = args.reason;
    if (args.ipAddress != null) record.ipAddress = args.ipAddress;
    if (args.userAgent != null) record.userAgent = args.userAgent;
    await ctx.db.insert("securityEvents", record);
  },
});
