/**
 * Shared TypeScript interfaces for the direct payer FHIR R4 connection layer.
 * Used by convex/lib/payers/* — strict TypeScript, no @ts-nocheck.
 */

export interface PayerConfig {
  key: string;
  name: string;
  fhirBase: string;
  tokenUrl: string;
  envClientId: string;
  envClientSecret: string;
  notes: string;
}

export interface EligibilityRequest {
  patient: {
    firstName: string;
    lastName: string;
    dob: string;        // YYYY-MM-DD
    memberId?: string;
    groupId?: string;
  };
  serviceDate?: string; // YYYY-MM-DD, defaults to today
  serviceType?: string; // e.g. '1' = Medical, '25' = Eprescribing
}

export interface EligibilityResult {
  payer: string;
  status: 'eligible' | 'not_eligible' | 'pending' | 'error' | 'not_configured';
  memberId?: string;
  groupId?: string;
  planName?: string;
  coverageStart?: string;
  coverageEnd?: string;
  copay?: string;
  deductible?: string;
  deductibleMet?: string;
  outOfPocketMax?: string;
  outOfPocketMet?: string;
  formularyTier?: string;
  priorAuthRequired?: boolean;
  raw?: unknown;
  error?: string;
  checkedAt: number;
}

export interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}
