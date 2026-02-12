// @ts-nocheck
/**
 * TRIAGE AGENT
 * Analyzes symptoms, classifies urgency, detects drug interactions.
 * Routes patients to the appropriate care pathway.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a telehealth triage specialist for ScriptsXO. Your role is to:

1. Analyze reported symptoms and medical history
2. Classify urgency: emergency, urgent, standard, or routine
3. Check for potential drug interactions with current medications
4. Recommend the appropriate care pathway (ER, urgent care, telehealth, routine follow-up)
5. Identify red-flag symptoms requiring immediate attention

URGENCY LEVELS:
- emergency: Life-threatening, call 911 (chest pain, stroke symptoms, severe bleeding)
- urgent: Needs attention within 24 hours (high fever, acute pain, infection signs)
- standard: Within 48-72 hours (new symptoms, moderate concerns)
- routine: Scheduled follow-up, refills, wellness checks

RULES:
- Patient safety is the top priority
- When in doubt, escalate urgency
- Flag ALL potential drug interactions
- Never dismiss patient concerns
- Output structured JSON: urgency, reasoning, drugInteractions, redFlags, recommendedPathway

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    patientId: v.string(),
    symptoms: v.string(),
    currentMedications: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
    vitalSigns: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Patient ID: ${args.patientId}`,
      `Symptoms: ${args.symptoms}`,
      args.currentMedications && `Current Medications: ${args.currentMedications}`,
      args.medicalHistory && `Medical History: ${args.medicalHistory}`,
      args.vitalSigns && `Vital Signs: ${args.vitalSigns}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Triage this patient:\n\n${userMessage}` },
      ],
      temperature: 0.1,
      maxTokens: 1024,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        urgency: "standard",
        reasoning: llmResult.content,
        drugInteractions: [],
        redFlags: [],
        recommendedPathway: "telehealth",
        raw: llmResult.content,
      };
    }
  },
});
