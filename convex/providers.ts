// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    memberId: v.id("members"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    title: v.string(),
    npiNumber: v.string(),
    deaNumber: v.optional(v.string()),
    specialties: v.array(v.string()),
    licensedStates: v.array(v.string()),
    consultationRate: v.number(),
    maxDailyConsultations: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify NPI is unique
    const existingNpi = await ctx.db
      .query("providers")
      .withIndex("by_npiNumber", (q) => q.eq("npiNumber", args.npiNumber))
      .first();

    if (existingNpi) {
      throw new Error("A provider with this NPI number already exists");
    }

    return await ctx.db.insert("providers", {
      ...args,
      licenseNumbers: undefined,
      acceptingPatients: true,
      availability: undefined,
      currentQueueSize: 0,
      rating: undefined,
      totalConsultations: 0,
      status: "onboarding",
      credentialVerifiedAt: undefined,
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
        .query("providers")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("providers").collect();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

export const getByMemberId = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("providers")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .first();
  },
});

export const getByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const allProviders = await ctx.db
      .query("providers")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return allProviders.filter(
      (p) => p.licensedStates.includes(args.state) && p.acceptingPatients
    );
  },
});

export const updateAvailability = mutation({
  args: {
    providerId: v.id("providers"),
    acceptingPatients: v.optional(v.boolean()),
    availability: v.optional(v.any()),
    maxDailyConsultations: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.acceptingPatients !== undefined) updates.acceptingPatients = args.acceptingPatients;
    if (args.availability !== undefined) updates.availability = args.availability;
    if (args.maxDailyConsultations !== undefined)
      updates.maxDailyConsultations = args.maxDailyConsultations;

    await ctx.db.patch(args.providerId, updates);
    return { success: true };
  },
});

export const verifyCredentials = mutation({
  args: {
    providerId: v.id("providers"),
    deaNumber: v.optional(v.string()),
    licenseNumbers: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: "active",
      credentialVerifiedAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (args.deaNumber) updates.deaNumber = args.deaNumber;
    if (args.licenseNumbers) updates.licenseNumbers = args.licenseNumbers;

    await ctx.db.patch(args.providerId, updates);
    return { success: true };
  },
});

export const updateStatus = mutation({
  args: {
    providerId: v.id("providers"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.providerId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const getById = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.providerId);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("providers")
      .order("desc")
      .collect();
  },
});

export const update = mutation({
  args: {
    providerId: v.id("providers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    deaNumber: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    licensedStates: v.optional(v.array(v.string())),
    consultationRate: v.optional(v.number()),
    maxDailyConsultations: v.optional(v.number()),
    acceptingPatients: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { providerId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(providerId, updates);
    return { success: true };
  },
});

export const remove = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.providerId, {
      status: "inactive",
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const incrementQueue = mutation({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) throw new Error("Provider not found");
    await ctx.db.patch(args.providerId, {
      currentQueueSize: provider.currentQueueSize + 1,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
