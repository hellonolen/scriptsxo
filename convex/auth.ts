import { mutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Magic Link + Backup Code Auth for ScriptsXO
 * Standard login flow: First Name + Email → magic link → signed in
 * Backup: 8-digit code sent to email → user enters code → signed in
 */

// Generate cryptographically secure token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Generate 8-digit numeric code
function generate8DigitCode(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const num =
    ((array[0] << 24) | (array[1] << 16) | (array[2] << 8) | array[3]) >>> 0;
  return (num % 100000000).toString().padStart(8, "0");
}

// Step 1: Send magic link (primary)
export const sendMagicLink = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const token = generateSecureToken();
    const code = generate8DigitCode();

    // Expire old codes for this email
    const existing = await ctx.db
      .query("loginCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    for (const old of existing) {
      if (!old.used) await ctx.db.patch(old._id, { used: true });
    }

    // Create new login code record
    await ctx.db.insert("loginCodes", {
      email,
      code,
      token,
      firstName: args.firstName.trim(),
      type: "magic_link",
      used: false,
      expiresAt: Date.now() + 15 * 60 * 1000,
      createdAt: Date.now(),
    });

    // Schedule email send
    const siteUrl = process.env.SITE_URL || "https://scriptsxo.com";
    const magicLinkUrl = `${siteUrl}/api/auth/verify?token=${token}`;

    await ctx.scheduler.runAfter(0, internal.auth.sendMagicLinkEmail, {
      to: email,
      firstName: args.firstName.trim(),
      magicLinkUrl,
    });

    return { success: true as const, error: null };
  },
});

// Internal action to send magic link email
export const sendMagicLinkEmail = internalAction({
  args: {
    to: v.string(),
    firstName: v.string(),
    magicLinkUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.EMAILIT_API_KEY;
    if (!apiKey) return;

    await fetch("https://api.emailit.com/v1/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "ScriptsXO <noreply@scriptsxo.com>",
        to: args.to,
        subject: "Sign in to ScriptsXO",
        html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px"><h2 style="margin-bottom:24px">Sign In</h2><p>Hi ${args.firstName},</p><p>Click the link below to sign in to ScriptsXO:</p><p style="margin:24px 0"><a href="${args.magicLinkUrl}" style="display:inline-block;padding:14px 28px;background:#7C3AED;color:white;text-decoration:none;border-radius:5px;font-weight:600">Sign In to ScriptsXO</a></p><p style="color:#666;font-size:14px">This link expires in 15 minutes.</p></div>`,
      }),
    });
  },
});

// Step 2 (backup): Send 8-digit code
export const sendBackupCode = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    const existing = await ctx.db
      .query("loginCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .first();

    if (!existing || existing.used || existing.expiresAt < Date.now()) {
      return { success: false, error: "No active login session. Please start over." };
    }

    await ctx.db.patch(existing._id, { type: "backup_code" });

    await ctx.scheduler.runAfter(0, internal.auth.sendBackupCodeEmail, {
      to: email,
      firstName: existing.firstName,
      code: existing.code,
    });

    return { success: true };
  },
});

// Internal action to send backup code email
export const sendBackupCodeEmail = internalAction({
  args: {
    to: v.string(),
    firstName: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.EMAILIT_API_KEY;
    if (!apiKey) return;

    await fetch("https://api.emailit.com/v1/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "ScriptsXO <noreply@scriptsxo.com>",
        to: args.to,
        subject: `${args.code} — Your ScriptsXO sign-in code`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px"><h2 style="margin-bottom:24px">Your Sign-In Code</h2><p>Hi ${args.firstName},</p><p>Your sign-in code is:</p><div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin:24px 0"><span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#7C3AED">${args.code}</span></div><p style="color:#666;font-size:14px">This code expires in 15 minutes.</p></div>`,
      }),
    });
  },
});

// Step 3: Verify backup code
export const verifyBackupCode = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    const loginCode = await ctx.db
      .query("loginCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .first();

    if (!loginCode) {
      return { success: false, error: "No code found. Please request a new one." };
    }
    if (loginCode.used) {
      return { success: false, error: "Code already used. Please request a new one." };
    }
    if (loginCode.expiresAt < Date.now()) {
      return { success: false, error: "Code expired. Please request a new one." };
    }
    if (loginCode.code !== args.code.trim()) {
      return { success: false, error: "Invalid code. Please check and try again." };
    }

    await ctx.db.patch(loginCode._id, { used: true });

    // Check admin status
    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase());
    const isAdmin = adminEmails.includes(email);

    return {
      success: true,
      email,
      name: loginCode.firstName,
      role: isAdmin ? "admin" : "member",
      isAdmin,
    };
  },
});

// Verify magic link token (called from API route)
export const verifyMagicLinkToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const loginCode = await ctx.db
      .query("loginCodes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!loginCode) return { success: false, error: "Invalid link." };
    if (loginCode.used) return { success: false, error: "Link already used." };
    if (loginCode.expiresAt < Date.now()) return { success: false, error: "Link expired." };

    await ctx.db.patch(loginCode._id, { used: true });

    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase());
    const isAdmin = adminEmails.includes(loginCode.email);

    return {
      success: true,
      email: loginCode.email,
      name: loginCode.firstName,
      role: isAdmin ? "admin" : "member",
      isAdmin,
    };
  },
});
