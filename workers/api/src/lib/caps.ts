export const CAP = {
  VIEW_DASHBOARD:   'view:dashboard',
  USER_MANAGE:      'user:manage',
  RX_WRITE:         'rx:write',
  RX_SIGN:          'rx:sign',
  RX_READ:          'rx:read',
  CONSULT_START:    'consult:start',
  CONSULT_JOIN:     'consult:join',
  PATIENT_READ:     'patient:read',
  PATIENT_WRITE:    'patient:write',
  PROVIDER_READ:    'provider:read',
  PROVIDER_WRITE:   'provider:write',
  PHARMACY_READ:    'pharmacy:read',
  PHARMACY_WRITE:   'pharmacy:write',
  ADMIN_READ:       'admin:read',
  ADMIN_WRITE:      'admin:write',
  FAX_SEND:         'fax:send',
  BILLING_READ:     'billing:read',
  BILLING_WRITE:    'billing:write',
  COMPLIANCE_READ:  'compliance:read',
  PLATFORM_OWNER:   'platform:owner',
} as const;

export type Capability = typeof CAP[keyof typeof CAP];

const ROLE_CAPS: Record<string, Capability[]> = {
  patient: [CAP.VIEW_DASHBOARD, CAP.PATIENT_READ, CAP.PATIENT_WRITE, CAP.RX_READ, CAP.BILLING_READ],
  provider: [CAP.VIEW_DASHBOARD, CAP.PROVIDER_READ, CAP.PROVIDER_WRITE, CAP.PATIENT_READ, CAP.RX_WRITE, CAP.RX_SIGN, CAP.CONSULT_START, CAP.CONSULT_JOIN, CAP.FAX_SEND],
  pharmacist: [CAP.VIEW_DASHBOARD, CAP.PHARMACY_READ, CAP.PHARMACY_WRITE, CAP.RX_READ],
  admin: [CAP.VIEW_DASHBOARD, CAP.USER_MANAGE, CAP.ADMIN_READ, CAP.ADMIN_WRITE, CAP.PATIENT_READ, CAP.PATIENT_WRITE, CAP.PROVIDER_READ, CAP.RX_READ, CAP.BILLING_READ, CAP.BILLING_WRITE, CAP.COMPLIANCE_READ, CAP.FAX_SEND],
  staff: [CAP.VIEW_DASHBOARD, CAP.PATIENT_READ],
  unverified: [],
};

export function getCapsForRole(role: string): Set<Capability> {
  const base = ROLE_CAPS[role] ?? [];
  return new Set(base);
}

export function applyOverrides(
  caps: Set<Capability>,
  allow: string[] | null,
  deny: string[] | null
): Set<Capability> {
  const result = new Set(caps);
  if (allow) for (const c of allow) result.add(c as Capability);
  if (deny) for (const c of deny) result.delete(c as Capability);
  return result;
}
