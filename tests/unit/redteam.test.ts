/**
 * RED TEAM — ADVERSARIAL CAPABILITY & CROSS-ORG TESTS
 *
 * Phase 3: direct handler calls with forged/missing callerIds
 * Phase 4: platform owner grant state machine
 * Phase 5: audit trail narrative reconstruction
 *
 * Uses the same vi.mock pattern as mutations-security.test.ts —
 * mock _generated/server so mutation(def) returns def directly,
 * letting us call .handler(ctx, args) without Convex runtime.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as path from "path";

// ---------------------------------------------------------------------------
// Mock Convex runtime so we can call handlers directly
// ---------------------------------------------------------------------------

vi.mock("../../convex/_generated/server", () => ({
  mutation: (def: any) => def,
  query: (def: any) => def,
  internalMutation: (def: any) => def,
  action: (def: any) => def,
}));
vi.mock("../../convex/_generated/api", () => ({ api: {}, internal: {} }));

// ---------------------------------------------------------------------------
// Lazy-load handlers AFTER mock is registered
// ---------------------------------------------------------------------------

const h = (mod: any) => mod.handler ?? mod;

import * as members from "../../convex/members";
import * as orgs from "../../convex/organizations";
import * as prescriptions from "../../convex/prescriptions";
import * as platformAdmin from "../../convex/platformAdmin";
import * as credVerif from "../../convex/credentialVerifications";
import * as billing from "../../convex/billing";

// ---------------------------------------------------------------------------
// Context factory
// ---------------------------------------------------------------------------

type FakeMember = {
  _id: string;
  email: string;
  role: string;
  orgId?: string;
  isPlatformOwner?: boolean;
  capAllow?: string[];
  capDeny?: string[];
};

type FakeOrg = {
  _id: string;
  name: string;
  capAllow?: string[];
  capDeny?: string[];
};

function makeQueryChain(results: unknown[] = [], first: unknown = null) {
  const b: any = {
    first: vi.fn(async () => first),
    collect: vi.fn(async () => results),
    take: vi.fn(async (n: number) => results.slice(0, n)),
    withIndex: vi.fn(() => b),
    filter: vi.fn(() => b),
    order: vi.fn(() => b),
    eq: vi.fn(() => b),
  };
  return b;
}

function makeCtx(
  members: FakeMember[],
  orgs: FakeOrg[] = [],
  overrides: Partial<{
    pendingGrants: Record<string, unknown>;
    extraRecords: Record<string, unknown>;
    securityEvents: unknown[];
  }> = {}
) {
  const memberMap: Record<string, FakeMember> = {};
  for (const m of members) memberMap[m._id] = m;
  const orgMap: Record<string, FakeOrg> = {};
  for (const o of orgs) orgMap[o._id] = o;
  const grantMap: Record<string, unknown> = overrides.pendingGrants ?? {};
  const extraMap: Record<string, unknown> = overrides.extraRecords ?? {};
  const securityLog: unknown[] = overrides.securityEvents ?? [];

  const allRecords: Record<string, unknown> = {
    ...memberMap,
    ...orgMap,
    ...grantMap,
    ...extraMap,
  };

  return {
    db: {
      get: vi.fn(async (id: string) => allRecords[id] ?? null),
      insert: vi.fn(async (_table: string, doc: unknown) => {
        const id = `new_${Math.random().toString(36).slice(2)}`;
        if ((_table as string) === "securityEvents") securityLog.push(doc);
        return id;
      }),
      patch: vi.fn(async (id: string, updates: unknown) => {
        if (allRecords[id]) {
          Object.assign(allRecords[id] as object, updates);
        }
      }),
      delete: vi.fn(async () => {}),
      query: vi.fn((_table: string) => {
        if (_table === "members") {
          return makeQueryChain(
            members.filter((m) => m.isPlatformOwner),
            null
          );
        }
        return makeQueryChain();
      }),
    },
    _securityLog: securityLog,
    _allRecords: allRecords,
  };
}

// ---------------------------------------------------------------------------
// PHASE 3-A: Cross-org access with forged params
// ---------------------------------------------------------------------------

describe("3-A: Cross-org write with forged params", () => {
  it("organizations.update: Org A member cannot update Org B", async () => {
    const ctx = makeCtx(
      [{ _id: "caller_a", email: "a@org-a.com", role: "admin", orgId: "org_a" }],
      [
        { _id: "org_a", name: "Org A" },
        { _id: "org_b", name: "Org B" },
      ]
    );
    // Caller is admin in org_a, but tries to update org_b
    await expect(
      h(orgs.update)(ctx, {
        callerId: "caller_a",
        orgId: "org_b",
        name: "Hacked Name",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("organizations.addMember: cannot add to org you don't belong to", async () => {
    const ctx = makeCtx(
      [{ _id: "caller_a", email: "a@org-a.com", role: "admin", orgId: "org_a" }],
      [
        { _id: "org_a", name: "Org A" },
        { _id: "org_b", name: "Org B" },
      ]
    );
    await expect(
      h(orgs.addMember)(ctx, {
        callerId: "caller_a",
        orgId: "org_b",
        email: "evil@example.com",
        name: "Evil",
        role: "admin",
        orgRole: "owner",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("organizations.removeMember: cannot remove from org you don't belong to", async () => {
    const ctx = makeCtx(
      [
        { _id: "caller_a", email: "a@org-a.com", role: "admin", orgId: "org_a" },
        { _id: "victim", email: "victim@org-b.com", role: "provider", orgId: "org_b" },
      ],
      [
        { _id: "org_a", name: "Org A" },
        { _id: "org_b", name: "Org B" },
      ]
    );
    await expect(
      h(orgs.removeMember)(ctx, {
        callerId: "caller_a",
        orgId: "org_b",
        memberId: "victim",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });
});

// ---------------------------------------------------------------------------
// PHASE 3-B: Cross-user tamper (caller ≠ subject)
// ---------------------------------------------------------------------------

describe("3-B: Cross-user role/cap tamper", () => {
  it("members.updateRole: patient cannot elevate another member", async () => {
    const ctx = makeCtx([
      { _id: "patient_a", email: "p@p.com", role: "patient" },
      { _id: "target", email: "t@t.com", role: "unverified" },
    ]);
    await expect(
      h(members.updateRole)(ctx, {
        callerId: "patient_a",
        memberId: "target",
        role: "admin",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("members.updateRole: provider cannot elevate another member", async () => {
    const ctx = makeCtx([
      { _id: "provider_a", email: "doc@doc.com", role: "provider" },
      { _id: "target", email: "t@t.com", role: "patient" },
    ]);
    await expect(
      h(members.updateRole)(ctx, {
        callerId: "provider_a",
        memberId: "target",
        role: "admin",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("members.updateCapOverrides: non-admin cannot grant caps to another user", async () => {
    const ctx = makeCtx([
      { _id: "provider_a", email: "doc@doc.com", role: "provider" },
      { _id: "target", email: "t@t.com", role: "patient" },
    ]);
    await expect(
      h(members.updateCapOverrides)(ctx, {
        callerId: "provider_a",
        memberId: "target",
        capAllow: ["rx:write", "settings:manage"],
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("members.updateCapOverrides: patient cannot grant themselves caps", async () => {
    const ctx = makeCtx([
      { _id: "patient_a", email: "p@p.com", role: "patient" },
    ]);
    await expect(
      h(members.updateCapOverrides)(ctx, {
        callerId: "patient_a",
        memberId: "patient_a",
        capAllow: ["admin:write", "user:manage"],
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });
});

// ---------------------------------------------------------------------------
// PHASE 3-C: Direct-call capability bypass (no UI path)
// ---------------------------------------------------------------------------

describe("3-C: Direct-call without callerId (unauthenticated)", () => {
  it("members.updateRole: no callerId → UNAUTHORIZED", async () => {
    const ctx = makeCtx([{ _id: "target", email: "t@t.com", role: "patient" }]);
    await expect(
      h(members.updateRole)(ctx, { memberId: "target", role: "admin" })
    ).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  it("prescriptions.create: no callerId → UNAUTHORIZED", async () => {
    const ctx = makeCtx([]);
    await expect(
      h(prescriptions.create)(ctx, {
        consultationId: "c1",
        patientId: "p1",
        providerId: "prov1",
        medicationName: "TestDrug",
        dosage: "10mg",
        form: "tablet",
        quantity: 30,
        daysSupply: 30,
        refillsAuthorized: 0,
        directions: "Take one daily",
        priorAuthRequired: false,
        expiresAt: Date.now() + 86400000,
      })
    ).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  it("billing.createRecord: no callerId → UNAUTHORIZED", async () => {
    const ctx = makeCtx([]);
    await expect(
      h(billing.createRecord)(ctx, {
        patientId: "p1",
        type: "consultation",
        amount: 5000,
        status: "pending",
      })
    ).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  it("credentialVerifications.complete: no callerId → UNAUTHORIZED", async () => {
    const ctx = makeCtx([]);
    await expect(
      h(credVerif.complete)(ctx, {
        id: "ver1",
        status: "verified",
      })
    ).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  it("organizations.updateCapOverrides: no callerId → UNAUTHORIZED", async () => {
    const ctx = makeCtx([], [{ _id: "org1", name: "Test Org" }]);
    await expect(
      h(orgs.updateCapOverrides)(ctx, {
        orgId: "org1",
        capAllow: ["admin:write"],
      })
    ).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });
});

describe("3-C: Direct-call with wrong role", () => {
  it("pharmacy role cannot create prescription (RX_WRITE required)", async () => {
    const ctx = makeCtx([{ _id: "pharm1", email: "rx@rx.com", role: "pharmacy" }]);
    await expect(
      h(prescriptions.create)(ctx, {
        callerId: "pharm1",
        consultationId: "c1",
        patientId: "p1",
        providerId: "prov1",
        medicationName: "TestDrug",
        dosage: "10mg",
        form: "tablet",
        quantity: 30,
        daysSupply: 30,
        refillsAuthorized: 0,
        directions: "Take one daily",
        priorAuthRequired: false,
        expiresAt: Date.now() + 86400000,
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("patient role cannot update another user's role", async () => {
    const ctx = makeCtx([
      { _id: "pat1", email: "patient@x.com", role: "patient" },
      { _id: "tgt1", email: "other@x.com", role: "unverified" },
    ]);
    await expect(
      h(members.updateRole)(ctx, {
        callerId: "pat1",
        memberId: "tgt1",
        role: "admin",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });
});

// ---------------------------------------------------------------------------
// PHASE 4: Platform owner grant state machine
// ---------------------------------------------------------------------------

describe("4: Platform owner grant — state machine", () => {
  const NOW = Date.now();

  it("seed fails if owner already exists", async () => {
    const ctx = makeCtx([
      { _id: "existing_owner", email: "owner@x.com", role: "admin", isPlatformOwner: true },
    ]);
    await expect(
      h(platformAdmin.seed)(ctx, { email: "new@x.com" })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("seed: audit log written on failure (owner already exists)", async () => {
    const ctx = makeCtx([
      { _id: "existing_owner", email: "owner@x.com", role: "admin", isPlatformOwner: true },
    ]);
    try { await h(platformAdmin.seed)(ctx, { email: "new@x.com" }); } catch {}
    const failEvent = ctx._securityLog.find((e: any) => e.action === "PLATFORM_OWNER_SEED" && !e.success);
    expect(failEvent, "no audit event for failed seed").toBeTruthy();
  });

  it("requestPlatformOwnerGrant: wrong phrase rejected", async () => {
    const ctx = makeCtx([{ _id: "owner", email: "o@o.com", role: "admin", isPlatformOwner: true }]);
    await expect(
      h(platformAdmin.requestPlatformOwnerGrant)(ctx, {
        callerId: "owner",
        targetMemberId: "owner",
        confirmationPhrase: "WRONG_PHRASE",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("requestPlatformOwnerGrant: non-owner cannot request", async () => {
    const ctx = makeCtx([
      { _id: "admin1", email: "a@a.com", role: "admin", isPlatformOwner: false },
      { _id: "target", email: "t@t.com", role: "provider" },
    ]);
    await expect(
      h(platformAdmin.requestPlatformOwnerGrant)(ctx, {
        callerId: "admin1",
        targetMemberId: "target",
        confirmationPhrase: "GRANT_PLATFORM_OWNER",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("requestPlatformOwnerGrant: audit log written on phrase failure", async () => {
    const ctx = makeCtx([{ _id: "owner", email: "o@o.com", role: "admin", isPlatformOwner: true }]);
    try {
      await h(platformAdmin.requestPlatformOwnerGrant)(ctx, {
        callerId: "owner",
        targetMemberId: "owner",
        confirmationPhrase: "BAD",
      });
    } catch {}
    const ev = ctx._securityLog.find(
      (e: any) => e.action === "PLATFORM_OWNER_GRANT_REQUESTED" && !e.success
    );
    expect(ev).toBeTruthy();
    expect((ev as any).reason).toContain("phrase");
  });

  it("confirmPlatformOwnerGrant: cannot confirm before cooldown elapsed", async () => {
    const futureConfirmTime = NOW + 55_000; // 55s from now, within 60s cooldown
    const ctx = makeCtx(
      [{ _id: "owner", email: "o@o.com", role: "admin", isPlatformOwner: true }],
      [],
      {
        pendingGrants: {
          grant1: {
            _id: "grant1",
            requestedBy: "owner",
            targetMemberId: "target1",
            requestedAt: NOW,
            confirmsAfter: futureConfirmTime,
            expiresAt: NOW + 360_000,
            status: "pending",
          },
        },
      }
    );
    await expect(
      h(platformAdmin.confirmPlatformOwnerGrant)(ctx, {
        callerId: "owner",
        requestId: "grant1",
      })
    ).rejects.toMatchObject({ data: { code: "TOO_EARLY" } });
  });

  it("confirmPlatformOwnerGrant: cannot confirm if expired", async () => {
    const ctx = makeCtx(
      [{ _id: "owner", email: "o@o.com", role: "admin", isPlatformOwner: true }],
      [],
      {
        pendingGrants: {
          grant2: {
            _id: "grant2",
            requestedBy: "owner",
            targetMemberId: "target2",
            requestedAt: NOW - 400_000,
            confirmsAfter: NOW - 340_000,  // cooldown elapsed
            expiresAt: NOW - 100_000,       // but window expired
            status: "pending",
          },
        },
      }
    );
    await expect(
      h(platformAdmin.confirmPlatformOwnerGrant)(ctx, {
        callerId: "owner",
        requestId: "grant2",
      })
    ).rejects.toMatchObject({ data: { code: "EXPIRED" } });
    // Grant status should be marked expired
    expect((ctx._allRecords["grant2"] as any).status).toBe("expired");
  });

  it("confirmPlatformOwnerGrant: different caller cannot confirm someone else's request", async () => {
    const ctx = makeCtx(
      [
        { _id: "owner1", email: "o1@o.com", role: "admin", isPlatformOwner: true },
        { _id: "owner2", email: "o2@o.com", role: "admin", isPlatformOwner: true },
      ],
      [],
      {
        pendingGrants: {
          grant3: {
            _id: "grant3",
            requestedBy: "owner1",
            targetMemberId: "target3",
            requestedAt: NOW - 70_000,
            confirmsAfter: NOW - 10_000,
            expiresAt: NOW + 230_000,
            status: "pending",
          },
        },
      }
    );
    await expect(
      h(platformAdmin.confirmPlatformOwnerGrant)(ctx, {
        callerId: "owner2",  // different caller
        requestId: "grant3",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("confirmPlatformOwnerGrant: replay (already confirmed) fails", async () => {
    const ctx = makeCtx(
      [{ _id: "owner", email: "o@o.com", role: "admin", isPlatformOwner: true }],
      [],
      {
        pendingGrants: {
          grant4: {
            _id: "grant4",
            requestedBy: "owner",
            targetMemberId: "target4",
            requestedAt: NOW - 70_000,
            confirmsAfter: NOW - 10_000,
            expiresAt: NOW + 230_000,
            status: "confirmed", // already applied!
          },
        },
      }
    );
    await expect(
      h(platformAdmin.confirmPlatformOwnerGrant)(ctx, {
        callerId: "owner",
        requestId: "grant4",
      })
    ).rejects.toMatchObject({ data: { code: "CONFLICT" } });
  });

  it("confirmPlatformOwnerGrant: success path — applies grant + audit event", async () => {
    const ctx = makeCtx(
      [
        { _id: "owner", email: "o@o.com", role: "admin", isPlatformOwner: true },
        { _id: "new_owner", email: "new@o.com", role: "admin", isPlatformOwner: false },
      ],
      [],
      {
        pendingGrants: {
          grant5: {
            _id: "grant5",
            requestedBy: "owner",
            targetMemberId: "new_owner",
            requestedAt: NOW - 70_000,
            confirmsAfter: NOW - 10_000,
            expiresAt: NOW + 230_000,
            status: "pending",
          },
        },
      }
    );
    const result = await h(platformAdmin.confirmPlatformOwnerGrant)(ctx, {
      callerId: "owner",
      requestId: "grant5",
    });

    expect(result.success).toBe(true);
    expect((ctx._allRecords["new_owner"] as any).isPlatformOwner).toBe(true);
    expect((ctx._allRecords["grant5"] as any).status).toBe("confirmed");

    const ev = ctx._securityLog.find(
      (e: any) => e.action === "PLATFORM_OWNER_GRANT_CONFIRMED" && e.success
    );
    expect(ev).toBeTruthy();
    expect((ev as any).actorMemberId).toBe("owner");
    expect((ev as any).targetId).toBe("new_owner");
  });

  it("revokePlatformOwner: wrong phrase rejected + audit logged", async () => {
    const ctx = makeCtx([
      { _id: "owner", email: "o@o.com", role: "admin", isPlatformOwner: true },
      { _id: "other_owner", email: "other@o.com", role: "admin", isPlatformOwner: true },
    ]);
    await expect(
      h(platformAdmin.revokePlatformOwner)(ctx, {
        callerId: "owner",
        targetMemberId: "other_owner",
        confirmationPhrase: "WRONG",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });

    const ev = ctx._securityLog.find((e: any) => e.action === "PLATFORM_OWNER_REVOKE" && !e.success);
    expect(ev).toBeTruthy();
  });

  it("revokePlatformOwner: self-revoke blocked + audit logged", async () => {
    const ctx = makeCtx([
      { _id: "owner", email: "o@o.com", role: "admin", isPlatformOwner: true },
    ]);
    await expect(
      h(platformAdmin.revokePlatformOwner)(ctx, {
        callerId: "owner",
        targetMemberId: "owner",
        confirmationPhrase: "REVOKE_PLATFORM_OWNER",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });

    const ev = ctx._securityLog.find((e: any) => e.action === "PLATFORM_OWNER_REVOKE" && !e.success);
    expect(ev, "no audit event for self-revoke attempt").toBeTruthy();
    expect((ev as any).reason.toLowerCase()).toContain("self");
  });

  it("revokePlatformOwner: non-owner cannot revoke + audit logged", async () => {
    const ctx = makeCtx([
      { _id: "admin1", email: "a@a.com", role: "admin", isPlatformOwner: false },
      { _id: "owner", email: "o@o.com", role: "admin", isPlatformOwner: true },
    ]);
    await expect(
      h(platformAdmin.revokePlatformOwner)(ctx, {
        callerId: "admin1",
        targetMemberId: "owner",
        confirmationPhrase: "REVOKE_PLATFORM_OWNER",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("revokePlatformOwner: success path — clears flag + audit logged", async () => {
    const ctx = makeCtx([
      { _id: "owner1", email: "o1@o.com", role: "admin", isPlatformOwner: true },
      { _id: "owner2", email: "o2@o.com", role: "admin", isPlatformOwner: true },
    ]);
    const result = await h(platformAdmin.revokePlatformOwner)(ctx, {
      callerId: "owner1",
      targetMemberId: "owner2",
      confirmationPhrase: "REVOKE_PLATFORM_OWNER",
    });
    expect(result.success).toBe(true);
    expect((ctx._allRecords["owner2"] as any).isPlatformOwner).toBe(false);

    const ev = ctx._securityLog.find((e: any) => e.action === "PLATFORM_OWNER_REVOKE" && e.success);
    expect(ev).toBeTruthy();
    expect((ev as any).diff?.isPlatformOwner?.from).toBe(true);
    expect((ev as any).diff?.isPlatformOwner?.to).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PHASE 5: Audit trail narrative — can reconstruct who/what/when from events
// ---------------------------------------------------------------------------

describe("5: Audit trail narrative reconstruction", () => {
  it("role change narrative: actor, target, from-role, to-role all present in securityEvents", async () => {
    const ctx = makeCtx([
      { _id: "admin_user", email: "admin@x.com", role: "admin" },
      { _id: "unverified_user", email: "new@x.com", role: "unverified" },
    ]);

    // Give admin USER_MANAGE
    (ctx._allRecords["admin_user"] as any).capAllow = ["user:manage"];

    await h(members.updateRole)(ctx, {
      callerId: "admin_user",
      memberId: "unverified_user",
      role: "patient",
    });

    const ev = ctx._securityLog.find((e: any) => e.action === "ROLE_CHANGE" && e.success);
    expect(ev, "ROLE_CHANGE event not emitted").toBeTruthy();

    // All required narrative fields
    expect((ev as any).actorMemberId, "actor not recorded").toBe("admin_user");
    expect((ev as any).targetId, "target not recorded").toBe("unverified_user");
    expect((ev as any).diff?.role?.from, "from-role not recorded").toBe("unverified");
    expect((ev as any).diff?.role?.to, "to-role not recorded").toBe("patient");
    expect((ev as any).timestamp, "timestamp not recorded").toBeTruthy();
  });

  it("forbidden role change narrative: failed attempt also recorded", async () => {
    const ctx = makeCtx([
      { _id: "patient_user", email: "p@x.com", role: "patient" },
      { _id: "target_user", email: "t@x.com", role: "unverified" },
    ]);

    try {
      await h(members.updateRole)(ctx, {
        callerId: "patient_user",
        memberId: "target_user",
        role: "admin",
      });
    } catch {}

    const ev = ctx._securityLog.find((e: any) => e.action === "ROLE_CHANGE" && !e.success);
    expect(ev, "failed ROLE_CHANGE not audited").toBeTruthy();
    expect((ev as any).actorMemberId).toBe("patient_user");
    expect((ev as any).reason).toBeTruthy();
  });

  it("cap override narrative: before/after diff recorded", async () => {
    const ctx = makeCtx([
      { _id: "admin_user", email: "admin@x.com", role: "admin" },
      { _id: "member_user", email: "m@x.com", role: "provider", capAllow: ["rx:view"] },
    ]);

    await h(members.updateCapOverrides)(ctx, {
      callerId: "admin_user",
      memberId: "member_user",
      capAllow: ["rx:view", "rx:sign"],
      capDeny: ["consult:start"],
    });

    const ev = ctx._securityLog.find((e: any) => e.action === "MEMBER_CAP_OVERRIDE_CHANGE" && e.success);
    expect(ev, "MEMBER_CAP_OVERRIDE_CHANGE not emitted").toBeTruthy();
    expect((ev as any).diff?.capAllow?.from).toContain("rx:view");
    expect((ev as any).diff?.capAllow?.to).toContain("rx:sign");
    expect((ev as any).diff?.capDeny?.to).toContain("consult:start");
  });

  it("full narrative: member registers → forbidden action → elevated → retries successfully", async () => {
    const events: any[] = [];
    const ctx = makeCtx(
      [
        { _id: "sysadmin", email: "sysadmin@x.com", role: "admin" },
        { _id: "new_user", email: "new@x.com", role: "unverified" },
      ],
      [],
      { securityEvents: events }
    );

    // Step 1: new_user tries to update their own role (forbidden — needs USER_MANAGE)
    try {
      await h(members.updateRole)(ctx, {
        callerId: "new_user",
        memberId: "new_user",
        role: "patient",
      });
    } catch {}

    // Step 2: sysadmin elevates them to patient
    await h(members.updateRole)(ctx, {
      callerId: "sysadmin",
      memberId: "new_user",
      role: "patient",
    });

    // Step 3: new_user (now patient) tries to create a prescription (still forbidden)
    try {
      await h(prescriptions.create)(ctx, {
        callerId: "new_user",
        consultationId: "c1",
        patientId: "p1",
        providerId: "prov1",
        medicationName: "TestDrug",
        dosage: "10mg",
        form: "tablet",
        quantity: 30,
        daysSupply: 30,
        refillsAuthorized: 0,
        directions: "Take one daily",
        priorAuthRequired: false,
        expiresAt: Date.now() + 86400000,
      });
    } catch {}

    // Reconstruct narrative from securityEvents
    const roleChangeForbidden = events.find(
      (e) => e.action === "ROLE_CHANGE" && !e.success && e.actorMemberId === "new_user"
    );
    const roleChangeSuccess = events.find(
      (e) => e.action === "ROLE_CHANGE" && e.success && e.actorMemberId === "sysadmin"
    );

    expect(roleChangeForbidden, "forbidden self-elevation not audited").toBeTruthy();
    expect(roleChangeSuccess, "admin elevation not audited").toBeTruthy();

    // Verify chronology
    expect(roleChangeForbidden.timestamp).toBeLessThanOrEqual(roleChangeSuccess.timestamp);

    // Verify identities
    expect(roleChangeSuccess.targetId).toBe("new_user");
    expect(roleChangeSuccess.diff.role.from).toBe("unverified");
    expect(roleChangeSuccess.diff.role.to).toBe("patient");
  });
});

// ---------------------------------------------------------------------------
// PHASE 6-UNIT: Secrets scan (static)
// ---------------------------------------------------------------------------

import * as fs from "fs";

describe("6: Secrets — no hardcoded keys in source", () => {
  const SCAN_DIRS = [
    "convex/",
    "src/",
    "scripts/",
  ];

  const PATTERNS = [
    { re: /sk-[A-Za-z0-9]{20,}/, label: "OpenAI key" },
    { re: /AIzaSy[A-Za-z0-9_-]{33}/, label: "Google API key (hardcoded)" },
    { re: /whsec_[A-Za-z0-9]{40,}/, label: "Stripe webhook secret" },
    { re: /sk_live_[A-Za-z0-9]{20,}/, label: "Stripe live secret" },
    { re: /PLATFORM_OWNER_EMAILS\s*=\s*new Set/, label: "Email-based platform owner bypass" },
    { re: /devBypassVerification\s*=\s*(mutation|action)/, label: "Dev bypass function" },
    { re: /DEV MODE.*bypass/i, label: "Dev bypass comment" },
    { re: /phaxio_api_secret\s*=\s*["'][^"']{5,}/, label: "Phaxio secret hardcoded" },
  ];

  function scanDir(dir: string): { file: string; line: number; label: string; match: string }[] {
    const hits: { file: string; line: number; label: string; match: string }[] = [];
    if (!fs.existsSync(dir)) return hits;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = dir + "/" + entry.name;
      if (entry.isDirectory()) {
        if (entry.name === "_generated" || entry.name === "node_modules") continue;
        hits.push(...scanDir(full));
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".js")) {
        const content = fs.readFileSync(full, "utf8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          for (const { re, label } of PATTERNS) {
            if (re.test(lines[i]) && !lines[i].trim().startsWith("//") && !lines[i].trim().startsWith("*")) {
              hits.push({ file: full, line: i + 1, label, match: lines[i].trim().slice(0, 80) });
            }
          }
        }
      }
    }
    return hits;
  }

  it("no hardcoded secrets or bypass patterns in source tree", () => {
    const hits: { file: string; line: number; label: string; match: string }[] = [];
    for (const dir of SCAN_DIRS) hits.push(...scanDir(dir));

    if (hits.length > 0) {
      const report = hits
        .map((h) => `  ${h.label} at ${h.file}:${h.line} → ${h.match}`)
        .join("\n");
      expect.fail(`Secret/bypass patterns found:\n${report}`);
    }
  });
});
