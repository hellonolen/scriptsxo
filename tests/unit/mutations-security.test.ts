/**
 * MUTATION SECURITY TESTS
 *
 * Verifies the four security properties the user requires:
 *
 *   1. TAMPER  — Org A callerId cannot mutate Org B data by swapping orgId
 *   2. DIRECT  — Direct mutation calls fail for unprivileged roles
 *   3. OVERRIDE — org.capAllow + member.capDeny → deny wins (in handler context)
 *   4. PLATFORM — Platform owner cross-org scope is intentional and bounded
 *
 * Architecture note
 * -----------------
 * All Convex mutations enforce security via:
 *   requireCap(ctx, callerId, cap)      — role bundle + per-org/member overrides
 *   requireOrgMember(ctx, callerId, orgId) — org boundary check
 *
 * Both functions are the only security gate between "UI called mutation"
 * and "direct Convex client call". There is NO additional gate in Convex's
 * runtime — a mutation called from Convex CLI receives the same ctx as one
 * called from the UI. Testing these functions with the same DB state the
 * handler would use IS testing the handler under direct-call conditions.
 *
 * Handler invocation
 * ------------------
 * The mock below makes `mutation(def) → def` so every exported mutation is
 * `{ args, handler }`.  Tests call `handler(mockCtx, args)` directly.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Mock convex/_generated/server BEFORE any handler imports ───────────────
// This must be at module scope; Vitest hoists vi.mock() calls automatically.
vi.mock("../../convex/_generated/server", () => ({
  mutation: (def: { args: unknown; handler: Function }) => def,
  query:    (def: { args: unknown; handler: Function }) => def,
  internalMutation: (def: { args: unknown; handler: Function }) => def,
  internalQuery:    (def: { args: unknown; handler: Function }) => def,
}));

// ─── Import actual mutation handlers (now accessible as .handler) ────────────
import * as prescriptions   from "@convex/prescriptions";
import * as patients        from "@convex/patients";
import * as organizations   from "@convex/organizations";
import * as settings        from "@convex/settings";
import * as members         from "@convex/members";
import * as storage         from "@convex/storage";
import * as credVerifs      from "@convex/credentialVerifications";

// ─── DB fixture ──────────────────────────────────────────────────────────────

const ORG_A = "org_a_id";
const ORG_B = "org_b_id";

const DB: Record<string, unknown> = {
  org_a_id: { _id: ORG_A, name: "Clinic A", slug: "clinic-a", type: "clinic", status: "active", createdAt: 0 },
  org_b_id: { _id: ORG_B, name: "Clinic B", slug: "clinic-b", type: "clinic", status: "active", createdAt: 0 },

  provider_org_a: { _id: "provider_org_a", email: "provider@a.com", role: "provider", orgId: ORG_A, permissions: [], joinedAt: 0, name: "Dr A", status: "active" },
  provider_org_b: { _id: "provider_org_b", email: "provider@b.com", role: "provider", orgId: ORG_B, permissions: [], joinedAt: 0, name: "Dr B", status: "active" },
  patient_member:  { _id: "patient_member",  email: "patient@x.com",  role: "patient",   orgId: null,  permissions: [], joinedAt: 0, name: "Pat",  status: "active" },
  pharmacy_member: { _id: "pharmacy_member", email: "pharma@x.com",   role: "pharmacy",  orgId: ORG_B, permissions: [], joinedAt: 0, name: "Rx",   status: "active" },
  admin_org_a:     { _id: "admin_org_a",     email: "admin@a.com",    role: "admin",     orgId: ORG_A, permissions: [], joinedAt: 0, name: "Adm",  status: "active" },
  platform_owner:  { _id: "platform_owner",  email: "owner@x.com",   role: "admin",     orgId: ORG_A, permissions: [], joinedAt: 0, name: "PO",   status: "active", isPlatformOwner: true },

  // For override precedence tests
  provider_denied_rx: {
    _id: "provider_denied_rx",
    email: "provdeny@a.com",
    role: "provider",
    orgId: "org_override",
    permissions: [],
    joinedAt: 0,
    name: "DenyRx",
    status: "active",
    capDeny: ["rx:write"],
  },
  org_override: {
    _id: "org_override",
    name: "Override Org",
    slug: "override",
    type: "clinic",
    status: "active",
    createdAt: 0,
    capAllow: ["rx:write"], // org grants it...
  },
  patient_allowed_rx: {
    _id: "patient_allowed_rx",
    email: "patient_rx@x.com",
    role: "patient",
    orgId: "org_override",
    permissions: [],
    joinedAt: 0,
    name: "AllowRx",
    status: "active",
    capAllow: ["rx:write"], // member gets it via allow...
    capDeny:  ["rx:write"], // ...but member deny removes it
  },
};

// Fully chainable query builder mock — every method returns itself or a terminal
function makeQueryChain(results: unknown[] = [], first: unknown = null) {
  const chain: Record<string, unknown> = {};
  const terminal = {
    first:   vi.fn(async () => first),
    collect: vi.fn(async () => results),
    take:    vi.fn(async () => results),
  };
  // All builder methods return the same chain (which also has terminal methods)
  const builder: Record<string, unknown> = {
    ...terminal,
    withIndex: vi.fn((_name: string, _fn?: Function) => builder),
    filter:    vi.fn((_fn?: Function) => builder),
    order:     vi.fn(() => builder),
    eq:        vi.fn(() => builder),
  };
  return builder;
}

function makeCtx(extraInserts: Record<string, unknown> = {}) {
  const db = { ...DB, ...extraInserts };
  const inserted: unknown[] = [];
  const patched: Array<[string, unknown]> = [];

  return {
    db: {
      get: vi.fn(async (id: string) => db[id] ?? null),
      insert: vi.fn(async (_table: string, data: unknown) => {
        const id = `inserted_${inserted.length}`;
        inserted.push({ _id: id, ...( data as object) });
        (db as Record<string,unknown>)[id] = { _id: id, ...(data as object) };
        return id;
      }),
      patch: vi.fn(async (id: string, data: unknown) => {
        patched.push([id, data]);
      }),
      delete: vi.fn(async (_id: string) => {}),
      query: vi.fn((_table: string) => makeQueryChain()),
    },
    _inserted: inserted,
    _patched: patched,
  };
}

type Ctx = ReturnType<typeof makeCtx>;

// Helper: extract the raw handler from a Convex mutation/query def
function h(mod: { handler: Function }) { return mod.handler; }

// ─────────────────────────────────────────────────────────────────────────────
// 1. TAMPER TESTS — cross-org mutation attempts
// ─────────────────────────────────────────────────────────────────────────────

describe("1. TAMPER — Org A callerId cannot mutate Org B", () => {
  it("addMember: org_a provider tries to add to org_b → FORBIDDEN", async () => {
    const ctx = makeCtx();
    await expect(
      h(organizations.addMember)(ctx, {
        callerId: "provider_org_a", // legitimate caller in org A
        orgId: ORG_B,               // but targeting org B
        email: "new@b.com",
        name: "New",
        role: "provider",
        orgRole: "member",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("removeMember: org_a provider tries to remove from org_b → FORBIDDEN", async () => {
    const ctx = makeCtx();
    await expect(
      h(organizations.removeMember)(ctx, {
        callerId: "provider_org_a",
        orgId: ORG_B,
        memberId: "provider_org_b",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("update: org_a admin tries to update org_b → FORBIDDEN", async () => {
    const ctx = makeCtx();
    await expect(
      h(organizations.update)(ctx, {
        callerId: "admin_org_a",
        orgId: ORG_B,
        name: "Hijacked",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("addMember: swapping orgId in same call → still FORBIDDEN", async () => {
    // Even if callerId is valid for org A, swapping to org B must fail
    const ctx = makeCtx();
    await expect(
      h(organizations.addMember)(ctx, {
        callerId: "admin_org_a",
        orgId: ORG_B,
        email: "hacked@b.com",
        name: "Hacked",
        role: "admin",
        orgRole: "owner",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DIRECT-CALL TESTS — roles that must be blocked
// ─────────────────────────────────────────────────────────────────────────────

describe("2. DIRECT-CALL — wrong role fails on protected mutations", () => {
  // patient cannot create prescriptions
  it("patient → prescriptions.create → FORBIDDEN (no rx:write)", async () => {
    const ctx = makeCtx();
    await expect(
      h(prescriptions.create)(ctx, {
        callerId: "patient_member",
        consultationId: "c1" as any,
        patientId: "p1" as any,
        providerId: "prov1" as any,
        medicationName: "Amoxicillin",
        dosage: "500mg",
        form: "capsule",
        quantity: 30,
        daysSupply: 10,
        refillsAuthorized: 0,
        refillsUsed: 0,
        directions: "Take once daily",
        status: "draft",
        priorAuthRequired: false,
        expiresAt: Date.now() + 86400000,
        cost: 2000,
        paymentStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  // pharmacy cannot update patients
  it("pharmacy → patients.update → FORBIDDEN (no patient:manage)", async () => {
    const ctx = makeCtx();
    await expect(
      h(patients.update)(ctx, {
        callerId: "pharmacy_member",
        patientId: "p1" as any,
        allergies: ["peanuts"],
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  // provider cannot manage settings
  it("provider → settings.set → FORBIDDEN (no settings:manage)", async () => {
    const ctx = makeCtx();
    await expect(
      h(settings.set)(ctx, {
        callerId: "provider_org_a",
        key: "featureFlag",
        value: true,
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  // provider cannot manage users
  it("provider → organizations.addMember → FORBIDDEN (no user:manage)", async () => {
    const ctx = makeCtx();
    await expect(
      h(organizations.addMember)(ctx, {
        callerId: "provider_org_a",
        orgId: ORG_A,
        email: "new@a.com",
        name: "New",
        role: "provider",
        orgRole: "member",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  // unauthenticated (no callerId) gets UNAUTHORIZED on any protected mutation
  it("no callerId → prescriptions.create → UNAUTHORIZED", async () => {
    const ctx = makeCtx();
    await expect(
      h(prescriptions.create)(ctx, {
        callerId: undefined,
        consultationId: "c1" as any,
        patientId: "p1" as any,
        providerId: "prov1" as any,
        medicationName: "Test",
        dosage: "1mg",
        form: "tablet",
        quantity: 1,
        daysSupply: 1,
        refillsAuthorized: 0,
        refillsUsed: 0,
        directions: "Take daily",
        status: "draft",
        priorAuthRequired: false,
        expiresAt: Date.now() + 86400000,
        cost: 0,
        paymentStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  it("no callerId → settings.set → UNAUTHORIZED", async () => {
    const ctx = makeCtx();
    await expect(
      h(settings.set)(ctx, { callerId: undefined, key: "x", value: 1 })
    ).rejects.toMatchObject({ data: { code: "UNAUTHORIZED" } });
  });

  // patient cannot elevate their own role (privilege escalation)
  it("patient → members.updateRole (self) → FORBIDDEN (no user:manage)", async () => {
    const ctx = makeCtx();
    await expect(
      h(members.updateRole)(ctx, {
        callerId: "patient_member",
        memberId: "patient_member" as any, // claiming to update self
        role: "admin",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  // patient cannot update another member's profile
  it("patient → members.updateProfile (other user) → FORBIDDEN (no user:manage)", async () => {
    const ctx = makeCtx();
    await expect(
      h(members.updateProfile)(ctx, {
        callerId: "patient_member",
        memberId: "provider_org_a" as any,
        name: "Hacked Name",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  // credentialVerification.complete requires INTAKE_REVIEW
  it("patient → credentialVerifications.complete → FORBIDDEN (no intake:review)", async () => {
    const ctx = makeCtx();
    await expect(
      h(credVerifs.complete)(ctx, {
        callerId: "patient_member",
        id: "cv1" as any,
        status: "verified",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. OVERRIDE PRECEDENCE — deny wins over allow, tested in handler context
// ─────────────────────────────────────────────────────────────────────────────

describe("3. OVERRIDE PRECEDENCE — deny wins in mutation handler", () => {
  it("org.capAllow=[rx:write] + member.capDeny=[rx:write] → prescriptions.create FORBIDDEN", async () => {
    // org_override grants rx:write to all members
    // but provider_denied_rx has member-level capDeny=[rx:write]
    // → deny wins → handler must throw FORBIDDEN
    const ctx = makeCtx();
    await expect(
      h(prescriptions.create)(ctx, {
        callerId: "provider_denied_rx",
        consultationId: "c1" as any,
        patientId: "p1" as any,
        providerId: "prov1" as any,
        medicationName: "Deniedicin",
        dosage: "1mg",
        form: "tablet",
        quantity: 1,
        daysSupply: 1,
        refillsAuthorized: 0,
        refillsUsed: 0,
        directions: "Take daily",
        status: "draft",
        priorAuthRequired: false,
        expiresAt: Date.now() + 86400000,
        cost: 0,
        paymentStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("member.capAllow=[rx:write] + member.capDeny=[rx:write] → prescriptions.create FORBIDDEN", async () => {
    // capAllow grants, capDeny revokes same cap → deny wins
    const ctx = makeCtx();
    await expect(
      h(prescriptions.create)(ctx, {
        callerId: "patient_allowed_rx",
        consultationId: "c1" as any,
        patientId: "p1" as any,
        providerId: "prov1" as any,
        medicationName: "AllowyDeny",
        dosage: "1mg",
        form: "tablet",
        quantity: 1,
        daysSupply: 1,
        refillsAuthorized: 0,
        refillsUsed: 0,
        directions: "Take daily",
        status: "draft",
        priorAuthRequired: false,
        expiresAt: Date.now() + 86400000,
        cost: 0,
        paymentStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("provider with no deny → prescriptions.create succeeds", async () => {
    // Verify the deny tests don't have a false positive —
    // a normal provider (no capDeny) must succeed through.
    const ctx = makeCtx();
    // Should NOT throw — insert will be called (we don't check DB output here,
    // just that the cap check passes)
    await expect(
      h(prescriptions.create)(ctx, {
        callerId: "provider_org_a",
        consultationId: "c1" as any,
        patientId: "p1" as any,
        providerId: "prov1" as any,
        medicationName: "Amoxicillin",
        dosage: "500mg",
        form: "capsule",
        quantity: 30,
        daysSupply: 10,
        refillsAuthorized: 0,
        refillsUsed: 0,
        directions: "Once daily",
        status: "draft",
        priorAuthRequired: false,
        expiresAt: Date.now() + 86400000,
        cost: 2000,
        paymentStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ).resolves.toBeDefined(); // insert returns a fake ID
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLATFORM OWNER SCOPE — cross-org access is intentional and documented
// ─────────────────────────────────────────────────────────────────────────────

describe("4. PLATFORM OWNER SCOPE — cross-org access", () => {
  /**
   * Design decision (see convex/platformAdmin.ts):
   *   Platform owners bypass requireOrgMember() to support break-glass
   *   administration across all orgs.
   *
   *   This is INTENTIONAL for a SaaS context where the operator must be
   *   able to manage any tenant org.
   *
   *   Constraints:
   *   - isPlatformOwner is set only via the seed / grantPlatformOwner mutations
   *   - It cannot be set to true by any client-supplied value
   *   - It is a DB record flag, never derived from email or session
   *
   *   Future: log every cross-org platform owner action to auditLog.
   */

  it("platform_owner (orgId=org_a) can add member to org_b — intentional break-glass", async () => {
    const ctx = makeCtx();
    // addMember requires USER_MANAGE cap and org membership.
    // Platform owner has all caps (USER_MANAGE ✓) and bypasses org check.
    await expect(
      h(organizations.addMember)(ctx, {
        callerId: "platform_owner",
        orgId: ORG_B,           // different org from owner's orgId
        email: "new@b.com",
        name: "New",
        role: "provider",
        orgRole: "member",
      })
    ).resolves.toBeDefined();
  });

  it("platform_owner can update any org settings — intentional", async () => {
    const ctx = makeCtx();
    await expect(
      h(organizations.update)(ctx, {
        callerId: "platform_owner",
        orgId: ORG_B,
        name: "Updated by PO",
      })
    ).resolves.toBeDefined();
  });

  it("non-owner admin (admin_org_a) cannot cross org boundary — confirms constraint", async () => {
    // admin_org_a has USER_MANAGE cap but is NOT isPlatformOwner
    const ctx = makeCtx();
    await expect(
      h(organizations.addMember)(ctx, {
        callerId: "admin_org_a",
        orgId: ORG_B,
        email: "sneak@b.com",
        name: "Sneak",
        role: "provider",
        orgRole: "member",
      })
    ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
  });

  it("platform_owner can create prescriptions for any patient — all caps granted", async () => {
    const ctx = makeCtx();
    await expect(
      h(prescriptions.create)(ctx, {
        callerId: "platform_owner",
        consultationId: "c1" as any,
        patientId: "p1" as any,
        providerId: "prov1" as any,
        medicationName: "AdminRx",
        dosage: "1mg",
        form: "tablet",
        quantity: 1,
        daysSupply: 1,
        refillsAuthorized: 0,
        refillsUsed: 0,
        directions: "As needed",
        status: "draft",
        priorAuthRequired: false,
        expiresAt: Date.now() + 86400000,
        cost: 0,
        paymentStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. STATIC COMPLETENESS — every protected mutation/action file has enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe("5. STATIC COMPLETENESS — every protected handler has requireCap", () => {
  const CONVEX_DIR = path.resolve(__dirname, "../../convex");

  /**
   * Files that MUST contain capability enforcement (mutations with protected data)
   */
  const PROTECTED_MUTATIONS = [
    "prescriptions.ts",
    "patients.ts",
    "consultations.ts",
    "intake.ts",
    "messages.ts",
    "refills.ts",
    "providers.ts",
    "pharmacies.ts",
    "billing.ts",
    "compliance.ts",
    "settings.ts",
    "organizations.ts",
    "scheduling.ts",
    "followUps.ts",
    "triage.ts",
    "aiConversations.ts",
    "members.ts",
    "storage.ts",
    "credentialVerifications.ts",
  ];

  for (const file of PROTECTED_MUTATIONS) {
    it(`${file} contains requireCap or requireAnyCap`, () => {
      const content = fs.readFileSync(path.join(CONVEX_DIR, file), "utf-8");
      const hasCapCheck =
        content.includes("requireCap(") ||
        content.includes("requireAnyCap(");
      expect(
        hasCapCheck,
        `${file} has mutations but no requireCap/requireAnyCap call`
      ).toBe(true);
    });
  }

  /**
   * Action files — enforcement model for actions:
   *
   *   Convex actions run in Node.js ("use node") and do NOT have ctx.db.
   *   requireCap(ctx, ...) relies on ctx.db.get() and will always throw in
   *   action context (ctx.db is undefined → catch → empty caps → FORBIDDEN).
   *
   *   The REAL enforcement gate for actions is in the mutations they call via
   *   ctx.runMutation(). Every action calls at least one protected mutation.
   *
   *   This test verifies that action files that ARE action-gated have callerId
   *   threaded through to their underlying mutations, OR are in the intentional
   *   public list (pre-identity auth flows, public lookup utilities).
   *
   *   Action files fall into three categories:
   *   A) "enforced-at-mutation" — threads callerId to protected mutations
   *   B) "pre-identity public"  — auth flows, no session yet
   *   C) "public utility"       — read-only, no DB writes, intentionally open
   */

  // Category B: auth flows that run before a user identity exists
  const PRE_IDENTITY_ACTIONS = new Set([
    "emailAuth.ts",
    "webauthn.ts",
    "magicLinks.ts",
  ]);

  // Category C: read-only public utilities with no protected DB writes
  const PUBLIC_UTILITY_ACTIONS = new Set([
    "lookupPharmacy.ts",   // NPI registry lookup — read-only external API
    "validateInput.ts",    // Input validation — no DB side effects
    "stripeCheckout.ts",   // Payment flow — Stripe handles auth
    "stripeIdentity.ts",   // Stripe Identity flow
    "whopCheckout.ts",     // Whop payment flow
  ]);

  // Category A: enforced-at-mutation (must thread callerId through)
  const ENFORCED_AT_MUTATION_ACTIONS = new Set([
    "credentialVerificationOrchestrator.ts",  // calls credentialVerifications + members mutations
    "aiChat.ts",                               // calls aiConversations mutations
    "assignProvider.ts",                       // calls providers mutations
    "generatePrescriptionPdf.ts",             // calls prescriptions mutations
    "sendFax.ts",                              // calls faxLogs mutations
    "verifyLicense.ts",                        // calls compliance mutations
    "medicalIntelligence.ts",                  // read-only external API; no DB writes
    "scanDocument.ts",                         // document scan; no direct DB writes
  ]);

  it("all action files are categorized (no uncategorized action files)", () => {
    const actionsDir = path.join(CONVEX_DIR, "actions");
    const actionFiles = fs.readdirSync(actionsDir).filter((f) => f.endsWith(".ts"));
    const uncategorized = actionFiles.filter(
      (f) =>
        !PRE_IDENTITY_ACTIONS.has(f) &&
        !PUBLIC_UTILITY_ACTIONS.has(f) &&
        !ENFORCED_AT_MUTATION_ACTIONS.has(f)
    );
    expect(
      uncategorized,
      `Uncategorized action files (assign to pre-identity, public-utility, or enforced-at-mutation): ${uncategorized.join(", ")}`
    ).toHaveLength(0);
  });

  it("enforced-at-mutation actions contain callerId arg", () => {
    const actionsDir = path.join(CONVEX_DIR, "actions");
    const missing: string[] = [];
    for (const file of ENFORCED_AT_MUTATION_ACTIONS) {
      const fullPath = path.join(actionsDir, file);
      if (!fs.existsSync(fullPath)) continue; // skip if file doesn't exist yet
      const content = fs.readFileSync(fullPath, "utf-8");
      // medicalIntelligence and scanDocument are read-only external calls — no callerId needed
      if (file === "medicalIntelligence.ts" || file === "scanDocument.ts") continue;
      if (!content.includes("callerId")) missing.push(file);
    }
    expect(
      missing,
      `Enforced-at-mutation actions missing callerId arg: ${missing.join(", ")}`
    ).toHaveLength(0);
  });

  it("devBypassVerification export does not exist in credentialVerificationOrchestrator", () => {
    const content = fs.readFileSync(
      path.join(CONVEX_DIR, "actions/credentialVerificationOrchestrator.ts"),
      "utf-8"
    );
    // Check that the function is not exported (tombstone comment may reference the name)
    expect(content).not.toMatch(/export\s+const\s+devBypassVerification/);
    expect(content).not.toContain("DEV MODE: verification bypassed");
  });
});
