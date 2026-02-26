/**
 * AUDIT TRAIL VERIFICATION TESTS (Phase 7)
 *
 * Verifies that:
 *   1. logSecurityEvent schedules an audit event via ctx.scheduler.runAfter.
 *   2. The event uses the internal API (not a direct DB insert).
 *   3. Required fields (action, success, timestamp) are always present.
 *   4. Audit events survive transaction rollbacks (BUG-002 pattern):
 *      the scheduler is called even when the mutation throws.
 *   5. Audit event schema matches expected structure.
 *
 * Note: The async nature of scheduler means events appear after the
 * transaction, but the scheduler.runAfter call is synchronous in the
 * mutation body and thus testable.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock convex internals before any module imports
vi.mock("../../convex/_generated/api", () => ({
  internal: {
    lib: {
      securityAuditInternal: {
        persistSecurityEvent: "internal/lib/securityAuditInternal:persistSecurityEvent",
      },
    },
  },
  api: {},
}));

// ─── Import the logSecurityEvent function directly ───────────────────────────

import { logSecurityEvent } from "@convex/lib/securityAudit";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ctx with scheduler
// ─────────────────────────────────────────────────────────────────────────────

function makeAuditCtx() {
  const scheduled: Array<[number, string, Record<string, unknown>]> = [];
  return {
    scheduler: {
      runAfter: vi.fn(async (delay: number, fn: string, args: Record<string, unknown>) => {
        scheduled.push([delay, fn, args]);
      }),
    },
    _scheduled: scheduled,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BASIC SCHEDULER INVOCATION
// ─────────────────────────────────────────────────────────────────────────────

describe("1. logSecurityEvent schedules via ctx.scheduler", () => {
  it("calls ctx.scheduler.runAfter once", async () => {
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "ROLE_CHANGE",
      actorMemberId: "actor_123",
      targetId: "target_456",
      targetType: "member",
      success: true,
    });
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
  });

  it("uses delay of 0 (fire immediately in next transaction)", async () => {
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "SESSION_CREATED",
      success: true,
    });
    const [delay] = ctx._scheduled[0];
    expect(delay).toBe(0);
  });

  it("passes the internal persistSecurityEvent function reference", async () => {
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "SESSION_REVOKED",
      success: true,
    });
    const [, fn] = ctx._scheduled[0];
    expect(fn).toBeTruthy();
    // The fn should reference the internal api, not a direct DB call
    expect(typeof fn).toBe("string"); // Convex internal refs are string identifiers
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. REQUIRED FIELDS
// ─────────────────────────────────────────────────────────────────────────────

describe("2. Audit event always includes required fields", () => {
  it("event includes action field", async () => {
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "PHI_EXPORT",
      success: true,
    });
    const [,, args] = ctx._scheduled[0];
    expect(args.action).toBe("PHI_EXPORT");
  });

  it("event includes success field", async () => {
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "PAYMENT_FAILED",
      success: false,
      reason: "Card declined",
    });
    const [,, args] = ctx._scheduled[0];
    expect(args.success).toBe(false);
  });

  it("event includes timestamp", async () => {
    const before = Date.now();
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "ROLE_CHANGE",
      success: true,
    });
    const after = Date.now();
    const [,, args] = ctx._scheduled[0];
    expect(args.timestamp).toBeTypeOf("number");
    expect(args.timestamp as number).toBeGreaterThanOrEqual(before);
    expect(args.timestamp as number).toBeLessThanOrEqual(after);
  });

  it("event includes reason when provided", async () => {
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "PLATFORM_OWNER_REVOKE",
      actorMemberId: "actor_1",
      targetId: "target_2",
      success: true,
      reason: "Offboarding",
    });
    const [,, args] = ctx._scheduled[0];
    expect(args.reason).toBe("Offboarding");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. OPTIONAL FIELDS (null → undefined coercion)
// ─────────────────────────────────────────────────────────────────────────────

describe("3. Optional fields: null values coerced to undefined", () => {
  it("null actorMemberId becomes undefined in scheduled event", async () => {
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "ROLE_CHANGE",
      actorMemberId: null,
      success: true,
    });
    const [,, args] = ctx._scheduled[0];
    expect(args.actorMemberId).toBeUndefined();
  });

  it("null actorOrgId becomes undefined", async () => {
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "ROLE_CHANGE",
      actorOrgId: null,
      success: true,
    });
    const [,, args] = ctx._scheduled[0];
    expect(args.actorOrgId).toBeUndefined();
  });

  it("null targetId becomes undefined", async () => {
    const ctx = makeAuditCtx();
    await logSecurityEvent(ctx as any, {
      action: "SESSION_CREATED",
      targetId: null,
      success: true,
    });
    const [,, args] = ctx._scheduled[0];
    expect(args.targetId).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. BUG-002 PATTERN: audit survives transaction rollbacks
// ─────────────────────────────────────────────────────────────────────────────

describe("4. BUG-002 pattern: scheduler called before potential throw", () => {
  it("logSecurityEvent resolves even when called in a mutation that throws afterwards", async () => {
    const ctx = makeAuditCtx();

    // Simulate a mutation that logs an event and then throws
    async function simulateMutationWithRollback() {
      await logSecurityEvent(ctx as any, {
        action: "PAYMENT_FAILED",
        success: false,
        reason: "Simulated failure",
      });
      // After logging, the mutation would throw (simulating rollback)
      throw new Error("Simulated transaction rollback");
    }

    await expect(simulateMutationWithRollback()).rejects.toThrow("Simulated transaction rollback");

    // Despite the throw, the scheduler was still called
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
    const [,, args] = ctx._scheduled[0];
    expect(args.action).toBe("PAYMENT_FAILED");
    expect(args.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ALL DEFINED ACTION TYPES ARE VALID STRINGS
// ─────────────────────────────────────────────────────────────────────────────

describe("5. All documented SecurityEventAction types can be logged", () => {
  const DOCUMENTED_ACTIONS = [
    "PLATFORM_OWNER_SEED",
    "PLATFORM_OWNER_GRANT_REQUESTED",
    "PLATFORM_OWNER_GRANT_CONFIRMED",
    "PLATFORM_OWNER_GRANT_CANCELLED",
    "PLATFORM_OWNER_REVOKE",
    "ROLE_CHANGE",
    "MEMBER_CAP_OVERRIDE_CHANGE",
    "ORG_CAP_OVERRIDE_CHANGE",
    "PHI_EXPORT",
    "PAYMENT_FAILED",
    "SESSION_CREATED",
    "SESSION_REVOKED",
  ];

  for (const action of DOCUMENTED_ACTIONS) {
    it(`can log action: ${action}`, async () => {
      const ctx = makeAuditCtx();
      await logSecurityEvent(ctx as any, { action, success: true });
      const [,, args] = ctx._scheduled[0];
      expect(args.action).toBe(action);
    });
  }
});
