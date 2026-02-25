// @ts-nocheck
/**
 * MEMBERS MODULE
 * Member management - getOrCreate for patient onboarding.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAnyCap, requireCap, CAP } from "./lib/capabilities";
import { logSecurityEvent } from "./lib/securityAudit";

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
      role: "unverified",
      permissions: [],
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
 * Update a member's verified role.
 * Called by the credential verification orchestrator after agentic verification passes.
 * All role changes are audited to securityEvents.
 */
export const updateRole = mutation({
  args: {
    memberId: v.id("members"),
    role: v.string(), // "patient" | "provider" | "pharmacy" | "admin" | "staff"
    callerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Role changes always require USER_MANAGE — no self-promotion allowed.
    try {
      await requireCap(ctx, args.callerId, CAP.USER_MANAGE);
    } catch (err) {
      await logSecurityEvent(ctx, {
        action: "ROLE_CHANGE",
        actorMemberId: args.callerId ?? null,
        targetId: args.memberId,
        targetType: "member",
        success: false,
        reason: "Caller lacks USER_MANAGE capability.",
      });
      throw err;
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const previousRole = member.role;

    // Assign role-appropriate permissions
    const permissionsByRole: Record<string, string[]> = {
      patient: ["patient:read", "patient:write"],
      provider: ["provider:read", "provider:write", "patient:read"],
      pharmacy: ["pharmacy:read", "pharmacy:write"],
      admin: ["admin:read", "admin:write", "provider:read", "provider:write", "patient:read", "patient:write", "pharmacy:read", "pharmacy:write"],
      staff: ["patient:read"],
      unverified: [],
    };

    await ctx.db.patch(args.memberId, {
      role: args.role,
      permissions: permissionsByRole[args.role] || [],
      lastLoginAt: Date.now(),
    });

    await logSecurityEvent(ctx, {
      action: "ROLE_CHANGE",
      actorMemberId: args.callerId ?? null,
      targetId: args.memberId,
      targetType: "member",
      diff: { role: { from: previousRole, to: args.role } },
      success: true,
    });

    return { success: true, role: args.role };
  },
});

/**
 * Update member profile.
 * Caller must be the subject themselves OR have USER_MANAGE.
 */
export const updateProfile = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    memberId: v.id("members"),
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    dob: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Allow: caller is the profile owner, OR caller has USER_MANAGE
    const callerIsSelf = args.callerId === (args.memberId as string);
    if (!callerIsSelf) {
      await requireCap(ctx, args.callerId, CAP.USER_MANAGE);
    }
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

/**
 * Update per-member capability overrides (capAllow / capDeny).
 * Requires USER_MANAGE. Every change is audited.
 */
export const updateCapOverrides = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    memberId: v.id("members"),
    capAllow: v.optional(v.array(v.string())),
    capDeny: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      await requireCap(ctx, args.callerId, CAP.USER_MANAGE);
    } catch (err) {
      await logSecurityEvent(ctx, {
        action: "MEMBER_CAP_OVERRIDE_CHANGE",
        actorMemberId: args.callerId ?? null,
        targetId: args.memberId,
        targetType: "member",
        success: false,
        reason: "Caller lacks USER_MANAGE capability.",
      });
      throw err;
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const updates: Record<string, unknown> = {};
    if (args.capAllow !== undefined) updates.capAllow = args.capAllow;
    if (args.capDeny !== undefined) updates.capDeny = args.capDeny;

    await ctx.db.patch(args.memberId, updates);

    await logSecurityEvent(ctx, {
      action: "MEMBER_CAP_OVERRIDE_CHANGE",
      actorMemberId: args.callerId ?? null,
      targetId: args.memberId,
      targetType: "member",
      diff: {
        capAllow: { from: member.capAllow ?? [], to: args.capAllow ?? member.capAllow ?? [] },
        capDeny:  { from: member.capDeny  ?? [], to: args.capDeny  ?? member.capDeny  ?? [] },
      },
      success: true,
    });

    return { success: true };
  },
});
