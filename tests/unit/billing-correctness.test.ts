/**
 * BILLING CORRECTNESS TESTS (Phase 5)
 *
 * 7 scenarios verifying billing mutation behavior:
 *   1. Zero-amount record → creates with pending status
 *   2. Single payment processing → status updated, paidAt set
 *   3. Multiple sequential payments → each is independent
 *   4. Pending-only (no paid) → total computation returns 0
 *   5. Already-paid record → idempotent update
 *   6. Missing/null amount fields → handled gracefully
 *   7. Payment status transitions → only valid statuses allowed
 *
 * Note: billing.ts uses the sessionToken API via serverAuth.ts.
 * These tests verify the mutation LOGIC by calling handlers directly
 * with a properly mocked ctx.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../convex/_generated/server", () => ({
  mutation: (def: { args: unknown; handler: Function }) => def,
  query:    (def: { args: unknown; handler: Function }) => def,
  internalMutation: (def: { args: unknown; handler: Function }) => def,
  internalQuery:    (def: { args: unknown; handler: Function }) => def,
}));

vi.mock("../../convex/_generated/api", () => ({
  internal: { lib: { securityAuditInternal: { persistSecurityEvent: "mock_persist" } } },
  api: {},
}));

import * as billing from "@convex/billing";

const NOW = Date.now();
const SESSION_EXPIRY = NOW + 86_400_000;

// ─── Admin ctx maker (admin bypasses cap checks) ─────────────────────────────

function makeAdminCtx(billingRecord?: { _id: string; [key: string]: unknown } | null) {
  const session = {
    sessionToken: "tok_admin",
    memberId: "admin_user",
    email: "admin@scriptsxo.com",
    expiresAt: SESSION_EXPIRY,
    lastUsedAt: NOW,
  };

  const patched: Array<{ id: string; updates: unknown }> = [];
  const inserted: unknown[] = [];

  return {
    db: {
      get: vi.fn(async (id: string) => {
        if (id === "admin_user") {
          return { _id: "admin_user", role: "admin", orgId: "org_main", isPlatformOwner: true };
        }
        if (billingRecord && id === billingRecord._id) return billingRecord;
        return null;
      }),
      query: vi.fn((_table: string) => {
        const self: Record<string, unknown> = {
          withIndex: vi.fn(() => self),
          filter:    vi.fn(() => self),
          order:     vi.fn(() => self),
          first: vi.fn(async () => {
            if (_table === "sessions") return session;
            return null; // admin exempt from credVerif check
          }),
          collect: vi.fn(async () => []),
        };
        return self;
      }),
      patch: vi.fn(async (id: string, updates: unknown) => {
        patched.push({ id, updates });
      }),
      insert: vi.fn(async (_table: string, data: unknown) => {
        const id = `inserted_${inserted.length}`;
        inserted.push({ _id: id, ...(data as object) });
        return id;
      }),
      delete: vi.fn(async () => {}),
    },
    scheduler: { runAfter: vi.fn() },
    _patched: patched,
    _inserted: inserted,
  };
}

function h(mod: { handler: Function }) {
  return mod.handler;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1: Zero-amount record
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 1: Zero-amount billing record", () => {
  it("creates billing record with zero amount and pending status", async () => {
    const ctx = makeAdminCtx();
    const id = await h(billing.createRecord)(ctx, {
      sessionToken: "tok_admin",
      patientId: "p1" as any,
      type: "consultation",
      amount: 0,
    });
    expect(id).toBeDefined();
    const record = ctx._inserted[0] as any;
    expect(record.amount).toBe(0);
    expect(record.status).toBe("pending");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2: Single payment processing
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 2: Single payment → status updated, paidAt set", () => {
  it("processPayment sets status=paid and paidAt timestamp", async () => {
    const billingRecord = { _id: "bill_1", status: "pending", amount: 9900 };
    const ctx = makeAdminCtx(billingRecord);

    await h(billing.processPayment)(ctx, {
      sessionToken: "tok_admin",
      billingId: "bill_1" as any,
      stripePaymentIntentId: "pi_test_123",
      status: "paid",
    });

    expect(ctx.db.patch).toHaveBeenCalledWith("bill_1", expect.objectContaining({ status: "paid" }));
    const patchCall = ctx._patched.find((p) => p.id === "bill_1");
    expect(patchCall).toBeDefined();
    expect((patchCall!.updates as any).paidAt).toBeTypeOf("number");
    expect((patchCall!.updates as any).stripePaymentIntentId).toBe("pi_test_123");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 3: Multiple sequential payments
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 3: Multiple sequential payments are independent", () => {
  it("two billing records can be processed independently", async () => {
    const bill1 = { _id: "bill_a", status: "pending", amount: 5000 };
    const ctx1 = makeAdminCtx(bill1);
    await h(billing.processPayment)(ctx1, {
      sessionToken: "tok_admin",
      billingId: "bill_a" as any,
      status: "paid",
    });

    const bill2 = { _id: "bill_b", status: "pending", amount: 7500 };
    const ctx2 = makeAdminCtx(bill2);
    await h(billing.processPayment)(ctx2, {
      sessionToken: "tok_admin",
      billingId: "bill_b" as any,
      status: "paid",
    });

    // Both were patched independently
    expect(ctx1.db.patch).toHaveBeenCalledWith("bill_a", expect.objectContaining({ status: "paid" }));
    expect(ctx2.db.patch).toHaveBeenCalledWith("bill_b", expect.objectContaining({ status: "paid" }));

    // No cross-contamination
    expect(ctx1._patched.every((p) => p.id !== "bill_b")).toBe(true);
    expect(ctx2._patched.every((p) => p.id !== "bill_a")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 4: Pending-only (no paid) → paidAt not set
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 4: Non-paid status does not set paidAt", () => {
  it("failed payment status does not set paidAt", async () => {
    const billingRecord = { _id: "bill_fail", status: "pending", amount: 9900 };
    const ctx = makeAdminCtx(billingRecord);

    await h(billing.processPayment)(ctx, {
      sessionToken: "tok_admin",
      billingId: "bill_fail" as any,
      status: "failed",
    });

    const patchCall = ctx._patched.find((p) => p.id === "bill_fail");
    expect(patchCall).toBeDefined();
    expect((patchCall!.updates as any).status).toBe("failed");
    expect((patchCall!.updates as any).paidAt).toBeUndefined();
  });

  it("pending status does not set paidAt", async () => {
    const billingRecord = { _id: "bill_pend", status: "processing", amount: 5000 };
    const ctx = makeAdminCtx(billingRecord);

    await h(billing.processPayment)(ctx, {
      sessionToken: "tok_admin",
      billingId: "bill_pend" as any,
      status: "pending",
    });

    const patchCall = ctx._patched.find((p) => p.id === "bill_pend");
    expect((patchCall!.updates as any).paidAt).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 5: Already-paid record → updatedAt is refreshed
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 5: Already-paid record can be updated (idempotent-style)", () => {
  it("marking paid again updates updatedAt", async () => {
    const billingRecord = { _id: "bill_paid", status: "paid", amount: 9900, paidAt: NOW - 10000 };
    const ctx = makeAdminCtx(billingRecord);

    await h(billing.processPayment)(ctx, {
      sessionToken: "tok_admin",
      billingId: "bill_paid" as any,
      status: "paid",
    });

    const patchCall = ctx._patched.find((p) => p.id === "bill_paid");
    expect(patchCall).toBeDefined();
    expect((patchCall!.updates as any).updatedAt).toBeGreaterThan(NOW - 1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 6: Missing/null fields handled gracefully
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 6: Missing optional fields handled gracefully", () => {
  it("createRecord without consultationId is valid (optional field)", async () => {
    const ctx = makeAdminCtx();
    const id = await h(billing.createRecord)(ctx, {
      sessionToken: "tok_admin",
      patientId: "p1" as any,
      type: "membership",
      amount: 19900,
      // consultationId is optional, not provided
    });
    expect(id).toBeDefined();
    const record = ctx._inserted[0] as any;
    expect(record.type).toBe("membership");
    expect(record.amount).toBe(19900);
  });

  it("processPayment without stripePaymentIntentId doesn't patch it", async () => {
    const billingRecord = { _id: "bill_nostripe", status: "pending", amount: 5000 };
    const ctx = makeAdminCtx(billingRecord);

    await h(billing.processPayment)(ctx, {
      sessionToken: "tok_admin",
      billingId: "bill_nostripe" as any,
      status: "paid",
      // No stripePaymentIntentId
    });

    const patchCall = ctx._patched.find((p) => p.id === "bill_nostripe");
    expect(patchCall).toBeDefined();
    expect((patchCall!.updates as any).stripePaymentIntentId).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 7: Unauthorized role cannot create/process billing
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 7: Unauthorized role cannot access billing mutations", () => {
  function makePatientCtx() {
    const session = {
      sessionToken: "tok_patient_billing",
      memberId: "patient_billing",
      email: "patient@test.com",
      expiresAt: SESSION_EXPIRY,
      lastUsedAt: NOW,
    };
    return {
      db: {
        get: vi.fn(async (id: string) => {
          if (id === "patient_billing") {
            return { _id: "patient_billing", role: "patient", orgId: null };
          }
          return null;
        }),
        query: vi.fn((_table: string) => {
          const self: Record<string, unknown> = {
            withIndex: vi.fn(() => self),
            filter: vi.fn(() => self),
            first: vi.fn(async () => {
              if (_table === "sessions") return session;
              if (_table === "credentialVerifications") {
                return {
                  status: "verified",
                  patientStripeSessionId: "cs_123",
                  patientStripeStatus: "verified",
                };
              }
              return null;
            }),
            collect: vi.fn(async () => []),
          };
          return self;
        }),
        patch: vi.fn(async () => {}),
        insert: vi.fn(),
        delete: vi.fn(),
      },
      scheduler: { runAfter: vi.fn() },
    };
  }

  it("patient cannot create billing record → FORBIDDEN", async () => {
    const ctx = makePatientCtx();
    await expect(
      h(billing.createRecord)(ctx, {
        sessionToken: "tok_patient_billing",
        patientId: "p1" as any,
        type: "consultation",
        amount: 9900,
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it("patient cannot process payment → FORBIDDEN", async () => {
    const ctx = makePatientCtx();
    await expect(
      h(billing.processPayment)(ctx, {
        sessionToken: "tok_patient_billing",
        billingId: "bill_x" as any,
        status: "paid",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    // getCaller patches session.lastUsedAt — billing record must NOT be patched
    expect(ctx.db.patch).not.toHaveBeenCalledWith("bill_x", expect.anything());
  });
});
