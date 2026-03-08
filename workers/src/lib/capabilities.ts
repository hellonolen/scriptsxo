import { Env, Member } from '../types';

export const CAP = {
  VIEW_DASHBOARD: 'view:dashboard',
  INTAKE_SELF: 'intake:self',
  INTAKE_REVIEW: 'intake:review',
  RX_VIEW: 'rx:view',
  RX_WRITE: 'rx:write',
  RX_SIGN: 'rx:sign',
  RX_REFILL: 'rx:refill',
  CONSULT_START: 'consult:start',
  CONSULT_JOIN: 'consult:join',
  CONSULT_HISTORY: 'consult:history',
  WORKFLOW_VIEW: 'workflow:view',
  WORKFLOW_MANAGE: 'workflow:manage',
  MSG_VIEW: 'msg:view',
  MSG_SEND: 'msg:send',
  PHARMACY_QUEUE: 'pharmacy:queue',
  PHARMACY_FILL: 'pharmacy:fill',
  PHARMACY_VERIFY: 'pharmacy:verify',
  PATIENT_VIEW: 'patient:view',
  PATIENT_MANAGE: 'patient:manage',
  PROVIDER_MANAGE: 'provider:manage',
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  AUDIT_VIEW: 'audit:view',
  USER_VIEW: 'user:view',
  USER_MANAGE: 'user:manage',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
  AGENTS_VIEW: 'agents:view',
  AGENTS_MANAGE: 'agents:manage',
  INTEGRATIONS_VIEW: 'integrations:view',
  INTEGRATIONS_MANAGE: 'integrations:manage',
} as const;

export type Capability = (typeof CAP)[keyof typeof CAP];

type Role = 'patient' | 'provider' | 'nurse' | 'pharmacy' | 'admin' | 'unverified';

const ALL_CAPS = Object.values(CAP) as Capability[];

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
  admin: ALL_CAPS,
};

export function getMemberEffectiveCaps(member: Member, orgCapAllow?: string, orgCapDeny?: string): Set<Capability> {
  if (member.isPlatformOwner === 1) {
    return new Set(ALL_CAPS);
  }

  const role = member.role as Role;
  const base: Capability[] = role in ROLE_CAPS ? ROLE_CAPS[role] : [];
  const effective = new Set<Capability>(base);

  const orgAllow: string[] = orgCapAllow ? safeParseJson(orgCapAllow, []) : [];
  const orgDeny: string[] = orgCapDeny ? safeParseJson(orgCapDeny, []) : [];
  const memberAllow: string[] = member.capAllow ? safeParseJson(member.capAllow, []) : [];
  const memberDeny: string[] = member.capDeny ? safeParseJson(member.capDeny, []) : [];

  for (const cap of orgAllow) effective.add(cap as Capability);
  for (const cap of memberAllow) effective.add(cap as Capability);
  for (const cap of orgDeny) effective.delete(cap as Capability);
  for (const cap of memberDeny) effective.delete(cap as Capability);

  return effective;
}

export function hasCap(member: Member, cap: Capability): boolean {
  return getMemberEffectiveCaps(member).has(cap);
}

function safeParseJson<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export async function requireRole(
  member: Member | null,
  roles: string[]
): Promise<void> {
  if (!member) throw new CapError(401, 'Authentication required');
  if (!roles.includes(member.role) && member.isPlatformOwner !== 1) {
    throw new CapError(403, `Required role: ${roles.join(' or ')}`);
  }
}

export class CapError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'CapError';
  }
}
