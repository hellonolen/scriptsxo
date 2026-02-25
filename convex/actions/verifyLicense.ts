"use node";
// @ts-nocheck
/**
 * LICENSE VERIFICATION
 * Verifies NPI numbers for nurses, physicians, and other licensed
 * healthcare professionals who order on behalf of patients.
 * Uses the free NPPES NPI Registry API (npiregistry.cms.hhs.gov).
 */
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import { requireCap, CAP } from "../lib/capabilities";

const NPI_REGISTRY_URL = "https://npiregistry.cms.hhs.gov/api";

interface NpiResult {
  verified: boolean;
  npiNumber: string;
  firstName: string | null;
  lastName: string | null;
  credential: string | null;
  taxonomy: string | null;
  taxonomyDescription: string | null;
  state: string | null;
  status: string | null;
  organizationName: string | null;
  address: string | null;
  phone: string | null;
  issues: string[];
}

/**
 * Look up and verify an NPI number via the NPPES NPI Registry.
 * Returns provider details if found and active.
 */
export const verifyNpi = action({
  args: {
    npiNumber: v.string(),
    expectedFirstName: v.optional(v.string()),
    expectedLastName: v.optional(v.string()),
    callerId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<NpiResult> => {
    await requireCap(ctx, args.callerId, CAP.PROVIDER_MANAGE);
    const npi = args.npiNumber.replace(/\D/g, ""); // Strip non-digits

    if (npi.length !== 10) {
      return {
        verified: false,
        npiNumber: args.npiNumber,
        firstName: null,
        lastName: null,
        credential: null,
        taxonomy: null,
        taxonomyDescription: null,
        state: null,
        status: null,
        organizationName: null,
        address: null,
        phone: null,
        issues: ["NPI numbers must be exactly 10 digits"],
      };
    }

    const url = `${NPI_REGISTRY_URL}/?number=${npi}&version=2.1`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        verified: false,
        npiNumber: npi,
        firstName: null,
        lastName: null,
        credential: null,
        taxonomy: null,
        taxonomyDescription: null,
        state: null,
        status: null,
        organizationName: null,
        address: null,
        phone: null,
        issues: [`NPI Registry API error: ${response.status}`],
      };
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return {
        verified: false,
        npiNumber: npi,
        firstName: null,
        lastName: null,
        credential: null,
        taxonomy: null,
        taxonomyDescription: null,
        state: null,
        status: null,
        organizationName: null,
        address: null,
        phone: null,
        issues: ["NPI number not found in the national registry"],
      };
    }

    const provider = data.results[0];
    const basic = provider.basic || {};
    const taxonomies = provider.taxonomies || [];
    const addresses = provider.addresses || [];
    const issues: string[] = [];

    // Extract provider details
    const firstName = basic.first_name || basic.authorized_official_first_name || null;
    const lastName = basic.last_name || basic.authorized_official_last_name || null;
    const credential = basic.credential || null;
    const status = basic.status || null;
    const organizationName = basic.organization_name || null;

    // Get primary taxonomy (specialty)
    const primaryTaxonomy = taxonomies.find((t: any) => t.primary) || taxonomies[0];
    const taxonomy = primaryTaxonomy?.code || null;
    const taxonomyDescription = primaryTaxonomy?.desc || null;
    const taxonomyState = primaryTaxonomy?.state || null;

    // Get practice address
    const practiceAddress = addresses.find((a: any) => a.address_purpose === "LOCATION") || addresses[0];
    const state = taxonomyState || practiceAddress?.state || null;
    const address = practiceAddress
      ? `${practiceAddress.address_1}${practiceAddress.address_2 ? ", " + practiceAddress.address_2 : ""}, ${practiceAddress.city}, ${practiceAddress.state} ${practiceAddress.postal_code}`
      : null;
    const phone = practiceAddress?.telephone_number || null;

    // Check if NPI is active
    if (status && status !== "A") {
      issues.push(`NPI status is "${status}" — may not be active`);
    }

    // Check deactivation
    if (basic.deactivation_date) {
      issues.push(`NPI was deactivated on ${basic.deactivation_date}`);
    }

    // Name matching (if expected names provided)
    if (args.expectedFirstName && firstName) {
      const expected = args.expectedFirstName.toLowerCase().trim();
      const actual = firstName.toLowerCase().trim();
      if (actual !== expected && !actual.startsWith(expected) && !expected.startsWith(actual)) {
        issues.push(`First name mismatch: expected "${args.expectedFirstName}", found "${firstName}"`);
      }
    }

    if (args.expectedLastName && lastName) {
      const expected = args.expectedLastName.toLowerCase().trim();
      const actual = lastName.toLowerCase().trim();
      if (actual !== expected) {
        issues.push(`Last name mismatch: expected "${args.expectedLastName}", found "${lastName}"`);
      }
    }

    const verified = issues.length === 0 && (!status || status === "A") && !basic.deactivation_date;

    return {
      verified,
      npiNumber: npi,
      firstName,
      lastName,
      credential,
      taxonomy,
      taxonomyDescription,
      state,
      status,
      organizationName,
      address,
      phone,
      issues,
    };
  },
});

/**
 * Verify that a provider has prescribing authority based on their taxonomy.
 * Certain taxonomy codes indicate prescribing capability.
 */
export const checkPrescribingAuthority = action({
  args: {
    npiNumber: v.string(),
    callerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.PROVIDER_MANAGE);
    const npiResult = await ctx.runAction(api.actions.verifyLicense.verifyNpi, {
      npiNumber: args.npiNumber,
    });

    if (!npiResult.verified) {
      return {
        canPrescribe: false,
        npiResult,
        reason: `NPI verification failed: ${npiResult.issues.join(", ")}`,
      };
    }

    // Taxonomy codes that typically have prescribing authority
    const prescribingTaxonomies = [
      "207", // Physicians (all allopathic specialties start with 207)
      "208", // Physicians (more specialties)
      "363L", // Nurse Practitioner
      "363A", // Physician Assistant
      "364S", // Clinical Nurse Specialist
      "367A", // Advanced Practice Midwife
      "174400000X", // DO
    ];

    const hasPrescribingTaxonomy = npiResult.taxonomy
      ? prescribingTaxonomies.some((prefix) => npiResult.taxonomy!.startsWith(prefix))
      : false;

    // Check credential for prescribing indicators
    const prescribingCredentials = ["MD", "DO", "NP", "PA", "PA-C", "APRN", "DNP", "CNP", "CNS", "CNM"];
    const hasCredential = npiResult.credential
      ? prescribingCredentials.some((cred) =>
          npiResult.credential!.toUpperCase().includes(cred)
        )
      : false;

    const canPrescribe = hasPrescribingTaxonomy || hasCredential;

    return {
      canPrescribe,
      npiResult,
      reason: canPrescribe
        ? `${npiResult.firstName} ${npiResult.lastName}, ${npiResult.credential} — prescribing authority confirmed`
        : `Taxonomy "${npiResult.taxonomyDescription}" may not have independent prescribing authority`,
    };
  },
});
