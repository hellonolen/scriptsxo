// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    action: v.string(),
    actorEmail: v.string(),
    actorRole: v.optional(v.string()),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLog", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getByActor = query({
  args: {
    actorEmail: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("auditLog")
      .withIndex("by_actorEmail", (q) => q.eq("actorEmail", args.actorEmail))
      .order("desc")
      .collect();

    if (args.limit) {
      return results.slice(0, args.limit);
    }
    return results;
  },
});

export const getByEntity = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLog")
      .withIndex("by_entityType_entityId", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .collect();
  },
});

export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const results = await ctx.db
      .query("auditLog")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    return results.slice(0, limit);
  },
});

export const getByAction = query({
  args: { action: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("auditLog").order("desc").collect();
    return all.filter((entry) => entry.action === args.action);
  },
});

export const logAgentAction = mutation({
  args: {
    agentName: v.string(),
    action: v.string(),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getAgentLogs = query({
  args: {
    agentName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.agentName) {
      const results = await ctx.db
        .query("agentLogs")
        .withIndex("by_agentName", (q) => q.eq("agentName", args.agentName!))
        .order("desc")
        .collect();
      return results.slice(0, limit);
    }

    const results = await ctx.db
      .query("agentLogs")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    return results.slice(0, limit);
  },
});
