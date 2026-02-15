"use node";
// @ts-nocheck
/**
 * DOCUMENT SCANNER
 * Gemini Vision-powered government ID scanning and analysis.
 * Extracts identity data, validates document legitimacy.
 * Also handles previous prescription photo scanning.
 */
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

/**
 * Scan a government-issued ID using Gemini Vision.
 * Extracts name, DOB, document type, expiration, and validates legitimacy.
 */
export const scanGovernmentId = action({
  args: {
    imageBase64: v.string(), // base64-encoded image data (no data: prefix)
    mimeType: v.string(), // e.g., "image/jpeg", "image/png"
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(api.agents.llmGateway.callMultimodal, {
      systemPrompt: `You are an identity document scanner for a HIPAA-compliant telehealth platform. Analyze the uploaded government-issued ID image carefully.

Extract and return ONLY a JSON object (no markdown, no code fences):
{
  "isValidId": true/false,
  "documentType": "drivers_license" | "passport" | "state_id" | "military_id" | "tribal_id" | "other" | "not_id",
  "fullName": "extracted full name or null",
  "firstName": "first name or null",
  "lastName": "last name or null",
  "dateOfBirth": "extracted DOB in YYYY-MM-DD format or null",
  "expirationDate": "expiration date in YYYY-MM-DD format or null",
  "isExpired": true/false/null,
  "issuingState": "two-letter state code or country, or null",
  "idNumberLast4": "last 4 digits only for security, or null",
  "confidence": 0-100,
  "photoDetected": true/false,
  "issues": ["list of any issues found"]
}

IMPORTANT RULES:
- If the image is NOT a government ID, set isValidId to false and documentType to "not_id"
- For security, NEVER return the full ID number — only last 4 digits
- Check if the document appears expired based on expiration date
- Note if the photo on the ID is clearly visible
- Flag any obvious signs of tampering or low quality that would prevent verification
- If you cannot read certain fields, set them to null and note the issue`,
      textContent: "Scan and analyze this government-issued identification document. Extract all readable identity information.",
      images: [{ mimeType: args.mimeType, data: args.imageBase64 }],
      maxTokens: 500,
      temperature: 0.1,
    });

    try {
      const cleaned = result.content.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        isValidId: false,
        documentType: "unknown",
        fullName: null,
        firstName: null,
        lastName: null,
        dateOfBirth: null,
        expirationDate: null,
        isExpired: null,
        issuingState: null,
        idNumberLast4: null,
        confidence: 0,
        photoDetected: false,
        issues: ["Failed to analyze document image — please try a clearer photo"],
      };
    }
  },
});

/**
 * Scan a previous prescription photo using Gemini Vision.
 * Extracts medication name, prescriber, date, dosage info.
 */
export const scanPrescription = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(api.agents.llmGateway.callMultimodal, {
      systemPrompt: `You are a prescription document scanner for a telehealth platform. Analyze the uploaded prescription image.

Extract and return ONLY a JSON object (no markdown, no code fences):
{
  "isValidPrescription": true/false,
  "medicationName": "medication name or null",
  "dosage": "dosage info or null",
  "frequency": "how often taken or null",
  "prescriber": "prescribing doctor name or null",
  "prescriberNpi": "NPI number if visible, or null",
  "pharmacy": "pharmacy name if visible, or null",
  "dateWritten": "date in YYYY-MM-DD format or null",
  "refillsRemaining": number or null,
  "patientName": "patient name on Rx or null",
  "confidence": 0-100,
  "issues": ["list of any issues"]
}

IMPORTANT: If the image is not a prescription, set isValidPrescription to false.
For security, redact any sensitive identifiers in your response.`,
      textContent: "Scan and analyze this prescription document. Extract medication and prescriber information.",
      images: [{ mimeType: args.mimeType, data: args.imageBase64 }],
      maxTokens: 500,
      temperature: 0.1,
    });

    try {
      const cleaned = result.content.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        isValidPrescription: false,
        medicationName: null,
        dosage: null,
        prescriber: null,
        confidence: 0,
        issues: ["Failed to analyze prescription image — please try a clearer photo"],
      };
    }
  },
});

/**
 * Analyze a face photo captured from video for identity matching.
 * Used to compare against the government ID photo.
 */
export const analyzeFacePhoto = action({
  args: {
    faceImageBase64: v.string(),
    faceMimeType: v.string(),
    idImageBase64: v.optional(v.string()),
    idMimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const images = [{ mimeType: args.faceMimeType, data: args.faceImageBase64 }];
    if (args.idImageBase64 && args.idMimeType) {
      images.push({ mimeType: args.idMimeType, data: args.idImageBase64 });
    }

    const prompt = args.idImageBase64
      ? "The first image is a live face photo from a video consultation. The second image is their government ID. Analyze and compare."
      : "This is a live face photo captured from a video consultation. Analyze it for identity verification purposes.";

    const result = await ctx.runAction(api.agents.llmGateway.callMultimodal, {
      systemPrompt: `You are a face analysis system for a telehealth platform. Your job is to verify a live face capture is a real person (not a photo of a photo, a screen, or a mask).

Return ONLY a JSON object (no markdown):
{
  "faceDetected": true/false,
  "isLivePerson": true/false,
  "approximateAge": "age range estimate or null",
  "potentialIssues": ["list of issues like 'poor lighting', 'face partially obscured', etc."],
  "matchesId": true/false/null,
  "confidence": 0-100
}

NOTE: matchesId should be null if no ID image was provided for comparison.
You cannot make definitive identity matches — only note obvious mismatches (different gender, vastly different age, etc.)
Do NOT attempt racial profiling or make assumptions about ethnicity.`,
      textContent: prompt,
      images,
      maxTokens: 300,
      temperature: 0.1,
    });

    try {
      const cleaned = result.content.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        faceDetected: false,
        isLivePerson: false,
        confidence: 0,
        potentialIssues: ["Face analysis inconclusive"],
        matchesId: null,
      };
    }
  },
});
