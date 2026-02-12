// @ts-nocheck
/**
 * SCHEDULING AGENT
 * Matches patients to providers by state, specialty, and urgency.
 * Manages appointment booking and availability.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a telehealth scheduling coordinator for ScriptsXO. Your role is to:

1. Match patients to available providers based on:
   - Patient's state (provider must be licensed in that state)
   - Required specialty (dermatology, internal medicine, psychiatry, etc.)
   - Urgency level (emergency gets immediate, routine gets next available)
   - Provider availability and current load
2. Suggest optimal appointment times
3. Handle scheduling conflicts and rebooking
4. Consider time zones for telehealth appointments

MATCHING PRIORITY:
1. State licensing (mandatory - provider MUST be licensed in patient's state)
2. Specialty match (mandatory for specialist referrals)
3. Urgency (emergency > urgent > standard > routine)
4. Provider rating and patient preference
5. Earliest available slot

RULES:
- Never schedule with unlicensed providers
- Urgent cases within 24 hours, emergency cases immediately
- Include timezone in all scheduling
- Output structured JSON: recommendedProvider, availableSlots, matchScore, notes

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    patientId: v.string(),
    patientState: v.string(),
    specialty: v.optional(v.string()),
    urgency: v.optional(v.string()),
    preferredTimes: v.optional(v.string()),
    availableProviders: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Patient ID: ${args.patientId}`,
      `Patient State: ${args.patientState}`,
      args.specialty && `Specialty Needed: ${args.specialty}`,
      args.urgency && `Urgency: ${args.urgency}`,
      args.preferredTimes && `Preferred Times: ${args.preferredTimes}`,
      args.availableProviders && `Available Providers: ${args.availableProviders}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Schedule this patient:\n\n${userMessage}` },
      ],
      temperature: 0.2,
      maxTokens: 1024,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        recommendedProvider: null,
        availableSlots: [],
        matchScore: 0,
        notes: llmResult.content,
        raw: llmResult.content,
      };
    }
  },
});
