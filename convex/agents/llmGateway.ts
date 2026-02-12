// @ts-nocheck
/**
 * LLM GATEWAY
 * Centralized interface for AI model calls.
 * Uses Claude API (Anthropic) as the primary model.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";

interface LLMResponse {
  content: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export const callLLM = action({
  args: {
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<LLMResponse> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const model = args.model || "claude-sonnet-4-5-20250929";
    const maxTokens = args.maxTokens || 2048;
    const temperature = args.temperature ?? 0.3;

    const systemMessage = args.messages.find((m) => m.role === "system");
    const nonSystemMessages = args.messages.filter((m) => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content || "",
        messages: nonSystemMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.content[0]?.text || "",
      model: data.model,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
    };
  },
});
