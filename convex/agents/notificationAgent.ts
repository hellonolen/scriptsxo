// @ts-nocheck
/**
 * NOTIFICATION AGENT
 * Event-driven notification dispatcher for patient communication.
 * Fires immediately on key events: video received, approved, rejected, rx sent.
 */
import { action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const SUPPORT_EMAIL = "support@scriptsxo.com";
const SUPPORT_PHONE = "(800) 555-0100";
const FROM_ADDRESS = "ScriptsXO <noreply@scriptsxo.com>";

// ─── Internal mutation: persist notification record ───────────

export const saveNotification = internalMutation({
  args: {
    recipientEmail: v.string(),
    type: v.string(),
    subject: v.string(),
    body: v.string(),
    status: v.string(),
    sentAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      recipientEmail: args.recipientEmail,
      type: args.type,
      channel: "email",
      subject: args.subject,
      body: args.body,
      status: args.status,
      sentAt: args.sentAt,
      readAt: undefined,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// ─── Email template builders ──────────────────────────────────

function buildVideoReceivedEmail() {
  return {
    subject: "We received your consultation video",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #2d2d2d;">
        <h2 style="color: #1a4a6b; font-size: 22px; margin-bottom: 16px;">Your video has been received</h2>
        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for completing your consultation. Your video has been received and is being reviewed by our clinical team.
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          You will hear back within <strong>24 hours</strong> with a decision from your provider.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="font-size: 14px; color: #666;">
          Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #1a4a6b;">${SUPPORT_EMAIL}</a> or call ${SUPPORT_PHONE}.
        </p>
      </div>
    `,
  };
}

function buildApprovedEmail(pharmacyDetails) {
  const pharmacySection = pharmacyDetails
    ? `<div style="background: #f0f7f0; border-left: 4px solid #2d8a4e; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 8px 0; color: #2d8a4e; font-size: 16px;">Pharmacy Details</h3>
        <p style="margin: 0; font-size: 15px;">${pharmacyDetails}</p>
      </div>`
    : "";

  return {
    subject: "Your prescription has been approved",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #2d2d2d;">
        <h2 style="color: #2d8a4e; font-size: 22px; margin-bottom: 16px;">Your prescription has been approved</h2>
        <p style="font-size: 16px; line-height: 1.6;">
          Good news — a licensed provider has reviewed your consultation and approved your prescription request.
        </p>
        ${pharmacySection}
        <p style="font-size: 16px; line-height: 1.6;">
          Your prescription is being processed. You will receive another notification when it is ready.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="font-size: 14px; color: #666;">
          Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #1a4a6b;">${SUPPORT_EMAIL}</a> or call ${SUPPORT_PHONE}.
        </p>
        <p style="font-size: 12px; color: #999; margin-top: 16px;">
          Telehealth services provided by licensed physicians.
        </p>
      </div>
    `,
  };
}

function buildRejectedEmail(reason, nextSteps) {
  const reasonSection = reason
    ? `<div style="background: #fdf8f0; border-left: 4px solid #b87a00; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 8px 0; color: #b87a00; font-size: 16px;">Provider Notes</h3>
        <p style="margin: 0; font-size: 15px;">${reason}</p>
      </div>`
    : "";

  const nextStepsText = nextSteps
    ? `<p style="font-size: 16px; line-height: 1.6;"><strong>Next steps:</strong> ${nextSteps}</p>`
    : `<p style="font-size: 16px; line-height: 1.6;">Please contact our support team to discuss your options and next steps.</p>`;

  return {
    subject: "Your consultation update",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #2d2d2d;">
        <h2 style="color: #1a4a6b; font-size: 22px; margin-bottom: 16px;">An update on your consultation</h2>
        <p style="font-size: 16px; line-height: 1.6;">
          After reviewing your consultation, our provider needs additional information before proceeding with your request.
        </p>
        ${reasonSection}
        ${nextStepsText}
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="font-size: 14px; color: #666;">
          We are here to help. Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #1a4a6b;">${SUPPORT_EMAIL}</a> or call ${SUPPORT_PHONE}.
        </p>
      </div>
    `,
  };
}

function buildPrescriptionSentEmail(prescriptionDetails) {
  const detailsSection = prescriptionDetails
    ? `<div style="background: #f0f4fb; border-left: 4px solid #1a4a6b; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 8px 0; color: #1a4a6b; font-size: 16px;">Prescription Details</h3>
        <p style="margin: 0; font-size: 15px;">${prescriptionDetails}</p>
      </div>`
    : "";

  return {
    subject: "Your prescription is on its way",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #2d2d2d;">
        <h2 style="color: #1a4a6b; font-size: 22px; margin-bottom: 16px;">Your prescription has been sent</h2>
        <p style="font-size: 16px; line-height: 1.6;">
          Your prescription has been sent to your pharmacy and is being prepared.
        </p>
        ${detailsSection}
        <p style="font-size: 16px; line-height: 1.6;">
          Your pharmacy will notify you when it is ready for pickup or delivery.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="font-size: 14px; color: #666;">
          Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #1a4a6b;">${SUPPORT_EMAIL}</a> or call ${SUPPORT_PHONE}.
        </p>
      </div>
    `,
  };
}

// ─── Shared email dispatch (EmailIt primary, SES fallback) ────

async function dispatchEmail(ctx, recipientEmail, subject, html, type, metadata) {
  let emailResult = { success: false, error: "No email provider configured", provider: null };

  // Primary: EmailIt
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (emailitKey) {
    try {
      const res = await fetch("https://api.emailit.com/v1/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${emailitKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: FROM_ADDRESS, to: recipientEmail, subject, html }),
      });
      if (res.ok) {
        const data = await res.json();
        emailResult = { success: true, provider: "emailit", messageId: data.id };
      } else {
        emailResult = { success: false, error: `EmailIt HTTP ${res.status}`, provider: "emailit" };
      }
    } catch (err) {
      emailResult = {
        success: false,
        error: err instanceof Error ? err.message : "EmailIt error",
        provider: "emailit",
      };
    }
  }

  // Fallback: AWS SES
  if (!emailResult.success) {
    const accessKey = process.env.AWS_SES_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
    const region = process.env.AWS_SES_REGION || "us-east-1";

    if (accessKey && secretKey) {
      try {
        const host = `email.${region}.amazonaws.com`;
        const body = JSON.stringify({
          FromEmailAddress: FROM_ADDRESS,
          Destination: { ToAddresses: [recipientEmail] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: "UTF-8" },
              Body: { Html: { Data: html, Charset: "UTF-8" } },
            },
          },
        });
        const res = await fetch(`https://${host}/v2/email/outbound-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (res.ok) {
          emailResult = { success: true, provider: "ses" };
        } else {
          emailResult = { success: false, error: `SES HTTP ${res.status}`, provider: "ses" };
        }
      } catch (err) {
        emailResult = {
          success: false,
          error: err instanceof Error ? err.message : "SES error",
          provider: "ses",
        };
      }
    }
  }

  await ctx.runMutation(internal.agents.notificationAgent.saveNotification, {
    recipientEmail,
    type,
    subject,
    body: html,
    status: emailResult.success ? "sent" : "failed",
    sentAt: emailResult.success ? Date.now() : undefined,
    metadata: { ...metadata, provider: emailResult.provider, error: emailResult.error },
  });

  return emailResult;
}

// ─── Actions ──────────────────────────────────────────────────

export const sendVideoReceived = action({
  args: {
    patientEmail: v.string(),
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const { subject, html } = buildVideoReceivedEmail();

    const result = await dispatchEmail(
      ctx,
      args.patientEmail,
      subject,
      html,
      "video_received",
      { consultationId: args.consultationId }
    );

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "notificationAgent",
      action: "sendVideoReceived",
      input: { patientEmail: args.patientEmail, consultationId: args.consultationId },
      output: result,
      success: result.success,
      durationMs: Date.now() - startTime,
    });

    return result;
  },
});

export const sendApproved = action({
  args: {
    patientEmail: v.string(),
    consultationId: v.id("consultations"),
    pharmacyDetails: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const { subject, html } = buildApprovedEmail(args.pharmacyDetails);

    const result = await dispatchEmail(
      ctx,
      args.patientEmail,
      subject,
      html,
      "approved",
      { consultationId: args.consultationId, pharmacyDetails: args.pharmacyDetails }
    );

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "notificationAgent",
      action: "sendApproved",
      input: { patientEmail: args.patientEmail, consultationId: args.consultationId },
      output: result,
      success: result.success,
      durationMs: Date.now() - startTime,
    });

    return result;
  },
});

export const sendRejected = action({
  args: {
    patientEmail: v.string(),
    consultationId: v.id("consultations"),
    reason: v.optional(v.string()),
    nextSteps: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const { subject, html } = buildRejectedEmail(args.reason, args.nextSteps);

    const result = await dispatchEmail(
      ctx,
      args.patientEmail,
      subject,
      html,
      "rejected",
      { consultationId: args.consultationId, reason: args.reason }
    );

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "notificationAgent",
      action: "sendRejected",
      input: { patientEmail: args.patientEmail, consultationId: args.consultationId },
      output: result,
      success: result.success,
      durationMs: Date.now() - startTime,
    });

    return result;
  },
});

export const sendPrescriptionSent = action({
  args: {
    patientEmail: v.string(),
    prescriptionDetails: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const { subject, html } = buildPrescriptionSentEmail(args.prescriptionDetails);

    const result = await dispatchEmail(
      ctx,
      args.patientEmail,
      subject,
      html,
      "prescription_sent",
      { prescriptionDetails: args.prescriptionDetails }
    );

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "notificationAgent",
      action: "sendPrescriptionSent",
      input: { patientEmail: args.patientEmail },
      output: result,
      success: result.success,
      durationMs: Date.now() - startTime,
    });

    return result;
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
      case "sendVideoReceived":
        return await ctx.runAction(
          internal.agents.notificationAgent.sendVideoReceived,
          args.input
        );
      case "sendApproved":
        return await ctx.runAction(
          internal.agents.notificationAgent.sendApproved,
          args.input
        );
      case "sendRejected":
        return await ctx.runAction(
          internal.agents.notificationAgent.sendRejected,
          args.input
        );
      case "sendPrescriptionSent":
        return await ctx.runAction(
          internal.agents.notificationAgent.sendPrescriptionSent,
          args.input
        );
      default:
        throw new Error(`Unknown notification task: ${args.task}`);
    }
  },
});
