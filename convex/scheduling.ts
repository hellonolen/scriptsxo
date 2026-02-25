// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAnyCap, CAP } from "./lib/capabilities";

/**
 * Match a patient to an available provider based on state licensing and availability.
 */
export const matchProvider = query({
  args: {
    patientState: v.string(),
    specialty: v.optional(v.string()),
    preferredType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const eligible = providers.filter((p) => {
      if (!p.acceptingPatients) return false;
      if (!p.licensedStates.includes(args.patientState)) return false;
      if (p.currentQueueSize >= p.maxDailyConsultations) return false;
      if (args.specialty && !p.specialties.includes(args.specialty)) return false;
      return true;
    });

    // Sort by queue size (least busy first), then by rating
    eligible.sort((a, b) => {
      if (a.currentQueueSize !== b.currentQueueSize) {
        return a.currentQueueSize - b.currentQueueSize;
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    return eligible.map((p) => ({
      providerId: p._id,
      name: `${p.title} ${p.firstName} ${p.lastName}`,
      specialties: p.specialties,
      consultationRate: p.consultationRate,
      currentQueueSize: p.currentQueueSize,
      rating: p.rating,
    }));
  },
});

/**
 * Book a consultation - creates the consultation record.
 */
export const bookConsultation = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    patientId: v.id("patients"),
    providerId: v.id("providers"),
    intakeId: v.optional(v.id("intakes")),
    triageId: v.optional(v.id("triageAssessments")),
    type: v.string(),
    scheduledAt: v.number(),
    patientState: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.callerId, [CAP.CONSULT_JOIN, CAP.CONSULT_START]);
    const provider = await ctx.db.get(args.providerId);
    if (!provider) throw new Error("Provider not found");

    if (!provider.acceptingPatients) {
      throw new Error("Provider is not currently accepting patients");
    }

    if (!provider.licensedStates.includes(args.patientState)) {
      throw new Error("Provider is not licensed in the patient's state");
    }

    const now = Date.now();
    const consultationId = await ctx.db.insert("consultations", {
      patientId: args.patientId,
      providerId: args.providerId,
      intakeId: args.intakeId,
      triageId: args.triageId,
      type: args.type,
      status: "scheduled",
      scheduledAt: args.scheduledAt,
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
      patientState: args.patientState,
      cost: provider.consultationRate,
      paymentStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, consultationId };
  },
});

/**
 * Get available time slots for a provider on a given date.
 */
export const getAvailableSlots = query({
  args: {
    providerId: v.id("providers"),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return [];

    // Get existing consultations for the day
    const dayStart = new Date(args.date).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const existingConsultations = await ctx.db
      .query("consultations")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .collect();

    const dayConsultations = existingConsultations.filter(
      (c) =>
        c.scheduledAt >= dayStart &&
        c.scheduledAt < dayEnd &&
        c.status !== "cancelled"
    );

    const bookedTimes = new Set(dayConsultations.map((c) => c.scheduledAt));

    // Generate 30-minute slots from 8am to 5pm
    const slots: Array<{ time: number; available: boolean }> = [];
    const startHour = 8;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      for (const minute of [0, 30]) {
        const slotDate = new Date(args.date);
        slotDate.setHours(hour, minute, 0, 0);
        const slotTime = slotDate.getTime();

        slots.push({
          time: slotTime,
          available: !bookedTimes.has(slotTime),
        });
      }
    }

    // Filter to only available slots if provider has hit daily max
    if (dayConsultations.length >= provider.maxDailyConsultations) {
      return slots.map((s) => ({ ...s, available: false }));
    }

    return slots;
  },
});
