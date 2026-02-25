"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { requireCap, CAP } from "../lib/capabilities";

export const assign = action({
  args: {
    patientState: v.string(),
    callerId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ providerId: string }> => {
    await requireCap(ctx, args.callerId, CAP.PROVIDER_MANAGE);
    // Get active providers licensed in patient's state
    const providers = await ctx.runQuery(api.providers.getByState, {
      state: args.patientState,
    });

    if (!providers || providers.length === 0) {
      throw new Error(
        `No active providers licensed in ${args.patientState}. Please contact support.`
      );
    }

    // Select provider with lowest current queue size (least loaded)
    const sorted = [...providers].sort(
      (a, b) => a.currentQueueSize - b.currentQueueSize
    );
    const selected = sorted[0];

    // Increment their queue size
    await ctx.runMutation(api.providers.incrementQueue, {
      providerId: selected._id,
    });

    return { providerId: selected._id as string };
  },
});
