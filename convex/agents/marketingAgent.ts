// @ts-nocheck
/**
 * MARKETING AGENT
 * Generates HIPAA-compliant, conversion-focused marketing content for ScriptsXO.
 * Stores all output in marketingContent table for review before publishing.
 */
import { action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const MARKETING_SKILL = `# Marketing Agent Skill

## Role
You are a healthcare marketing specialist for ScriptsXO, a telehealth prescription platform. Generate compliant, conversion-focused marketing content.

## Content Types
- SEO blog posts (informational, 600-800 words)
- Google Ads copy (headlines 30 chars, descriptions 90 chars)
- Facebook/Instagram ad copy (hook + body + CTA)
- Email subject lines (A/B pairs)
- Landing page headlines

## Compliance Rules
- Never make specific medical claims (use "may help", "can support")
- Never claim to replace emergency care
- Always include: "Telehealth services provided by licensed physicians"
- HIPAA: No patient data in any marketing content
- FDA: No unapproved drug efficacy claims

## Target Audience
- Adults 25-65 managing chronic conditions
- People who have difficulty accessing a physician
- Florida residents (primary market)

## Brand Voice
- Warm, direct, trustworthy
- Not clinical or cold
- Not urgent or fear-based
- Focused on convenience and access`;

// ─── Gemini call (direct, internal agent) ────────────────────

async function callGemini(systemPrompt, userMessage, maxTokens = 2048) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  };

  const url = `${GEMINI_BASE}/gemini-2.0-flash:generateContent?key=${apiKey}`;
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── Internal mutation: store generated content ───────────────

export const storeContent = internalMutation({
  args: {
    type: v.string(),
    topic: v.string(),
    targetKeyword: v.optional(v.string()),
    platform: v.optional(v.string()),
    content: v.string(),
    status: v.string(),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("marketingContent", {
      type: args.type,
      topic: args.topic,
      targetKeyword: args.targetKeyword,
      platform: args.platform,
      content: args.content,
      status: args.status,
      generatedAt: args.generatedAt,
    });
  },
});

// ─── Generate blog post ───────────────────────────────────────

export const generateBlogPost = action({
  args: {
    topic: v.string(),
    targetKeyword: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    const prompt = `Write an SEO-optimized blog post about: "${args.topic}"
Target keyword: "${args.targetKeyword}"

Requirements:
- 600-800 words
- Include the target keyword naturally 3-5 times
- H2 and H3 headings for structure
- Conversational, informative tone
- End with a soft CTA to ScriptsXO
- Include the disclaimer: "Telehealth services provided by licensed physicians"
- Return as plain text with markdown headings`;

    const content = await callGemini(MARKETING_SKILL, prompt, 2048);

    const contentId = await ctx.runMutation(
      internal.agents.marketingAgent.storeContent,
      {
        type: "blog_post",
        topic: args.topic,
        targetKeyword: args.targetKeyword,
        content,
        status: "draft",
        generatedAt: Date.now(),
      }
    );

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "marketingAgent",
      action: "generateBlogPost",
      input: { topic: args.topic, targetKeyword: args.targetKeyword },
      output: { contentId, wordCount: content.split(" ").length },
      success: true,
      durationMs: Date.now() - startTime,
    });

    return { contentId, content, type: "blog_post", status: "draft" };
  },
});

// ─── Generate ad copy ─────────────────────────────────────────

export const generateAdCopy = action({
  args: {
    platform: v.string(),
    product: v.string(),
    targetAudience: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    const platformInstructions = {
      google: `Generate Google Ads copy:
- 3 headlines (max 30 characters each)
- 2 descriptions (max 90 characters each)
- Return as JSON: { "headlines": [], "descriptions": [] }`,
      facebook: `Generate Facebook/Instagram ad copy:
- Hook (first 3 words must grab attention)
- Body (2-3 sentences, benefit-focused)
- CTA (clear action, e.g., "Get Started Today")
- Return as JSON: { "hook": "", "body": "", "cta": "" }`,
      instagram: `Generate Instagram ad copy:
- Caption (2-3 sentences, conversational)
- Hashtags (5-8 relevant tags)
- CTA line
- Return as JSON: { "caption": "", "hashtags": [], "cta": "" }`,
    };

    const instruction =
      platformInstructions[args.platform.toLowerCase()] ||
      `Generate ad copy for ${args.platform} as JSON.`;

    const prompt = `Product/Service: ${args.product}
Target Audience: ${args.targetAudience}

${instruction}

Compliance: No specific medical claims. Use "may help", "can support". Always warm and trust-focused.`;

    const rawContent = await callGemini(MARKETING_SKILL, prompt, 512);
    const cleaned = rawContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsedContent;
    try {
      parsedContent = JSON.parse(cleaned);
    } catch {
      parsedContent = { raw: rawContent };
    }

    const contentString = JSON.stringify(parsedContent);

    const contentId = await ctx.runMutation(
      internal.agents.marketingAgent.storeContent,
      {
        type: args.platform.toLowerCase().includes("google")
          ? "google_ad"
          : "facebook_ad",
        topic: args.product,
        platform: args.platform,
        content: contentString,
        status: "draft",
        generatedAt: Date.now(),
      }
    );

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "marketingAgent",
      action: "generateAdCopy",
      input: { platform: args.platform, product: args.product, targetAudience: args.targetAudience },
      output: { contentId },
      success: true,
      durationMs: Date.now() - startTime,
    });

    return {
      contentId,
      content: parsedContent,
      type: args.platform.toLowerCase().includes("google") ? "google_ad" : "facebook_ad",
      status: "draft",
    };
  },
});

// ─── Generate email subject lines ─────────────────────────────

export const generateEmailSubjectLines = action({
  args: {
    campaign: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const pairCount = args.count || 3;

    const prompt = `Generate ${pairCount} A/B test pairs of email subject lines for this campaign: "${args.campaign}"

Requirements:
- Each pair has version A and version B with different angles
- Version A: benefit-focused
- Version B: curiosity or question-based
- Max 50 characters per subject line
- No spam trigger words
- No medical claims in subject lines (HIPAA)
- Return as JSON array: [{ "a": "...", "b": "..." }]`;

    const rawContent = await callGemini(MARKETING_SKILL, prompt, 512);
    const cleaned = rawContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let pairs;
    try {
      pairs = JSON.parse(cleaned);
    } catch {
      pairs = [{ a: rawContent, b: "" }];
    }

    const contentString = JSON.stringify(pairs);

    const contentId = await ctx.runMutation(
      internal.agents.marketingAgent.storeContent,
      {
        type: "email_subject",
        topic: args.campaign,
        content: contentString,
        status: "draft",
        generatedAt: Date.now(),
      }
    );

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "marketingAgent",
      action: "generateEmailSubjectLines",
      input: { campaign: args.campaign, count: pairCount },
      output: { contentId, pairsGenerated: pairs.length },
      success: true,
      durationMs: Date.now() - startTime,
    });

    return {
      contentId,
      pairs,
      type: "email_subject",
      status: "draft",
    };
  },
});

// ─── Unified run entrypoint (for conductor dispatch) ──────────

export const run = action({
  args: {
    task: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    switch (args.task) {
      case "generateBlogPost":
        return await ctx.runAction(
          internal.agents.marketingAgent.generateBlogPost,
          args.input
        );
      case "generateAdCopy":
        return await ctx.runAction(
          internal.agents.marketingAgent.generateAdCopy,
          args.input
        );
      case "generateEmailSubjectLines":
        return await ctx.runAction(
          internal.agents.marketingAgent.generateEmailSubjectLines,
          args.input
        );
      default:
        throw new Error(`Unknown marketing task: ${args.task}`);
    }
  },
});
