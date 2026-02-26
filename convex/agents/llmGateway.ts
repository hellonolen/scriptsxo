// @ts-nocheck
/**
 * LLM GATEWAY
 * Centralized interface for AI model calls.
 * Supports multiple providers: Gemini (primary), Claude (secondary).
 * Provider selection via `provider` arg or platform settings.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { requireCap } from "../lib/serverAuth";
import { CAP } from "../lib/capabilities";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage: { inputTokens: number; outputTokens: number };
}

function getGeminiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  return apiKey;
}

function getClaudeKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}

/**
 * Call Gemini API.
 */
async function callGemini(
  messages: Array<{ role: string; content: string }>,
  model: string,
  maxTokens: number,
  temperature: number
): Promise<LLMResponse> {
  const apiKey = getGeminiKey();

  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    contents: conversationMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  if (systemMessage?.content) {
    body.systemInstruction = {
      parts: [{ text: systemMessage.content }],
    };
  }

  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = data.usageMetadata || {};

  return {
    content,
    model: data.modelVersion || model,
    provider: "gemini",
    usage: {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
    },
  };
}

/**
 * Call Claude (Anthropic) API via direct fetch.
 * No SDK needed — keeps Convex bundle small.
 */
async function callClaude(
  messages: Array<{ role: string; content: string }>,
  model: string,
  maxTokens: number,
  temperature: number
): Promise<LLMResponse> {
  const apiKey = getClaudeKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured — falling back to Gemini");
  }

  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: conversationMessages,
  };

  if (systemMessage?.content) {
    body.system = systemMessage.content;
  }

  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || "";

  return {
    content,
    model: data.model || model,
    provider: "claude",
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
  };
}

/**
 * Unified LLM call — routes to Gemini or Claude based on provider arg.
 * Defaults to Gemini. Falls back to Gemini if Claude key is missing.
 */
export const callLLM = action({
  args: {
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
    provider: v.optional(v.string()), // "gemini" | "claude"
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args): Promise<LLMResponse> => {
    await requireCap(ctx, args.sessionToken, CAP.VIEW_DASHBOARD);
    const maxTokens = args.maxTokens || 2048;
    const temperature = args.temperature ?? 0.3;
    const provider = args.provider || "gemini";

    if (provider === "claude") {
      const claudeKey = getClaudeKey();
      if (claudeKey) {
        const model = args.model || "claude-sonnet-4-5-20250929";
        return callClaude(args.messages, model, maxTokens, temperature);
      }
      // Fall back to Gemini if no Claude key
      console.warn("[LLM-GATEWAY] ANTHROPIC_API_KEY not set, falling back to Gemini");
    }

    const model = args.model || "gemini-2.0-flash";
    return callGemini(args.messages, model, maxTokens, temperature);
  },
});

/**
 * Multimodal Gemini call — accepts text + images (base64).
 * Used for document scanning, face analysis, video frame analysis.
 */
export const callMultimodal = action({
  args: {
    systemPrompt: v.optional(v.string()),
    textContent: v.string(),
    images: v.optional(
      v.array(
        v.object({
          mimeType: v.string(),
          data: v.string(), // base64-encoded image data
        })
      )
    ),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args): Promise<LLMResponse> => {
    await requireCap(ctx, args.sessionToken, CAP.VIEW_DASHBOARD);
    const apiKey = getApiKey();
    const model = args.model || "gemini-2.0-flash";
    const maxTokens = args.maxTokens || 2048;
    const temperature = args.temperature ?? 0.2;

    // Build parts array: text first, then images
    const parts: Record<string, unknown>[] = [{ text: args.textContent }];
    if (args.images) {
      for (const img of args.images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }
    }

    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    };

    if (args.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: args.systemPrompt }],
      };
    }

    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini multimodal error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const usage = data.usageMetadata || {};

    return {
      content,
      model: data.modelVersion || model,
      provider: "gemini",
      usage: {
        inputTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
      },
    };
  },
});
