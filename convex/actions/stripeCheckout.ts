"use node";
// @ts-nocheck
/**
 * STRIPE CHECKOUT
 * Creates Checkout sessions for consultation payments.
 * Verifies payment status after completion.
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
    throw new Error(`Stripe API error: ${response.status} - ${error}`);
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
    throw new Error(`Stripe API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Create a Stripe Checkout session for consultation payment.
 */
export const createCheckoutSession = action({
  args: {
    patientEmail: v.string(),
    consultationRate: v.optional(v.number()),
    successUrl: v.optional(v.string()),
    cancelUrl: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.INTAKE_SELF);
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const amount = args.consultationRate || 7500; // Default $75
    const baseUrl = process.env.SITE_URL || "https://scriptsxo.pages.dev";
    const successUrl =
      args.successUrl ||
      `${baseUrl}/intake/medical-history?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = args.cancelUrl || `${baseUrl}/access`;

    const session = await stripeRequest(
      "/checkout/sessions",
      apiKey,
      {
        "mode": "payment",
        "customer_email": args.patientEmail.toLowerCase(),
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]":
          "ScriptsXO Telehealth Consultation",
        "line_items[0][price_data][product_data][description]":
          "AI-powered telehealth consultation with a licensed provider",
        "line_items[0][price_data][unit_amount]": amount.toString(),
        "line_items[0][quantity]": "1",
        "success_url": successUrl,
        "cancel_url": cancelUrl,
        "metadata[type]": "consultation",
        "metadata[patient_email]": args.patientEmail.toLowerCase(),
      }
    );

    return {
      sessionId: session.id as string,
      url: session.url as string,
    };
  },
});

/**
 * Verify a Stripe Checkout session payment status.
 * Updates the passkey record with payment info.
 */
export const verifyPayment = action({
  args: {
    sessionId: v.string(),
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
      `/checkout/sessions/${args.sessionId}`,
      apiKey
    );

    if (session.payment_status !== "paid") {
      return {
        success: false,
        error: "Payment not completed",
        status: session.payment_status as string,
      };
    }

    // Update passkey payment status
    await ctx.runMutation(api.passkeys.updatePaymentStatus, {
      email: args.patientEmail.toLowerCase(),
      paymentStatus: "active",
      stripeCustomerId: (session.customer as string) || undefined,
      stripeSessionId: session.id as string,
    });

    return {
      success: true,
      customerId: session.customer as string | null,
      amountTotal: session.amount_total as number,
    };
  },
});
