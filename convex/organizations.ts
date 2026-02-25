// @ts-nocheck
/**
 * ORGANIZATIONS MODULE
 * Organization management for B2B (clinic) and B2E (hospital) tiers.
 * Organizations contain members (physicians, staff) and manage subscription.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCap, requireOrgMember, CAP } from "./lib/capabilities";
import { logSecurityEvent } from "./lib/securityAudit";

/**
 * Create a new organization.
 */
export const create = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    name: v.string(),
    slug: v.string(),
    type: v.string(), // "clinic" | "hospital" | "pharmacy"
    subscriptionTier: v.optional(v.string()), // "clinic" | "enterprise"
    maxProviders: v.optional(v.number()),
    maxPatients: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.SETTINGS_MANAGE);
    // Check slug uniqueness
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Organization slug "${args.slug}" is already taken`);
    }

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      type: args.type,
      status: "active",
      subscriptionTier: args.subscriptionTier,
      maxProviders: args.maxProviders,
      maxPatients: args.maxPatients,
      createdAt: Date.now(),
    });

    return orgId;
  },
});

/**
 * Get organization by slug.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Get organization by ID.
 */
export const getById = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orgId);
  },
});

/**
 * List all organizations, optionally filtered by type.
 */
export const list = query({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.type) {
      return await ctx.db
        .query("organizations")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    }
    return await ctx.db.query("organizations").collect();
  },
});

/**
 * Get members of an organization.
 */
export const getMembers = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/**
 * Add a member to an organization.
 */
export const addMember = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    orgId: v.id("organizations"),
    email: v.string(),
    name: v.string(),
    role: v.string(), // "provider" | "staff" | "admin"
    orgRole: v.string(), // "owner" | "admin" | "member"
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.USER_MANAGE);
    await requireOrgMember(ctx, args.callerId, args.orgId);
    const emailLower = args.email.toLowerCase();

    // Check if member already exists in org
    const members = await ctx.db
      .query("members")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    const existing = members.find(
      (m) => m.email.toLowerCase() === emailLower
    );

    if (existing) {
      throw new Error("This email is already a member of this organization");
    }

    // Check org capacity
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");

    if (
      args.role === "provider" &&
      org.maxProviders &&
      members.filter((m) => m.role === "provider").length >= org.maxProviders
    ) {
      throw new Error(
        `Organization has reached its provider limit (${org.maxProviders})`
      );
    }

    const memberId = await ctx.db.insert("members", {
      orgId: args.orgId,
      email: emailLower,
      name: args.name,
      role: args.role,
      orgRole: args.orgRole,
      permissions: getDefaultPermissions(args.role),
      status: "active",
      joinedAt: Date.now(),
    });

    return memberId;
  },
});

/**
 * Remove a member from an organization.
 */
export const removeMember = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    orgId: v.id("organizations"),
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.USER_MANAGE);
    await requireOrgMember(ctx, args.callerId, args.orgId);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    if (member.orgId?.toString() !== args.orgId.toString()) {
      throw new Error("Member does not belong to this organization");
    }

    await ctx.db.patch(args.memberId, { status: "inactive" });
    return { success: true };
  },
});

/**
 * Update organization details.
 */
export const update = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    subscriptionTier: v.optional(v.string()),
    whopMembershipId: v.optional(v.string()),
    maxProviders: v.optional(v.number()),
    maxPatients: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.SETTINGS_MANAGE);
    await requireOrgMember(ctx, args.callerId, args.orgId);
    const { callerId: _c, orgId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(orgId, filteredUpdates);
    return { success: true };
  },
});

/**
 * Get organization stats: member count, provider count, patient count, Rx volume.
 */
export const getStats = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    const activeMembers = members.filter((m) => m.status === "active");
    const providers = activeMembers.filter((m) => m.role === "provider");

    // Count patients linked to providers in this org
    let patientCount = 0;
    let rxCount = 0;

    for (const provider of providers) {
      const providerRecord = await ctx.db
        .query("providers")
        .withIndex("by_email", (q) => q.eq("email", provider.email))
        .first();

      if (providerRecord) {
        const consultations = await ctx.db
          .query("consultations")
          .withIndex("by_providerId", (q) =>
            q.eq("providerId", providerRecord._id)
          )
          .collect();

        const uniquePatients = new Set(
          consultations.map((c) => c.patientId.toString())
        );
        patientCount += uniquePatients.size;

        const prescriptions = await ctx.db
          .query("prescriptions")
          .withIndex("by_providerId", (q) =>
            q.eq("providerId", providerRecord._id)
          )
          .collect();
        rxCount += prescriptions.length;
      }
    }

    return {
      totalMembers: activeMembers.length,
      providerCount: providers.length,
      patientCount,
      prescriptionCount: rxCount,
    };
  },
});

/**
 * Update org-level capability overrides (capAllow / capDeny).
 * Affects all members of the org. Requires SETTINGS_MANAGE + org membership.
 * Every change is audited to securityEvents.
 */
export const updateCapOverrides = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    orgId: v.id("organizations"),
    capAllow: v.optional(v.array(v.string())),
    capDeny: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      await requireCap(ctx, args.callerId, CAP.SETTINGS_MANAGE);
      await requireOrgMember(ctx, args.callerId, args.orgId);
    } catch (err) {
      await logSecurityEvent(ctx, {
        action: "ORG_CAP_OVERRIDE_CHANGE",
        actorMemberId: args.callerId ?? null,
        targetId: args.orgId,
        targetType: "org",
        success: false,
        reason: "Caller lacks SETTINGS_MANAGE or is not an org member.",
      });
      throw err;
    }

    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");

    const updates: Record<string, unknown> = {};
    if (args.capAllow !== undefined) updates.capAllow = args.capAllow;
    if (args.capDeny !== undefined) updates.capDeny = args.capDeny;

    await ctx.db.patch(args.orgId, updates);

    await logSecurityEvent(ctx, {
      action: "ORG_CAP_OVERRIDE_CHANGE",
      actorMemberId: args.callerId ?? null,
      targetId: args.orgId,
      targetType: "org",
      diff: {
        capAllow: { from: org.capAllow ?? [], to: args.capAllow ?? org.capAllow ?? [] },
        capDeny:  { from: org.capDeny  ?? [], to: args.capDeny  ?? org.capDeny  ?? [] },
      },
      success: true,
    });

    return { success: true };
  },
});

function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case "provider":
      return [
        "patient:read",
        "patient:write",
        "prescription:read",
        "prescription:write",
        "consultation:read",
        "consultation:write",
      ];
    case "admin":
      return [
        "patient:read",
        "patient:write",
        "prescription:read",
        "prescription:write",
        "consultation:read",
        "consultation:write",
        "org:read",
        "org:write",
        "member:read",
        "member:write",
      ];
    case "staff":
      return ["patient:read", "consultation:read", "prescription:read"];
    default:
      return ["patient:read"];
  }
}
