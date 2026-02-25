// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCap, CAP } from "./lib/capabilities";

export const create = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    prescriptionId: v.id("prescriptions"),
    patientId: v.id("patients"),
    pharmacyId: v.optional(v.id("pharmacies")),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.RX_REFILL);
    // Validate prescription exists and has refills remaining
    const rx = await ctx.db.get(args.prescriptionId);
    if (!rx) throw new Error("Prescription not found");

    if (rx.refillsUsed >= rx.refillsAuthorized) {
      throw new Error("No refills remaining on this prescription");
    }

    if (rx.expiresAt < Date.now()) {
      throw new Error("This prescription has expired");
    }

    const now = Date.now();
    return await ctx.db.insert("refillRequests", {
      prescriptionId: args.prescriptionId,
      patientId: args.patientId,
      pharmacyId: args.pharmacyId || rx.pharmacyId,
      status: "requested",
      requestedAt: now,
      processedAt: undefined,
      processedBy: undefined,
      denialReason: undefined,
      createdAt: now,
    });
  },
});

export const approve = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    refillId: v.id("refillRequests"),
    providerId: v.id("providers"),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.RX_SIGN);
    const refill = await ctx.db.get(args.refillId);
    if (!refill) throw new Error("Refill request not found");

    // Update refill request
    await ctx.db.patch(args.refillId, {
      status: "approved",
      processedAt: Date.now(),
      processedBy: args.providerId,
    });

    // Increment refills used on the prescription
    const rx = await ctx.db.get(refill.prescriptionId);
    if (rx) {
      await ctx.db.patch(rx._id, {
        refillsUsed: rx.refillsUsed + 1,
        nextRefillDate: undefined,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const deny = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    refillId: v.id("refillRequests"),
    providerId: v.id("providers"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.RX_SIGN);
    await ctx.db.patch(args.refillId, {
      status: "denied",
      processedAt: Date.now(),
      processedBy: args.providerId,
      denialReason: args.reason,
    });
    return { success: true };
  },
});

export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("refillRequests")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const getByPrescription = query({
  args: { prescriptionId: v.id("prescriptions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("refillRequests")
      .withIndex("by_prescriptionId", (q) => q.eq("prescriptionId", args.prescriptionId))
      .order("desc")
      .collect();
  },
});

export const getPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("refillRequests")
      .withIndex("by_status", (q) => q.eq("status", "requested"))
      .order("asc")
      .collect();
  },
});
