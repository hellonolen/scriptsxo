// @ts-nocheck
/**
 * VIDEO REVIEW AGENT
 * Analyzes patient async video submissions and produces clinical summaries
 * for provider review. Runs autonomously after video upload.
 */
import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const VIDEO_REVIEW_SKILL = `# VideoReview Agent Skill

## Role
You are a clinical review assistant. Your job is to analyze a patient's self-recorded video consultation and produce a structured medical review for a licensed provider to approve or reject.

## Input
- Patient transcript (from video)
- Patient medical history (conditions, medications, allergies)
- Chief complaint and symptoms
- Requested prescription details

## Output Format (JSON)
{
  "summary": "2-3 sentence plain language summary of what the patient said",
  "chiefComplaint": "extracted chief complaint",
  "requestedMedications": ["list of medications mentioned"],
  "redFlags": ["any concerning symptoms or contradictions"],
  "contraindications": ["potential drug interactions or medical history conflicts"],
  "recommendedAction": "approve" | "reject" | "needs_more_info",
  "recommendationReason": "clinical reasoning for the recommendation",
  "urgencyLevel": 1,
  "confidence": 0.0
}

## Rules
- Never diagnose — summarize and flag
- Flag any mention of controlled substances
- Flag any suicidal ideation or emergency symptoms immediately with urgencyLevel: 5
- If transcript is unclear, set recommendedAction: "needs_more_info"
- Be concise — provider has 60 seconds to review
- ALWAYS respond with valid JSON only.`;

// ─── Gemini call (direct, no session needed for internal agent) ───

async function callGemini(systemPrompt, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.1,
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

// ─── Parse Gemini JSON response safely ───────────────────────

function parseReviewResponse(raw) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: raw,
      chiefComplaint: "Unable to extract",
      requestedMedications: [],
      redFlags: ["AI response could not be parsed — manual review required"],
      contraindications: [],
      recommendedAction: "needs_more_info",
      recommendationReason: "AI response parsing failed",
      urgencyLevel: 2,
      confidence: 0,
    };
  }
}

// ─── Internal mutation: store review result ───────────────────

export const storeReview = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    patientId: v.id("patients"),
    transcript: v.string(),
    summary: v.string(),
    chiefComplaint: v.string(),
    requestedMedications: v.array(v.string()),
    redFlags: v.array(v.string()),
    contraindications: v.array(v.string()),
    recommendedAction: v.string(),
    recommendationReason: v.string(),
    urgencyLevel: v.number(),
    confidence: v.number(),
    agentStatus: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("videoReviews", {
      consultationId: args.consultationId,
      patientId: args.patientId,
      transcript: args.transcript,
      summary: args.summary,
      chiefComplaint: args.chiefComplaint,
      requestedMedications: args.requestedMedications,
      redFlags: args.redFlags,
      contraindications: args.contraindications,
      recommendedAction: args.recommendedAction,
      recommendationReason: args.recommendationReason,
      urgencyLevel: args.urgencyLevel,
      confidence: args.confidence,
      agentStatus: args.agentStatus,
    });
  },
});

// ─── Internal mutation: update review status on error ────────

export const updateReviewStatus = internalMutation({
  args: {
    reviewId: v.id("videoReviews"),
    agentStatus: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reviewId, {
      agentStatus: args.agentStatus,
    });
  },
});

// ─── Internal mutation: record provider decision ─────────────

export const recordDecision = internalMutation({
  args: {
    reviewId: v.id("videoReviews"),
    providerDecision: v.string(),
    providerNotes: v.optional(v.string()),
    providerEmail: v.string(),
    decidedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reviewId, {
      providerDecision: args.providerDecision,
      providerNotes: args.providerNotes,
      providerEmail: args.providerEmail,
      decidedAt: args.decidedAt,
    });
  },
});

// ─── Internal query: get review by consultation ───────────────

export const getByConsultation = internalQuery({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videoReviews")
      .withIndex("by_consultation", (q) =>
        q.eq("consultationId", args.consultationId)
      )
      .first();
  },
});

// ─── Main agent action ────────────────────────────────────────

export const run = action({
  args: {
    consultationId: v.id("consultations"),
    patientId: v.id("patients"),
    transcript: v.string(),
    patientHistory: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    const patientHistory = args.patientHistory || {};
    const conditions = Array.isArray(patientHistory.medicalConditions)
      ? patientHistory.medicalConditions.join(", ")
      : "None provided";
    const medications = Array.isArray(patientHistory.currentMedications)
      ? patientHistory.currentMedications.join(", ")
      : "None provided";
    const allergies = Array.isArray(patientHistory.allergies)
      ? patientHistory.allergies.join(", ")
      : "None provided";

    const userMessage = [
      `PATIENT TRANSCRIPT:\n${args.transcript}`,
      `\nPATIENT MEDICAL HISTORY:`,
      `Conditions: ${conditions}`,
      `Current Medications: ${medications}`,
      `Allergies: ${allergies}`,
      patientHistory.chiefComplaint
        ? `Chief Complaint: ${patientHistory.chiefComplaint}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    let reviewData;
    let agentStatus = "complete";

    try {
      const rawResponse = await callGemini(VIDEO_REVIEW_SKILL, userMessage);
      reviewData = parseReviewResponse(rawResponse);
    } catch (err) {
      agentStatus = "error";
      reviewData = {
        summary: "AI analysis failed — manual review required.",
        chiefComplaint: "Unknown",
        requestedMedications: [],
        redFlags: ["Agent error: " + (err instanceof Error ? err.message : "Unknown error")],
        contraindications: [],
        recommendedAction: "needs_more_info",
        recommendationReason: "AI analysis could not be completed",
        urgencyLevel: 2,
        confidence: 0,
      };
    }

    const reviewId = await ctx.runMutation(
      internal.agents.videoReviewAgent.storeReview,
      {
        consultationId: args.consultationId,
        patientId: args.patientId,
        transcript: args.transcript,
        summary: reviewData.summary || "",
        chiefComplaint: reviewData.chiefComplaint || "",
        requestedMedications: Array.isArray(reviewData.requestedMedications)
          ? reviewData.requestedMedications
          : [],
        redFlags: Array.isArray(reviewData.redFlags) ? reviewData.redFlags : [],
        contraindications: Array.isArray(reviewData.contraindications)
          ? reviewData.contraindications
          : [],
        recommendedAction: reviewData.recommendedAction || "needs_more_info",
        recommendationReason: reviewData.recommendationReason || "",
        urgencyLevel: typeof reviewData.urgencyLevel === "number"
          ? reviewData.urgencyLevel
          : 2,
        confidence: typeof reviewData.confidence === "number"
          ? reviewData.confidence
          : 0,
        agentStatus,
      }
    );

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "videoReviewAgent",
      action: "analyzeVideo",
      input: {
        consultationId: args.consultationId,
        patientId: args.patientId,
        transcriptLength: args.transcript.length,
      },
      output: { reviewId, agentStatus, recommendedAction: reviewData.recommendedAction },
      success: agentStatus !== "error",
      durationMs: Date.now() - startTime,
    });

    return {
      reviewId,
      agentStatus,
      ...reviewData,
    };
  },
});
