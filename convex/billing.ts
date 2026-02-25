// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCap, requireAnyCap, CAP } from "./lib/capabilities";

export const createRecord = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    patientId: v.id("patients"),
    consultationId: v.optional(v.id("consultations")),
    type: v.string(),
    amount: v.number(),
    insuranceAmount: v.optional(v.number()),
    copay: v.optional(v.number()),
    cptCodes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.callerId, [CAP.REPORT_VIEW, CAP.SETTINGS_MANAGE]);
    const now = Date.now();
    return await ctx.db.insert("billingRecords", {
      ...args,
      status: "pending",
      stripePaymentIntentId: undefined,
      insuranceClaimId: undefined,
      paidAt: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const processPayment = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    billingId: v.id("billingRecords"),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.SETTINGS_MANAGE);
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.stripePaymentIntentId) {
      updates.stripePaymentIntentId = args.stripePaymentIntentId;
    }

    if (args.status === "paid") {
      updates.paidAt = Date.now();
    }

    await ctx.db.patch(args.billingId, updates);

    // Update consultation payment status if linked
    const billing = await ctx.db.get(args.billingId);
    if (billing?.consultationId && args.status === "paid") {
      await ctx.db.patch(billing.consultationId, {
        paymentStatus: "paid",
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const submitInsuranceClaim = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    billingId: v.id("billingRecords"),
    insuranceClaimId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.SETTINGS_MANAGE);
    await ctx.db.patch(args.billingId, {
      status: "submitted",
      insuranceClaimId: args.insuranceClaimId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("billingRecords")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const getByConsultation = query({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("billingRecords")
      .withIndex("by_consultationId", (q) => q.eq("consultationId", args.consultationId))
      .first();
  },
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("billingRecords")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

export const getById = query({
  args: { billingId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.billingId);
  },
});
