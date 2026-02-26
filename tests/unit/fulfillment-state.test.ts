/**
 * FULFILLMENT STATE MACHINE TESTS (Phase 6)
 *
 * Verifies server-side enforcement of prescription status transitions:
 *   sent → filling → ready → picked_up | shipped → delivered
 *
 * Properties tested:
 *   1. Valid transitions succeed.
 *   2. Invalid transitions (skipping states) throw FORBIDDEN.
 *   3. Backwards transitions throw FORBIDDEN.
 *   4. Double-apply (same status → same status) throws FORBIDDEN.
 *   5. Unauthorized role (patient) cannot call updateStatus.
 *   6. Non-existent prescription throws NOT_FOUND.
 *   7. Concurrency: patch is only called once per call (no double-write).
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { ConvexError } from "convex/values";

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

import * as prescriptions from "@convex/prescriptions";

// ─── Session-token mock infrastructure ────────────────────────────────────────

const NOW = Date.now();
const SESSION_EXPIRY = NOW + 86_400_000;

type MockRole = "pharmacy" | "provider" | "patient" | "admin" | "nurse" | "unverified";

interface MockMember {
  _id: string;
  role: MockRole;
  orgId?: string;
  isPlatformOwner?: boolean;
}

function makeCredVerif(memberId: string, role: MockRole): Record<string, unknown> | null {
  const base = { _id: `cv_${memberId}`, memberId, status: "verified" };
  switch (role) {
    case "pharmacy":
      return { ...base, pharmacyNcpdpId: "1234567", pharmacyRegistryResult: { registered: true } };
    case "provider":
      return {
        ...base,
        providerNpi: "1003000126",
        providerNpiResult: { npi: "1003000126" },
        providerLicenseFileId: "file_abc",
      };
    case "patient":
      return { ...base, patientStripeSessionId: "cs_test_123", patientStripeStatus: "verified" };
    case "admin":
    case "unverified":
    case "nurse":
      return null;
    default:
      return null;
  }
}

function makeCtx(
  sessionToken: string,
  member: MockMember,
  rxData?: { _id: string; status: string; filledAt?: number } | null
) {
  const session = {
    _id: `sess_${member._id}`,
    sessionToken,
    memberId: member._id,
    email: `${member._id}@test.com`,
    expiresAt: SESSION_EXPIRY,
    lastUsedAt: NOW,
  };

  const credVerif = makeCredVerif(member._id, member.role);
  const patched: Array<{ id: string; updates: unknown }> = [];

  const ctx = {
    db: {
      get: vi.fn(async (id: string) => {
        if (id === member._id) return member;
        if (rxData && id === rxData._id) return rxData;
        return null;
      }),
      query: vi.fn((_table: string) => {
        const chain: Record<string, unknown> = {};
        const self: Record<string, unknown> = {
          withIndex: vi.fn(() => self),
          filter:    vi.fn(() => self),
          order:     vi.fn(() => self),
          first: vi.fn(async () => {
            if (_table === "sessions") return session;
            if (_table === "credentialVerifications") return credVerif;
            return null;
          }),
          collect: vi.fn(async () => []),
        };
        return self;
      }),
      patch: vi.fn(async (id: string, updates: unknown) => {
        patched.push({ id, updates });
      }),
      insert: vi.fn(async () => "new_id"),
      delete: vi.fn(async () => {}),
    },
    scheduler: { runAfter: vi.fn(async () => {}) },
    _patched: patched,
  };

  return ctx;
}

function h(mod: { handler: Function }) {
  return mod.handler.bind(null);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTOR FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const PHARMACY = { _id: "pharmacy_member", role: "pharmacy" as MockRole, orgId: "org_a" };
const PROVIDER = { _id: "provider_member", role: "provider" as MockRole, orgId: "org_a" };
const PATIENT  = { _id: "patient_member",  role: "patient"  as MockRole };

// ─────────────────────────────────────────────────────────────────────────────
// 1. VALID TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

describe("1. Valid transitions", () => {
  it("sent → filling succeeds", async () => {
    const rx = { _id: "rx_1", status: "sent" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    const result = await h(prescriptions.updateStatus)(ctx, {
      sessionToken: "tok_pharma",
      prescriptionId: "rx_1" as any,
      status: "filling",
    });
    expect(result).toEqual({ success: true });
    expect(ctx.db.patch).toHaveBeenCalledWith("rx_1", expect.objectContaining({ status: "filling" }));
  });

  it("filling → ready succeeds and sets filledAt", async () => {
    const rx = { _id: "rx_2", status: "filling", filledAt: undefined };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await h(prescriptions.updateStatus)(ctx, {
      sessionToken: "tok_pharma",
      prescriptionId: "rx_2" as any,
      status: "ready",
    });
    // getCaller also patches session.lastUsedAt — find the prescription-specific patch
    const rxPatch = ctx._patched.find((p) => p.id === "rx_2");
    expect(rxPatch).toBeDefined();
    expect(rxPatch!.updates).toMatchObject({ status: "ready" });
    expect((rxPatch!.updates as any).filledAt).toBeTypeOf("number");
  });

  it("ready → picked_up succeeds", async () => {
    const rx = { _id: "rx_3", status: "ready", filledAt: NOW };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await h(prescriptions.updateStatus)(ctx, {
      sessionToken: "tok_pharma",
      prescriptionId: "rx_3" as any,
      status: "picked_up",
    });
    expect(ctx.db.patch).toHaveBeenCalledWith("rx_3", expect.objectContaining({ status: "picked_up" }));
  });

  it("ready → shipped succeeds", async () => {
    const rx = { _id: "rx_4", status: "ready", filledAt: NOW };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await h(prescriptions.updateStatus)(ctx, {
      sessionToken: "tok_pharma",
      prescriptionId: "rx_4" as any,
      status: "shipped",
    });
    expect(ctx.db.patch).toHaveBeenCalledWith("rx_4", expect.objectContaining({ status: "shipped" }));
  });

  it("shipped → delivered succeeds", async () => {
    const rx = { _id: "rx_5", status: "shipped", filledAt: NOW };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await h(prescriptions.updateStatus)(ctx, {
      sessionToken: "tok_pharma",
      prescriptionId: "rx_5" as any,
      status: "delivered",
    });
    expect(ctx.db.patch).toHaveBeenCalledWith("rx_5", expect.objectContaining({ status: "delivered" }));
  });

  it("provider with RX_WRITE can also advance status", async () => {
    const rx = { _id: "rx_6", status: "sent" };
    const ctx = makeCtx("tok_prov", PROVIDER, rx);
    const result = await h(prescriptions.updateStatus)(ctx, {
      sessionToken: "tok_prov",
      prescriptionId: "rx_6" as any,
      status: "filling",
    });
    expect(result).toEqual({ success: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. INVALID TRANSITIONS (state machine enforcement)
// ─────────────────────────────────────────────────────────────────────────────

describe("2. Invalid transitions → FORBIDDEN", () => {
  it("sent → ready (skip filling) is FORBIDDEN", async () => {
    const rx = { _id: "rx_10", status: "sent" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_10" as any,
        status: "ready",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    // getCaller patches session.lastUsedAt — verify prescription was NOT patched
    const rxPatch = ctx._patched.find((p) => p.id === "rx_10");
    expect(rxPatch).toBeUndefined();
  });

  it("sent → shipped (skip filling+ready) is FORBIDDEN", async () => {
    const rx = { _id: "rx_11", status: "sent" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_11" as any,
        status: "shipped",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("filling → sent (backwards) is FORBIDDEN", async () => {
    const rx = { _id: "rx_12", status: "filling" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_12" as any,
        status: "sent",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("ready → filling (backwards) is FORBIDDEN", async () => {
    const rx = { _id: "rx_13", status: "ready" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_13" as any,
        status: "filling",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("delivered → any status is FORBIDDEN (terminal state)", async () => {
    const rx = { _id: "rx_14", status: "delivered" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_14" as any,
        status: "shipped",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("double-apply: filling → filling is FORBIDDEN", async () => {
    const rx = { _id: "rx_15", status: "filling" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_15" as any,
        status: "filling",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("arbitrary string status is FORBIDDEN", async () => {
    const rx = { _id: "rx_16", status: "sent" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_16" as any,
        status: "hacked_status",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────────────────

describe("3. Access control", () => {
  it("patient cannot call updateStatus → FORBIDDEN", async () => {
    const rx = { _id: "rx_20", status: "sent" };
    const ctx = makeCtx("tok_patient", PATIENT, rx);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_patient",
        prescriptionId: "rx_20" as any,
        status: "filling",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    // Prescription must not be patched (only session.lastUsedAt may be patched by getCaller)
    const rxPatch = ctx._patched.find((p) => p.id === "rx_20");
    expect(rxPatch).toBeUndefined();
  });

  it("missing sessionToken → UNAUTHORIZED", async () => {
    const rx = { _id: "rx_21", status: "sent" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    // Override session query to return null
    ctx.db.query = vi.fn((_table: string) => {
      const self: Record<string, unknown> = {
        withIndex: vi.fn(() => self),
        filter: vi.fn(() => self),
        first: vi.fn(async () => null), // no session found
        collect: vi.fn(async () => []),
      };
      return self;
    });
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: undefined as any,
        prescriptionId: "rx_21" as any,
        status: "filling",
      })
    ).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  it("expired session → UNAUTHORIZED", async () => {
    const rx = { _id: "rx_22", status: "sent" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    // Override to return expired session
    ctx.db.query = vi.fn((_table: string) => {
      const self: Record<string, unknown> = {
        withIndex: vi.fn(() => self),
        filter: vi.fn(() => self),
        first: vi.fn(async () => {
          if (_table === "sessions") {
            return { sessionToken: "tok_pharma", memberId: PHARMACY._id, expiresAt: NOW - 1 };
          }
          return null;
        }),
        collect: vi.fn(async () => []),
      };
      return self;
    });
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_22" as any,
        status: "filling",
      })
    ).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. NOT_FOUND
// ─────────────────────────────────────────────────────────────────────────────

describe("4. Not found", () => {
  it("non-existent prescriptionId → NOT_FOUND", async () => {
    const ctx = makeCtx("tok_pharma", PHARMACY, null);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_nonexistent" as any,
        status: "filling",
      })
    ).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONCURRENCY SAFETY
// ─────────────────────────────────────────────────────────────────────────────

describe("5. Concurrency", () => {
  it("prescription is patched exactly once per successful transition", async () => {
    const rx = { _id: "rx_30", status: "sent" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await h(prescriptions.updateStatus)(ctx, {
      sessionToken: "tok_pharma",
      prescriptionId: "rx_30" as any,
      status: "filling",
    });
    // Only one patch for the prescription (getCaller may also patch session.lastUsedAt)
    const rxPatches = ctx._patched.filter((p) => p.id === "rx_30");
    expect(rxPatches).toHaveLength(1);
  });

  it("prescription is NOT patched on invalid transition", async () => {
    const rx = { _id: "rx_31", status: "sent" };
    const ctx = makeCtx("tok_pharma", PHARMACY, rx);
    await expect(
      h(prescriptions.updateStatus)(ctx, {
        sessionToken: "tok_pharma",
        prescriptionId: "rx_31" as any,
        status: "delivered",
      })
    ).rejects.toThrow();
    // Prescription must not be patched
    const rxPatches = ctx._patched.filter((p) => p.id === "rx_31");
    expect(rxPatches).toHaveLength(0);
  });
});
