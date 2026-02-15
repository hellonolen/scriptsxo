// @ts-nocheck
/**
 * SETTINGS MODULE
 * Platform configuration stored in Convex.
 * Used for LLM preferences, feature flags, tier pricing, etc.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get a setting by key.
 */
export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return setting?.value ?? null;
  },
});

/**
 * Get multiple settings by keys.
 */
export const getMany = query({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: Record<string, unknown> = {};
    for (const key of args.keys) {
      const setting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      results[key] = setting?.value ?? null;
    }
    return results;
  },
});

/**
 * Set a setting (upsert).
 */
export const set = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
      });
      return { success: true, action: "updated" };
    }

    await ctx.db.insert("settings", {
      key: args.key,
      value: args.value,
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });
    return { success: true, action: "created" };
  },
});

/**
 * Delete a setting.
 */
export const remove = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!existing) {
      return { success: false, error: "Setting not found" };
    }

    await ctx.db.delete(existing._id);
    return { success: true };
  },
});

/**
 * List all settings.
 */
export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("settings").collect();
  },
});
