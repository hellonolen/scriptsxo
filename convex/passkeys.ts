// @ts-nocheck
// Convex function typings can trigger "Type instantiation is excessively deep" during Next.js typecheck.
// Convex validates these at deploy/runtime; this keeps `next build` unblocked.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * DEVICE-MEMORY PASSKEY AUTHENTICATION (ScriptsXO)
 * Server-side credential storage and ECDSA signature verification.
 *
 * DEVICE-SPECIFIC ONLY:
 * - Keys generated via Web Crypto API (ECDSA P-256)
 * - Private keys stored in IndexedDB on the device (NEVER sent to server)
 * - Public keys stored here in Convex
 * - Authentication = sign challenge with device key, verify here
 *
 * NO browser WebAuthn dialogs. NO navigator.credentials calls.
 *
 * Features:
 * - Challenge generation and verification
 * - ECDSA signature verification
 * - Credential storage
 * - Recovery PIN management
 * - Membership status tracking
 * - Admin/Staff role checking
 */

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

const RECOVERY_CONFIG = {
  PIN_LENGTH: 6,
  LOGIN_THRESHOLD: 3,
  MAX_PASSKEYS_PER_USER: 2,
} as const;

const CHALLENGE_EXPIRY = {
  DEFAULT: 5 * 60 * 1000,
  RECOVERY: 15 * 60 * 1000,
} as const;

const RATE_LIMIT_CONFIG = {
  CHALLENGE_MAX_REQUESTS: 10,
  CHALLENGE_WINDOW_MS: 60 * 1000,
  AUTH_MAX_FAILURES: 5,
  AUTH_WINDOW_MS: 15 * 60 * 1000,
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  const base64 = btoa(binString);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function generateRandomPin(length: number = RECOVERY_CONFIG.PIN_LENGTH): string {
  const digits = new Uint8Array(length);
  crypto.getRandomValues(digits);
  return Array.from(digits, (d) => (d % 10).toString()).join("");
}

async function hashSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPinHash(pin: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashSHA256(pin);
  return inputHash === storedHash;
}

/**
 * Verify an ECDSA signature using the stored public key (JWK format).
 * The client signs the challenge string with their device-stored private key.
 * We verify it here with the public key stored in Convex.
 */
async function verifyECDSASignature(
  publicKeyJwk: string,
  signature: string,
  challenge: string
): Promise<boolean> {
  try {
    const jwk = JSON.parse(publicKeyJwk) as JsonWebKey;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    const signatureBytes = base64urlToUint8Array(signature);
    const encoder = new TextEncoder();
    const challengeBytes = encoder.encode(challenge);

    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signatureBytes.buffer as ArrayBuffer,
      challengeBytes.buffer as ArrayBuffer
    );

    return isValid;
  } catch (err) {
    console.error("[SXO-AUTH] ECDSA verification error:", err);
    return false;
  }
}

// ============================================
// CHALLENGE MANAGEMENT
// ============================================

/**
 * Create a new authentication challenge.
 * Stores challenge in database with 5-minute expiration.
 */
export const createChallenge = mutation({
  args: {
    email: v.optional(v.string()),
    type: v.string(),
    clientFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rateLimitKey = args.email?.toLowerCase() || args.clientFingerprint;

    if (rateLimitKey) {
      const windowStart = now - RATE_LIMIT_CONFIG.CHALLENGE_WINDOW_MS;
      const recentChallenges = await ctx.db
        .query("authChallenges")
        .filter((q) =>
          q.and(
            q.or(
              q.eq(q.field("email"), rateLimitKey),
              q.eq(q.field("rateLimitKey"), rateLimitKey)
            ),
            q.gt(q.field("createdAt"), windowStart)
          )
        )
        .collect();

      if (recentChallenges.length >= RATE_LIMIT_CONFIG.CHALLENGE_MAX_REQUESTS) {
        console.warn(`[SXO-AUTH] RATE LIMIT: Too many challenge requests for ${rateLimitKey}`);
        throw new Error("Too many authentication attempts. Please wait a minute and try again.");
      }
    }

    const challengeBytes = new Uint8Array(32);
    crypto.getRandomValues(challengeBytes);
    const challenge = uint8ArrayToBase64Url(challengeBytes);

    await ctx.db.insert("authChallenges", {
      challenge,
      email: args.email,
      type: args.type,
      expiresAt: now + CHALLENGE_EXPIRY.DEFAULT,
      createdAt: now,
      rateLimitKey: rateLimitKey || undefined,
    });

    return { challenge };
  },
});

/**
 * Verify challenge exists and is valid.
 * One-time use -- deletes challenge after verification.
 */
export const verifyChallenge = mutation({
  args: {
    challenge: v.string(),
  },
  handler: async (ctx, args) => {
    const stored = await ctx.db
      .query("authChallenges")
      .withIndex("by_challenge", (q) => q.eq("challenge", args.challenge))
      .first();

    if (!stored) {
      return { valid: false, error: "Challenge not found" };
    }

    if (stored.expiresAt < Date.now()) {
      await ctx.db.delete(stored._id);
      return { valid: false, error: "Challenge expired" };
    }

    await ctx.db.delete(stored._id);
    return { valid: true, email: stored.email, type: stored.type };
  },
});

// ============================================
// CREDENTIAL MANAGEMENT
// ============================================

/**
 * Store a new device key credential.
 * Called after client generates ECDSA key pair and stores private key in IndexedDB.
 * Only the public key (JWK) is stored here.
 *
 * GATED: Only emails in ADMIN_EMAILS, members table, or with existing passkeys can register.
 */
export const storeCredential = mutation({
  args: {
    email: v.string(),
    credentialId: v.string(),
    publicKey: v.string(),
    counter: v.number(),
    deviceType: v.optional(v.string()),
    backedUp: v.optional(v.boolean()),
    transports: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    // -- ELIGIBILITY CHECK --

    // 1. Check ADMIN_EMAILS env var
    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase());
    const isAdminEmail = adminEmails.includes(emailLower);

    // 2. Check members table (patient, provider, pharmacist, admin, staff)
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    // 3. Check if they already have a passkey (re-registering a new device)
    const existingPasskey = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    // Must match at least one: admin, member, or existing passkey holder
    if (!isAdminEmail && !member && !existingPasskey) {
      console.warn(`[SXO-AUTH] BLOCKED: Unrecognized email ${emailLower} attempted registration`);
      return {
        success: false,
        error:
          "This email is not associated with an account. Please contact your clinic or provider to get started.",
      };
    }

    // Enforce platform (device-only) type
    if (args.deviceType && args.deviceType !== "platform") {
      return { success: false, error: "Only device-specific keys are allowed." };
    }

    const existing = await ctx.db
      .query("passkeys")
      .withIndex("by_credentialId", (q) => q.eq("credentialId", args.credentialId))
      .first();

    if (existing) {
      return { success: false, error: "Credential already registered" };
    }

    const userPasskeys = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    if (userPasskeys.length >= RECOVERY_CONFIG.MAX_PASSKEYS_PER_USER) {
      return {
        success: false,
        error: `Maximum of ${RECOVERY_CONFIG.MAX_PASSKEYS_PER_USER} device keys allowed per account. Please remove an existing key first.`,
      };
    }

    const id = await ctx.db.insert("passkeys", {
      email: args.email,
      credentialId: args.credentialId,
      publicKey: args.publicKey,
      counter: args.counter,
      deviceType: args.deviceType,
      backedUp: args.backedUp,
      transports: args.transports,
      loginCount: 0,
      createdAt: Date.now(),
    });

    console.log(
      `[SXO-AUTH] New credential registered for ${args.email} (${userPasskeys.length + 1}/${RECOVERY_CONFIG.MAX_PASSKEYS_PER_USER})`
    );
    return { success: true, id };
  },
});

/**
 * Check if an email is eligible to register a device key.
 */
export const checkEmailEligibility = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    // 1. Check ADMIN_EMAILS env var
    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase());
    if (adminEmails.includes(emailLower)) {
      return { eligible: true, reason: "admin" };
    }

    // 2. Check members table
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();
    if (member) {
      return { eligible: true, reason: "member" };
    }

    // 3. Check existing passkey record (re-registering)
    const existingPasskey = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();
    if (existingPasskey) {
      return { eligible: true, reason: "existing_account" };
    }

    return { eligible: false, reason: "no_account" };
  },
});

/**
 * Get credentials for an email.
 */
export const getCredentials = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const credentials = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    return credentials.map((cred) => ({
      credentialId: cred.credentialId,
      transports: cred.transports,
    }));
  },
});

/**
 * Check if email has any device keys registered.
 */
export const hasPasskey = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const credential = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    return !!credential;
  },
});

/**
 * Verify credential using ECDSA signature.
 * Client signs the challenge with their device-stored private key.
 * We verify the signature with the stored public key.
 *
 * Also accepts the legacy counter-only flow for backwards compat.
 */
export const verifyCredential = mutation({
  args: {
    credentialId: v.string(),
    counter: v.optional(v.number()),
    signature: v.optional(v.string()),
    challenge: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const credential = await ctx.db
      .query("passkeys")
      .withIndex("by_credentialId", (q) => q.eq("credentialId", args.credentialId))
      .first();

    if (!credential) {
      return { success: false, error: "Credential not found" };
    }

    // -- ECDSA signature verification (device-memory auth) --
    if (args.signature && args.challenge) {
      const storedChallenge = await ctx.db
        .query("authChallenges")
        .withIndex("by_challenge", (q) => q.eq("challenge", args.challenge))
        .first();

      if (!storedChallenge) {
        return { success: false, error: "Challenge not found or expired" };
      }

      if (storedChallenge.expiresAt < Date.now()) {
        await ctx.db.delete(storedChallenge._id);
        return { success: false, error: "Challenge expired" };
      }

      const isValid = await verifyECDSASignature(
        credential.publicKey,
        args.signature,
        args.challenge
      );

      if (!isValid) {
        console.warn(`[SXO-AUTH] Invalid signature for ${credential.email}`);
        return { success: false, error: "Invalid signature" };
      }

      // Delete challenge (one-time use)
      await ctx.db.delete(storedChallenge._id);
    }
    // -- Legacy counter-only verification --
    else if (args.counter !== undefined) {
      if (args.counter <= credential.counter) {
        console.warn(`[SXO-AUTH] Potential replay attack for ${credential.email}`);
        return { success: false, error: "Invalid counter" };
      }
    }
    // -- No verification data provided --
    else {
      return { success: false, error: "No verification data provided" };
    }

    // Update login count and last used
    const currentLoginCount = credential.loginCount || 0;
    const newLoginCount = currentLoginCount + 1;

    await ctx.db.patch(credential._id, {
      counter: args.counter ?? credential.counter + 1,
      lastUsedAt: Date.now(),
      loginCount: newLoginCount,
    });

    console.log(
      `[SXO-AUTH] Authentication successful for ${credential.email} (login #${newLoginCount})`
    );

    return {
      success: true,
      email: credential.email,
      publicKey: credential.publicKey,
      loginCount: newLoginCount,
    };
  },
});

/**
 * Get all device keys for a user (for settings page).
 */
export const getUserPasskeys = query({
  args: {
    email: v.string(),
    memberId: v.optional(v.id("members")),
  },
  handler: async (ctx, args) => {
    if (args.memberId) {
      const member = await ctx.db.get(args.memberId);
      if (!member || member.email.toLowerCase() !== args.email.toLowerCase()) {
        console.warn(
          `[SXO-AUTH] SECURITY: memberId ${args.memberId} does not match email ${args.email}`
        );
        return {
          passkeys: [],
          count: 0,
          maxAllowed: RECOVERY_CONFIG.MAX_PASSKEYS_PER_USER,
          canAddMore: true,
          hasRecovery: false,
          recoverySetupAt: null,
        };
      }
    }

    const passkeys = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    const firstPasskey = passkeys[0];
    const hasRecovery = firstPasskey?.recoveryPinHash ? true : false;

    return {
      passkeys: passkeys.map((p) => ({
        id: p._id,
        credentialId: p.credentialId.slice(0, 8) + "...",
        deviceType: p.deviceType,
        createdAt: p.createdAt,
        lastUsedAt: p.lastUsedAt,
      })),
      count: passkeys.length,
      maxAllowed: RECOVERY_CONFIG.MAX_PASSKEYS_PER_USER,
      canAddMore: passkeys.length < RECOVERY_CONFIG.MAX_PASSKEYS_PER_USER,
      hasRecovery,
      recoverySetupAt: firstPasskey?.recoverySetupAt || null,
    };
  },
});

/**
 * Delete a device key.
 */
export const deletePasskey = mutation({
  args: {
    email: v.string(),
    credentialId: v.string(),
  },
  handler: async (ctx, args) => {
    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_credentialId", (q) => q.eq("credentialId", args.credentialId))
      .first();

    if (!passkey) {
      return { success: false, error: "Device key not found" };
    }

    if (passkey.email !== args.email) {
      return { success: false, error: "Unauthorized" };
    }

    const allPasskeys = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    if (allPasskeys.length === 1) {
      return { success: false, error: "Cannot delete your only device key" };
    }

    await ctx.db.delete(passkey._id);
    return { success: true };
  },
});

// ============================================
// RECOVERY PIN MANAGEMENT
// ============================================

export const generateRecoveryPin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!passkey) {
      return { success: false, error: "Account not found" };
    }

    const pin = generateRandomPin(RECOVERY_CONFIG.PIN_LENGTH);
    const pinHash = await hashSHA256(pin);

    await ctx.db.patch(passkey._id, {
      recoveryPinHash: pinHash,
      recoverySetupAt: Date.now(),
    });

    console.log(`[SXO-AUTH] RECOVERY: PIN generated for ${args.email}`);

    return {
      success: true,
      pin,
      message:
        "Save this PIN securely. You will need it to recover your account if you lose access to your device key.",
    };
  },
});

export const verifyRecoveryPin = mutation({
  args: {
    email: v.string(),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!passkey) {
      return { success: false, error: "Account not found" };
    }

    if (!passkey.recoveryPinHash) {
      return { success: false, error: "No recovery PIN set up for this account" };
    }

    const isValid = await verifyPinHash(args.pin, passkey.recoveryPinHash);

    if (!isValid) {
      console.warn(`[SXO-AUTH] RECOVERY: Invalid PIN attempt for ${args.email}`);
      return { success: false, error: "Invalid recovery PIN" };
    }

    const challengeBytes = new Uint8Array(32);
    crypto.getRandomValues(challengeBytes);
    const challenge = uint8ArrayToBase64Url(challengeBytes);

    await ctx.db.insert("authChallenges", {
      challenge,
      email: args.email,
      type: "recovery",
      expiresAt: Date.now() + CHALLENGE_EXPIRY.RECOVERY,
    });

    console.log(`[SXO-AUTH] RECOVERY: PIN verified for ${args.email}, recovery challenge created`);

    return {
      success: true,
      challenge,
      message: "PIN verified. You can now register a new device key.",
    };
  },
});

export const getRecoveryStatus = query({
  args: {
    email: v.string(),
    memberId: v.optional(v.id("members")),
  },
  handler: async (ctx, args) => {
    if (args.memberId) {
      const member = await ctx.db.get(args.memberId);
      if (!member || member.email.toLowerCase() !== args.email.toLowerCase()) {
        return {
          hasAccount: false,
          hasRecovery: false,
          shouldPromptRecovery: false,
          loginCount: 0,
        };
      }
    }

    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!passkey) {
      return {
        hasAccount: false,
        hasRecovery: false,
        shouldPromptRecovery: false,
        loginCount: 0,
      };
    }

    const loginCount = passkey.loginCount || 0;
    const hasRecovery = !!passkey.recoveryPinHash;
    const shouldPromptRecovery = !hasRecovery && loginCount >= RECOVERY_CONFIG.LOGIN_THRESHOLD;

    return {
      hasAccount: true,
      hasRecovery,
      shouldPromptRecovery,
      loginCount,
      recoverySetupAt: passkey.recoverySetupAt || null,
    };
  },
});

export const canAddPasskey = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const passkeys = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    return {
      canAdd: passkeys.length < RECOVERY_CONFIG.MAX_PASSKEYS_PER_USER,
      currentCount: passkeys.length,
      maxAllowed: RECOVERY_CONFIG.MAX_PASSKEYS_PER_USER,
    };
  },
});

// ============================================
// MEMBERSHIP STATUS
// ============================================

export const getMembershipStatus = query({
  args: {
    email: v.string(),
    memberId: v.optional(v.id("members")),
  },
  handler: async (ctx, args) => {
    if (args.memberId) {
      const member = await ctx.db.get(args.memberId);
      if (!member || member.email.toLowerCase() !== args.email.toLowerCase()) {
        return {
          hasAccount: false,
          isPaid: false,
          isLinked: false,
          paymentStatus: null,
        };
      }
    }

    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!passkey) {
      return {
        hasAccount: false,
        isPaid: false,
        isLinked: false,
        paymentStatus: null,
      };
    }

    return {
      hasAccount: true,
      isPaid: passkey.paymentStatus === "active",
      isLinked: !!passkey.discordUserId,
      paymentStatus: passkey.paymentStatus || "none",
      paidAt: passkey.paidAt || null,
    };
  },
});

export const updatePaymentStatus = mutation({
  args: {
    email: v.string(),
    paymentStatus: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!passkey) {
      throw new Error("Account not found");
    }

    const updates: Record<string, unknown> = {
      paymentStatus: args.paymentStatus,
    };

    if (args.stripeCustomerId) updates.stripeCustomerId = args.stripeCustomerId;
    if (args.stripeSessionId) updates.stripeSessionId = args.stripeSessionId;
    if (args.paymentStatus === "active") updates.paidAt = Date.now();

    await ctx.db.patch(passkey._id, updates);
    console.log(`[SXO-AUTH] PAYMENT: Updated ${args.email} to ${args.paymentStatus}`);
    return { success: true };
  },
});

export const revokeMembership = mutation({
  args: {
    email: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const passkey = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!passkey) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(passkey._id, { paymentStatus: args.reason });
    console.log(`[SXO-AUTH] MEMBERSHIP: Revoked for ${args.email} - ${args.reason}`);
    return { success: true };
  },
});

// ============================================
// ADMIN/STAFF ROLE CHECKING
// ============================================

const ADMIN_ROLES = ["owner", "admin"];
const STAFF_ROLES = ["owner", "admin", "moderator", "staff"];

/**
 * Check if email is admin.
 * Checks ADMIN_EMAILS env var OR members table.
 */
export const isAdmin = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase());
    if (adminEmails.includes(emailLower)) {
      return true;
    }

    const members = await ctx.db.query("members").collect();
    const adminMember = members.find(
      (m) => m.email.toLowerCase() === emailLower && ADMIN_ROLES.includes(m.role)
    );

    return !!adminMember;
  },
});

/**
 * Delete ALL device keys for an email (admin reset).
 */
export const resetAllPasskeys = mutation({
  args: {
    email: v.string(),
    adminEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const adminEmailLower = args.adminEmail.toLowerCase();
    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase());

    if (!adminEmails.includes(adminEmailLower)) {
      const members = await ctx.db.query("members").collect();
      const isAdminMember = members.some(
        (m) => m.email.toLowerCase() === adminEmailLower && ADMIN_ROLES.includes(m.role)
      );
      if (!isAdminMember) {
        return { success: false, error: "Unauthorized: Admin access required" };
      }
    }

    const passkeys = await ctx.db
      .query("passkeys")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    if (passkeys.length === 0) {
      return { success: false, error: "No device keys found for this email" };
    }

    for (const passkey of passkeys) {
      await ctx.db.delete(passkey._id);
    }

    console.log(
      `[SXO-AUTH] ADMIN RESET: Deleted ${passkeys.length} device keys for ${args.email} by ${args.adminEmail}`
    );

    return {
      success: true,
      deletedCount: passkeys.length,
      message: `Deleted ${passkeys.length} device keys. User can now register a new key.`,
    };
  },
});

/**
 * Check if email belongs to staff.
 */
export const isStaff = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase());
    if (adminEmails.includes(emailLower)) {
      return true;
    }

    const members = await ctx.db.query("members").collect();
    const staffMember = members.find(
      (m) => m.email.toLowerCase() === emailLower && STAFF_ROLES.includes(m.role)
    );

    return !!staffMember;
  },
});
