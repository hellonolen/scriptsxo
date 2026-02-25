// @ts-nocheck
/**
 * COMPOSIO INTEGRATION LAYER (API v3)
 * Unified external service routing via Composio REST API.
 *
 * Composio provides authenticated access to 1000+ SaaS tools and APIs.
 * For ScriptsXO, we use it for:
 *
 * 1. E-PRESCRIBING  — Route prescriptions to ModMed / Surescripts
 * 2. EHR ACCESS      — Pull/push patient records from ModMed
 * 3. PHARMACY LOOKUP  — Query pharmacy networks for availability
 * 4. FAX / COMMS      — Send Rx faxes to non-electronic pharmacies
 * 5. INSURANCE        — Verify patient insurance eligibility
 * 6. SCHEDULING       — Sync with external calendar / scheduling systems
 *
 * Each toolkit is configured with its own auth via Composio dashboard.
 * The COMPOSIO_API_KEY env var must be set in Convex production environment.
 *
 * API v3 (default for orgs created after 2026-02-15):
 *   Base: https://backend.composio.dev/api/v3
 *   Execute: POST /api/v3/tools/execute/:action_slug
 *   List:    GET  /api/v3/tools?toolkit_slug=...
 *   Accounts: GET /api/v3/connected_accounts
 */
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";

/* ---------------------------------------------------------------------------
   COMPOSIO CLIENT INITIALIZATION (API v3)
   --------------------------------------------------------------------------- */

const COMPOSIO_BASE_URL = "https://backend.composio.dev/api/v3";

interface ComposioConfig {
  apiKey: string;
  baseUrl: string;
}

interface ComposioToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime?: number;
}

function getComposioConfig(): ComposioConfig {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "COMPOSIO_API_KEY not configured. Add it to your Convex environment variables."
    );
  }
  return {
    apiKey,
    baseUrl: process.env.COMPOSIO_BASE_URL || COMPOSIO_BASE_URL,
  };
}

/**
 * Execute a Composio tool action via REST API v3.
 * Endpoint: POST /api/v3/tools/execute/:action_slug
 *
 * This avoids importing the full SDK in Convex (which can cause bundling issues).
 * Instead, we call the Composio API directly — same pattern as llmGateway.ts.
 */
async function executeComposioAction(
  toolkit: string,
  actionName: string,
  params: Record<string, unknown>,
  userId?: string
): Promise<ComposioToolResult> {
  const config = getComposioConfig();
  const startTime = Date.now();

  // v3 action slugs are formatted as TOOLKIT_ACTION (uppercase)
  const actionSlug = `${toolkit}_${actionName}`.toUpperCase();

  try {
    const response = await fetch(`${config.baseUrl}/tools/execute/${actionSlug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
      },
      body: JSON.stringify({
        input: params,
        // v3 uses user_id instead of entity_id
        user_id: userId || "default",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Composio API error (${response.status}): ${errorText}`,
        executionTime: Date.now() - startTime,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Composio error",
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * List available tools from a Composio toolkit.
 * Endpoint: GET /api/v3/tools?toolkit_slug=...
 */
async function listToolkitActions(toolkit: string): Promise<ComposioToolResult> {
  const config = getComposioConfig();

  try {
    const response = await fetch(`${config.baseUrl}/tools?toolkit_slug=${toolkit}`, {
      headers: {
        "x-api-key": config.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Failed to list tools: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, data: data.items || data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/* ---------------------------------------------------------------------------
   TOOLKIT DEFINITIONS
   These map ScriptsXO use cases to Composio toolkit + action pairs.
   As new Composio integrations become available (especially healthcare),
   add them here.
   --------------------------------------------------------------------------- */

export const COMPOSIO_TOOLKITS = {
  // E-Prescribing — ModMed / Surescripts routing
  ePrescribe: {
    toolkit: "modmed",
    actions: {
      sendPrescription: "MODMED_SEND_PRESCRIPTION",
      checkDrugInteraction: "MODMED_CHECK_DRUG_INTERACTION",
      verifyPrescriber: "MODMED_VERIFY_PRESCRIBER",
      getFormulary: "MODMED_GET_FORMULARY",
    },
  },

  // EHR — Patient records via ModMed
  ehr: {
    toolkit: "modmed",
    actions: {
      getPatientRecord: "MODMED_GET_PATIENT",
      updatePatientRecord: "MODMED_UPDATE_PATIENT",
      createEncounter: "MODMED_CREATE_ENCOUNTER",
      getEncounterHistory: "MODMED_GET_ENCOUNTERS",
    },
  },

  // Pharmacy — Lookup and routing
  pharmacy: {
    toolkit: "pharmacy_network",
    actions: {
      lookupPharmacy: "PHARMACY_LOOKUP",
      checkDrugAvailability: "PHARMACY_CHECK_STOCK",
      submitOrder: "PHARMACY_SUBMIT_ORDER",
      trackFulfillment: "PHARMACY_TRACK_ORDER",
    },
  },

  // Fax — For non-electronic pharmacy routing
  fax: {
    toolkit: "fax",
    actions: {
      sendFax: "FAX_SEND",
      checkStatus: "FAX_CHECK_STATUS",
    },
  },

  // Insurance — Eligibility verification
  insurance: {
    toolkit: "insurance_verify",
    actions: {
      checkEligibility: "INSURANCE_CHECK_ELIGIBILITY",
      getFormulary: "INSURANCE_GET_FORMULARY",
      priorAuth: "INSURANCE_PRIOR_AUTH",
    },
  },

  // Communication — Email, SMS
  communication: {
    toolkit: "email",
    actions: {
      sendEmail: "EMAIL_SEND",
      sendSms: "SMS_SEND",
    },
  },

  // Scheduling — Calendar sync
  scheduling: {
    toolkit: "google_calendar",
    actions: {
      createEvent: "GOOGLECALENDAR_CREATE_EVENT",
      listEvents: "GOOGLECALENDAR_FIND_EVENT",
      updateEvent: "GOOGLECALENDAR_UPDATE_EVENT",
    },
  },
} as const;

/* ---------------------------------------------------------------------------
   CONVEX ACTIONS — Exposed to the rest of the app
   --------------------------------------------------------------------------- */

/**
 * Execute any Composio toolkit action.
 * This is the main entry point for the conductor and agents.
 */
export const execute = action({
  args: {
    toolkit: v.string(),
    actionName: v.string(),
    params: v.any(),
    userId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    return executeComposioAction(
      args.toolkit,
      args.actionName,
      args.params,
      args.userId
    );
  },
});

/**
 * List available tools for a toolkit.
 * Useful for admin dashboard / debugging.
 */
export const listActions = action({
  args: {
    toolkit: v.string(),
  },
  handler: async (_ctx, args) => {
    return listToolkitActions(args.toolkit);
  },
});

/**
 * List all available toolkits in the Composio account.
 * Endpoint: GET /api/v3/toolkits
 */
export const listToolkits = action({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const config = getComposioConfig();
    try {
      const params = new URLSearchParams();
      if (args.search) params.set("search", args.search);
      params.set("limit", "50");

      const response = await fetch(
        `${config.baseUrl}/toolkits?${params.toString()}`,
        { headers: { "x-api-key": config.apiKey } }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Failed to list toolkits: ${errorText}` };
      }

      const data = await response.json();
      return { success: true, data: data.items || data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Get details about a specific toolkit by slug.
 * Endpoint: GET /api/v3/toolkits/:slug
 */
export const getToolkit = action({
  args: {
    slug: v.string(),
  },
  handler: async (_ctx, args) => {
    const config = getComposioConfig();
    try {
      const response = await fetch(
        `${config.baseUrl}/toolkits/${args.slug}`,
        { headers: { "x-api-key": config.apiKey } }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Toolkit not found: ${errorText}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Check if Composio is configured and reachable.
 * Uses the v3 connected_accounts endpoint as a health probe.
 * Used by admin panel and health checks.
 */
export const healthCheck = action({
  args: {},
  handler: async () => {
    try {
      const config = getComposioConfig();

      // v3 endpoint: GET /api/v3/connected_accounts
      const response = await fetch(`${config.baseUrl}/connected_accounts?limit=1`, {
        headers: { "x-api-key": config.apiKey },
      });

      const body = response.ok ? await response.json() : null;

      return {
        configured: true,
        reachable: response.ok,
        status: response.status,
        apiVersion: "v3",
        connectedAccounts: body?.items?.length ?? 0,
      };
    } catch (error) {
      return {
        configured: false,
        reachable: false,
        error: error instanceof Error ? error.message : "Not configured",
        apiVersion: "v3",
      };
    }
  },
});

/* ---------------------------------------------------------------------------
   DOMAIN-SPECIFIC HELPERS
   Higher-level functions that agents call directly.
   --------------------------------------------------------------------------- */

/**
 * Send a prescription via Composio e-prescribe toolkit.
 * Used by the prescriptionAgent after Rx is signed.
 */
export const sendPrescription = action({
  args: {
    prescriptionId: v.string(),
    drugName: v.string(),
    dosage: v.string(),
    frequency: v.string(),
    quantity: v.string(),
    refills: v.number(),
    pharmacyNcpdpId: v.string(),
    prescriberNpi: v.string(),
    patientId: v.string(),
    isControlled: v.boolean(),
    dawCode: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    // Format for NCPDP SCRIPT standard
    const prescriptionPayload = {
      rxId: args.prescriptionId,
      drug: {
        name: args.drugName,
        dosage: args.dosage,
        frequency: args.frequency,
        quantity: args.quantity,
        refills: args.refills,
        dawCode: args.dawCode || 0,
      },
      pharmacy: { ncpdpId: args.pharmacyNcpdpId },
      prescriber: { npi: args.prescriberNpi },
      patient: { id: args.patientId },
      isControlled: args.isControlled,
    };

    return executeComposioAction(
      COMPOSIO_TOOLKITS.ePrescribe.toolkit,
      COMPOSIO_TOOLKITS.ePrescribe.actions.sendPrescription,
      prescriptionPayload
    );
  },
});

/**
 * Look up pharmacies near a location.
 * Used by the pharmacyAgent for routing.
 */
export const lookupPharmacy = action({
  args: {
    zipCode: v.string(),
    drugName: v.optional(v.string()),
    maxResults: v.optional(v.number()),
    deliveryOnly: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    return executeComposioAction(
      COMPOSIO_TOOLKITS.pharmacy.toolkit,
      COMPOSIO_TOOLKITS.pharmacy.actions.lookupPharmacy,
      {
        zipCode: args.zipCode,
        drugName: args.drugName,
        maxResults: args.maxResults || 10,
        deliveryOnly: args.deliveryOnly || false,
      }
    );
  },
});

/**
 * Verify insurance eligibility.
 * Used before consultation booking and prescription routing.
 */
export const checkInsurance = action({
  args: {
    patientId: v.string(),
    memberId: v.string(),
    groupNumber: v.optional(v.string()),
    payerName: v.string(),
  },
  handler: async (_ctx, args) => {
    return executeComposioAction(
      COMPOSIO_TOOLKITS.insurance.toolkit,
      COMPOSIO_TOOLKITS.insurance.actions.checkEligibility,
      args
    );
  },
});
