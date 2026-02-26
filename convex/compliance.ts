// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCap, requireAnyCap } from "./lib/serverAuth";
import { CAP } from "./lib/capabilities";

export const createCheck = mutation({
  args: {
    sessionToken: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    checkType: v.string(),
    status: v.string(),
    details: v.optional(v.any()),
    expiresAt: v.optional(v.number()),
    checkedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.AUDIT_VIEW);
    return await ctx.db.insert("complianceRecords", {
      ...args,
      checkedAt: Date.now(),
    });
  },
});

export const verifyPatientId = mutation({
  args: {
    sessionToken: v.string(),
    patientId: v.id("patients"),
    status: v.string(),
    details: v.optional(v.any()),
    checkedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.PATIENT_MANAGE, CAP.AUDIT_VIEW]);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new Error("Patient not found");

    // Create compliance record
    await ctx.db.insert("complianceRecords", {
      entityType: "patient",
      entityId: args.patientId,
      checkType: "id_verification",
      status: args.status,
      details: args.details,
      checkedAt: Date.now(),
      expiresAt: undefined,
      checkedBy: args.checkedBy || "system",
    });

    // Update patient record
    const updates: Record<string, unknown> = {
      idVerificationStatus: args.status === "passed" ? "verified" : "rejected",
      updatedAt: Date.now(),
    };
    if (args.status === "passed") {
      updates.idVerifiedAt = Date.now();
    }
    await ctx.db.patch(args.patientId, updates);

    return { success: true };
  },
});

export const checkProviderLicense = mutation({
  args: {
    sessionToken: v.string(),
    providerId: v.id("providers"),
    state: v.string(),
    status: v.string(),
    details: v.optional(v.any()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.PROVIDER_MANAGE, CAP.AUDIT_VIEW]);
    await ctx.db.insert("complianceRecords", {
      entityType: "provider",
      entityId: args.providerId,
      checkType: "license_check",
      status: args.status,
      details: { state: args.state, ...args.details },
      checkedAt: Date.now(),
      expiresAt: args.expiresAt,
      checkedBy: "system",
    });

    return { success: true };
  },
});

export const checkStateLicensing = query({
  args: {
    providerId: v.id("providers"),
    patientState: v.string(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return { allowed: false, reason: "Provider not found" };

    // Check if provider is licensed in the patient's state
    const isLicensed = provider.licensedStates.includes(args.patientState);

    // Check state licensing rules
    const stateRule = await ctx.db
      .query("stateLicensing")
      .withIndex("by_state", (q) => q.eq("state", args.patientState))
      .first();

    if (!stateRule) {
      return {
        allowed: isLicensed,
        reason: isLicensed
          ? "Provider is licensed in this state"
          : "Provider is not licensed in this state",
        stateRulesFound: false,
      };
    }

    if (!stateRule.telehealthAllowed) {
      return { allowed: false, reason: "Telehealth is not allowed in this state" };
    }

    if (!isLicensed && !stateRule.crossStatePrescribing) {
      return {
        allowed: false,
        reason: "Provider must be licensed in the patient's state",
      };
    }

    return {
      allowed: isLicensed || stateRule.crossStatePrescribing,
      reason: "Compliance check passed",
      stateRulesFound: true,
      inPersonRequired: stateRule.inPersonRequiredFirst,
      consentRequirements: stateRule.consentRequirements,
    };
  },
});

export const getByEntity = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceRecords")
      .withIndex("by_entityType_entityId", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .collect();
  },
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceRecords")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

export const getExpiring = query({
  args: {
    withinDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() + args.withinDays * 24 * 60 * 60 * 1000;
    const all = await ctx.db
      .query("complianceRecords")
      .withIndex("by_status", (q) => q.eq("status", "passed"))
      .collect();

    return all.filter((r) => r.expiresAt && r.expiresAt <= cutoff);
  },
});
