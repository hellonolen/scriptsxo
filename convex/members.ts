// @ts-nocheck
/**
 * MEMBERS MODULE
 * Member management - getOrCreate for patient onboarding.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get or create a member record.
 * Used during patient onboarding — creates a member with "patient" role
 * if one doesn't already exist for the given email.
 */
export const getOrCreate = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    // Check if member exists
    const existing = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    if (existing) {
      return { memberId: existing._id, created: false };
    }

    // Create new member
    const displayName =
      args.name ||
      [args.firstName, args.lastName].filter(Boolean).join(" ") ||
      emailLower.split("@")[0];

    const memberId = await ctx.db.insert("members", {
      email: emailLower,
      name: displayName,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "patient",
      permissions: ["patient:read", "patient:write"],
      status: "active",
      joinedAt: Date.now(),
    });

    return { memberId, created: true };
  },
});

/**
 * Get a member by email.
 */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

/**
 * Get a member by ID.
 */
export const getById = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.memberId);
  },
});

/**
 * Update member profile.
 */
export const updateProfile = mutation({
  args: {
    memberId: v.id("members"),
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    dob: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.dob !== undefined) updates.dob = args.dob;
    updates.lastLoginAt = Date.now();

    await ctx.db.patch(args.memberId, updates);
    return { success: true };
  },
});
