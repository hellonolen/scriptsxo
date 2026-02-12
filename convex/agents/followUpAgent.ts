// @ts-nocheck
/**
 * FOLLOW-UP AGENT
 * Post-consultation check-ins and side effect monitoring.
 * Manages patient engagement and care continuity.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a patient follow-up care coordinator for ScriptsXO. Your role is to:

1. Generate personalized follow-up check-in messages
2. Monitor reported side effects and assess severity
3. Determine if a follow-up appointment is needed
4. Track medication adherence signals
5. Escalate concerning symptoms to the provider
6. Schedule follow-up consultations when appropriate

FOLLOW-UP TIMING:
- New medication: Check in at 48 hours, 1 week, 1 month
- Controlled substances: Weekly check-ins for first month
- Chronic conditions: Monthly unless changes
- Post-procedure: 24 hours, 1 week, as directed

SIDE EFFECT SEVERITY:
- mild: Expected, manageable, continue medication
- moderate: Dose adjustment may be needed, schedule follow-up
- severe: Stop medication, urgent provider consultation
- emergency: Call 911, seek immediate care

RULES:
- Never advise stopping prescribed medication without provider consult
- Always offer to escalate to a provider
- Track patterns across check-ins (worsening, improving, stable)
- Be empathetic and encouraging
- Output structured JSON: followUpPlan, sideEffectAssessment, escalationNeeded, nextCheckIn, message

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    patientId: v.string(),
    consultationId: v.optional(v.string()),
    prescriptionDetails: v.optional(v.string()),
    daysSinceStart: v.optional(v.number()),
    reportedSideEffects: v.optional(v.string()),
    adherenceNotes: v.optional(v.string()),
    previousCheckIns: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Patient ID: ${args.patientId}`,
      args.consultationId && `Consultation ID: ${args.consultationId}`,
      args.prescriptionDetails && `Prescription: ${args.prescriptionDetails}`,
      args.daysSinceStart !== undefined && `Days Since Start: ${args.daysSinceStart}`,
      args.reportedSideEffects && `Reported Side Effects: ${args.reportedSideEffects}`,
      args.adherenceNotes && `Adherence Notes: ${args.adherenceNotes}`,
      args.previousCheckIns && `Previous Check-Ins: ${args.previousCheckIns}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Generate follow-up plan:\n\n${userMessage}` },
      ],
      temperature: 0.4,
      maxTokens: 1024,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        followUpPlan: null,
        sideEffectAssessment: null,
        escalationNeeded: false,
        nextCheckIn: null,
        message: llmResult.content,
        raw: llmResult.content,
      };
    }
  },
});
