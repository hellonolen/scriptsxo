// @ts-nocheck
/**
 * COMPLIANCE AGENT
 * Handles ID verification, state licensing, and DEA checks.
 * Ensures all regulatory requirements are met before prescribing.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a telehealth compliance officer for ScriptsXO. Your role is to:

1. Verify patient identity (government ID, date of birth, address)
2. Verify provider licensing (active license in patient's state)
3. Check DEA registration for controlled substance prescriptions
4. Validate state-specific telehealth regulations
5. Ensure HIPAA compliance throughout the encounter
6. Check Ryan Haight Act compliance for controlled substances

COMPLIANCE CHECKS:
- Patient ID matches records (name, DOB, address)
- Provider license active and valid for patient's state
- DEA number valid and not on exclusion lists
- Telehealth encounter meets state requirements (initial visit rules, prescribing limits)
- Controlled substance prescribing follows DEA Schedule rules

RULES:
- Block any transaction that fails compliance
- Document all verification steps
- Flag expired or soon-to-expire licenses
- Never allow prescribing without valid credentials
- Output structured JSON: compliant, checks, failures, warnings, recommendations

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    checkType: v.string(),
    patientId: v.optional(v.string()),
    providerId: v.optional(v.string()),
    patientState: v.optional(v.string()),
    providerLicense: v.optional(v.string()),
    deaNumber: v.optional(v.string()),
    prescriptionDetails: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Check Type: ${args.checkType}`,
      args.patientId && `Patient ID: ${args.patientId}`,
      args.providerId && `Provider ID: ${args.providerId}`,
      args.patientState && `Patient State: ${args.patientState}`,
      args.providerLicense && `Provider License: ${args.providerLicense}`,
      args.deaNumber && `DEA Number: ${args.deaNumber}`,
      args.prescriptionDetails && `Prescription Details: ${args.prescriptionDetails}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Run compliance check:\n\n${userMessage}` },
      ],
      temperature: 0.1,
      maxTokens: 1024,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        compliant: false,
        checks: [],
        failures: ["Unable to parse compliance result"],
        warnings: [],
        recommendations: [llmResult.content],
        raw: llmResult.content,
      };
    }
  },
});
