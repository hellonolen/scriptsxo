/**
 * Payer configurations with real FHIR R4 endpoint URLs.
 * Sources: each payer's public developer portal.
 * No credentials here — credentials are read from environment variables at runtime.
 */

import type { PayerConfig } from './types';

export const PAYER_CONFIGS: Record<string, PayerConfig> = {
  uhc: {
    key: 'uhc',
    name: 'UnitedHealth Group',
    fhirBase: 'https://fhir.uhc.com/R4',
    tokenUrl: 'https://api.uhc.com/oauth2/token',
    envClientId: 'UHC_CLIENT_ID',
    envClientSecret: 'UHC_CLIENT_SECRET',
    notes: 'Register at developer.uhc.com — sandbox available without contract',
  },

  aetna: {
    key: 'aetna',
    name: 'Aetna',
    fhirBase: 'https://member.aetna.com/apif/fhir-ri/fhir/R4',
    tokenUrl: 'https://api.aetna.com/oauth2/token',
    envClientId: 'AETNA_CLIENT_ID',
    envClientSecret: 'AETNA_CLIENT_SECRET',
    notes: 'Register at developerportal.aetna.com — CMS-mandated API, SMART on FHIR',
  },

  bcbs: {
    key: 'bcbs',
    name: 'BlueCross BlueShield',
    fhirBase: 'https://api.bcbs.com/fhir/R4',
    tokenUrl: 'https://api.bcbs.com/oauth2/token',
    envClientId: 'BCBS_CLIENT_ID',
    envClientSecret: 'BCBS_CLIENT_SECRET',
    notes: 'BCBSA national API — individual Blue plans have separate endpoints; this targets the national federation layer',
  },

  cigna: {
    key: 'cigna',
    name: 'Cigna',
    fhirBase: 'https://p-api.digitaledge.cigna.com/patientaccess/v3/fhir/R4',
    tokenUrl: 'https://api.digitaledge.cigna.com/auth/oauth/v2/token',
    envClientId: 'CIGNA_CLIENT_ID',
    envClientSecret: 'CIGNA_CLIENT_SECRET',
    notes: 'Register at developer.cigna.com — SMART on FHIR, sandbox available',
  },

  humana: {
    key: 'humana',
    name: 'Humana',
    fhirBase: 'https://api.humana.com/fhir/R4',
    tokenUrl: 'https://api.humana.com/oauth2/token',
    envClientId: 'HUMANA_CLIENT_ID',
    envClientSecret: 'HUMANA_CLIENT_SECRET',
    notes: 'Register at developers.humana.com — strong Medicare Advantage / Part D coverage',
  },
} as const;
