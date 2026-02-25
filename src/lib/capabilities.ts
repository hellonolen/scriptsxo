/**
 * CAPABILITY SYSTEM — CLIENT-SIDE MODULE
 *
 * This file is the source of truth for capability identifiers, role mappings,
 * and helper functions. It is used on the client (AppShell nav, route guards)
 * and mirrored in convex/lib/capabilities.ts for server-side enforcement.
 *
 * KEEP IN SYNC with convex/lib/capabilities.ts — both files define the same
 * CAP constants and ROLE_CAPS mapping. They cannot share a module because
 * Convex and Next.js run in separate runtimes.
 *
 * V1 Design Decisions (see ADR-023):
 *  - Fixed role → capability bundles. No per-org customization yet.
 *  - Multi-role support: pass roles[] and take the union of capabilities.
 *  - Server-side enforcement uses memberId + DB lookup via requireCap().
 *  - V2 will add capAllow/capDeny overrides per org membership.
 */

// ---------------------------------------------------------------------------
// Capability identifiers
// ---------------------------------------------------------------------------

export const CAP = {
  // Core access
  VIEW_DASHBOARD: "view:dashboard",

  // Intake
  INTAKE_SELF: "intake:self",         // patient submits own intake
  INTAKE_REVIEW: "intake:review",     // provider/nurse reviews intake

  // Prescriptions
  RX_VIEW: "rx:view",                 // view prescription list
  RX_WRITE: "rx:write",               // create a new Rx
  RX_SIGN: "rx:sign",                 // sign / approve an Rx (provider only)
  RX_REFILL: "rx:refill",             // request a refill (patient)

  // Consultations
  CONSULT_START: "consult:start",     // provider initiates session
  CONSULT_JOIN: "consult:join",       // patient / nurse joins session
  CONSULT_HISTORY: "consult:history", // view past consultation records

  // Workflows (provider / nurse task management)
  WORKFLOW_VIEW: "workflow:view",
  WORKFLOW_MANAGE: "workflow:manage",

  // Messaging
  MSG_VIEW: "msg:view",
  MSG_SEND: "msg:send",

  // Pharmacy operations
  PHARMACY_QUEUE: "pharmacy:queue",   // view pharmacy queue
  PHARMACY_FILL: "pharmacy:fill",     // fill / dispense an Rx
  PHARMACY_VERIFY: "pharmacy:verify", // verify a prescription

  // Patient management (provider / admin)
  PATIENT_VIEW: "patient:view",
  PATIENT_MANAGE: "patient:manage",   // edit, assign, discharge

  // Administration
  PROVIDER_MANAGE: "provider:manage", // manage provider roster
  REPORT_VIEW: "report:view",
  REPORT_EXPORT: "report:export",
  AUDIT_VIEW: "audit:view",
  USER_VIEW: "user:view",
  USER_MANAGE: "user:manage",
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",
  AGENTS_VIEW: "agents:view",
  AGENTS_MANAGE: "agents:manage",
  INTEGRATIONS_VIEW: "integrations:view",
  INTEGRATIONS_MANAGE: "integrations:manage",
} as const;

export type Capability = (typeof CAP)[keyof typeof CAP];

// ---------------------------------------------------------------------------
// Role type
// ---------------------------------------------------------------------------

export type Role =
  | "patient"
  | "provider"
  | "nurse"
  | "pharmacy"
  | "admin"
  | "unverified";

// ---------------------------------------------------------------------------
// Role → capability bundles
// ---------------------------------------------------------------------------

export const ROLE_CAPS: Record<Role, Capability[]> = {
  unverified: [],

  patient: [
    CAP.VIEW_DASHBOARD,
    CAP.INTAKE_SELF,
    CAP.RX_VIEW,
    CAP.RX_REFILL,
    CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
  ],

  nurse: [
    CAP.VIEW_DASHBOARD,
    CAP.INTAKE_REVIEW,
    CAP.RX_VIEW,
    CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY,
    CAP.WORKFLOW_VIEW,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
    CAP.PATIENT_VIEW,
    CAP.PATIENT_MANAGE,
  ],

  provider: [
    CAP.VIEW_DASHBOARD,
    CAP.INTAKE_REVIEW,
    CAP.RX_VIEW,
    CAP.RX_WRITE,
    CAP.RX_SIGN,
    CAP.RX_REFILL,
    CAP.CONSULT_START,
    CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY,
    CAP.WORKFLOW_VIEW,
    CAP.WORKFLOW_MANAGE,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
    CAP.PATIENT_VIEW,
    CAP.PATIENT_MANAGE,
  ],

  pharmacy: [
    CAP.VIEW_DASHBOARD,
    CAP.RX_VIEW,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
    CAP.PHARMACY_QUEUE,
    CAP.PHARMACY_FILL,
    CAP.PHARMACY_VERIFY,
  ],

  // Admin has all capabilities
  admin: Object.values(CAP) as Capability[],
};

// ---------------------------------------------------------------------------
// Priority order for primary role resolution (highest → lowest)
// ---------------------------------------------------------------------------

const ROLE_PRIORITY: Role[] = [
  "admin",
  "provider",
  "nurse",
  "pharmacy",
  "patient",
  "unverified",
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Compute the union of capabilities across all of a user's roles.
 * Supports multi-role memberships — returns a Set for O(1) lookups.
 */
export function getEffectiveCaps(roles: Role[]): Set<Capability> {
  const caps = new Set<Capability>();
  for (const role of roles) {
    for (const cap of ROLE_CAPS[role] ?? []) {
      caps.add(cap);
    }
  }
  return caps;
}

/**
 * Returns true if the user (described by their roles array) has the capability.
 */
export function hasCap(roles: Role[], cap: Capability): boolean {
  return getEffectiveCaps(roles).has(cap);
}

/**
 * Returns true if the user has ANY of the listed capabilities.
 */
export function hasAnyCap(roles: Role[], caps: Capability[]): boolean {
  const effective = getEffectiveCaps(roles);
  return caps.some((c) => effective.has(c));
}

/**
 * Returns true if the user has ALL of the listed capabilities.
 */
export function hasAllCaps(roles: Role[], caps: Capability[]): boolean {
  const effective = getEffectiveCaps(roles);
  return caps.every((c) => effective.has(c));
}

/**
 * Returns the highest-priority role for a user with multiple roles.
 * Used to resolve role-specific hrefs in the nav.
 */
export function getPrimaryRole(roles: Role[]): Role {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return "unverified";
}

/**
 * Parse the session cookie's role string into a roles array.
 * V1: sessions store a single role string. We normalise to an array here
 * so the rest of the system is multi-role ready.
 */
export function parseRolesFromSession(sessionRole: string | undefined): Role[] {
  if (!sessionRole) return ["unverified"];
  const r = sessionRole as Role;
  if (!(r in ROLE_CAPS)) return ["unverified"];
  return [r];
}

/**
 * Human-readable label for a role — used in the user section of the sidebar.
 */
export function roleLabel(primaryRole: Role): string {
  switch (primaryRole) {
    case "admin":     return "Admin";
    case "provider":  return "Provider";
    case "nurse":     return "Nurse";
    case "pharmacy":  return "Pharmacy";
    case "patient":   return "Client";
    case "unverified": return "Pending Verification";
  }
}
