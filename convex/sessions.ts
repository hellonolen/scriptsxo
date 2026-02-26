// @ts-nocheck
import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { createSession, revokeSession, revokeAllMemberSessions } from "./lib/serverAuth";

/**
 * Create a session after successful authentication.
 * Called by passkeys/magic link auth completions.
 * Returns sessionToken to store in cookie.
 */
export const create = internalMutation({
  args: {
    memberId: v.id("members"),
    email: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const token = await createSession(ctx, args.memberId, args.email, {
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });
    return { sessionToken: token };
  },
});

/**
 * Revoke a specific session (logout).
 */
export const revoke = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await revokeSession(ctx, args.sessionToken);
    return { success: true };
  },
});

/**
 * Revoke all sessions for a member (internal — used by admin actions).
 */
export const revokeAllForMember = internalMutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const count = await revokeAllMemberSessions(ctx, args.memberId);
    return { revokedCount: count };
  },
});

/**
 * Cleanup expired sessions (called by cron).
 */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("sessions")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();
    for (const s of expired) {
      await ctx.db.delete(s._id);
    }
    return { cleaned: expired.length };
  },
});
