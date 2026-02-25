// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCap, CAP } from "./lib/capabilities";

export const createAssessment = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    intakeId: v.id("intakes"),
    patientId: v.optional(v.id("patients")),
    urgencyLevel: v.string(),
    urgencyScore: v.number(),
    recommendedAction: v.string(),
    suggestedSpecialty: v.optional(v.string()),
    redFlags: v.array(v.string()),
    differentialDiagnoses: v.optional(v.array(v.string())),
    drugInteractions: v.optional(v.array(v.any())),
    aiConfidenceScore: v.number(),
    aiReasoning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.INTAKE_REVIEW);
    const id = await ctx.db.insert("triageAssessments", {
      ...args,
      reviewedByProvider: false,
      createdAt: Date.now(),
    });

    // Update the intake with triage result
    await ctx.db.patch(args.intakeId, {
      triageResult: {
        urgencyLevel: args.urgencyLevel,
        urgencyScore: args.urgencyScore,
        recommendedAction: args.recommendedAction,
      },
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const getByIntake = query({
  args: { intakeId: v.id("intakes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("triageAssessments")
      .withIndex("by_intakeId", (q) => q.eq("intakeId", args.intakeId))
      .first();
  },
});

export const markReviewed = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    triageId: v.id("triageAssessments"),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.INTAKE_REVIEW);
    await ctx.db.patch(args.triageId, { reviewedByProvider: true });
    return { success: true };
  },
});

export const getByUrgency = query({
  args: { urgencyLevel: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("triageAssessments")
      .withIndex("by_urgencyLevel", (q) => q.eq("urgencyLevel", args.urgencyLevel))
      .order("desc")
      .collect();
  },
});

export const getPendingReview = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("triageAssessments").order("desc").collect();
    return all.filter((t) => !t.reviewedByProvider);
  },
});
