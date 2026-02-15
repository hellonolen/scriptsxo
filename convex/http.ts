// @ts-nocheck
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

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

    // TODO: Verify Stripe webhook signature
    // const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // const event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);

    try {
      const event = JSON.parse(body);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          console.log(
            `[SXO-WEBHOOK] Checkout session completed: ${session.id}`
          );
          // TODO: Update billing record and consultation payment status
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

      if (faxId) {
        // Look up fax log by phaxioFaxId and update status
        // This will be handled by the faxLogs.updateStatus mutation
        console.log(`[SXO-FAX] Phaxio callback: faxId=${faxId}, success=${success}, message=${message}`);
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
