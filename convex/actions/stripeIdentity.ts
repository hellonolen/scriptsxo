"use node";
// @ts-nocheck
/**
 * STRIPE IDENTITY
 * Creates and checks Stripe Identity VerificationSessions.
 * Handles document + selfie verification for patients.
 *
 * Two sets of actions:
 * - createVerificationSession / checkVerificationStatus: require session auth (credential verification flow)
 * - createIntakeVerificationSession / checkIntakeVerificationStatus: no auth required (intake wizard flow)
 */
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import { requireCap, CAP } from "../lib/capabilities";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeRequest(
  endpoint: string,
  apiKey: string,
  body: Record<string, string>
): Promise<Record<string, unknown>> {
  const response = await fetch(`${STRIPE_API}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe Identity API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function stripeGet(
  endpoint: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const response = await fetch(`${STRIPE_API}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe Identity API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Create a Stripe Identity VerificationSession.
 * Returns a client_secret for the frontend to embed the Stripe Identity modal.
 */
export const createVerificationSession = action({
  args: {
    patientEmail: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.INTAKE_SELF);
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const baseUrl = process.env.SITE_URL || "https://scriptsxo.pages.dev";

    const session = await stripeRequest(
      "/identity/verification_sessions",
      apiKey,
      {
        "type": "document",
        "metadata[patient_email]": args.patientEmail.toLowerCase(),
        "options[document][require_matching_selfie]": "true",
        "options[document][allowed_types][0]": "driving_license",
        "options[document][allowed_types][1]": "passport",
        "options[document][allowed_types][2]": "id_card",
        "return_url": `${baseUrl}/intake/review`,
      }
    );

    return {
      verificationSessionId: session.id as string,
      clientSecret: session.client_secret as string,
    };
  },
});

/**
 * Check the status of a Stripe Identity VerificationSession.
 * Updates the patient record on verification success.
 */
export const checkVerificationStatus = action({
  args: {
    verificationSessionId: v.string(),
    patientEmail: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.INTAKE_SELF);
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const session = await stripeGet(
      `/identity/verification_sessions/${args.verificationSessionId}`,
      apiKey
    );

    const status = session.status as string;

    if (status === "verified") {
      // Find patient by email and update verification status
      const patient = await ctx.runQuery(api.patients.getByEmail, {
        email: args.patientEmail.toLowerCase(),
      });

      if (patient) {
        await ctx.runMutation(api.patients.verifyId, {
          patientId: patient._id,
          status: "verified",
        });
      }

      return {
        status: "verified",
        success: true,
      };
    }

    return {
      status,
      success: false,
      lastError: session.last_error,
    };
  },
});

/**
 * Create a Stripe Identity VerificationSession for the intake wizard flow.
 * No session auth required — the user just paid via Whop and is redirected here.
 * Returns the hosted verification URL for redirect.
 */
export const createIntakeVerificationSession = action({
  args: {
    patientEmail: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      return { error: "Identity verification service temporarily unavailable. Please contact support.", url: null, sessionId: null };
    }

    const session = await stripeRequest(
      "/identity/verification_sessions",
      apiKey,
      {
        "type": "document",
        "metadata[patient_email]": args.patientEmail.toLowerCase(),
        "options[document][require_matching_selfie]": "true",
        "options[document][require_live_capture]": "true",
        "options[document][allowed_types][0]": "driving_license",
        "options[document][allowed_types][1]": "passport",
        "options[document][allowed_types][2]": "id_card",
        "return_url": args.returnUrl,
      }
    );

    return {
      sessionId: session.id as string,
      url: session.url as string,
      error: null,
    };
  },
});

/**
 * Check the status of a Stripe Identity VerificationSession for the intake wizard.
 * No session auth required.
 */
export const checkIntakeVerificationStatus = action({
  args: {
    sessionId: v.string(),
    patientEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      return { status: "unknown", verified: false, lastError: null };
    }

    const session = await stripeGet(
      `/identity/verification_sessions/${args.sessionId}`,
      apiKey
    );

    const status = session.status as string;
    const verified = status === "verified";

    if (verified) {
      // Best-effort update of patient record — ignore errors
      try {
        const patient = await ctx.runQuery(api.patients.getByEmail, {
          email: args.patientEmail.toLowerCase(),
        });
        if (patient) {
          await ctx.runMutation(api.patients.verifyId, {
            patientId: patient._id,
            status: "verified",
          });
        }
      } catch {
        // Patient record may not exist yet at intake time — that's fine
      }
    }

    return {
      status,
      verified,
      lastError: session.last_error ?? null,
    };
  },
});
