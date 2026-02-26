// @ts-nocheck
/**
 * AGENT CONDUCTOR
 * Orchestrates agent tasks - routes work to the appropriate agent.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { requireCap } from "../lib/serverAuth";
import { CAP } from "../lib/capabilities";

export const dispatch = action({
  args: {
    agentName: v.string(),
    action: v.string(),
    input: v.any(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.VIEW_DASHBOARD);
    const startTime = Date.now();

    try {
      let result: unknown;

      switch (args.agentName) {
        case "intake":
          result = await ctx.runAction(api.agents.intakeAgent.run, args.input);
          break;
        case "triage":
          result = await ctx.runAction(api.agents.triageAgent.run, args.input);
          break;
        case "scheduling":
          result = await ctx.runAction(
            api.agents.schedulingAgent.run,
            args.input
          );
          break;
        case "compliance":
          result = await ctx.runAction(
            api.agents.complianceAgent.run,
            args.input
          );
          break;
        case "consultation":
          result = await ctx.runAction(
            api.agents.consultationAgent.run,
            args.input
          );
          break;
        case "prescription":
          result = await ctx.runAction(
            api.agents.prescriptionAgent.run,
            args.input
          );
          break;
        case "pharmacy":
          result = await ctx.runAction(
            api.agents.pharmacyAgent.run,
            args.input
          );
          break;
        case "followUp":
          result = await ctx.runAction(
            api.agents.followUpAgent.run,
            args.input
          );
          break;
        case "billing":
          result = await ctx.runAction(
            api.agents.billingAgent.run,
            args.input
          );
          break;
        case "quality":
          result = await ctx.runAction(
            api.agents.qualityAgent.run,
            args.input
          );
          break;
        case "credentialVerification":
          // Route to credential verification agent
          result = await ctx.runAction(
            api.agents.credentialVerificationAgent[args.input.method || "verifyProviderNpi"],
            args.input.params || {}
          );
          break;
        case "composio":
          // Route to Composio for external service integrations
          result = await ctx.runAction(api.integrations.composio.execute, {
            toolkit: args.input.toolkit,
            actionName: args.input.actionName,
            params: args.input.params || {},
            userId: args.input.userId,
          });
          break;
        default:
          throw new Error(`Unknown agent: ${args.agentName}`);
      }

      const durationMs = Date.now() - startTime;

      await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
        agentName: args.agentName,
        action: args.action,
        input: args.input,
        output: result,
        success: true,
        durationMs,
      });

      return { success: true, data: result, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
        agentName: args.agentName,
        action: args.action,
        input: args.input,
        success: false,
        errorMessage,
        durationMs,
      });

      return { success: false, error: errorMessage, durationMs };
    }
  },
});
