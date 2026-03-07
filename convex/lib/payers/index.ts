/**
 * Unified entry point for the direct payer FHIR R4 connection layer.
 * Coordinates config lookup, credential resolution, OAuth, and FHIR eligibility.
 */

import { PAYER_CONFIGS } from './config';
import { getAccessToken } from './oauth';
import { checkCoverageEligibility } from './fhir';
import type { EligibilityRequest, EligibilityResult, PayerConfig } from './types';

export { PAYER_CONFIGS as PAYERS };
export type { PayerConfig, EligibilityRequest, EligibilityResult };

export function getPayer(key: string): PayerConfig | undefined {
  return PAYER_CONFIGS[key];
}

export function listPayers(env: Record<string, string | undefined>): Array<{
  key: string;
  name: string;
  configured: boolean;
}> {
  return Object.values(PAYER_CONFIGS).map((config) => ({
    key: config.key,
    name: config.name,
    configured: Boolean(env[config.envClientId] && env[config.envClientSecret]),
  }));
}

export async function checkEligibility(
  payerKey: string,
  request: EligibilityRequest,
  env: Record<string, string | undefined>,
): Promise<EligibilityResult> {
  const checkedAt = Date.now();
  const config = PAYER_CONFIGS[payerKey];

  if (!config) {
    return {
      payer: payerKey,
      status: 'error',
      error: `Unknown payer key: ${payerKey}`,
      checkedAt,
    };
  }

  const clientId = env[config.envClientId];
  const clientSecret = env[config.envClientSecret];

  if (!clientId || !clientSecret) {
    return {
      payer: config.name,
      status: 'not_configured',
      error: 'Payer credentials not set — contact ScriptsXO support to activate',
      checkedAt,
    };
  }

  const accessToken = await getAccessToken(config, clientId, clientSecret);

  if (!accessToken) {
    return {
      payer: config.name,
      status: 'error',
      error: 'Failed to obtain OAuth token — verify credentials are valid',
      checkedAt,
    };
  }

  return checkCoverageEligibility(config, accessToken, request);
}
