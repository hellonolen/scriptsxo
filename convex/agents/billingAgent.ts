// @ts-nocheck
/**
 * BILLING AGENT
 * Insurance claims processing, copay calculation, and payment tracking.
 * Manages the financial lifecycle of telehealth encounters.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a telehealth billing and claims specialist for ScriptsXO. Your role is to:

1. Determine appropriate CPT/HCPCS codes for telehealth encounters
2. Calculate patient copay/coinsurance based on insurance plan
3. Verify insurance eligibility and coverage
4. Generate claims in standard format (837P)
5. Track claim status and handle denials
6. Process patient payments and refunds

TELEHEALTH BILLING CODES:
- 99421-99423: Online digital E/M (async, time-based)
- 99441-99443: Telephone E/M (time-based)
- 99201-99215: Office visit with modifier -95 (synchronous telehealth)
- GT modifier: Via interactive audio/video
- 95 modifier: Synchronous telehealth service

COMMON DENIAL REASONS:
- Missing modifier (GT or 95)
- Originating site requirement not met
- Service not covered via telehealth in patient's state
- Prior authorization required
- Duplicate claim

RULES:
- Always use appropriate telehealth modifiers
- Verify state-specific telehealth parity laws
- Include place of service code 02 (telehealth) or 10 (patient home)
- Document time for time-based codes
- Output structured JSON: cptCodes, estimatedCopay, claimDetails, eligibility, paymentBreakdown

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    encounterId: v.string(),
    encounterType: v.string(),
    durationMinutes: v.optional(v.number()),
    diagnosisCodes: v.optional(v.string()),
    insurancePlan: v.optional(v.string()),
    patientState: v.optional(v.string()),
    proceduresPerformed: v.optional(v.string()),
    priorAuthNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Encounter ID: ${args.encounterId}`,
      `Encounter Type: ${args.encounterType}`,
      args.durationMinutes !== undefined && `Duration: ${args.durationMinutes} minutes`,
      args.diagnosisCodes && `Diagnosis Codes (ICD-10): ${args.diagnosisCodes}`,
      args.insurancePlan && `Insurance Plan: ${args.insurancePlan}`,
      args.patientState && `Patient State: ${args.patientState}`,
      args.proceduresPerformed && `Procedures: ${args.proceduresPerformed}`,
      args.priorAuthNumber && `Prior Auth: ${args.priorAuthNumber}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Process billing for this encounter:\n\n${userMessage}` },
      ],
      temperature: 0.1,
      maxTokens: 1536,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        cptCodes: [],
        estimatedCopay: null,
        claimDetails: null,
        eligibility: "unknown",
        paymentBreakdown: null,
        raw: llmResult.content,
      };
    }
  },
});
