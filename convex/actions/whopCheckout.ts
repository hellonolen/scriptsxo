// @ts-nocheck
"use node";
/**
 * WHOP CHECKOUT
 * Creates embedded checkout sessions for $97/mo membership via Whop.com API.
 * Verifies membership status after payment.
 */
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import { requireCap, CAP } from "../lib/capabilities";

const WHOP_API = "https://api.whop.com/api/v1";

async function whopRequest(
  endpoint: string,
  apiKey: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };

  if (body && (method === "POST" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${WHOP_API}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whop API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Create an embedded checkout session.
 * Returns a session ID that the frontend uses with <WhopCheckoutEmbed />.
 * The checkout renders inline — users never leave the ScriptsXO site.
 */
export const createCheckoutSession = action({
  args: {
    patientEmail: v.string(),
    callerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.INTAKE_SELF);
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      throw new Error("WHOP_API_KEY not configured");
    }

    const planId = process.env.WHOP_PLAN_ID;
    if (!planId) {
      throw new Error("WHOP_PLAN_ID not configured");
    }

    const baseUrl = process.env.SITE_URL || "http://localhost:3001";

    const checkout = await whopRequest(
      "/checkout_configurations",
      apiKey,
      "POST",
      {
        plan_id: planId,
        mode: "payment",
        redirect_url: `${baseUrl}/intake/medical-history?whop_checkout=success`,
        metadata: {
          patient_email: args.patientEmail.toLowerCase(),
        },
      }
    );

    return {
      sessionId: checkout.id as string,
      purchaseUrl: (checkout.purchase_url as string) || null,
    };
  },
});

/**
 * Verify membership status for a patient by checking Whop API.
 * Called after checkout completion (via onComplete callback or redirect).
 */
export const verifyMembership = action({
  args: {
    patientEmail: v.string(),
    callerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.INTAKE_SELF);
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      throw new Error("WHOP_API_KEY not configured");
    }

    const companyId = process.env.WHOP_COMPANY_ID;
    if (!companyId) {
      throw new Error("WHOP_COMPANY_ID not configured");
    }

    const emailLower = args.patientEmail.toLowerCase();

    try {
      // List active memberships for this company
      const memberships = await whopRequest(
        `/memberships?company_id=${companyId}&status=active`,
        apiKey
      );

      const data = memberships.data as Array<Record<string, unknown>> | undefined;
      if (!data || data.length === 0) {
        return { success: false, error: "No active membership found" };
      }

      // Find a membership matching this email
      const match = data.find((m: Record<string, unknown>) => {
        const email = (m.email as string || "").toLowerCase();
        const metadata = m.metadata as Record<string, string> | undefined;
        const metaEmail = (metadata?.patient_email || "").toLowerCase();
        return email === emailLower || metaEmail === emailLower;
      });

      if (!match) {
        return { success: false, error: "No membership found for this email" };
      }

      // Update passkey payment status
      await ctx.runMutation(api.passkeys.updatePaymentStatus, {
        email: emailLower,
        paymentStatus: "active",
        stripeSessionId: (match.id as string) || undefined,
      });

      return {
        success: true,
        membershipId: match.id as string,
        status: match.status as string,
      };
    } catch (err: any) {
      console.error("[SXO-WHOP] Membership verification error:", err);
      return { success: false, error: err.message || "Verification failed" };
    }
  },
});

/**
 * Process a Whop webhook event.
 * Called from the HTTP endpoint handler.
 */
export const processWebhook = action({
  args: {
    eventType: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const { eventType, data } = args;

    console.log(`[SXO-WHOP] Processing webhook: ${eventType}`);

    switch (eventType) {
      case "payment.succeeded": {
        const email =
          (data.metadata?.patient_email as string) ||
          (data.email as string) ||
          "";
        if (email) {
          await ctx.runMutation(api.passkeys.updatePaymentStatus, {
            email: email.toLowerCase(),
            paymentStatus: "active",
            stripeSessionId: data.id || undefined,
          });
          console.log(`[SXO-WHOP] Payment succeeded for ${email}`);
        }
        break;
      }

      case "membership.activated": {
        const email =
          (data.metadata?.patient_email as string) ||
          (data.email as string) ||
          "";
        if (email) {
          await ctx.runMutation(api.passkeys.updatePaymentStatus, {
            email: email.toLowerCase(),
            paymentStatus: "active",
            stripeSessionId: data.membership_id || data.id || undefined,
          });
          console.log(`[SXO-WHOP] Membership activated for ${email}`);
        }
        break;
      }

      case "membership.deactivated": {
        const email =
          (data.metadata?.patient_email as string) ||
          (data.email as string) ||
          "";
        if (email) {
          await ctx.runMutation(api.passkeys.revokeMembership, {
            email: email.toLowerCase(),
            reason: "cancelled",
          });
          console.log(`[SXO-WHOP] Membership deactivated for ${email}`);
        }
        break;
      }

      case "payment.failed": {
        const email =
          (data.metadata?.patient_email as string) ||
          (data.email as string) ||
          "";
        if (email) {
          console.log(`[SXO-WHOP] Payment failed for ${email}`);
        }
        break;
      }

      default:
        console.log(`[SXO-WHOP] Unhandled event type: ${eventType}`);
    }

    return { success: true };
  },
});
