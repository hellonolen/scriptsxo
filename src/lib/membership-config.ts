/**
 * Membership Configuration
 * ========================
 * Defines member requirements, pricing tiers, and Office Hours settings.
 *
 * Every member MUST have:
 *  1. Government-issued ID on file (verified via Stripe Identity)
 *  2. Active credit card on file (via Stripe / Whop)
 *  3. Active subscription (monthly membership)
 *
 * Without all three, a member cannot access consultations, prescriptions,
 * or Office Hours.
 */

// ---------------------------------------------------------------------------
// Member Requirements
// ---------------------------------------------------------------------------

export type VerificationStatus = "pending" | "verified" | "rejected" | "expired";

export interface MemberRequirement {
  id: string;
  label: string;
  description: string;
  required: boolean;
  /** Field on the patient/passkey record that tracks this */
  statusField: string;
  /** What value means "complete" */
  completeValue: string;
}

export const MEMBER_REQUIREMENTS: MemberRequirement[] = [
  {
    id: "government_id",
    label: "Government-Issued ID",
    description:
      "A valid driver's license, passport, or state-issued identification card verified through our secure identity verification system.",
    required: true,
    statusField: "idVerificationStatus",
    completeValue: "verified",
  },
  {
    id: "payment_method",
    label: "Active Payment Method",
    description:
      "A valid credit or debit card on file. Required for membership billing and any additional services.",
    required: true,
    statusField: "paymentStatus",
    completeValue: "active",
  },
  {
    id: "active_subscription",
    label: "Active Membership",
    description:
      "An active monthly ScriptsXO membership subscription. Grants access to all platform features including Office Hours.",
    required: true,
    statusField: "subscriptionStatus",
    completeValue: "active",
  },
];

/**
 * Check whether a member object satisfies all requirements.
 * Returns { complete: boolean, missing: MemberRequirement[] }
 */
export function checkMemberRequirements(member: Record<string, unknown>): {
  complete: boolean;
  missing: MemberRequirement[];
  completed: MemberRequirement[];
} {
  const missing: MemberRequirement[] = [];
  const completed: MemberRequirement[] = [];

  for (const req of MEMBER_REQUIREMENTS) {
    const value = member[req.statusField];
    if (value === req.completeValue) {
      completed.push(req);
    } else {
      missing.push(req);
    }
  }

  return { complete: missing.length === 0, missing, completed };
}

// ---------------------------------------------------------------------------
// Pricing Tiers
// ---------------------------------------------------------------------------

export type PricingTierId = "membership" | "office_hours" | "provider_consultation";

export interface PricingTier {
  id: PricingTierId;
  name: string;
  tagline: string;
  priceInCents: number;
  interval: "monthly" | "weekly" | "per_session";
  description: string;
  features: string[];
  highlight?: boolean;
  /** Whether this tier is included with the base membership */
  includedWithMembership: boolean;
  active: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "membership",
    name: "Monthly Membership",
    tagline: "Everything you need, one flat rate",
    priceInCents: 9700, // $97/mo
    interval: "monthly",
    description:
      "Full access to the ScriptsXO platform including prescription management, secure messaging, health records, and weekly Nurse Office Hours.",
    features: [
      "Prescription management and refill tracking",
      "Secure messaging with care team",
      "Health records and lab result access",
      "Weekly Nurse Office Hours (included)",
      "Priority scheduling for provider visits",
      "Pharmacy coordination and delivery tracking",
      "Insurance verification and claims support",
      "24/7 AI health screening",
    ],
    highlight: true,
    includedWithMembership: true,
    active: true,
  },
  {
    id: "office_hours",
    name: "Nurse Office Hours",
    tagline: "Weekly Q&A with a licensed nurse",
    priceInCents: 0, // Included with membership
    interval: "weekly",
    description:
      "Join a live weekly audio session with a registered nurse. Submit your questions about blood work, medications, general health, and more. Non-prescribing, informational guidance only.",
    features: [
      "Live weekly audio Q&A session",
      "Submit questions in advance or live",
      "Blood work and lab result interpretation",
      "Medication questions and interactions",
      "General health guidance",
      "Audio-only (no video required)",
      "Non-prescribing / informational only",
      "Recorded sessions available for replay",
    ],
    includedWithMembership: true,
    active: true,
  },
  {
    id: "provider_consultation",
    name: "Provider Consultation",
    tagline: "Same-day prescribing visit",
    priceInCents: 19700, // $197 per session
    interval: "per_session",
    description:
      "A private 15-minute video consultation with a board-certified physician who can evaluate, diagnose, and prescribe. Same-day availability.",
    features: [
      "Private 1-on-1 video visit",
      "Board-certified physician",
      "Evaluation, diagnosis, and treatment plan",
      "E-prescriptions sent directly to pharmacy",
      "Same-day scheduling",
      "15-minute session",
      "Follow-up notes in your health record",
    ],
    includedWithMembership: false,
    active: true,
  },
];

export function getPricingTier(id: PricingTierId): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === id);
}

export function getActivePricingTiers(): PricingTier[] {
  return PRICING_TIERS.filter((t) => t.active);
}

// ---------------------------------------------------------------------------
// Office Hours Configuration
// ---------------------------------------------------------------------------

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface OfficeHoursConfig {
  /** Whether Office Hours are currently active */
  enabled: boolean;
  /** Day of the week for the recurring session */
  dayOfWeek: DayOfWeek;
  /** Start time in 24h format, e.g. "14:00" */
  startTime: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Maximum participants per session */
  maxParticipants: number;
  /** Minutes before session to open the room */
  earlyJoinMinutes: number;
  /** Whether to allow question submission before the session */
  allowPreSubmitQuestions: boolean;
  /** Whether to record sessions for later replay */
  recordSessions: boolean;
  /** Nurse/host information */
  hostTitle: string;
  hostCredentials: string;
  /** Disclaimer text shown to participants */
  disclaimer: string;
  /** Topics the nurse can address */
  topics: string[];
}

export const DEFAULT_OFFICE_HOURS: OfficeHoursConfig = {
  enabled: true,
  dayOfWeek: "wednesday",
  startTime: "14:00",
  durationMinutes: 60,
  maxParticipants: 50,
  earlyJoinMinutes: 10,
  allowPreSubmitQuestions: true,
  recordSessions: true,
  hostTitle: "Registered Nurse",
  hostCredentials: "RN, BSN",
  disclaimer:
    "Office Hours are for informational purposes only. The nurse cannot prescribe medications, diagnose conditions, or provide individualized medical advice during this session. For prescriptions or diagnosis, please book a Provider Consultation.",
  topics: [
    "Understanding blood work and lab results",
    "Medication questions and interactions",
    "General wellness and preventive health",
    "Post-consultation follow-up questions",
    "Nutrition and lifestyle guidance",
    "Understanding your treatment plan",
    "Insurance and billing questions",
    "Navigating the ScriptsXO platform",
  ],
};

// ---------------------------------------------------------------------------
// Office Hours Session State
// ---------------------------------------------------------------------------

export type OfficeHoursSessionStatus =
  | "scheduled"
  | "open_for_questions"
  | "live"
  | "completed"
  | "cancelled";

export interface OfficeHoursQuestion {
  id: string;
  memberName: string;
  memberId: string;
  question: string;
  submittedAt: string;
  isAnonymous: boolean;
  status: "pending" | "answered" | "skipped";
  answer?: string;
}

export interface OfficeHoursSession {
  id: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: OfficeHoursSessionStatus;
  hostName: string;
  hostCredentials: string;
  participantCount: number;
  maxParticipants: number;
  questions: OfficeHoursQuestion[];
  recordingUrl?: string;
}

// ---------------------------------------------------------------------------
// Helper: Format next Office Hours date
// ---------------------------------------------------------------------------

const DAY_MAP: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function getNextOfficeHoursDate(config: OfficeHoursConfig = DEFAULT_OFFICE_HOURS): Date {
  const now = new Date();
  const targetDay = DAY_MAP[config.dayOfWeek];
  const [hours, minutes] = config.startTime.split(":").map(Number);

  const next = new Date(now);
  const currentDay = now.getDay();

  let daysUntil = targetDay - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) {
    // Same day — check if it's already passed
    const sessionTime = new Date(now);
    sessionTime.setHours(hours, minutes, 0, 0);
    if (now > sessionTime) {
      daysUntil = 7;
    }
  }

  next.setDate(now.getDate() + daysUntil);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function formatOfficeHoursSchedule(config: OfficeHoursConfig = DEFAULT_OFFICE_HOURS): string {
  const day = config.dayOfWeek.charAt(0).toUpperCase() + config.dayOfWeek.slice(1);
  const [h, m] = config.startTime.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const displayMin = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
  return `Every ${day} at ${displayHour}${displayMin} ${period} ET`;
}
