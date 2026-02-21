// @ts-nocheck
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const REPLAY_TOLERANCE_SECONDS = 300; // 5 minutes

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Parse the Stripe-Signature header: t=timestamp,v1=hash
  const parts = signature.split(",");
  let timestamp = "";
  let v1Signature = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signature = value;
  }

  if (!timestamp || !v1Signature) {
    console.error("[SXO-WEBHOOK] Missing timestamp or v1 in Stripe-Signature");
    return false;
  }

  // Check replay attack: timestamp must be within tolerance
  const timestampSeconds = parseInt(timestamp, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > REPLAY_TOLERANCE_SECONDS) {
    console.error(
      `[SXO-WEBHOOK] Timestamp outside tolerance: ${timestampSeconds} vs ${nowSeconds}`
    );
    return false;
  }

  // Compute HMAC-SHA256 of "timestamp.payload" using the webhook secret
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedPayload = `${timestamp}.${payload}`;
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );

  // Convert to hex string
  const computedHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison via subtle crypto digest trick
  const isValid = computedHex === v1Signature;
  if (!isValid) {
    console.error("[SXO-WEBHOOK] Signature mismatch");
  }
  return isValid;
}

const http = httpRouter();

/**
 * Stripe webhook endpoint.
 * Handles payment events for consultations and billing.
 */
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    // Verify Stripe webhook signature
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (stripeWebhookSecret) {
      const isValid = await verifyStripeSignature(body, signature, stripeWebhookSecret);
      if (!isValid) {
        console.error("[SXO-WEBHOOK] Stripe signature verification failed");
        return new Response("Invalid signature", { status: 401 });
      }
      console.log("[SXO-WEBHOOK] Stripe signature verified successfully");
    } else {
      console.warn(
        "[SXO-WEBHOOK] STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev/test mode)"
      );
    }

    try {
      const event = JSON.parse(body);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          console.log(
            `[SXO-WEBHOOK] Checkout session completed: ${session.id}`
          );

          // Extract customer email from session
          const sessionEmail =
            session.customer_details?.email ||
            session.metadata?.email ||
            "";
          if (sessionEmail) {
            const emailLower = sessionEmail.toLowerCase();
            console.log(
              `[SXO-WEBHOOK] Recording payment active for: ${emailLower}`
            );
            await ctx.runMutation(api.passkeys.updatePaymentStatus, {
              email: emailLower,
              paymentStatus: "active",
              stripeCustomerId: session.customer || undefined,
              stripeSessionId: session.id || undefined,
            });
            console.log(
              `[SXO-WEBHOOK] Payment status updated to active for: ${emailLower}`
            );
          } else {
            console.warn(
              `[SXO-WEBHOOK] No email found in checkout session ${session.id} — cannot record payment`
            );
          }
          break;
        }

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          console.log(
            `[SXO-WEBHOOK] Payment succeeded: ${paymentIntent.id}`
          );
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object;
          console.log(
            `[SXO-WEBHOOK] Payment failed: ${paymentIntent.id}`
          );

          // Extract email from payment intent
          const failedEmail =
            paymentIntent.metadata?.email ||
            paymentIntent.receipt_email ||
            "";
          if (failedEmail) {
            const failedEmailLower = failedEmail.toLowerCase();
            console.log(
              `[SXO-WEBHOOK] Recording payment failed for: ${failedEmailLower}`
            );
            await ctx.runMutation(api.passkeys.updatePaymentStatus, {
              email: failedEmailLower,
              paymentStatus: "failed",
            });
            console.log(
              `[SXO-WEBHOOK] Payment status updated to failed for: ${failedEmailLower}`
            );
          } else {
            console.warn(
              `[SXO-WEBHOOK] No email found in failed payment_intent ${paymentIntent.id} — cannot record failure`
            );
          }
          break;
        }

        default:
          console.log(`[SXO-WEBHOOK] Unhandled event type: ${event.type}`);
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[SXO-WEBHOOK] Error processing webhook:", err);
      return new Response("Webhook processing error", { status: 500 });
    }
  }),
});

/**
 * Health check endpoint.
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        service: "scriptsxo",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

/**
 * E-prescribe callback endpoint (for pharmacy integration).
 */
http.route({
  path: "/eprescribe-callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();

    try {
      const data = JSON.parse(body);
      console.log(`[SXO-EPRESCRIBE] Callback received:`, data);

      // TODO: Process e-prescribe status updates
      // Update prescription status based on pharmacy response

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[SXO-EPRESCRIBE] Error processing callback:", err);
      return new Response("Processing error", { status: 500 });
    }
  }),
});

/**
 * Phaxio fax delivery callback endpoint.
 * Receives status updates when faxes are sent/failed/confirmed.
 */
http.route({
  path: "/phaxio-callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();

    try {
      const data = JSON.parse(body);
      const faxId = data.fax?.id?.toString();
      const success = data.success;
      const message = data.message;
      const pages = data.fax?.num_pages ?? undefined;

      if (!faxId) {
        console.warn("[SXO-FAX] Phaxio callback missing faxId");
        return new Response("Missing faxId", { status: 400 });
      }

      const status = success ? "confirmed" : "failed";
      console.log(`[SXO-FAX] Phaxio callback: faxId=${faxId}, success=${success}, status=${status}, message=${message}`);

      // Update fax log status via the new mutation
      const result = await ctx.runMutation(api.faxLogs.updateByPhaxioFaxId, {
        phaxioFaxId: faxId,
        status,
        pages: typeof pages === "number" ? pages : undefined,
        errorMessage: success ? undefined : (message || "Fax delivery failed"),
      });

      if (!result.success) {
        console.warn(`[SXO-FAX] Could not update fax log: ${result.error}`);
      }

      // If fax confirmed, update the prescription's sent status
      if (status === "confirmed") {
        const faxLog = await ctx.runQuery(api.faxLogs.getByPhaxioFaxId, {
          phaxioFaxId: faxId,
        });
        if (faxLog?.prescriptionId) {
          console.log(`[SXO-FAX] Fax confirmed for prescription: ${faxLog.prescriptionId}`);
        }
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[SXO-FAX] Error processing Phaxio callback:", err);
      return new Response("Processing error", { status: 500 });
    }
  }),
});

/**
 * Stripe Identity webhook endpoint.
 * Handles identity verification status updates.
 */
http.route({
  path: "/stripe-identity-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    try {
      const event = JSON.parse(body);

      switch (event.type) {
        case "identity.verification_session.verified": {
          const session = event.data.object;
          const patientEmail = session.metadata?.patient_email;
          console.log(
            `[SXO-IDENTITY] Verification verified for: ${patientEmail}`
          );

          if (patientEmail) {
            // Update patient verification status via internal mutation
            const patient = await ctx.runQuery(
              // @ts-expect-error - internal module reference
              { _path: "patients:getByEmail" },
              { email: patientEmail }
            );

            if (patient) {
              await ctx.runMutation(
                // @ts-expect-error - internal module reference
                { _path: "patients:verifyId" },
                { patientId: patient._id, status: "verified" }
              );
            }
          }
          break;
        }

        case "identity.verification_session.requires_input": {
          const session = event.data.object;
          console.log(
            `[SXO-IDENTITY] Verification requires input: ${session.id}`
          );
          break;
        }

        default:
          console.log(
            `[SXO-IDENTITY] Unhandled event type: ${event.type}`
          );
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[SXO-IDENTITY] Error processing webhook:", err);
      return new Response("Webhook processing error", { status: 500 });
    }
  }),
});

/**
 * Whop webhook endpoint.
 * Handles membership and payment events from Whop.com.
 * Webhook URL: https://striped-caribou-797.convex.cloud/whop-webhook
 */
http.route({
  path: "/whop-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();

    try {
      const event = JSON.parse(body);
      const eventType = event.type || event.event || "";
      const data = event.data?.object || event.data || event;

      console.log(`[SXO-WHOP-WEBHOOK] Received: ${eventType}`);

      // Process the webhook via the Whop action
      await ctx.runAction(
        // @ts-expect-error - internal action reference
        { _path: "actions/whopCheckout:processWebhook" },
        { eventType, data }
      );

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[SXO-WHOP-WEBHOOK] Error:", err);
      return new Response("Webhook processing error", { status: 500 });
    }
  }),
});

export default http;
