// @ts-nocheck
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Email sending via EmailIt (https://api.emailit.com).
 * All emails are recorded as notifications for audit trail.
 *
 * ENV REQUIRED: EMAILIT_API_KEY (set via npx convex env set)
 */

const EMAILIT_API_URL = "https://api.emailit.com/v1/emails";
const FROM_EMAIL = "noreply@scriptsxo.com";
const FROM_NAME = "ScriptsXO";

async function sendViaEmailIt(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.EMAILIT_API_KEY;
  if (!apiKey) {
    console.error("[EMAIL] EMAILIT_API_KEY not configured");
    return { success: false, error: "EMAILIT_API_KEY not configured" };
  }

  try {
    const response = await fetch(EMAILIT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EMAIL] EmailIt error: ${response.status} - ${errorText}`);
      return { success: false, error: `EmailIt ${response.status}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.id || data.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[EMAIL] Send failed: ${msg}`);
    return { success: false, error: msg };
  }
}

// ─── Internal mutation to record notification ────────────────

export const recordNotification = internalMutation({
  args: {
    recipientEmail: v.string(),
    recipientId: v.optional(v.id("members")),
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
      recipientId: args.recipientId,
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

// ─── Appointment Reminder ────────────────────────────────────

export const sendAppointmentReminder = action({
  args: {
    recipientEmail: v.string(),
    patientName: v.string(),
    providerName: v.string(),
    scheduledAt: v.number(),
    consultationType: v.string(),
  },
  handler: async (ctx, args) => {
    const scheduledDate = new Date(args.scheduledAt).toLocaleString();
    const subject = `Appointment Reminder: ${scheduledDate}`;
    const textBody = `Hi ${args.patientName}, your ${args.consultationType} consultation with ${args.providerName} is scheduled for ${scheduledDate}.`;
    const htmlBody = `<p>Hi ${args.patientName},</p><p>Your <strong>${args.consultationType}</strong> consultation with <strong>${args.providerName}</strong> is scheduled for <strong>${scheduledDate}</strong>.</p><p>Please log in to your ScriptsXO portal to prepare.</p>`;

    const result = await sendViaEmailIt(args.recipientEmail, subject, htmlBody, textBody);

    await ctx.runMutation(internal.email.recordNotification, {
      recipientEmail: args.recipientEmail,
      type: "appointment_reminder",
      subject,
      body: textBody,
      status: result.success ? "sent" : "failed",
      sentAt: result.success ? Date.now() : undefined,
      metadata: {
        scheduledAt: args.scheduledAt,
        providerName: args.providerName,
        emailitMessageId: result.messageId,
        error: result.error,
      },
    });

    return { success: result.success, error: result.error };
  },
});

// ─── Prescription Ready ─────────────────────────────────────

export const sendPrescriptionReady = action({
  args: {
    recipientEmail: v.string(),
    patientName: v.string(),
    medicationName: v.string(),
    pharmacyName: v.string(),
  },
  handler: async (ctx, args) => {
    const subject = `Your Prescription is Ready: ${args.medicationName}`;
    const textBody = `Hi ${args.patientName}, your prescription for ${args.medicationName} is ready for pickup at ${args.pharmacyName}.`;
    const htmlBody = `<p>Hi ${args.patientName},</p><p>Your prescription for <strong>${args.medicationName}</strong> is ready for pickup at <strong>${args.pharmacyName}</strong>.</p>`;

    const result = await sendViaEmailIt(args.recipientEmail, subject, htmlBody, textBody);

    await ctx.runMutation(internal.email.recordNotification, {
      recipientEmail: args.recipientEmail,
      type: "prescription_ready",
      subject,
      body: textBody,
      status: result.success ? "sent" : "failed",
      sentAt: result.success ? Date.now() : undefined,
      metadata: {
        medicationName: args.medicationName,
        pharmacyName: args.pharmacyName,
        emailitMessageId: result.messageId,
        error: result.error,
      },
    });

    return { success: result.success, error: result.error };
  },
});

// ─── Follow-Up Reminder ─────────────────────────────────────

export const sendFollowUpReminder = action({
  args: {
    recipientEmail: v.string(),
    patientName: v.string(),
    followUpType: v.string(),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args) => {
    const scheduledDate = new Date(args.scheduledFor).toLocaleString();
    const subject = `Follow-Up Required: ${args.followUpType}`;
    const textBody = `Hi ${args.patientName}, you have a ${args.followUpType} follow-up scheduled for ${scheduledDate}. Please log in to complete it.`;
    const htmlBody = `<p>Hi ${args.patientName},</p><p>You have a <strong>${args.followUpType}</strong> follow-up scheduled for <strong>${scheduledDate}</strong>.</p><p>Please log in to your ScriptsXO portal to complete it.</p>`;

    const result = await sendViaEmailIt(args.recipientEmail, subject, htmlBody, textBody);

    await ctx.runMutation(internal.email.recordNotification, {
      recipientEmail: args.recipientEmail,
      type: "follow_up",
      subject,
      body: textBody,
      status: result.success ? "sent" : "failed",
      sentAt: result.success ? Date.now() : undefined,
      metadata: {
        followUpType: args.followUpType,
        scheduledFor: args.scheduledFor,
        emailitMessageId: result.messageId,
        error: result.error,
      },
    });

    return { success: result.success, error: result.error };
  },
});

// ─── Compliance Alert ───────────────────────────────────────

export const sendComplianceAlert = action({
  args: {
    recipientEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const htmlBody = `<p>${args.body.replace(/\n/g, "</p><p>")}</p>`;

    const result = await sendViaEmailIt(args.recipientEmail, args.subject, htmlBody, args.body);

    await ctx.runMutation(internal.email.recordNotification, {
      recipientEmail: args.recipientEmail,
      type: "compliance_alert",
      subject: args.subject,
      body: args.body,
      status: result.success ? "sent" : "failed",
      sentAt: result.success ? Date.now() : undefined,
      metadata: {
        ...args.metadata,
        emailitMessageId: result.messageId,
        error: result.error,
      },
    });

    return { success: result.success, error: result.error };
  },
});
