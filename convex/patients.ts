// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
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
    patientId: v.id("patients"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.patientId, { ...args.updates, updatedAt: Date.now() });
    return { success: true };
  },
});

export const verifyId = mutation({
  args: {
    patientId: v.id("patients"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
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
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.patientId, {
      consentSignedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const updateInsurance = mutation({
  args: {
    patientId: v.id("patients"),
    insuranceProvider: v.string(),
    insurancePolicyNumber: v.string(),
    insuranceGroupNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
    patientId: v.id("patients"),
    pharmacyId: v.id("pharmacies"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.patientId, {
      primaryPharmacy: args.pharmacyId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
