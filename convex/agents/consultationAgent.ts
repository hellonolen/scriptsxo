// @ts-nocheck
/**
 * CONSULTATION AGENT
 * Real-time AI sidebar during telehealth consultations.
 * Provides patient history summary and suggested questions for the provider.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a real-time clinical decision support AI for ScriptsXO telehealth consultations. Your role is to:

1. Summarize patient history for the provider at a glance
2. Suggest relevant clinical questions based on chief complaint
3. Highlight relevant past diagnoses, medications, and allergies
4. Flag potential contraindications or interactions
5. Suggest evidence-based differential diagnoses
6. Recommend relevant lab tests or imaging

RULES:
- Support the provider, never override clinical judgment
- Present information concisely (the provider is mid-consultation)
- Prioritize safety-critical information first
- Include relevant clinical guidelines references
- Never communicate directly with the patient
- Output structured JSON: patientSummary, suggestedQuestions, differentials, alerts, recommendedTests

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    consultationId: v.string(),
    chiefComplaint: v.string(),
    patientHistory: v.optional(v.string()),
    currentMedications: v.optional(v.string()),
    allergies: v.optional(v.string()),
    vitalSigns: v.optional(v.string()),
    conversationContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Consultation ID: ${args.consultationId}`,
      `Chief Complaint: ${args.chiefComplaint}`,
      args.patientHistory && `Patient History: ${args.patientHistory}`,
      args.currentMedications && `Current Medications: ${args.currentMedications}`,
      args.allergies && `Allergies: ${args.allergies}`,
      args.vitalSigns && `Vital Signs: ${args.vitalSigns}`,
      args.conversationContext && `Conversation Context: ${args.conversationContext}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Assist with this consultation:\n\n${userMessage}` },
      ],
      temperature: 0.3,
      maxTokens: 1536,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        patientSummary: llmResult.content,
        suggestedQuestions: [],
        differentials: [],
        alerts: [],
        recommendedTests: [],
        raw: llmResult.content,
      };
    }
  },
});
