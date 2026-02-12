// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 60;

/**
 * Check if a key is rate limited and increment counter.
 * Returns whether the request is allowed.
 */
export const checkAndIncrement = mutation({
  args: {
    key: v.string(),
    maxRequests: v.optional(v.number()),
    windowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxRequests = args.maxRequests || DEFAULT_MAX_REQUESTS;
    const windowMs = args.windowMs || DEFAULT_WINDOW_MS;
    const now = Date.now();

    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    // No existing record or window expired - create new
    if (!existing || existing.windowStart + existing.windowMs < now) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }

      await ctx.db.insert("rateLimits", {
        key: args.key,
        count: 1,
        windowStart: now,
        windowMs,
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    // Window still active - check and increment
    if (existing.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.windowStart + existing.windowMs,
      };
    }

    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
    });

    return {
      allowed: true,
      remaining: maxRequests - existing.count - 1,
      resetAt: existing.windowStart + existing.windowMs,
    };
  },
});

/**
 * Check rate limit status without incrementing.
 */
export const check = query({
  args: {
    key: v.string(),
    maxRequests: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxRequests = args.maxRequests || DEFAULT_MAX_REQUESTS;
    const now = Date.now();

    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!existing || existing.windowStart + existing.windowMs < now) {
      return {
        limited: false,
        remaining: maxRequests,
        resetAt: null,
      };
    }

    return {
      limited: existing.count >= maxRequests,
      remaining: Math.max(0, maxRequests - existing.count),
      resetAt: existing.windowStart + existing.windowMs,
    };
  },
});

/**
 * Reset rate limit for a specific key.
 */
export const reset = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});
