/**
 * DEV-MODE HELPERS
 * Utilities for running the full app flow on localhost without external services.
 *
 * In development (localhost), we skip:
 * - Convex mutations/queries (use localStorage instead)
 * - Whop checkout (auto-complete payment step)
 * - Stripe Identity (auto-verify identity)
 * - EmailIt (dev login bypasses email)
 *
 * This lets the entire patient flow work end-to-end for demos and development.
 */

/** True when running on localhost (no external services available) */
export function isDev(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/* ---------------------------------------------------------------------------
   LOCAL INTAKE STORE
   Mirrors the Convex intake record in localStorage for dev mode.
   --------------------------------------------------------------------------- */

const INTAKE_KEY = "sxo_intake_data";
const INTAKE_ID_KEY = "sxo_intake_id";

export interface LocalIntakeData {
  id: string;
  email: string;
  status: "in_progress" | "completed";
  medicalHistory?: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    phone: string;
    conditions: string[];
    medications: string[];
    allergies: string[];
    surgeries: string;
    familyHistory: string[];
  };
  currentSymptoms?: {
    chiefComplaint: string;
    duration: string;
    severity: number;
    relatedSymptoms: string[];
    previousTreatments: string;
  };
  idVerified: boolean;
  consent: boolean;
  createdAt: number;
}

export const DevIntakeStore = {
  /** Create a new intake and return its ID */
  create(email: string): string {
    const id = `dev_intake_${Date.now()}`;
    const intake: LocalIntakeData = {
      id,
      email,
      status: "in_progress",
      idVerified: false,
      consent: false,
      createdAt: Date.now(),
    };
    localStorage.setItem(INTAKE_KEY, JSON.stringify(intake));
    localStorage.setItem(INTAKE_ID_KEY, id);
    return id;
  },

  /** Get the current intake data */
  get(): LocalIntakeData | null {
    try {
      const raw = localStorage.getItem(INTAKE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /** Get the current intake ID */
  getId(): string | null {
    return localStorage.getItem(INTAKE_ID_KEY);
  },

  /** Update a step's data */
  updateStep(stepName: string, data: unknown): void {
    const intake = DevIntakeStore.get();
    if (!intake) return;

    switch (stepName) {
      case "medical_history":
        intake.medicalHistory = data as LocalIntakeData["medicalHistory"];
        break;
      case "symptoms":
        intake.currentSymptoms = data as LocalIntakeData["currentSymptoms"];
        break;
      case "id_verification":
        intake.idVerified = true;
        break;
      case "consent":
        intake.consent = true;
        break;
    }

    localStorage.setItem(INTAKE_KEY, JSON.stringify(intake));
  },

  /** Mark intake as completed */
  complete(): void {
    const intake = DevIntakeStore.get();
    if (!intake) return;
    intake.status = "completed";
    localStorage.setItem(INTAKE_KEY, JSON.stringify(intake));
  },

  /** Clear all intake data */
  clear(): void {
    localStorage.removeItem(INTAKE_KEY);
    localStorage.removeItem(INTAKE_ID_KEY);
  },
};
