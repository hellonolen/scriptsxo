// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCap, CAP } from "./lib/capabilities";

export const create = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    name: v.string(),
    ncpdpId: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    address: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
    phone: v.string(),
    fax: v.optional(v.string()),
    email: v.optional(v.string()),
    type: v.string(),
    acceptsEPrescribe: v.boolean(),
    capabilities: v.array(v.string()),
    tier: v.number(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.PROVIDER_MANAGE);
    const now = Date.now();
    return await ctx.db.insert("pharmacies", {
      ...args,
      operatingHours: undefined,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("pharmacies")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("pharmacies").collect();
  },
});

export const getById = query({
  args: { pharmacyId: v.id("pharmacies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.pharmacyId);
  },
});

export const getByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("pharmacies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return all.filter((p) => p.address.state === args.state);
  },
});

export const updateStatus = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    pharmacyId: v.id("pharmacies"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.PROVIDER_MANAGE);
    await ctx.db.patch(args.pharmacyId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const update = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    pharmacyId: v.id("pharmacies"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.PROVIDER_MANAGE);
    await ctx.db.patch(args.pharmacyId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const getByTier = query({
  args: { tier: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pharmacies")
      .withIndex("by_tier", (q) => q.eq("tier", args.tier))
      .collect();
  },
});
