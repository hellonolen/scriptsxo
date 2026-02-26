// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAnyCap } from "./lib/serverAuth";
import { CAP } from "./lib/capabilities";

export const create = mutation({
  args: {
    sessionToken: v.string(),
    memberId: v.id("members"),
    email: v.string(),
    dateOfBirth: v.string(),
    gender: v.string(),
    address: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
    allergies: v.array(v.string()),
    currentMedications: v.array(v.string()),
    medicalConditions: v.array(v.string()),
    emergencyContact: v.optional(
      v.object({
        name: v.string(),
        phone: v.string(),
        relationship: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.PATIENT_MANAGE]);
    const now = Date.now();
    return await ctx.db.insert("patients", {
      ...args,
      insuranceProvider: undefined,
      insurancePolicyNumber: undefined,
      insuranceGroupNumber: undefined,
      primaryPharmacy: undefined,
      consentSignedAt: undefined,
      idVerifiedAt: undefined,
      idVerificationStatus: "pending",
      state: args.address.state,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getByMemberId = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("patients")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .first();
  },
});

export const getById = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.patientId);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("patients")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    patientId: v.id("patients"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.PATIENT_MANAGE]);
    await ctx.db.patch(args.patientId, { ...args.updates, updatedAt: Date.now() });
    return { success: true };
  },
});

export const verifyId = mutation({
  args: {
    sessionToken: v.string(),
    patientId: v.id("patients"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.PATIENT_MANAGE]);
    const updates: Record<string, unknown> = {
      idVerificationStatus: args.status,
      updatedAt: Date.now(),
    };
    if (args.status === "verified") {
      updates.idVerifiedAt = Date.now();
    }
    await ctx.db.patch(args.patientId, updates);
    return { success: true };
  },
});

export const signConsent = mutation({
  args: {
    sessionToken: v.string(),
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.PATIENT_MANAGE]);
    await ctx.db.patch(args.patientId, {
      consentSignedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const updateInsurance = mutation({
  args: {
    sessionToken: v.string(),
    patientId: v.id("patients"),
    insuranceProvider: v.string(),
    insurancePolicyNumber: v.string(),
    insuranceGroupNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.PATIENT_MANAGE]);
    await ctx.db.patch(args.patientId, {
      insuranceProvider: args.insuranceProvider,
      insurancePolicyNumber: args.insurancePolicyNumber,
      insuranceGroupNumber: args.insuranceGroupNumber,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const setPrimaryPharmacy = mutation({
  args: {
    sessionToken: v.string(),
    patientId: v.id("patients"),
    pharmacyId: v.id("pharmacies"),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.PATIENT_MANAGE]);
    await ctx.db.patch(args.patientId, {
      primaryPharmacy: args.pharmacyId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// === CMS Queries ===

const ACTIVE_RX_STATUSES = ["signed", "sent", "filling", "ready"];

export const getFullRecord = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();

    const consultations = await ctx.db
      .query("consultations")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();

    const billing = await ctx.db
      .query("billingRecords")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();

    const latestIntake = await ctx.db
      .query("intakes")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .first();

    const activeRxCount = prescriptions.filter((rx) =>
      ACTIVE_RX_STATUSES.includes(rx.status)
    ).length;

    const totalRefills = prescriptions.reduce(
      (sum, rx) => sum + (rx.refillsUsed ?? 0),
      0
    );

    const totalSpent = billing
      .filter((record) => record.status === "paid")
      .reduce((sum, record) => sum + record.amount, 0);

    return {
      patient,
      prescriptions,
      consultations,
      billing,
      latestIntake,
      stats: {
        activeRxCount,
        totalRefills,
        lifetimeConsultations: consultations.length,
        totalSpent,
        memberSince: patient.createdAt,
      },
    };
  },
});

export const list = query({
  args: {
    paginationOpts: v.any(),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.state) {
      return await ctx.db
        .query("patients")
        .withIndex("by_state", (q) => q.eq("state", args.state))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("patients")
      .withIndex("by_created")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const search = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("patients")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});
