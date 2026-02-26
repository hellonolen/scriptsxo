/**
 * COMPOSIO CLIENT CONFIG
 * Client-side configuration and types for Composio integration.
 * The actual API calls happen server-side in convex/integrations/composio.ts.
 * This file provides types and UI helpers.
 */

/* ---------------------------------------------------------------------------
   TOOLKIT REGISTRY
   Maps each ScriptsXO capability to a Composio toolkit + action.
   Used by the admin panel to show integration status.
   --------------------------------------------------------------------------- */

export interface ComposioToolkit {
  id: string;
  name: string;
  description: string;
  category: "prescribing" | "ehr" | "pharmacy" | "communication" | "scheduling" | "insurance";
  status: "active" | "configured" | "pending" | "not_configured";
  actions: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

export const COMPOSIO_REGISTRY: ComposioToolkit[] = [
  {
    id: "modmed_eprescribe",
    name: "ModMed E-Prescribe",
    description: "Send prescriptions to pharmacies via Surescripts through ModMed",
    category: "prescribing",
    status: "pending",
    actions: [
      { id: "send_prescription", label: "Send Prescription", description: "Transmit signed Rx to pharmacy" },
      { id: "check_interaction", label: "Drug Interaction Check", description: "Cross-reference against patient medications" },
      { id: "verify_prescriber", label: "Verify Prescriber", description: "Validate NPI and DEA credentials" },
      { id: "get_formulary", label: "Get Formulary", description: "Check drug formulary coverage" },
    ],
  },
  {
    id: "modmed_ehr",
    name: "ModMed EHR",
    description: "Patient records, encounters, and clinical data via ModMed API",
    category: "ehr",
    status: "pending",
    actions: [
      { id: "get_patient", label: "Get Patient Record", description: "Retrieve full patient demographics and history" },
      { id: "update_patient", label: "Update Patient Record", description: "Push intake data to EHR" },
      { id: "create_encounter", label: "Create Encounter", description: "Document a telehealth visit" },
      { id: "get_encounters", label: "Get Encounter History", description: "Pull prior visit records" },
    ],
  },
  {
    id: "pharmacy_network",
    name: "Pharmacy Network",
    description: "Pharmacy lookup, stock checks, and order routing",
    category: "pharmacy",
    status: "pending",
    actions: [
      { id: "lookup", label: "Pharmacy Lookup", description: "Find pharmacies near patient location" },
      { id: "check_stock", label: "Check Drug Availability", description: "Verify drug is in stock at pharmacy" },
      { id: "submit_order", label: "Submit Order", description: "Send Rx order to pharmacy" },
      { id: "track_order", label: "Track Fulfillment", description: "Monitor order through fulfillment pipeline" },
    ],
  },
  {
    id: "fax",
    name: "Fax Service",
    description: "Send prescription faxes to non-electronic pharmacies",
    category: "communication",
    status: "pending",
    actions: [
      { id: "send_fax", label: "Send Fax", description: "Fax a prescription PDF" },
      { id: "check_status", label: "Check Fax Status", description: "Monitor fax delivery status" },
    ],
  },
  {
    id: "insurance",
    name: "Insurance Verification",
    description: "Real-time insurance eligibility and formulary checks",
    category: "insurance",
    status: "pending",
    actions: [
      { id: "check_eligibility", label: "Check Eligibility", description: "Verify patient insurance coverage" },
      { id: "get_formulary", label: "Get Formulary", description: "Check formulary tier and copay" },
      { id: "prior_auth", label: "Prior Authorization", description: "Submit prior auth request" },
    ],
  },
  {
    id: "email_sms",
    name: "Patient Communication",
    description: "Email and SMS notifications to patients",
    category: "communication",
    status: "pending",
    actions: [
      { id: "send_email", label: "Send Email", description: "Send transactional email to patient" },
      { id: "send_sms", label: "Send SMS", description: "Send text notification to patient" },
    ],
  },
  {
    id: "google_calendar",
    name: "Scheduling Sync",
    description: "Sync appointments with Google Calendar for providers",
    category: "scheduling",
    status: "pending",
    actions: [
      { id: "create_event", label: "Create Event", description: "Add consultation to provider calendar" },
      { id: "list_events", label: "List Events", description: "Check provider availability" },
      { id: "update_event", label: "Update Event", description: "Reschedule or cancel appointment" },
    ],
  },
];

/**
 * Get all toolkits for a specific category.
 */
export function getToolkitsByCategory(category: ComposioToolkit["category"]): ComposioToolkit[] {
  return COMPOSIO_REGISTRY.filter((t) => t.category === category);
}

/**
 * Get a specific toolkit by ID.
 */
export function getToolkit(id: string): ComposioToolkit | undefined {
  return COMPOSIO_REGISTRY.find((t) => t.id === id);
}
