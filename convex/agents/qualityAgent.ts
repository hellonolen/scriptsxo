// @ts-nocheck
/**
 * QUALITY AGENT
 * Consultation quality scoring, prescribing pattern analysis, and compliance audit.
 * Ensures clinical standards and regulatory compliance across the platform.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a clinical quality and compliance auditor for ScriptsXO. Your role is to:

1. Score consultation quality (documentation, clinical reasoning, patient communication)
2. Analyze prescribing patterns for safety signals
3. Audit compliance with telehealth regulations
4. Detect anomalies (over-prescribing, pill mill patterns, inappropriate care)
5. Generate quality improvement recommendations
6. Track provider performance metrics

QUALITY DIMENSIONS:
- Documentation completeness (HPI, ROS, exam, assessment, plan)
- Clinical decision-making (appropriate workup, evidence-based treatment)
- Patient communication (informed consent, education, shared decision-making)
- Follow-up planning (appropriate follow-up interval, contingency plan)
- Compliance (HIPAA, state regulations, prescribing rules)

RED FLAGS:
- Controlled substance prescribing without documented indication
- Consultation duration < 5 minutes for new patients
- No documented allergies or medication review
- Prescribing without adequate history
- Same controlled substance to multiple patients in cluster

SCORING:
- 90-100: Excellent (meets all quality standards)
- 70-89: Satisfactory (minor improvements needed)
- 50-69: Needs Improvement (significant gaps)
- Below 50: Critical (immediate review required)

RULES:
- Be objective and evidence-based
- Reference specific clinical guidelines
- Protect patient safety above all
- Output structured JSON: qualityScore, dimensions, findings, redFlags, recommendations

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    auditType: v.string(),
    consultationId: v.optional(v.string()),
    providerId: v.optional(v.string()),
    consultationNotes: v.optional(v.string()),
    prescriptionsWritten: v.optional(v.string()),
    consultationDuration: v.optional(v.number()),
    patientOutcome: v.optional(v.string()),
    historicalData: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Audit Type: ${args.auditType}`,
      args.consultationId && `Consultation ID: ${args.consultationId}`,
      args.providerId && `Provider ID: ${args.providerId}`,
      args.consultationNotes && `Consultation Notes: ${args.consultationNotes}`,
      args.prescriptionsWritten && `Prescriptions Written: ${args.prescriptionsWritten}`,
      args.consultationDuration !== undefined && `Duration: ${args.consultationDuration} minutes`,
      args.patientOutcome && `Patient Outcome: ${args.patientOutcome}`,
      args.historicalData && `Historical Data: ${args.historicalData}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Run quality audit:\n\n${userMessage}` },
      ],
      temperature: 0.2,
      maxTokens: 1536,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        qualityScore: 0,
        dimensions: {},
        findings: [],
        redFlags: [],
        recommendations: [llmResult.content],
        raw: llmResult.content,
      };
    }
  },
});
