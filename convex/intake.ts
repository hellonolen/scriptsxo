// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAnyCap, CAP } from "./lib/capabilities";

export const create = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    email: v.string(),
    patientId: v.optional(v.id("patients")),
    chiefComplaint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.callerId, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    const now = Date.now();
    return await ctx.db.insert("intakes", {
      email: args.email.toLowerCase(),
      patientId: args.patientId,
      status: "draft",
      medicalHistory: undefined,
      currentSymptoms: undefined,
      medications: undefined,
      allergies: undefined,
      chiefComplaint: args.chiefComplaint,
      symptomDuration: undefined,
      severityLevel: undefined,
      vitalSigns: undefined,
      idVerified: false,
      consentGiven: false,
      completedSteps: [],
      triageResult: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStep = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    intakeId: v.id("intakes"),
    stepName: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.callerId, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
      status: "in_progress",
    };

    // Map step name to field
    const stepFieldMap: Record<string, string> = {
      medical_history: "medicalHistory",
      symptoms: "currentSymptoms",
      medications: "medications",
      allergies: "allergies",
      chief_complaint: "chiefComplaint",
      symptom_duration: "symptomDuration",
      severity: "severityLevel",
      vitals: "vitalSigns",
      id_verification: "idVerified",
      consent: "consentGiven",
    };

    const fieldName = stepFieldMap[args.stepName];
    if (fieldName) {
      updates[fieldName] = args.data;
    }

    // Track completed steps
    const completedSteps = [...intake.completedSteps];
    if (!completedSteps.includes(args.stepName)) {
      completedSteps.push(args.stepName);
    }
    updates.completedSteps = completedSteps;

    await ctx.db.patch(args.intakeId, updates);
    return { success: true, completedSteps };
  },
});

export const complete = mutation({
  args: {
    callerId: v.optional(v.id("members")),
    intakeId: v.id("intakes"),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.callerId, [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW]);
    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");

    if (!intake.consentGiven) {
      throw new Error("Patient consent is required to complete intake");
    }

    await ctx.db.patch(args.intakeId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("intakes")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { intakeId: v.id("intakes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.intakeId);
  },
});

export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("intakes")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const getLatestByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("intakes")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .order("desc")
      .first();
  },
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("intakes")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});
