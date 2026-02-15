// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    consultationId: v.id("consultations"),
    patientId: v.id("patients"),
    providerId: v.id("providers"),
    pharmacyId: v.optional(v.id("pharmacies")),
    medicationName: v.string(),
    genericName: v.optional(v.string()),
    ndc: v.optional(v.string()),
    dosage: v.string(),
    form: v.string(),
    quantity: v.number(),
    daysSupply: v.number(),
    refillsAuthorized: v.number(),
    directions: v.string(),
    deaSchedule: v.optional(v.string()),
    expiresAt: v.number(),
    priorAuthRequired: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("prescriptions", {
      ...args,
      refillsUsed: 0,
      status: "draft",
      ePrescribeId: undefined,
      sentToPharmacyAt: undefined,
      filledAt: undefined,
      nextRefillDate: undefined,
      drugInteractions: undefined,
      priorAuthStatus: args.priorAuthRequired ? "pending" : undefined,
      cost: undefined,
      insuranceCovered: undefined,
      copay: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const sign = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    providerId: v.id("providers"),
  },
  handler: async (ctx, args) => {
    const rx = await ctx.db.get(args.prescriptionId);
    if (!rx) throw new Error("Prescription not found");

    if (rx.providerId !== args.providerId) {
      throw new Error("Only the prescribing provider can sign this prescription");
    }

    await ctx.db.patch(args.prescriptionId, {
      status: "signed",
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const sendToPharmacy = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    pharmacyId: v.id("pharmacies"),
    ePrescribeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rx = await ctx.db.get(args.prescriptionId);
    if (!rx) throw new Error("Prescription not found");

    if (rx.status !== "signed") {
      throw new Error("Prescription must be signed before sending to pharmacy");
    }

    await ctx.db.patch(args.prescriptionId, {
      status: "sent",
      pharmacyId: args.pharmacyId,
      ePrescribeId: args.ePrescribeId,
      sentToPharmacyAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const updateStatus = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "ready" || args.status === "picked_up" || args.status === "delivered") {
      const rx = await ctx.db.get(args.prescriptionId);
      if (rx && !rx.filledAt) {
        updates.filledAt = Date.now();
      }
    }

    await ctx.db.patch(args.prescriptionId, updates);
    return { success: true };
  },
});

export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("prescriptions")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const getByProvider = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("prescriptions")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .order("desc")
      .collect();
  },
});

export const getByConsultation = query({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("prescriptions")
      .withIndex("by_consultationId", (q) => q.eq("consultationId", args.consultationId))
      .collect();
  },
});

export const getById = query({
  args: { prescriptionId: v.id("prescriptions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.prescriptionId);
  },
});

export const getByPharmacy = query({
  args: {
    pharmacyId: v.id("pharmacies"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("prescriptions")
      .withIndex("by_pharmacyId", (q) => q.eq("pharmacyId", args.pharmacyId))
      .collect();

    if (args.status) {
      return results.filter((rx) => rx.status === args.status);
    }
    return results;
  },
});

export const listAll = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("prescriptions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("prescriptions")
      .order("desc")
      .collect();
  },
});

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxResults = args.limit ?? 50;
    return await ctx.db
      .query("prescriptions")
      .order("desc")
      .take(maxResults);
  },
});

export const requestRefill = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const rx = await ctx.db.get(args.prescriptionId);
    if (!rx) {
      throw new Error("Prescription not found");
    }

    if (rx.patientId !== args.patientId) {
      throw new Error("Prescription does not belong to this patient");
    }

    if (rx.refillsUsed >= rx.refillsAuthorized) {
      throw new Error("No refills remaining");
    }

    if (rx.expiresAt <= Date.now()) {
      throw new Error("Prescription has expired");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("refillRequests", {
      prescriptionId: args.prescriptionId,
      patientId: args.patientId,
      status: "requested",
      requestedAt: now,
      createdAt: now,
    });

    return requestId;
  },
});
