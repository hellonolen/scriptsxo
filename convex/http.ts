// @ts-nocheck
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// ---------------------------------------------------------------------------
// Stripe signature verification (manual HMAC — no external Stripe SDK needed
// in Convex runtime; Convex uses the standard Web Crypto API)
// ---------------------------------------------------------------------------

async function verifyStripeSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  // Parse t= and v1= from header like: t=1234,v1=abc123,v1=def456
  const parts: Record<string, string[]> = {};
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=");
    if (k && v) {
      parts[k] = parts[k] ?? [];
      parts[k].push(v);
    }
  }

  const timestamp = parts["t"]?.[0];
  const v1Signatures = parts["v1"] ?? [];
  if (!timestamp || v1Signatures.length === 0) return false;

  // Rebuild signed payload: timestamp + "." + body
  const signedPayload = `${timestamp}.${payload}`;

  // Compute expected HMAC-SHA256
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Verify at least one v1 signature matches
  return v1Signatures.some((sig) => sig === expected);
}

// ---------------------------------------------------------------------------
// Stripe payment webhook
// ---------------------------------------------------------------------------

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[SXO-WEBHOOK] STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const valid = await verifyStripeSignature(body, signature, secret);
    if (!valid) {
      console.error("[SXO-WEBHOOK] Invalid stripe-signature — rejected");
      return new Response("Invalid signature", { status: 400 });
    }

    let event: any;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const memberId: string | undefined = session.metadata?.memberId;
          const orgId: string | undefined = session.metadata?.orgId;
          const consultationId: string | undefined = session.metadata?.consultationId;

          console.log(`[SXO-WEBHOOK] checkout.session.completed: ${session.id} memberId=${memberId}`);

          if (memberId) {
            // Update passkey payment status
            await ctx.runMutation(
              // @ts-expect-error internal ref
              { _path: "passkeys:updatePaymentStatusByEmail" },
              { email: session.customer_email ?? session.metadata?.email, paymentStatus: "active" }
            );
          }

          if (consultationId) {
            // Mark consultation as paid
            await ctx.runMutation(
              // @ts-expect-error internal ref
              { _path: "billing:markConsultationPaid" },
              {
                consultationId,
                stripeSessionId: session.id,
                stripeCustomerId: session.customer,
                amount: session.amount_total,
              }
            );
          }
          break;
        }

        case "payment_intent.succeeded": {
          const pi = event.data.object;
          console.log(`[SXO-WEBHOOK] payment_intent.succeeded: ${pi.id}`);
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          const memberId: string | undefined = pi.metadata?.memberId;
          console.error(`[SXO-WEBHOOK] payment_intent.payment_failed: ${pi.id} memberId=${memberId}`);

          if (memberId) {
            // Mark billing as failed and log security event
            await ctx.runMutation(
              // @ts-expect-error internal ref
              { _path: "billing:markPaymentFailed" },
              { stripePaymentIntentId: pi.id, memberId }
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

// ---------------------------------------------------------------------------
// Stripe Identity webhook (separate endpoint, separate secret)
// ---------------------------------------------------------------------------

http.route({
  path: "/stripe-identity-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    const secret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[SXO-IDENTITY] Webhook secret not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const valid = await verifyStripeSignature(body, signature, secret);
    if (!valid) {
      console.error("[SXO-IDENTITY] Invalid stripe-signature — rejected");
      return new Response("Invalid signature", { status: 400 });
    }

    let event: any;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }

    try {
      switch (event.type) {
        case "identity.verification_session.verified": {
          const session = event.data.object;
          const patientEmail = session.metadata?.patient_email;
          console.log(`[SXO-IDENTITY] Verified: ${patientEmail}`);

          if (patientEmail) {
            const patient = await ctx.runQuery(
              // @ts-expect-error
              { _path: "patients:getByEmail" },
              { email: patientEmail }
            );
            if (patient) {
              await ctx.runMutation(
                // @ts-expect-error
                { _path: "patients:verifyId" },
                { patientId: patient._id, status: "verified" }
              );
            }
          }
          break;
        }

        case "identity.verification_session.requires_input": {
          const session = event.data.object;
          console.log(`[SXO-IDENTITY] Requires input: ${session.id}`);
          break;
        }

        default:
          console.log(`[SXO-IDENTITY] Unhandled event type: ${event.type}`);
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[SXO-IDENTITY] Error processing webhook:", err);
      return new Response("Webhook processing error", { status: 500 });
    }
  }),
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ status: "ok", service: "scriptsxo", timestamp: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

// ---------------------------------------------------------------------------
// E-prescribe callback
// ---------------------------------------------------------------------------

http.route({
  path: "/eprescribe-callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    try {
      const data = JSON.parse(body);
      const prescriptionId = data.prescriptionId;
      const status = data.status;
      console.log(`[SXO-EPRESCRIBE] callback: prescriptionId=${prescriptionId} status=${status}`);

      if (prescriptionId && status) {
        await ctx.runMutation(
          // @ts-expect-error
          { _path: "prescriptions:updateStatusFromEprescribe" },
          { ePrescribeId: prescriptionId, status }
        );
      }
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[SXO-EPRESCRIBE] Error:", err);
      return new Response("Processing error", { status: 500 });
    }
  }),
});

// ---------------------------------------------------------------------------
// Phaxio fax delivery callback
// ---------------------------------------------------------------------------

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

      if (faxId) {
        console.log(`[SXO-FAX] callback: faxId=${faxId} success=${success}`);
        await ctx.runMutation(
          // @ts-expect-error
          { _path: "faxLogs:updateStatusByPhaxioId" },
          {
            phaxioFaxId: faxId,
            status: success ? "confirmed" : "failed",
            errorMessage: success ? undefined : (message ?? "Fax delivery failed"),
          }
        );
      }
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[SXO-FAX] Error:", err);
      return new Response("Processing error", { status: 500 });
    }
  }),
});

// ---------------------------------------------------------------------------
// Whop webhook
// ---------------------------------------------------------------------------

http.route({
  path: "/whop-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    try {
      const event = JSON.parse(body);
      const eventType = event.type || event.event || "";
      const data = event.data?.object || event.data || event;

      console.log(`[SXO-WHOP] Received: ${eventType}`);
      await ctx.runAction(
        // @ts-expect-error
        { _path: "actions/whopCheckout:processWebhook" },
        { eventType, data }
      );
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[SXO-WHOP] Error:", err);
      return new Response("Webhook processing error", { status: 500 });
    }
  }),
});

export default http;
