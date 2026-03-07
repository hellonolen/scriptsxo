/**
 * Core FHIR R4 eligibility check using CoverageEligibilityRequest.
 * Sends a FHIR resource to the payer's FHIR base and parses the response.
 */

import type { PayerConfig, EligibilityRequest, EligibilityResult } from './types';

const today = (): string => new Date().toISOString().slice(0, 10);

function buildCoverageEligibilityRequest(
  config: PayerConfig,
  request: EligibilityRequest,
): Record<string, unknown> {
  const serviceDate = request.serviceDate ?? today();

  const resource: Record<string, unknown> = {
    resourceType: 'CoverageEligibilityRequest',
    status: 'active',
    purpose: ['benefits'],
    patient: {
      identifier: {
        system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
        value: request.patient.memberId ?? `${request.patient.lastName}-${request.patient.dob}`,
      },
    },
    created: new Date().toISOString(),
    servicedDate: serviceDate,
    insurer: {
      display: config.name,
    },
    insurance: [
      {
        focal: true,
        coverage: {
          subscriber: {
            name: [
              {
                family: request.patient.lastName,
                given: [request.patient.firstName],
              },
            ],
            birthDate: request.patient.dob,
          },
        },
      },
    ],
  };

  if (request.patient.memberId) {
    (resource.insurance as Record<string, unknown>[])[0] = {
      ...((resource.insurance as Record<string, unknown>[])[0] as Record<string, unknown>),
      coverage: {
        subscriberId: request.patient.memberId,
        ...(request.patient.groupId ? { class: [{ type: { coding: [{ code: 'group' }] }, value: request.patient.groupId }] } : {}),
      },
    };
  }

  if (request.serviceType) {
    resource.item = [
      {
        category: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/ex-benefitcategory',
              code: request.serviceType,
            },
          ],
        },
      },
    ];
  }

  return resource;
}

function parseCoverageEligibilityResponse(
  payerName: string,
  data: Record<string, unknown>,
): Omit<EligibilityResult, 'checkedAt'> {
  const resourceType = data.resourceType as string | undefined;

  if (resourceType !== 'CoverageEligibilityResponse') {
    return { payer: payerName, status: 'error', error: `Unexpected resourceType: ${resourceType ?? 'unknown'}`, raw: data };
  }

  const outcome = data.outcome as string | undefined;
  const disposition = data.disposition as string | undefined;
  const insurance = (data.insurance as Record<string, unknown>[] | undefined) ?? [];

  const firstCoverage = insurance[0] as Record<string, unknown> | undefined;
  const coverageResource = firstCoverage?.coverage as Record<string, unknown> | undefined;
  const period = coverageResource?.period as Record<string, unknown> | undefined;

  const benefitBalance = (firstCoverage?.benefitBalance as Record<string, unknown>[] | undefined) ?? [];

  let copay: string | undefined;
  let deductible: string | undefined;
  let deductibleMet: string | undefined;
  let outOfPocketMax: string | undefined;
  let outOfPocketMet: string | undefined;
  let priorAuthRequired: boolean | undefined;
  let formularyTier: string | undefined;
  let planName: string | undefined;

  planName = (coverageResource?.display as string | undefined) ?? (firstCoverage?.description as string | undefined);

  for (const balance of benefitBalance) {
    const category = (balance.category as Record<string, unknown> | undefined)?.coding as Record<string, unknown>[] | undefined;
    const code = (category?.[0]?.code as string | undefined)?.toLowerCase() ?? '';
    const financial = (balance.financial as Record<string, unknown>[] | undefined) ?? [];

    for (const fin of financial) {
      const finType = ((fin.type as Record<string, unknown> | undefined)?.coding as Record<string, unknown>[] | undefined)?.[0]?.code as string | undefined;
      const allowedMoney = fin.allowedMoney as Record<string, unknown> | undefined;
      const usedMoney = fin.usedMoney as Record<string, unknown> | undefined;
      const allowedUnsignedInt = fin.allowedUnsignedInt as number | undefined;

      if (code.includes('copay') || finType === 'copay') {
        copay = allowedMoney?.value?.toString() ?? allowedUnsignedInt?.toString();
      }
      if (code.includes('deductible') || finType === 'deductible') {
        deductible = allowedMoney?.value?.toString();
        deductibleMet = usedMoney?.value?.toString();
      }
      if (code.includes('out') && code.includes('pocket') || finType === 'oop') {
        outOfPocketMax = allowedMoney?.value?.toString();
        outOfPocketMet = usedMoney?.value?.toString();
      }
    }

    if (code.includes('prior') || code.includes('auth')) {
      priorAuthRequired = true;
    }
    if (code.includes('formulary') || code.includes('tier')) {
      formularyTier = balance.description as string | undefined;
    }
  }

  const status: EligibilityResult['status'] =
    outcome === 'complete' && disposition?.toLowerCase().includes('eligible')
      ? 'eligible'
      : outcome === 'complete'
        ? 'not_eligible'
        : 'error';

  const memberId = (coverageResource?.subscriberId as string | undefined);
  const groupId = (coverageResource?.class as Record<string, unknown>[] | undefined)?.[0]?.value as string | undefined;

  return {
    payer: payerName,
    status,
    memberId,
    groupId,
    planName,
    coverageStart: period?.start as string | undefined,
    coverageEnd: period?.end as string | undefined,
    copay,
    deductible,
    deductibleMet,
    outOfPocketMax,
    outOfPocketMet,
    formularyTier,
    priorAuthRequired,
    raw: data,
  };
}

export async function checkCoverageEligibility(
  config: PayerConfig,
  accessToken: string,
  request: EligibilityRequest,
): Promise<EligibilityResult> {
  const checkedAt = Date.now();

  try {
    const body = buildCoverageEligibilityRequest(config, request);

    const response = await fetch(`${config.fhirBase}/CoverageEligibilityRequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        payer: config.name,
        status: 'error',
        error: `FHIR request failed (${response.status}): ${errorText.slice(0, 300)}`,
        checkedAt,
      };
    }

    const data = await response.json() as Record<string, unknown>;
    const parsed = parseCoverageEligibilityResponse(config.name, data);
    return { ...parsed, checkedAt };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      payer: config.name,
      status: 'error',
      error: `Network error: ${message}`,
      checkedAt,
    };
  }
}
