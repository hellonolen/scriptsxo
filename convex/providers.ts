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
