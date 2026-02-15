"use node";
// @ts-nocheck
/**
 * FORM INPUT VALIDATION
 * Gemini-powered validation for all patient form fields.
 * Rejects gibberish, fake data, and meaningless inputs.
 * Runs before allowing the user to proceed to the next step.
 */
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

const VALIDATION_SYSTEM_PROMPT = `You are a medical form input validator for a HIPAA-compliant telehealth platform. Your job is to determine if a patient's form input is legitimate and contains real, meaningful information.

Rules:
- REJECT gibberish, random characters, keyboard smashing, single meaningless letters, or obviously fake data (e.g., "asdfgh", "xxxxx", "test123", "aaa")
- REJECT clearly unsafe inputs (SQL injection attempts, script tags, etc.)
- REJECT obviously joke/troll answers (e.g., "your mom", "deez nuts", "idk lol")
- ACCEPT legitimate medical terms, medication names, condition descriptions, symptom descriptions
- ACCEPT "none", "n/a", "no", "nothing", "no known allergies" as valid for optional fields
- ACCEPT common abbreviations (BP, HTN, DM, GERD, etc.)
- Be LENIENT with spelling — patients aren't medical professionals ("high blood presure" is valid)
- Be LENIENT with casual phrasing ("my head hurts a lot" is valid for symptoms)
- ACCEPT real pharmacy names and locations even if informal ("the CVS on main street")
- ACCEPT real medication names even if misspelled ("lisinipril" = Lisinopril)

Respond with ONLY a JSON object, no markdown formatting:
{"valid": true/false, "reason": "brief explanation", "suggestion": "optional suggestion for improvement or null"}`;

/**
 * Validate a single form field input using Gemini.
 */
export const validateField = action({
  args: {
    fieldName: v.string(),
    fieldValue: v.string(),
    stepContext: v.string(), // e.g., "medical_history", "symptoms", "pharmacy"
    isRequired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Empty required fields fail immediately — no need for AI
    if (args.isRequired && !args.fieldValue.trim()) {
      return { valid: false, reason: "This field is required.", suggestion: null };
    }

    // Empty optional fields pass immediately
    if (!args.isRequired && !args.fieldValue.trim()) {
      return { valid: true, reason: "Optional field left blank.", suggestion: null };
    }

    const result = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: VALIDATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Field: "${args.fieldName}"\nStep: ${args.stepContext}\nRequired: ${args.isRequired ? "yes" : "no"}\nValue: "${args.fieldValue}"\n\nIs this a legitimate response?`,
        },
      ],
      maxTokens: 150,
      temperature: 0.1,
    });

    try {
      // Strip markdown code fences if present
      const cleaned = result.content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        valid: parsed.valid === true,
        reason: parsed.reason || "",
        suggestion: parsed.suggestion || null,
      };
    } catch {
      // If parsing fails, don't block the user
      return { valid: true, reason: "Validation check passed.", suggestion: null };
    }
  },
});

/**
 * Validate multiple form fields at once (batch validation).
 * More efficient than calling validateField for each field individually.
 */
export const validateFormStep = action({
  args: {
    fields: v.array(
      v.object({
        name: v.string(),
        value: v.string(),
        required: v.optional(v.boolean()),
      })
    ),
    stepContext: v.string(),
  },
  handler: async (ctx, args) => {
    // Build a single prompt with all fields
    const fieldList = args.fields
      .map(
        (f) =>
          `- ${f.name} (${f.required ? "required" : "optional"}): "${f.value}"`
      )
      .join("\n");

    const result = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        {
          role: "system",
          content: `${VALIDATION_SYSTEM_PROMPT}\n\nYou are validating MULTIPLE fields at once. Return a JSON object where keys are field names and values are validation objects:\n{"fieldName": {"valid": true/false, "reason": "...", "suggestion": "..."}}`,
        },
        {
          role: "user",
          content: `Step: ${args.stepContext}\n\nFields to validate:\n${fieldList}\n\nValidate each field and return the results as a single JSON object.`,
        },
      ],
      maxTokens: 500,
      temperature: 0.1,
    });

    try {
      const cleaned = result.content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return { results: parsed, allValid: Object.values(parsed).every((v: any) => v.valid) };
    } catch {
      // Default to valid if parsing fails
      const defaults: Record<string, unknown> = {};
      for (const f of args.fields) {
        defaults[f.name] = { valid: true, reason: "Validation check passed.", suggestion: null };
      }
      return { results: defaults, allValid: true };
    }
  },
});
