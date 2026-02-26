import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * MAGIC LINK CODE STORAGE
 * Stores and verifies 6-digit email codes for passwordless auth.
 * Codes expire after 10 minutes and are single-use.
 */

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MS = 60 * 1000; // 1 minute between requests

/**
 * Store a new magic link code. Invalidates any previous codes for this email.
 */
export const storeCode = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    // Invalidate any existing unused codes for this email
    const existingCodes = await ctx.db
      .query("magicLinks")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    for (const existing of existingCodes) {
      if (!existing.consumed) {
        await ctx.db.patch(existing._id, { consumed: true });
      }
    }

    // Store the new code
    return await ctx.db.insert("magicLinks", {
      email,
      code: args.code,
      expiresAt: Date.now() + CODE_EXPIRY_MS,
      consumed: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Verify and consume a magic link code.
 * Returns { valid: true } if the code is correct and not expired.
 */
export const verifyCode = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    const records = await ctx.db
      .query("magicLinks")
      .withIndex("by_email_code", (q) =>
        q.eq("email", email).eq("code", args.code)
      )
      .collect();

    // Find a valid (not consumed, not expired) code
    const validRecord = records.find(
      (r) => !r.consumed && r.expiresAt > Date.now()
    );

    if (!validRecord) {
      return { valid: false, error: "Invalid or expired code" };
    }

    // Consume the code (single-use)
    await ctx.db.patch(validRecord._id, { consumed: true });

    return { valid: true };
  },
});

/**
 * Check rate limiting — prevent sending codes too frequently.
 */
export const checkRateLimit = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    const recentCodes = await ctx.db
      .query("magicLinks")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .take(1);

    if (recentCodes.length > 0) {
      const lastCode = recentCodes[0];
      const timeSince = Date.now() - lastCode.createdAt;
      if (timeSince < RATE_LIMIT_MS) {
        return {
          allowed: false,
          retryAfterMs: RATE_LIMIT_MS - timeSince,
        };
      }
    }

    return { allowed: true, retryAfterMs: 0 };
  },
});
