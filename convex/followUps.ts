// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCap, CAP } from "./lib/capabilities";

export const create = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    consultationId: v.id("consultations"),
    patientId: v.id("patients"),
    providerId: v.optional(v.id("providers")),
    type: v.string(),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.CONSULT_START);
    return await ctx.db.insert("followUps", {
      ...args,
      status: "scheduled",
      sentAt: undefined,
      respondedAt: undefined,
      patientResponse: undefined,
      providerNotes: undefined,
      sideEffects: undefined,
      satisfactionRating: undefined,
      escalated: false,
      createdAt: Date.now(),
    });
  },
});

export const send = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    followUpId: v.id("followUps"),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.CONSULT_START);
    await ctx.db.patch(args.followUpId, {
      status: "sent",
      sentAt: Date.now(),
    });
    return { success: true };
  },
});

export const recordResponse = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    followUpId: v.id("followUps"),
    patientResponse: v.string(),
    sideEffects: v.optional(v.array(v.string())),
    satisfactionRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.CONSULT_JOIN);
    await ctx.db.patch(args.followUpId, {
      status: "responded",
      respondedAt: Date.now(),
      patientResponse: args.patientResponse,
      sideEffects: args.sideEffects,
      satisfactionRating: args.satisfactionRating,
    });
    return { success: true };
  },
});

export const review = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    followUpId: v.id("followUps"),
    providerNotes: v.string(),
    escalate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.CONSULT_START);
    const status = args.escalate ? "escalated" : "reviewed";
    await ctx.db.patch(args.followUpId, {
      status,
      providerNotes: args.providerNotes,
      escalated: args.escalate || false,
    });
    return { success: true };
  },
});

export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("followUps")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const getByConsultation = query({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("followUps")
      .withIndex("by_consultationId", (q) => q.eq("consultationId", args.consultationId))
      .collect();
  },
});

export const getPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("followUps")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();
  },
});

export const getDue = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const scheduled = await ctx.db
      .query("followUps")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();

    return scheduled.filter((f) => f.scheduledFor <= now);
  },
});

export const getEscalated = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("followUps")
      .withIndex("by_status", (q) => q.eq("status", "escalated"))
      .collect();
  },
});
