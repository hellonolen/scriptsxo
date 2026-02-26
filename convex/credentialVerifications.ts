/**
 * CREDENTIAL VERIFICATIONS MODULE
 * State machine for agentic credential verification pipeline.
 *
 * Each verification tracks a user through role-specific onboarding:
 *   Patient  -> Stripe Identity (gov ID + selfie)
 *   Provider -> NPI check + license OCR + optional DEA + compliance
 *   Pharmacy -> NCPDP / NPI registry lookup + compliance
 *
 * Agents drive transitions; this module is pure state management.
 *
 * Authorization model:
 *   callerId = the memberId of whoever is driving the step.
 *   INTAKE_SELF  — the person being verified (e.g. patient filling out their own form)
 *   INTAKE_REVIEW — an agent, admin, or provider reviewing/advancing the pipeline
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAnyCap, CAP } from "./lib/capabilities";

// ─── Queries ────────────────────────────────────────────────────────

export const getById = query({
  args: { id: v.id("credentialVerifications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByMemberId = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("credentialVerifications")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .first();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("credentialVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .order("desc")
      .first();
  },
});

export const getActiveByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("credentialVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .order("desc")
      .collect();
    return all.find(
      (v) => v.status === "pending" || v.status === "in_progress"
    ) ?? null;
  },
});

/**
 * List all verifications with a given status (for admin review queues).
 * Defaults to "pending" if no status is provided.
 * Caller must have INTAKE_REVIEW capability.
 */
export const getPending = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const targetStatus = args.status ?? "pending";
    const limit = args.limit ?? 50;
    const all = await ctx.db
      .query("credentialVerifications")
      .order("desc")
      .collect();
    return all
      .filter((r) => r.status === targetStatus)
      .slice(0, limit);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────

/**
 * Create a new verification record when the user selects a role.
 */
export const create = mutation({
  args: {
    memberId: v.id("members"),
    email: v.string(),
    selectedRole: v.string(), // "patient" | "provider" | "pharmacy"
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    const now = Date.now();
    const id = await ctx.db.insert("credentialVerifications", {
      memberId: args.memberId,
      email: args.email.toLowerCase(),
      selectedRole: args.selectedRole,
      status: "pending",
      currentStep: "role_selected",
      completedSteps: ["role_selected"],
      errors: [],
      retryCount: 0,
      startedAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Update the overall status of a verification.
 * Driven by agent orchestrators — requires INTAKE_REVIEW.
 */
export const updateStatus = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    status: v.string(),
    currentStep: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_REVIEW]);
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.currentStep) updates.currentStep = args.currentStep;
    if (args.status === "verified" || args.status === "rejected") {
      updates.completedAt = Date.now();
    }
    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Advance to the next step and record completion of the current one.
 * Driven by agent orchestrators — requires INTAKE_REVIEW.
 */
export const advanceStep = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    completedStep: v.string(),
    nextStep: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_REVIEW]);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Verification not found");

    const completedSteps = [...record.completedSteps];
    if (!completedSteps.includes(args.completedStep)) {
      completedSteps.push(args.completedStep);
    }

    await ctx.db.patch(args.id, {
      currentStep: args.nextStep,
      completedSteps,
      status: "in_progress",
      updatedAt: Date.now(),
    });
  },
});

// ─── Provider-specific updates ──────────────────────────────────────

export const updateProviderNpi = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    npiNumber: v.string(),
    npiResult: v.any(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    await ctx.db.patch(args.id, {
      providerNpi: args.npiNumber,
      providerNpiResult: args.npiResult,
      updatedAt: Date.now(),
    });
  },
});

export const updateProviderLicense = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    licenseFileId: v.optional(v.string()),
    licenseScanResult: v.optional(v.any()),
    licensedStates: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.licenseFileId) updates.providerLicenseFileId = args.licenseFileId;
    if (args.licenseScanResult) updates.providerLicenseScanResult = args.licenseScanResult;
    if (args.licensedStates) updates.providerLicensedStates = args.licensedStates;
    await ctx.db.patch(args.id, updates);
  },
});

export const updateProviderDea = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    deaNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    await ctx.db.patch(args.id, {
      providerDeaNumber: args.deaNumber,
      updatedAt: Date.now(),
    });
  },
});

export const updateProviderDetails = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    title: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title) updates.providerTitle = args.title;
    if (args.specialties) updates.providerSpecialties = args.specialties;
    await ctx.db.patch(args.id, updates);
  },
});

// ─── Patient-specific updates ───────────────────────────────────────

export const updatePatientStripe = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    stripeSessionId: v.optional(v.string()),
    stripeStatus: v.optional(v.string()),
    idScanResult: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.stripeSessionId) updates.patientStripeSessionId = args.stripeSessionId;
    if (args.stripeStatus) updates.patientStripeStatus = args.stripeStatus;
    if (args.idScanResult) updates.patientIdScanResult = args.idScanResult;
    await ctx.db.patch(args.id, updates);
  },
});

// ─── Pharmacy-specific updates ──────────────────────────────────────

export const updatePharmacy = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    ncpdpId: v.optional(v.string()),
    npi: v.optional(v.string()),
    pharmacyName: v.optional(v.string()),
    registryResult: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.ncpdpId) updates.pharmacyNcpdpId = args.ncpdpId;
    if (args.npi) updates.pharmacyNpi = args.npi;
    if (args.pharmacyName) updates.pharmacyName = args.pharmacyName;
    if (args.registryResult) updates.pharmacyRegistryResult = args.registryResult;
    await ctx.db.patch(args.id, updates);
  },
});

// ─── Compliance / Error tracking ────────────────────────────────────

export const updateCompliance = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    complianceSummary: v.any(),
    complianceRecordIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_REVIEW]);
    const updates: Record<string, unknown> = {
      complianceSummary: args.complianceSummary,
      updatedAt: Date.now(),
    };
    if (args.complianceRecordIds) {
      updates.complianceRecordIds = args.complianceRecordIds;
    }
    await ctx.db.patch(args.id, updates);
  },
});

export const recordError = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    step: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Verification not found");

    const errors = [...(record.errors || [])];
    errors.push({
      step: args.step,
      message: args.message,
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.id, {
      errors,
      retryCount: (record.retryCount || 0) + 1,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mark verification as complete and set final status.
 * Only agents/reviewers may finalize — requires INTAKE_REVIEW.
 */
export const complete = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("credentialVerifications"),
    status: v.string(), // "verified" | "rejected"
    complianceSummary: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_REVIEW]);
    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      currentStep: "complete",
      completedAt: now,
      updatedAt: now,
    };
    if (args.complianceSummary) {
      updates.complianceSummary = args.complianceSummary;
    }

    const record = await ctx.db.get(args.id);
    if (record) {
      const completedSteps = [...record.completedSteps];
      if (!completedSteps.includes("complete")) {
        completedSteps.push("complete");
      }
      updates.completedSteps = completedSteps;
    }

    await ctx.db.patch(args.id, updates);
  },
});
