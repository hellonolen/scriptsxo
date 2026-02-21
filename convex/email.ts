// @ts-nocheck
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Email sending for ScriptsXO
 *
 * Primary: AWS SES v2 ($0.10/1,000 emails)
 * Fallback: EmailIt (if SES fails)
 *
 * Environment variables (set via npx convex env set):
 *   AWS_SES_ACCESS_KEY_ID     — IAM user access key with SES permissions
 *   AWS_SES_SECRET_ACCESS_KEY — IAM user secret key
 *   AWS_SES_REGION            — SES region (default: us-east-1)
 *   EMAILIT_API_KEY           — EmailIt API key (fallback)
 */

// ─── Constants ──────────────────────────────────────────────

const FROM_EMAIL = "noreply@scriptsxo.com";
const FROM_NAME = "ScriptsXO";
const FROM_ADDRESS = `${FROM_NAME} <${FROM_EMAIL}>`;
const EMAILIT_API_URL = "https://api.emailit.com/v1/emails";

// ─── Types ──────────────────────────────────────────────────

interface EmailSendResult {
  success: boolean;
  error?: string;
  messageId?: string;
  provider?: "ses" | "emailit";
}

// ─── AWS SES v2 — raw HTTP (no SDK needed) ──────────────────

function hmacSha256(
  key: Uint8Array,
  message: string
): Promise<ArrayBuffer> {
  return crypto.subtle
    .importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((k) =>
      crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message))
    );
}

async function sha256(message: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(
    new TextEncoder().encode("AWS4" + key),
    dateStamp
  );
  const kRegion = await hmacSha256(new Uint8Array(kDate), region);
  const kService = await hmacSha256(new Uint8Array(kRegion), service);
  return hmacSha256(new Uint8Array(kService), "aws4_request");
}

async function sendViaSES(
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<EmailSendResult> {
  const accessKey = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  const region = process.env.AWS_SES_REGION || "us-east-1";

  if (!accessKey || !secretKey) {
    return { success: false, error: "AWS SES not configured" };
  }

  const sender = from || FROM_ADDRESS;
  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;

  const body = JSON.stringify({
    FromEmailAddress: sender,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: html, Charset: "UTF-8" } },
      },
    },
  });

  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256(body);
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = `POST\n/v2/email/outbound-emails\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;

  const signingKey = await getSignatureKey(secretKey, dateStamp, region, "ses");
  const signatureBuffer = await hmacSha256(
    new Uint8Array(signingKey),
    stringToSign
  );
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Amz-Date": amzDate,
        Authorization: authHeader,
      },
      body,
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[SES] HTTP ${response.status}: ${errBody}`);
      return {
        success: false,
        error: `SES HTTP ${response.status}`,
        provider: "ses",
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.MessageId,
      provider: "ses",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[SES] Request failed:", message);
    return { success: false, error: message, provider: "ses" };
  }
}

// ─── EmailIt — fallback ─────────────────────────────────────

async function sendViaEmailItDirect(
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<EmailSendResult> {
  const apiKey = process.env.EMAILIT_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "EmailIt not configured",
      provider: "emailit",
    };
  }

  try {
    const response = await fetch(EMAILIT_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || FROM_ADDRESS,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[EMAILIT] HTTP ${response.status}: ${errBody}`);
      return {
        success: false,
        error: `EmailIt HTTP ${response.status}`,
        provider: "emailit",
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id || data.messageId || undefined,
      provider: "emailit",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[EMAILIT] Request failed:", message);
    return { success: false, error: message, provider: "emailit" };
  }
}

// ─── Public send — SES primary, EmailIt fallback ────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  from?: string
): Promise<EmailSendResult> {
  // Try SES first
  const sesResult = await sendViaSES(to, subject, html, from);
  if (sesResult.success) {
    return sesResult;
  }

  console.warn(
    `[EMAIL] SES failed (${sesResult.error}), trying EmailIt fallback...`
  );

  // Fall back to EmailIt
  const emailitResult = await sendViaEmailItDirect(to, subject, html, from);
  if (emailitResult.success) {
    return emailitResult;
  }

  console.error(
    `[EMAIL] Both providers failed. SES: ${sesResult.error}, EmailIt: ${emailitResult.error}`
  );
  return {
    success: false,
    error: `All providers failed. SES: ${sesResult.error}, EmailIt: ${emailitResult.error}`,
  };
}

// ─── Internal mutation to record notification ───────────────

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

// ─── Appointment Reminder ───────────────────────────────────

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

    const result = await sendEmail(
      args.recipientEmail,
      subject,
      htmlBody,
      textBody
    );

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
        provider: result.provider,
        messageId: result.messageId,
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

    const result = await sendEmail(
      args.recipientEmail,
      subject,
      htmlBody,
      textBody
    );

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
        provider: result.provider,
        messageId: result.messageId,
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

    const result = await sendEmail(
      args.recipientEmail,
      subject,
      htmlBody,
      textBody
    );

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
        provider: result.provider,
        messageId: result.messageId,
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

    const result = await sendEmail(
      args.recipientEmail,
      args.subject,
      htmlBody,
      args.body
    );

    await ctx.runMutation(internal.email.recordNotification, {
      recipientEmail: args.recipientEmail,
      type: "compliance_alert",
      subject: args.subject,
      body: args.body,
      status: result.success ? "sent" : "failed",
      sentAt: result.success ? Date.now() : undefined,
      metadata: {
        ...args.metadata,
        provider: result.provider,
        messageId: result.messageId,
        error: result.error,
      },
    });

    return { success: result.success, error: result.error };
  },
});
