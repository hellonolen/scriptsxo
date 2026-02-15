// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    providerId: v.id("providers"),
    intakeId: v.optional(v.id("intakes")),
    triageId: v.optional(v.id("triageAssessments")),
    type: v.string(),
    scheduledAt: v.number(),
    patientState: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("consultations", {
      ...args,
      status: "scheduled",
      startedAt: undefined,
      endedAt: undefined,
      duration: undefined,
      roomUrl: undefined,
      roomToken: undefined,
      notes: undefined,
      diagnosis: undefined,
      diagnosisCodes: undefined,
      treatmentPlan: undefined,
      followUpRequired: false,
      followUpDate: undefined,
      aiSummary: undefined,
      aiSuggestedQuestions: undefined,
      recording: undefined,
      paymentStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const schedule = mutation({
  args: {
    consultationId: v.id("consultations"),
    scheduledAt: v.number(),
    roomUrl: v.optional(v.string()),
    roomToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.consultationId, {
      scheduledAt: args.scheduledAt,
      roomUrl: args.roomUrl,
      roomToken: args.roomToken,
      status: "scheduled",
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const start = mutation({
  args: {
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.consultationId, {
      status: "in_progress",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Increment provider queue
    const consultation = await ctx.db.get(args.consultationId);
    if (consultation) {
      const provider = await ctx.db.get(consultation.providerId);
      if (provider) {
        await ctx.db.patch(provider._id, {
          currentQueueSize: provider.currentQueueSize + 1,
        });
      }
    }

    return { success: true };
  },
});

export const complete = mutation({
  args: {
    consultationId: v.id("consultations"),
    notes: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    diagnosisCodes: v.optional(v.array(v.string())),
    treatmentPlan: v.optional(v.string()),
    followUpRequired: v.optional(v.boolean()),
    followUpDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation) throw new Error("Consultation not found");

    const duration = consultation.startedAt
      ? Math.round((now - consultation.startedAt) / 60000)
      : undefined;

    await ctx.db.patch(args.consultationId, {
      status: "completed",
      endedAt: now,
      duration,
      notes: args.notes,
      diagnosis: args.diagnosis,
      diagnosisCodes: args.diagnosisCodes,
      treatmentPlan: args.treatmentPlan,
      followUpRequired: args.followUpRequired ?? false,
      followUpDate: args.followUpDate,
      updatedAt: now,
    });

    // Update provider stats
    const provider = await ctx.db.get(consultation.providerId);
    if (provider) {
      await ctx.db.patch(provider._id, {
        currentQueueSize: Math.max(0, provider.currentQueueSize - 1),
        totalConsultations: provider.totalConsultations + 1,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const cancel = mutation({
  args: {
    consultationId: v.id("consultations"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.consultationId, {
      status: "cancelled",
      notes: args.reason,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("consultations")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const getByProvider = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("consultations")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .order("desc")
      .collect();
  },
});

export const getQueue = query({
  args: {
    providerId: v.optional(v.id("providers")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("consultations");

    if (args.status) {
      q = q.withIndex("by_status", (idx) => idx.eq("status", args.status!));
    }

    const results = await q.order("asc").collect();

    if (args.providerId) {
      return results.filter((c) => c.providerId === args.providerId);
    }

    return results;
  },
});

/**
 * Get consultation queue for a provider by their email.
 * Used by the provider dashboard hook.
 */
export const getProviderQueue = query({
  args: { providerEmail: v.string() },
  handler: async (ctx, args) => {
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_email", (q) => q.eq("email", args.providerEmail.toLowerCase()))
      .first();

    if (!provider) return [];

    return await ctx.db
      .query("consultations")
      .withIndex("by_providerId", (q) => q.eq("providerId", provider._id))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.consultationId);
  },
});

/**
 * Create a consultation from a completed intake.
 * Assigns a provider and links the intake + optional recording.
 */
export const createFromIntake = mutation({
  args: {
    intakeId: v.id("intakes"),
    patientId: v.id("patients"),
    recording: v.optional(v.string()),
    patientState: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get available providers for the patient's state
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const stateProviders = providers.filter(
      (p) => p.licensedStates.includes(args.patientState) && p.acceptingPatients
    );

    if (stateProviders.length === 0) {
      throw new Error(
        `No active providers licensed in ${args.patientState}. Please contact support.`
      );
    }

    // Pick provider with lowest queue
    const sorted = [...stateProviders].sort(
      (a, b) => a.currentQueueSize - b.currentQueueSize
    );
    const provider = sorted[0];

    const consultationId = await ctx.db.insert("consultations", {
      patientId: args.patientId,
      providerId: provider._id,
      intakeId: args.intakeId,
      triageId: undefined,
      type: "video",
      status: "in_progress",
      scheduledAt: now,
      startedAt: now,
      endedAt: undefined,
      duration: undefined,
      roomUrl: undefined,
      roomToken: undefined,
      notes: undefined,
      diagnosis: undefined,
      diagnosisCodes: undefined,
      treatmentPlan: undefined,
      followUpRequired: false,
      followUpDate: undefined,
      aiSummary: undefined,
      aiSuggestedQuestions: undefined,
      recording: args.recording,
      patientState: args.patientState,
      cost: provider.consultationRate,
      paymentStatus: "paid",
      createdAt: now,
      updatedAt: now,
    });

    // Increment provider queue
    await ctx.db.patch(provider._id, {
      currentQueueSize: provider.currentQueueSize + 1,
    });

    return { consultationId, providerId: provider._id };
  },
});
