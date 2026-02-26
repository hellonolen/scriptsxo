// @ts-nocheck
import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireCap, requireAnyCap, requireCapQuery } from "./lib/serverAuth";
import { CAP } from "./lib/capabilities";
import { logSecurityEvent } from "./lib/securityAudit";

export const createRecord = mutation({
  args: {
    sessionToken: v.string(),
    patientId: v.id("patients"),
    consultationId: v.optional(v.id("consultations")),
    type: v.string(),
    amount: v.number(),
    insuranceAmount: v.optional(v.number()),
    copay: v.optional(v.number()),
    cptCodes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { sessionToken, ...data } = args;
    await requireAnyCap(ctx, sessionToken, [CAP.REPORT_VIEW, CAP.SETTINGS_MANAGE]);
    const now = Date.now();
    return await ctx.db.insert("billingRecords", {
      ...data,
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
    sessionToken: v.string(),
    billingId: v.id("billingRecords"),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.SETTINGS_MANAGE);
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
    sessionToken: v.string(),
    billingId: v.id("billingRecords"),
    insuranceClaimId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.SETTINGS_MANAGE);
    await ctx.db.patch(args.billingId, {
      status: "submitted",
      insuranceClaimId: args.insuranceClaimId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Called by Stripe webhook (checkout.session.completed).
 * Idempotent — finds billing record by stripeSessionId or consultationId and marks paid.
 * Internal only — not callable from client.
 */
export const markConsultationPaid = internalMutation({
  args: {
    stripeSessionId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    patientEmail: v.optional(v.string()),
    amountTotal: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Idempotency: check if already processed
    const existing = await ctx.db
      .query("billingRecords")
      .filter((q) => q.eq(q.field("stripePaymentIntentId"), args.stripeSessionId))
      .first();

    if (existing) {
      // Already processed — skip to prevent duplicate
      return { success: true, alreadyProcessed: true };
    }

    // Find billing record by consultationId/patientId if available
    // For now create a new paid record since we may not have a pre-existing one
    // The real billing record may have been created during checkout session creation
    // Try to find by email via patient lookup
    if (args.patientEmail) {
      const patient = await ctx.db
        .query("patients")
        .filter((q) => q.eq(q.field("email"), args.patientEmail!.toLowerCase()))
        .first();

      if (patient) {
        // Find most recent pending billing record for this patient
        const pending = await ctx.db
          .query("billingRecords")
          .withIndex("by_patientId", (q) => q.eq("patientId", patient._id))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .order("desc")
          .first();

        if (pending) {
          await ctx.db.patch(pending._id, {
            status: "paid",
            stripePaymentIntentId: args.stripeSessionId,
            paidAt: now,
            updatedAt: now,
          });
          return { success: true, billingId: pending._id };
        }
      }
    }

    return { success: true, noRecordFound: true };
  },
});

/**
 * Called by Stripe webhook (payment_intent.payment_failed).
 * Marks billing record as failed and logs security event.
 * Internal only.
 */
export const markPaymentFailed = internalMutation({
  args: {
    stripePaymentIntentId: v.string(),
    patientEmail: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Idempotency: check already failed
    const existing = await ctx.db
      .query("billingRecords")
      .filter((q) =>
        q.and(
          q.eq(q.field("stripePaymentIntentId"), args.stripePaymentIntentId),
          q.eq(q.field("status"), "failed")
        )
      )
      .first();

    if (existing) {
      return { success: true, alreadyProcessed: true };
    }

    // Find record by stripePaymentIntentId
    const record = await ctx.db
      .query("billingRecords")
      .filter((q) => q.eq(q.field("stripePaymentIntentId"), args.stripePaymentIntentId))
      .first();

    if (record) {
      await ctx.db.patch(record._id, {
        status: "failed",
        updatedAt: now,
      });
    }

    await logSecurityEvent(ctx, {
      action: "PAYMENT_FAILED",
      targetId: args.patientEmail,
      targetType: "member",
      success: false,
      reason: args.failureMessage || "Stripe payment_intent.payment_failed",
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
