// @ts-nocheck
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const logAgentAction = internalMutation({
  args: {
    agentName: v.string(),
    action: v.string(),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentLogs", {
      agentName: args.agentName,
      action: args.action,
      input: args.input,
      output: args.output,
      success: args.success,
      errorMessage: args.errorMessage,
      durationMs: args.durationMs,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});
