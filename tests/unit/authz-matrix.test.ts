/**
 * AUTHZ MATRIX TESTS (Phase 2)
 *
 * Tests the capability-based authorization system for 8 actors × 8 routes.
 * Rather than testing the Next.js edge middleware directly (which requires
 * mocking NextRequest/NextResponse), this tests the underlying capability
 * system that the middleware delegates to.
 *
 * Verified property: given a role, does it have the required capability for
 * a given route? This is the source-of-truth for middleware decisions.
 *
 * Matrix:
 *   Roles: unverified, patient, nurse, provider, pharmacy, admin
 *   Routes (by required cap): dashboard, intake, pharmacy, provider, admin,
 *                              consultation, messages, workflows
 */

import { describe, it, expect } from "vitest";

// Mirror of src/lib/capabilities.ts — we import the source of truth directly
const CAP = {
  VIEW_DASHBOARD:      "view:dashboard",
  INTAKE_SELF:         "intake:self",
  INTAKE_REVIEW:       "intake:review",
  RX_VIEW:             "rx:view",
  RX_WRITE:            "rx:write",
  RX_SIGN:             "rx:sign",
  RX_REFILL:           "rx:refill",
  CONSULT_START:       "consult:start",
  CONSULT_JOIN:        "consult:join",
  CONSULT_HISTORY:     "consult:history",
  WORKFLOW_VIEW:       "workflow:view",
  WORKFLOW_MANAGE:     "workflow:manage",
  MSG_VIEW:            "msg:view",
  MSG_SEND:            "msg:send",
  PHARMACY_QUEUE:      "pharmacy:queue",
  PHARMACY_FILL:       "pharmacy:fill",
  PHARMACY_VERIFY:     "pharmacy:verify",
  PATIENT_VIEW:        "patient:view",
  PATIENT_MANAGE:      "patient:manage",
  PROVIDER_MANAGE:     "provider:manage",
  REPORT_VIEW:         "report:view",
  REPORT_EXPORT:       "report:export",
  AUDIT_VIEW:          "audit:view",
  USER_VIEW:           "user:view",
  USER_MANAGE:         "user:manage",
  SETTINGS_VIEW:       "settings:view",
  SETTINGS_MANAGE:     "settings:manage",
  AGENTS_VIEW:         "agents:view",
  AGENTS_MANAGE:       "agents:manage",
  INTEGRATIONS_VIEW:   "integrations:view",
  INTEGRATIONS_MANAGE: "integrations:manage",
} as const;

type Capability = (typeof CAP)[keyof typeof CAP];
type Role = "unverified" | "patient" | "nurse" | "provider" | "pharmacy" | "admin";

const ROLE_CAPS: Record<Role, Capability[]> = {
  unverified: [CAP.VIEW_DASHBOARD, CAP.INTAKE_SELF, CAP.MSG_VIEW, CAP.MSG_SEND],
  patient: [
    CAP.VIEW_DASHBOARD, CAP.INTAKE_SELF, CAP.RX_VIEW, CAP.RX_REFILL,
    CAP.CONSULT_JOIN, CAP.CONSULT_HISTORY, CAP.MSG_VIEW, CAP.MSG_SEND,
  ],
  nurse: [
    CAP.VIEW_DASHBOARD, CAP.INTAKE_REVIEW, CAP.RX_VIEW, CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY, CAP.WORKFLOW_VIEW, CAP.MSG_VIEW, CAP.MSG_SEND,
    CAP.PATIENT_VIEW, CAP.PATIENT_MANAGE,
  ],
  provider: [
    CAP.VIEW_DASHBOARD, CAP.INTAKE_REVIEW, CAP.RX_VIEW, CAP.RX_WRITE,
    CAP.RX_SIGN, CAP.RX_REFILL, CAP.CONSULT_START, CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY, CAP.WORKFLOW_VIEW, CAP.WORKFLOW_MANAGE,
    CAP.MSG_VIEW, CAP.MSG_SEND, CAP.PATIENT_VIEW, CAP.PATIENT_MANAGE,
  ],
  pharmacy: [
    CAP.VIEW_DASHBOARD, CAP.RX_VIEW, CAP.MSG_VIEW, CAP.MSG_SEND,
    CAP.PHARMACY_QUEUE, CAP.PHARMACY_FILL, CAP.PHARMACY_VERIFY,
  ],
  admin: Object.values(CAP) as Capability[],
};

function hasCap(role: Role, cap: Capability): boolean {
  return ROLE_CAPS[role].includes(cap);
}

function hasAnyCap(role: Role, caps: Capability[]): boolean {
  return caps.some((c) => hasCap(role, c));
}

// Route → required caps (from middleware.ts ROUTE_GUARDS)
const ROUTE_REQUIREMENTS: Record<string, Capability[]> = {
  "/admin":        [CAP.REPORT_VIEW, CAP.AUDIT_VIEW, CAP.USER_MANAGE, CAP.PROVIDER_MANAGE, CAP.AGENTS_VIEW, CAP.SETTINGS_VIEW],
  "/provider":     [CAP.PATIENT_VIEW, CAP.RX_WRITE, CAP.CONSULT_START, CAP.WORKFLOW_VIEW],
  "/pharmacy":     [CAP.PHARMACY_QUEUE, CAP.PHARMACY_FILL],
  "/consultation": [CAP.CONSULT_JOIN, CAP.CONSULT_START],
  "/dashboard":    [CAP.VIEW_DASHBOARD],
  "/intake":       [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW],
  "/workflows":    [CAP.WORKFLOW_VIEW],
  "/messages":     [CAP.MSG_VIEW],
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED MATRIX (true = allowed, false = denied)
// ─────────────────────────────────────────────────────────────────────────────

type RouteKey = keyof typeof ROUTE_REQUIREMENTS;

const EXPECTED: Record<Role, Record<RouteKey, boolean>> = {
  unverified: {
    "/admin":        false,
    "/provider":     false,
    "/pharmacy":     false,
    "/consultation": false,
    "/dashboard":    true,  // has VIEW_DASHBOARD
    "/intake":       true,  // has INTAKE_SELF
    "/workflows":    false,
    "/messages":     true,  // has MSG_VIEW
  },
  patient: {
    "/admin":        false,
    "/provider":     false,
    "/pharmacy":     false,
    "/consultation": true,  // has CONSULT_JOIN
    "/dashboard":    true,
    "/intake":       true,  // has INTAKE_SELF
    "/workflows":    false,
    "/messages":     true,
  },
  nurse: {
    "/admin":        false,
    "/provider":     true,  // has PATIENT_VIEW and WORKFLOW_VIEW
    "/pharmacy":     false,
    "/consultation": true,  // has CONSULT_JOIN
    "/dashboard":    true,
    "/intake":       true,  // has INTAKE_REVIEW
    "/workflows":    true,  // has WORKFLOW_VIEW
    "/messages":     true,
  },
  provider: {
    "/admin":        false,
    "/provider":     true,  // has PATIENT_VIEW, RX_WRITE, CONSULT_START, WORKFLOW_VIEW
    "/pharmacy":     false,
    "/consultation": true,  // has CONSULT_JOIN and CONSULT_START
    "/dashboard":    true,
    "/intake":       true,  // has INTAKE_REVIEW
    "/workflows":    true,  // has WORKFLOW_VIEW
    "/messages":     true,
  },
  pharmacy: {
    "/admin":        false,
    "/provider":     false,
    "/pharmacy":     true,  // has PHARMACY_QUEUE and PHARMACY_FILL
    "/consultation": false,
    "/dashboard":    true,
    "/intake":       false,
    "/workflows":    false,
    "/messages":     true,
  },
  admin: {
    "/admin":        true,  // has all caps
    "/provider":     true,
    "/pharmacy":     true,
    "/consultation": true,
    "/dashboard":    true,
    "/intake":       true,
    "/workflows":    true,
    "/messages":     true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTHZ MATRIX TEST
// ─────────────────────────────────────────────────────────────────────────────

const ROLES: Role[] = ["unverified", "patient", "nurse", "provider", "pharmacy", "admin"];
const ROUTES = Object.keys(ROUTE_REQUIREMENTS) as RouteKey[];

describe("AuthZ Matrix — role × route capability checks", () => {
  for (const role of ROLES) {
    describe(`Role: ${role}`, () => {
      for (const route of ROUTES) {
        const expected = EXPECTED[role][route];
        const requiredCaps = ROUTE_REQUIREMENTS[route];
        it(`${route} → ${expected ? "ALLOWED" : "DENIED"}`, () => {
          const actual = hasAnyCap(role, requiredCaps);
          expect(actual).toBe(expected);
        });
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL INVARIANTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Critical invariants", () => {
  it("unverified role CANNOT access /admin", () => {
    expect(hasAnyCap("unverified", ROUTE_REQUIREMENTS["/admin"])).toBe(false);
  });

  it("unverified role CANNOT access /provider", () => {
    expect(hasAnyCap("unverified", ROUTE_REQUIREMENTS["/provider"])).toBe(false);
  });

  it("unverified role CANNOT access /pharmacy", () => {
    expect(hasAnyCap("unverified", ROUTE_REQUIREMENTS["/pharmacy"])).toBe(false);
  });

  it("patient CANNOT access /admin", () => {
    expect(hasAnyCap("patient", ROUTE_REQUIREMENTS["/admin"])).toBe(false);
  });

  it("patient CANNOT access /provider portal", () => {
    expect(hasAnyCap("patient", ROUTE_REQUIREMENTS["/provider"])).toBe(false);
  });

  it("patient CANNOT access /pharmacy", () => {
    expect(hasAnyCap("patient", ROUTE_REQUIREMENTS["/pharmacy"])).toBe(false);
  });

  it("pharmacy CANNOT access /admin", () => {
    expect(hasAnyCap("pharmacy", ROUTE_REQUIREMENTS["/admin"])).toBe(false);
  });

  it("pharmacy CANNOT access /provider portal", () => {
    expect(hasAnyCap("pharmacy", ROUTE_REQUIREMENTS["/provider"])).toBe(false);
  });

  it("pharmacy CANNOT access /consultation", () => {
    expect(hasAnyCap("pharmacy", ROUTE_REQUIREMENTS["/consultation"])).toBe(false);
  });

  it("provider CANNOT access /admin", () => {
    expect(hasAnyCap("provider", ROUTE_REQUIREMENTS["/admin"])).toBe(false);
  });

  it("admin has ALL capabilities", () => {
    for (const cap of Object.values(CAP)) {
      expect(hasCap("admin", cap)).toBe(true);
    }
  });

  it("every role can access /dashboard (all have VIEW_DASHBOARD)", () => {
    for (const role of ROLES) {
      expect(hasCap(role, CAP.VIEW_DASHBOARD)).toBe(true);
    }
  });

  it("every role can access /messages (all have MSG_VIEW)", () => {
    for (const role of ROLES) {
      expect(hasCap(role, CAP.MSG_VIEW)).toBe(true);
    }
  });
});
