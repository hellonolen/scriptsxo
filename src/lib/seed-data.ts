/**
 * SEED / DEMO DATASETS — ScriptsXO
 *
 * Used ONLY when shouldShowDemoData() returns true (unauthenticated preview).
 * Authenticated users always see real data or proper empty states.
 *
 * NAMING POLICY (investor-safe):
 *   - No real medication names (Doxycycline, Prednisone, etc. are prohibited)
 *   - No real patient names — use "Member A.", "Member B.", etc.
 *   - Use generic clinical labels: "Protocol A", "Rx A", "Treatment B"
 *   - Financial figures are illustrative only
 */

// ---------------------------------------------------------------------------
// Provider — Daily Schedule
// ---------------------------------------------------------------------------

export const SEED_SCHEDULE = [
  { time: "9:00 AM",  patient: "Member A.", type: "video" as const, reason: "Follow-up visit",       status: "completed"   as const },
  { time: "9:30 AM",  patient: "Member B.", type: "phone" as const, reason: "Treatment review",      status: "completed"   as const },
  { time: "10:15 AM", patient: "Member C.", type: "video" as const, reason: "Initial consultation",  status: "in_progress" as const },
  { time: "11:00 AM", patient: "Member D.", type: "video" as const, reason: "New patient intake",    status: "upcoming"    as const },
  { time: "1:30 PM",  patient: "Member E.", type: "phone" as const, reason: "Wellness check",        status: "upcoming"    as const },
  { time: "2:00 PM",  patient: "Member F.", type: "video" as const, reason: "Progress review",       status: "upcoming"    as const },
  { time: "3:00 PM",  patient: "Member G.", type: "video" as const, reason: "Quarterly follow-up",   status: "upcoming"    as const },
];

// ---------------------------------------------------------------------------
// Provider — Payouts
// ---------------------------------------------------------------------------

export const SEED_PAYOUT_STATS = [
  { label: "This Month",  value: "$8,450" },
  { label: "Pending",     value: "$1,200" },
  { label: "Last Payout", value: "Feb 15" },
  { label: "Growth",      value: "+18%"   },
] as const;

export const SEED_RECENT_PAYOUTS = [
  { date: "Feb 15, 2026", amount: "$3,200.00", consultations: 16, status: "paid" as const },
  { date: "Feb 1, 2026",  amount: "$2,850.00", consultations: 14, status: "paid" as const },
  { date: "Jan 15, 2026", amount: "$3,100.00", consultations: 15, status: "paid" as const },
  { date: "Jan 1, 2026",  amount: "$2,400.00", consultations: 12, status: "paid" as const },
];

export const SEED_PENDING_EARNINGS = [
  { patient: "Member A.", date: "Feb 24", amount: "$197.00", type: "Video Visit" },
  { patient: "Member B.", date: "Feb 24", amount: "$147.00", type: "Phone Call"  },
  { patient: "Member C.", date: "Feb 25", amount: "$197.00", type: "Video Visit" },
  { patient: "Member D.", date: "Feb 25", amount: "$197.00", type: "Video Visit" },
];

// ---------------------------------------------------------------------------
// Pharmacy — Fulfillment Orders
// ---------------------------------------------------------------------------

export const SEED_FULFILLMENT_ORDERS = [
  { id: "RX-1037", patient: "Member A.", medication: "Protocol A · 100mg",  status: "filling"  as const, eta: "30 min",   tracking: undefined },
  { id: "RX-1036", patient: "Member B.", medication: "Treatment B · 10mg",  status: "ready"    as const, eta: "Pickup",   tracking: undefined },
  { id: "RX-1035", patient: "Member C.", medication: "Rx C · 250mg",        status: "shipped"  as const, eta: undefined,  tracking: "1Z999..." },
  { id: "RX-1034", patient: "Member D.", medication: "Protocol D · 500mg",  status: "ready"    as const, eta: "Pickup",   tracking: undefined },
];

// ---------------------------------------------------------------------------
// Office Hours — Upcoming Session
// ---------------------------------------------------------------------------

export const SEED_OFFICE_HOURS_SESSION = {
  participantCount: 14,
  maxParticipants: 50,
  hostName: "Jessica Ramirez",
  hostCredentials: "RN, BSN",
  questions: [
    {
      id: "q1",
      memberName: "Anonymous",
      question: "Can you help me understand my most recent lab results? A few values appear out of the normal range.",
      submittedAt: new Date(Date.now() - 3_600_000).toISOString(),
      isAnonymous: true,
      status: "pending" as const,
    },
    {
      id: "q2",
      memberName: "Member A.",
      question: "I was recently started on a new treatment plan. Are there any foods or activities I should be mindful of?",
      submittedAt: new Date(Date.now() - 7_200_000).toISOString(),
      isAnonymous: false,
      status: "pending" as const,
    },
    {
      id: "q3",
      memberName: "Anonymous",
      question: "My wellness metrics improved significantly over the past month — can you help explain what might have contributed?",
      submittedAt: new Date(Date.now() - 10_800_000).toISOString(),
      isAnonymous: true,
      status: "pending" as const,
    },
  ],
};

export const SEED_PAST_SESSIONS = [
  { id: "oh-2026-02-18", date: "Feb 18, 2026", host: "Jessica Ramirez, RN", participants: 22, questionsAnswered: 8,  hasRecording: true },
  { id: "oh-2026-02-11", date: "Feb 11, 2026", host: "Jessica Ramirez, RN", participants: 18, questionsAnswered: 6,  hasRecording: true },
  { id: "oh-2026-02-04", date: "Feb 4, 2026",  host: "Maria Santos, RN",    participants: 25, questionsAnswered: 10, hasRecording: true },
];
