// @ts-nocheck
/**
 * PLATFORM ADMIN MODULE
 *
 * The ONLY way to set isPlatformOwner on a member record.
 * Platform owner is orthogonal to roles — it is a separate root-level flag
 * checked before any role/cap logic and independent of ROLE_CAPS bundles.
 *
 * ─── Bootstrap (one-time) ────────────────────────────────────────────────────
 *
 *   npx convex run platformAdmin:seed '{"email":"you@example.com"}'
 *
 *   seed() is permanently disabled once any platform owner exists.
 *   It cannot be re-enabled through code — only a break-glass DB edit can
 *   restore access if all owners are lost. See /docs/ops/platform-owner-recovery.md
 *
 * ─── Grant (two-step, 60s cooldown) ──────────────────────────────────────────
 *
 *   Step 1 — request:
 *     npx convex run platformAdmin:requestPlatformOwnerGrant \
 *       '{"sessionToken":"<token>","targetMemberId":"<id>","confirmationPhrase":"GRANT_PLATFORM_OWNER"}'
 *     → returns { requestId, confirmsAfter }
 *
 *   Wait 60 seconds.
 *
 *   Step 2 — confirm:
 *     npx convex run platformAdmin:confirmPlatformOwnerGrant \
 *       '{"sessionToken":"<token>","requestId":"<id>"}'
 *     → grant applied
 *
 * ─── Revoke ───────────────────────────────────────────────────────────────────
 *
 *   npx convex run platformAdmin:revokePlatformOwner \
 *     '{"sessionToken":"<token>","targetMemberId":"<id>","confirmationPhrase":"REVOKE_PLATFORM_OWNER"}'
 *
 * ─── What you must NOT do ─────────────────────────────────────────────────────
 *
 *   - No email allowlists
 *   - No "dev bypass" — even in local dev
 *   - No granting via org admin UI
 *   - No multiple owners "for convenience" — add a second only if first is lost
 *
 * ─── Security model ───────────────────────────────────────────────────────────
 *
 *   Every attempt (success or failure) is logged to securityEvents.
 *   seed() logs under PLATFORM_OWNER_SEED.
 *   grant request/confirm logs under PLATFORM_OWNER_GRANT_REQUESTED / _CONFIRMED.
 *   revoke logs under PLATFORM_OWNER_REVOKE.
 *   Passkey re-auth is enforced by the caller before invoking these mutations
 *   (the frontend must complete a fresh WebAuthn challenge < 5 min ago).
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { logSecurityEvent } from "./lib/securityAudit";
import { getCaller, getCallerQuery } from "./lib/serverAuth";

const GRANT_PHRASE = "GRANT_PLATFORM_OWNER";
const REVOKE_PHRASE = "REVOKE_PLATFORM_OWNER";
const COOLDOWN_MS = 60_000;        // 60 seconds
const GRANT_WINDOW_MS = 300_000;   // 5 minutes to confirm after cooldown

// ─── Helpers ────────────────────────────────────────────────────────────────

async function requirePlatformOwner(ctx: any, sessionToken: string | null | undefined) {
  if (!sessionToken) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
  }
  const caller = await getCaller(ctx, sessionToken);
  if (!caller.isPlatformOwner) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only a platform owner may perform this action.",
    });
  }
  return caller;
}

// ─── seed ────────────────────────────────────────────────────────────────────

/**
 * One-time bootstrap. Open only when zero platform owners exist.
 * Permanently disabled after first successful call.
 */
export const seed = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    const existingOwners = await ctx.db
      .query("members")
      .filter((q: any) => q.eq(q.field("isPlatformOwner"), true))
      .collect();

    if (existingOwners.length > 0) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_SEED",
        actorMemberId: null,
        targetId: emailLower,
        targetType: "platform",
        success: false,
        reason: "Seed already completed — platform owner exists.",
      });
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Bootstrap already completed. Use requestPlatformOwnerGrant.",
      });
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q: any) => q.eq("email", emailLower))
      .first();

    if (!member) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_SEED",
        actorMemberId: null,
        targetId: emailLower,
        targetType: "platform",
        success: false,
        reason: `No member found with email ${emailLower}.`,
      });
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `No member with email ${emailLower}. Create the member first.`,
      });
    }

    await ctx.db.patch(member._id, { isPlatformOwner: true, role: "admin" });

    await logSecurityEvent(ctx, {
      action: "PLATFORM_OWNER_SEED",
      actorMemberId: member._id,
      targetId: member._id,
      targetType: "member",
      success: true,
      reason: "Bootstrap seed — first platform owner established.",
    });

    return { success: true, memberId: member._id };
  },
});

// ─── requestPlatformOwnerGrant ───────────────────────────────────────────────

/**
 * Step 1 of 2: request a platform owner grant.
 *
 * Requirements:
 *   - Caller must already be a platform owner
 *   - confirmationPhrase must equal exactly "GRANT_PLATFORM_OWNER"
 *   - Target must not already be a platform owner
 *
 * Creates a pending grant with a 60s cooldown. Call confirmPlatformOwnerGrant
 * after the cooldown to apply.
 */
export const requestPlatformOwnerGrant = mutation({
  args: {
    sessionToken: v.string(),
    targetMemberId: v.id("members"),
    confirmationPhrase: v.string(),
  },
  handler: async (ctx, args) => {
    // Phrase check first (fast fail, no DB read needed for audit target)
    if (args.confirmationPhrase !== GRANT_PHRASE) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_REQUESTED",
        actorMemberId: null,
        targetId: args.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Wrong confirmation phrase.",
      });
      throw new ConvexError({
        code: "FORBIDDEN",
        message: `confirmationPhrase must be exactly "${GRANT_PHRASE}".`,
      });
    }

    // Caller must be platform owner
    let caller;
    try {
      caller = await requirePlatformOwner(ctx, args.sessionToken);
    } catch (err) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_REQUESTED",
        actorMemberId: null,
        targetId: args.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Caller is not a platform owner.",
      });
      throw err;
    }

    const target = await ctx.db.get(args.targetMemberId);
    if (!target) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_REQUESTED",
        actorMemberId: caller.memberId,
        targetId: args.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Target member not found.",
      });
      throw new ConvexError({ code: "NOT_FOUND", message: "Target member not found." });
    }

    if (target.isPlatformOwner) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_REQUESTED",
        actorMemberId: caller.memberId,
        targetId: args.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Target is already a platform owner.",
      });
      throw new ConvexError({
        code: "CONFLICT",
        message: "Target is already a platform owner.",
      });
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("pendingPlatformOwnerGrants", {
      requestedBy: caller.memberId,
      targetMemberId: args.targetMemberId,
      requestedAt: now,
      confirmsAfter: now + COOLDOWN_MS,
      expiresAt: now + COOLDOWN_MS + GRANT_WINDOW_MS,
      status: "pending",
    });

    await logSecurityEvent(ctx, {
      action: "PLATFORM_OWNER_GRANT_REQUESTED",
      actorMemberId: caller.memberId,
      actorOrgId: caller.orgId ?? null,
      targetId: args.targetMemberId,
      targetType: "member",
      diff: { requestId, confirmsAfter: now + COOLDOWN_MS },
      success: true,
      reason: `Grant requested. Confirm after ${COOLDOWN_MS / 1000}s.`,
    });

    return {
      requestId,
      confirmsAfter: now + COOLDOWN_MS,
      expiresAt: now + COOLDOWN_MS + GRANT_WINDOW_MS,
    };
  },
});

// ─── confirmPlatformOwnerGrant ───────────────────────────────────────────────

/**
 * Step 2 of 2: confirm a pending grant after the 60s cooldown has elapsed.
 *
 * Requirements:
 *   - callerId must match grant.requestedBy (same caller as request)
 *   - 60s must have elapsed since the request
 *   - Grant must not be expired (5 min window after cooldown)
 */
export const confirmPlatformOwnerGrant = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("pendingPlatformOwnerGrants"),
  },
  handler: async (ctx, args) => {
    // Resolve caller first — all subsequent checks need the memberId
    const caller = await requirePlatformOwner(ctx, args.sessionToken);

    const grant = await ctx.db.get(args.requestId);
    if (!grant) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_CONFIRMED",
        actorMemberId: caller.memberId,
        targetId: args.requestId,
        targetType: "platform",
        success: false,
        reason: "Grant request not found.",
      });
      throw new ConvexError({ code: "NOT_FOUND", message: "Grant request not found." });
    }

    if (grant.status !== "pending") {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_CONFIRMED",
        actorMemberId: caller.memberId,
        targetId: grant.targetMemberId,
        targetType: "member",
        success: false,
        reason: `Grant is not pending (status: ${grant.status}).`,
      });
      throw new ConvexError({
        code: "CONFLICT",
        message: `Grant request is already ${grant.status}.`,
      });
    }

    // Must be the same caller who requested
    if (caller.memberId !== grant.requestedBy) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_CONFIRMED",
        actorMemberId: caller.memberId,
        targetId: grant.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Caller does not match original requester.",
      });
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the original requester may confirm this grant.",
      });
    }

    const now = Date.now();

    if (now < grant.confirmsAfter) {
      const remaining = Math.ceil((grant.confirmsAfter - now) / 1000);
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_CONFIRMED",
        actorMemberId: caller.memberId,
        targetId: grant.targetMemberId,
        targetType: "member",
        success: false,
        reason: `Cooldown not elapsed — ${remaining}s remaining.`,
      });
      throw new ConvexError({
        code: "TOO_EARLY",
        message: `Cooldown not elapsed. Wait ${remaining} more seconds.`,
      });
    }

    if (now > grant.expiresAt) {
      await ctx.db.patch(args.requestId, { status: "expired" });
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_CONFIRMED",
        actorMemberId: caller.memberId,
        targetId: grant.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Grant confirmation window expired.",
      });
      throw new ConvexError({
        code: "EXPIRED",
        message: "Grant confirmation window has expired. Submit a new request.",
      });
    }

    // All checks passed — apply the grant
    await ctx.db.patch(grant.targetMemberId, { isPlatformOwner: true, role: "admin" });
    await ctx.db.patch(args.requestId, { status: "confirmed" });

    await logSecurityEvent(ctx, {
      action: "PLATFORM_OWNER_GRANT_CONFIRMED",
      actorMemberId: caller.memberId,
      targetId: grant.targetMemberId,
      targetType: "member",
      diff: { isPlatformOwner: { from: false, to: true } },
      success: true,
      reason: "Platform owner grant confirmed after cooldown.",
    });

    return { success: true, targetMemberId: grant.targetMemberId };
  },
});

// ─── cancelPlatformOwnerGrantRequest ─────────────────────────────────────────

/**
 * Cancel a pending grant request before it is confirmed.
 * Only the original requester or another platform owner may cancel.
 */
export const cancelPlatformOwnerGrantRequest = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("pendingPlatformOwnerGrants"),
  },
  handler: async (ctx, args) => {
    // Resolve caller to get memberId for comparison
    const caller = await getCaller(ctx, args.sessionToken);

    const grant = await ctx.db.get(args.requestId);
    if (!grant || grant.status !== "pending") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No pending grant request found with that ID.",
      });
    }

    // Allow if caller is platform owner OR is the original requester
    const isOwner = caller.isPlatformOwner;
    const isRequester = caller.memberId === grant.requestedBy;

    if (!isOwner && !isRequester) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_GRANT_CANCELLED",
        actorMemberId: caller.memberId,
        targetId: grant.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Caller is neither a platform owner nor the original requester.",
      });
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the original requester or a platform owner may cancel.",
      });
    }

    await ctx.db.patch(args.requestId, { status: "cancelled" });

    await logSecurityEvent(ctx, {
      action: "PLATFORM_OWNER_GRANT_CANCELLED",
      actorMemberId: caller.memberId,
      targetId: grant.targetMemberId,
      targetType: "member",
      success: true,
      reason: "Grant request cancelled before confirmation.",
    });

    return { success: true };
  },
});

// ─── revokePlatformOwner ─────────────────────────────────────────────────────

/**
 * Revoke platform owner status.
 *
 * Requirements:
 *   - Caller must be a platform owner
 *   - confirmationPhrase must equal exactly "REVOKE_PLATFORM_OWNER"
 *   - Cannot revoke your own status (prevents self-lockout)
 */
export const revokePlatformOwner = mutation({
  args: {
    sessionToken: v.string(),
    targetMemberId: v.id("members"),
    confirmationPhrase: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confirmationPhrase !== REVOKE_PHRASE) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_REVOKE",
        actorMemberId: null,
        targetId: args.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Wrong confirmation phrase.",
      });
      throw new ConvexError({
        code: "FORBIDDEN",
        message: `confirmationPhrase must be exactly "${REVOKE_PHRASE}".`,
      });
    }

    let caller;
    try {
      caller = await requirePlatformOwner(ctx, args.sessionToken);
    } catch (err) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_REVOKE",
        actorMemberId: null,
        targetId: args.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Caller is not a platform owner.",
      });
      throw err;
    }

    // Prevent self-revoke
    if (caller.memberId === args.targetMemberId) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_REVOKE",
        actorMemberId: caller.memberId,
        targetId: args.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Self-revoke blocked.",
      });
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot revoke your own platform owner status.",
      });
    }

    const target = await ctx.db.get(args.targetMemberId);
    if (!target?.isPlatformOwner) {
      await logSecurityEvent(ctx, {
        action: "PLATFORM_OWNER_REVOKE",
        actorMemberId: caller.memberId,
        targetId: args.targetMemberId,
        targetType: "member",
        success: false,
        reason: "Target is not a platform owner.",
      });
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Target is not a platform owner.",
      });
    }

    await ctx.db.patch(args.targetMemberId, { isPlatformOwner: false });

    await logSecurityEvent(ctx, {
      action: "PLATFORM_OWNER_REVOKE",
      actorMemberId: caller.memberId,
      actorOrgId: caller.orgId ?? null,
      targetId: args.targetMemberId,
      targetType: "member",
      diff: { isPlatformOwner: { from: true, to: false } },
      success: true,
      reason: "Platform owner revoked.",
    });

    return { success: true };
  },
});

// ─── listOwners ──────────────────────────────────────────────────────────────

/** List current platform owners. Caller must be a platform owner. */
export const listOwners = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerQuery(ctx, args.sessionToken);
    if (!caller.isPlatformOwner) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Platform owners only." });
    }
    return await ctx.db
      .query("members")
      .filter((q: any) => q.eq(q.field("isPlatformOwner"), true))
      .collect();
  },
});

// ─── listSecurityEvents ───────────────────────────────────────────────────────

/** Fetch recent security events. Platform owner only. */
export const listSecurityEvents = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerQuery(ctx, args.sessionToken);
    if (!caller.isPlatformOwner) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Platform owners only." });
    }
    const limit = args.limit ?? 100;
    const events = await ctx.db
      .query("securityEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
    return events;
  },
});
