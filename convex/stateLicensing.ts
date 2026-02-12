// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stateLicensing")
      .withIndex("by_state", (q) => q.eq("state", args.state.toUpperCase()))
      .first();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stateLicensing").collect();
  },
});

export const update = mutation({
  args: {
    state: v.string(),
    telehealthAllowed: v.boolean(),
    prescribingRules: v.optional(v.any()),
    controlledSubstanceRules: v.optional(v.any()),
    requiredLicenseTypes: v.array(v.string()),
    crossStatePrescribing: v.boolean(),
    inPersonRequiredFirst: v.boolean(),
    consentRequirements: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const stateUpper = args.state.toUpperCase();
    const existing = await ctx.db
      .query("stateLicensing")
      .withIndex("by_state", (q) => q.eq("state", stateUpper))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        telehealthAllowed: args.telehealthAllowed,
        prescribingRules: args.prescribingRules,
        controlledSubstanceRules: args.controlledSubstanceRules,
        requiredLicenseTypes: args.requiredLicenseTypes,
        crossStatePrescribing: args.crossStatePrescribing,
        inPersonRequiredFirst: args.inPersonRequiredFirst,
        consentRequirements: args.consentRequirements,
        updatedAt: now,
      });
      return { success: true, action: "updated" };
    }

    await ctx.db.insert("stateLicensing", {
      state: stateUpper,
      telehealthAllowed: args.telehealthAllowed,
      prescribingRules: args.prescribingRules,
      controlledSubstanceRules: args.controlledSubstanceRules,
      requiredLicenseTypes: args.requiredLicenseTypes,
      crossStatePrescribing: args.crossStatePrescribing,
      inPersonRequiredFirst: args.inPersonRequiredFirst,
      consentRequirements: args.consentRequirements,
      effectiveDate: now,
      updatedAt: now,
    });

    return { success: true, action: "created" };
  },
});

export const getTelehealthStates = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("stateLicensing").collect();
    return all.filter((s) => s.telehealthAllowed).map((s) => s.state);
  },
});

export const checkPrescribingEligibility = query({
  args: {
    providerState: v.string(),
    patientState: v.string(),
  },
  handler: async (ctx, args) => {
    const patientStateRules = await ctx.db
      .query("stateLicensing")
      .withIndex("by_state", (q) => q.eq("state", args.patientState.toUpperCase()))
      .first();

    if (!patientStateRules) {
      return {
        eligible: false,
        reason: "No licensing rules found for patient's state",
      };
    }

    if (!patientStateRules.telehealthAllowed) {
      return {
        eligible: false,
        reason: "Telehealth is not allowed in the patient's state",
      };
    }

    if (args.providerState === args.patientState) {
      return { eligible: true, reason: "Same state - prescribing allowed" };
    }

    if (!patientStateRules.crossStatePrescribing) {
      return {
        eligible: false,
        reason: "Cross-state prescribing is not allowed in the patient's state",
      };
    }

    return {
      eligible: true,
      reason: "Cross-state prescribing is allowed",
      inPersonRequired: patientStateRules.inPersonRequiredFirst,
    };
  },
});
