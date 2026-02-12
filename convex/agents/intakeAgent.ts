// @ts-nocheck
/**
 * INTAKE AGENT
 * Guides patient through medical history collection.
 * Validates completeness of intake forms before proceeding.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a telehealth intake specialist for ScriptsXO. Your role is to:

1. Guide patients through medical history collection
2. Ask about current medications, allergies, and chronic conditions
3. Collect demographic and insurance information
4. Validate that all required fields are complete
5. Flag any contraindications or high-risk factors

RULES:
- Be warm, professional, and HIPAA-compliant
- Never diagnose or recommend treatment
- Flag incomplete or inconsistent information
- Prioritize patient safety signals (suicidal ideation, abuse, emergencies)
- Output structured JSON with fields: completeness (0-100), missingFields, riskFlags, summary

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    patientId: v.string(),
    medicalHistory: v.optional(v.string()),
    currentMedications: v.optional(v.string()),
    allergies: v.optional(v.string()),
    chiefComplaint: v.optional(v.string()),
    demographics: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Patient ID: ${args.patientId}`,
      args.chiefComplaint && `Chief Complaint: ${args.chiefComplaint}`,
      args.medicalHistory && `Medical History: ${args.medicalHistory}`,
      args.currentMedications && `Current Medications: ${args.currentMedications}`,
      args.allergies && `Allergies: ${args.allergies}`,
      args.demographics && `Demographics: ${args.demographics}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Evaluate this patient intake:\n\n${userMessage}` },
      ],
      temperature: 0.2,
      maxTokens: 1024,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        completeness: 0,
        missingFields: ["Unable to parse response"],
        riskFlags: [],
        summary: llmResult.content,
        raw: llmResult.content,
      };
    }
  },
});
