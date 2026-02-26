"use node";
// @ts-nocheck
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * EMAIL AUTH (MAGIC LINK / CODE)
 * Fallback auth method for devices without passkey support,
 * or for development on localhost where RP ID doesn't match.
 *
 * Flow:
 * 1. User enters email
 * 2. Server generates 6-digit code, stores it, sends it via EmailIt
 * 3. User enters code
 * 4. Server verifies code, returns success
 * 5. Client creates session cookie (same as passkey flow)
 */

const EMAILIT_API_URL = "https://api.emailit.com/v1/emails";
const FROM_EMAIL = "noreply@scriptsxo.com";
const FROM_NAME = "ScriptsXO";

function generateCode(): string {
  // 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendCodeEmail(
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.EMAILIT_API_KEY;
  if (!apiKey) {
    console.error("[EMAIL_AUTH] EMAILIT_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  const subject = `${code} is your ScriptsXO verification code`;
  const textBody = `Your ScriptsXO verification code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can safely ignore this email.`;
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 13px; letter-spacing: 0.35em; color: #7C3AED; text-transform: uppercase;">ScriptsXO</span>
      </div>
      <div style="background: #FAFAFA; border-radius: 12px; padding: 32px; text-align: center;">
        <p style="color: #374151; font-size: 15px; margin: 0 0 24px 0;">Your verification code is:</p>
        <div style="font-size: 36px; font-weight: 600; letter-spacing: 0.3em; color: #1F2937; padding: 16px 0; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
          ${code}
        </div>
        <p style="color: #9CA3AF; font-size: 13px; margin: 24px 0 0 0;">Expires in 10 minutes</p>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `;

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
      console.error(`[EMAIL_AUTH] EmailIt error: ${response.status} - ${errorText}`);
      return { success: false, error: `Email delivery failed` };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[EMAIL_AUTH] Send failed: ${msg}`);
    return { success: false, error: "Email delivery failed" };
  }
}

// ─── Request Magic Link Code ──────────────────────────────────

export const requestCode = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    // Ensure a member record exists (creates one with role "patient" if new)
    await ctx.runMutation(api.members.getOrCreate, {
      email,
      name: email.split("@")[0],
    });

    // Generate and store code
    const code = generateCode();
    await ctx.runMutation(api.magicLinks.storeCode, { email, code });

    // Send the email
    const result = await sendCodeEmail(email, code);

    // Record notification for audit trail
    await ctx.runMutation(internal.email.recordNotification, {
      recipientEmail: email,
      type: "magic_link",
      subject: `${code} is your ScriptsXO verification code`,
      body: `Verification code: ${code}`,
      status: result.success ? "sent" : "failed",
      sentAt: result.success ? Date.now() : undefined,
      metadata: { error: result.error },
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  },
});

// ─── Verify Magic Link Code ──────────────────────────────────

export const verifyCode = action({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const code = args.code.trim();

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return { success: false, error: "Please enter a valid 6-digit code" };
    }

    const result = await ctx.runMutation(api.magicLinks.verifyCode, {
      email,
      code,
    });

    if (!result.valid) {
      return { success: false, error: result.error };
    }

    // Create a server-side session so sessionToken can be stored in the cookie.
    // The client must pass this token to all Convex mutations (never memberId).
    let sessionToken: string | undefined;
    try {
      const member = await ctx.runQuery(api.members.getByEmail, { email });
      const memberId: Id<"members"> = member
        ? member._id
        : (await ctx.runMutation(api.members.getOrCreate, { email, name: email.split("@")[0] })).memberId;
      const session = await ctx.runMutation(internal.sessions.create, { memberId, email });
      sessionToken = session.sessionToken;
    } catch (err) {
      console.error("[EMAIL_AUTH] Failed to create session:", err);
      // Auth succeeded — still return success; session creation failure is non-fatal here
    }

    return { success: true, sessionToken };
  },
});
