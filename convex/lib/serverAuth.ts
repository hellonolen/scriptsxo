// @ts-nocheck
/**
 * SERVER-SIDE IDENTITY RESOLUTION
 *
 * Provides getCaller() which resolves a sessionToken to a verified CallerContext.
 * Mutations MUST use this instead of accepting callerId from client args.
 *
 * Security model:
 *  - Session tokens are opaque random strings (crypto.randomUUID)
 *  - Created server-side on successful authentication
 *  - Client presents the token; server looks it up — client cannot forge memberId
 *  - Sessions expire after 60 days; lastUsedAt is updated on each use
 */

import { ConvexError } from "convex/values";
import { getMemberEffectiveCaps, ROLE_CAPS, CAP, type Capability, type Role } from "./capabilities";
import { logSecurityEvent } from "./securityAudit";

export interface CallerContext {
  memberId: string;
  email: string;
  orgId: string | undefined;
  role: Role;
  isPlatformOwner: boolean;
  caps: Set<Capability>;
}

/**
 * Resolve a sessionToken to a CallerContext.
 * Throws UNAUTHORIZED if the token is missing, expired, or not found.
 * Updates session.lastUsedAt to track activity.
 */
export async function getCaller(
  ctx: any,
  sessionToken: string | undefined
): Promise<CallerContext> {
  if (!sessionToken) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
  }

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("sessionToken", sessionToken))
    .first();

  if (!session) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Session not found or expired." });
  }

  if (session.expiresAt < Date.now()) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Session expired. Please log in again." });
  }

  const member = await ctx.db.get(session.memberId);
  if (!member) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Member not found." });
  }

  // Update last-used timestamp (fire-and-forget, best effort)
  ctx.db.patch(session._id, { lastUsedAt: Date.now() }).catch(() => {});

  const caps = await getMemberEffectiveCaps(ctx, session.memberId);

  return {
    memberId: session.memberId,
    email: session.email,
    orgId: member.orgId,
    role: member.role as Role,
    isPlatformOwner: member.isPlatformOwner === true,
    caps,
  };
}

/**
 * Require a specific capability, resolved from sessionToken.
 * Throws UNAUTHORIZED (no session) or FORBIDDEN (missing cap).
 */
export async function requireCap(
  ctx: any,
  sessionToken: string | undefined,
  cap: Capability
): Promise<CallerContext> {
  const caller = await getCaller(ctx, sessionToken);
  if (!caller.caps.has(cap)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Missing required capability: ${cap}`,
    });
  }
  return caller;
}

/**
 * Require ANY of the listed capabilities (OR logic).
 */
export async function requireAnyCap(
  ctx: any,
  sessionToken: string | undefined,
  caps: Capability[]
): Promise<CallerContext> {
  const caller = await getCaller(ctx, sessionToken);
  if (!caps.some((c) => caller.caps.has(c))) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Missing one of: ${caps.join(", ")}`,
    });
  }
  return caller;
}

/**
 * Require the caller to be a member of the same org as orgId.
 * Platform owners bypass this check.
 */
export async function requireOrgScope(
  ctx: any,
  sessionToken: string | undefined,
  orgId: string
): Promise<CallerContext> {
  const caller = await getCaller(ctx, sessionToken);
  if (caller.isPlatformOwner) return caller; // Platform owner can access any org
  if (caller.orgId !== orgId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Not a member of this organization.",
    });
  }
  return caller;
}

/**
 * Create a new session for a successfully authenticated member.
 * Returns the session token to store in the client cookie.
 */
export async function createSession(
  ctx: any,
  memberId: string,
  email: string,
  options?: { userAgent?: string; ipAddress?: string }
): Promise<string> {
  const sessionToken = crypto.randomUUID() + "-" + crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + 60 * 24 * 60 * 60 * 1000; // 60 days

  await ctx.db.insert("sessions", {
    sessionToken,
    memberId,
    email,
    createdAt: now,
    expiresAt,
    lastUsedAt: now,
    userAgent: options?.userAgent,
    ipAddress: options?.ipAddress,
  });

  return sessionToken;
}

/**
 * Revoke a session by token. Used for logout.
 */
export async function revokeSession(
  ctx: any,
  sessionToken: string
): Promise<void> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("sessionToken", sessionToken))
    .first();
  if (session) {
    await ctx.db.delete(session._id);
  }
}

/**
 * Read-only variant of getCaller for use inside Convex QUERIES.
 * Queries are read-only; ctx.db.patch is forbidden.
 * This version validates the session without updating lastUsedAt.
 */
export async function getCallerQuery(
  ctx: any,
  sessionToken: string | undefined
): Promise<CallerContext> {
  if (!sessionToken) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Authentication required." });
  }

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("sessionToken", sessionToken))
    .first();

  if (!session) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Session not found or expired." });
  }

  if (session.expiresAt < Date.now()) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Session expired. Please log in again." });
  }

  const member = await ctx.db.get(session.memberId);
  if (!member) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Member not found." });
  }

  const caps = await getMemberEffectiveCaps(ctx, session.memberId);

  return {
    memberId: session.memberId,
    email: session.email,
    orgId: member.orgId,
    role: member.role as Role,
    isPlatformOwner: member.isPlatformOwner === true,
    caps,
  };
}

/**
 * Require a capability in a QUERY context (read-only, no lastUsedAt update).
 */
export async function requireCapQuery(
  ctx: any,
  sessionToken: string | undefined,
  cap: Capability
): Promise<CallerContext> {
  const caller = await getCallerQuery(ctx, sessionToken);
  if (!caller.caps.has(cap)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Missing required capability: ${cap}`,
    });
  }
  return caller;
}

/**
 * Revoke ALL sessions for a member (e.g., password reset, role change).
 */
export async function revokeAllMemberSessions(
  ctx: any,
  memberId: string
): Promise<number> {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_memberId", (q: any) => q.eq("memberId", memberId))
    .collect();
  for (const s of sessions) {
    await ctx.db.delete(s._id);
  }
  return sessions.length;
}
