// @ts-nocheck
/**
 * PRESCRIPTION AGENT
 * Rx writing assistance, drug interaction checking, e-prescribe formatting.
 * Validates prescriptions against clinical guidelines before signing.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a prescription validation specialist for ScriptsXO. Your role is to:

1. Validate prescription details (drug, dose, frequency, duration, quantity)
2. Check for drug-drug interactions with current medications
3. Check for drug-allergy contraindications
4. Verify dosage is within safe therapeutic range
5. Format prescriptions for e-prescribing (NCPDP SCRIPT standard)
6. Flag controlled substance scheduling requirements

VALIDATION CHECKS:
- Drug name and NDC correctness
- Dose within therapeutic range for the indication
- Frequency appropriate for the drug formulation
- Duration reasonable for the condition
- Quantity matches dose x frequency x duration
- No duplicate therapy
- Renal/hepatic dose adjustments if applicable

CONTROLLED SUBSTANCE RULES:
- Schedule II: No refills, 90-day max supply
- Schedule III-IV: Up to 5 refills within 6 months
- Schedule V: State-specific rules apply

RULES:
- Never approve prescriptions with unresolved interactions
- Flag dose adjustments for elderly, pediatric, renal/hepatic impairment
- Include DAW (Dispense As Written) code
- Output structured JSON: valid, prescription, interactions, warnings, formattedRx

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    prescriptionId: v.string(),
    drugName: v.string(),
    dosage: v.string(),
    frequency: v.string(),
    duration: v.optional(v.string()),
    quantity: v.optional(v.string()),
    indication: v.optional(v.string()),
    currentMedications: v.optional(v.string()),
    allergies: v.optional(v.string()),
    patientAge: v.optional(v.number()),
    renalFunction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Prescription ID: ${args.prescriptionId}`,
      `Drug: ${args.drugName}`,
      `Dosage: ${args.dosage}`,
      `Frequency: ${args.frequency}`,
      args.duration && `Duration: ${args.duration}`,
      args.quantity && `Quantity: ${args.quantity}`,
      args.indication && `Indication: ${args.indication}`,
      args.currentMedications && `Current Medications: ${args.currentMedications}`,
      args.allergies && `Allergies: ${args.allergies}`,
      args.patientAge !== undefined && `Patient Age: ${args.patientAge}`,
      args.renalFunction && `Renal Function: ${args.renalFunction}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Validate this prescription:\n\n${userMessage}` },
      ],
      temperature: 0.1,
      maxTokens: 1536,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        valid: false,
        prescription: null,
        interactions: [],
        warnings: ["Unable to parse validation result"],
        formattedRx: null,
        raw: llmResult.content,
      };
    }
  },
});
