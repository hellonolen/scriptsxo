// @ts-nocheck
import { internalMutation } from "./_generated/server";

/**
 * Cleanup expired auth challenges.
 * Designed to be called by a cron job.
 */
export const cleanupExpiredChallenges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const allChallenges = await ctx.db.query("authChallenges").collect();

    let deletedCount = 0;
    for (const challenge of allChallenges) {
      if (challenge.expiresAt < now) {
        await ctx.db.delete(challenge._id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`[SXO-CLEANUP] Deleted ${deletedCount} expired auth challenges`);
    }

    return { deletedCount };
  },
});

/**
 * Cleanup expired rate limit records.
 */
export const cleanupExpiredRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const allLimits = await ctx.db.query("rateLimits").collect();

    let deletedCount = 0;
    for (const limit of allLimits) {
      if (limit.windowStart + limit.windowMs < now) {
        await ctx.db.delete(limit._id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`[SXO-CLEANUP] Deleted ${deletedCount} expired rate limit records`);
    }

    return { deletedCount };
  },
});

/**
 * Cleanup expired intake forms (older than 30 days and still draft).
 */
export const cleanupStaleIntakes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const staleIntakes = await ctx.db
      .query("intakes")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .collect();

    let expiredCount = 0;
    for (const intake of staleIntakes) {
      if (intake.createdAt < thirtyDaysAgo) {
        await ctx.db.patch(intake._id, {
          status: "expired",
          updatedAt: Date.now(),
        });
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`[SXO-CLEANUP] Expired ${expiredCount} stale intake forms`);
    }

    return { expiredCount };
  },
});

/**
 * Cleanup old audit log entries (older than 90 days).
 */
export const cleanupOldAuditLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const oldLogs = await ctx.db.query("agentLogs").collect();

    let deletedCount = 0;
    for (const log of oldLogs) {
      if (log.createdAt < ninetyDaysAgo) {
        await ctx.db.delete(log._id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`[SXO-CLEANUP] Deleted ${deletedCount} old agent log entries`);
    }

    return { deletedCount };
  },
});
