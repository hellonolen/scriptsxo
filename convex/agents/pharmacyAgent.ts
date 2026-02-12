// @ts-nocheck
/**
 * PHARMACY AGENT
 * Routes prescriptions to pharmacies and tracks fulfillment status.
 * Manages multi-pharmacy sourcing and delivery coordination.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const SYSTEM_PROMPT = `You are a pharmacy routing and fulfillment specialist for ScriptsXO. Your role is to:

1. Route prescriptions to the optimal pharmacy based on:
   - Drug availability and stock
   - Patient location and preference (pickup vs delivery)
   - Pharmacy tier and cost optimization
   - Controlled substance licensing requirements
2. Track fulfillment status through the pipeline
3. Coordinate with multiple pharmacy sources
4. Handle transfer requests between pharmacies
5. Monitor for delays and proactively notify

ROUTING PRIORITY:
1. Drug availability (must be in stock or orderable within SLA)
2. Patient preference (preferred pharmacy, delivery vs pickup)
3. Pharmacy tier (Tier 1 preferred for cost)
4. Geographic proximity for pickup orders
5. Delivery speed for mail-order

FULFILLMENT STATUSES:
- sent: Rx transmitted to pharmacy
- filling: Pharmacy processing
- ready: Ready for pickup/shipping
- picked_up: Patient picked up
- delivered: Shipped and delivered
- cancelled: Order cancelled

RULES:
- Controlled substances require DEA-licensed pharmacy
- Verify pharmacy accepts patient's insurance
- Track fulfillment SLA and escalate delays
- Output structured JSON: selectedPharmacy, routingReason, estimatedReady, status, alternatives

ALWAYS respond with valid JSON only.`;

export const run = action({
  args: {
    prescriptionId: v.string(),
    drugName: v.string(),
    patientLocation: v.optional(v.string()),
    deliveryPreference: v.optional(v.string()),
    availablePharmacies: v.optional(v.string()),
    isControlled: v.optional(v.boolean()),
    insuranceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userMessage = [
      `Prescription ID: ${args.prescriptionId}`,
      `Drug: ${args.drugName}`,
      args.patientLocation && `Patient Location: ${args.patientLocation}`,
      args.deliveryPreference && `Delivery Preference: ${args.deliveryPreference}`,
      args.availablePharmacies && `Available Pharmacies: ${args.availablePharmacies}`,
      args.isControlled !== undefined && `Controlled Substance: ${args.isControlled}`,
      args.insuranceInfo && `Insurance: ${args.insuranceInfo}`,
    ]
      .filter(Boolean)
      .join("\n");

    const llmResult = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Route this prescription:\n\n${userMessage}` },
      ],
      temperature: 0.2,
      maxTokens: 1024,
    });

    try {
      return JSON.parse(llmResult.content);
    } catch {
      return {
        selectedPharmacy: null,
        routingReason: llmResult.content,
        estimatedReady: null,
        status: "pending",
        alternatives: [],
        raw: llmResult.content,
      };
    }
  },
});
