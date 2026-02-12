export const US_STATES = [
  { code: "FL", name: "Florida", telehealthActive: true },
  { code: "TX", name: "Texas", telehealthActive: false },
  { code: "CA", name: "California", telehealthActive: false },
  { code: "NY", name: "New York", telehealthActive: false },
] as const;

export const SPECIALTIES = [
  "General Medicine",
  "Internal Medicine",
  "Dermatology",
  "Mental Health",
  "Urgent Care",
  "Endocrinology",
  "Pain Management",
  "Sexual Health",
] as const;

export const DEA_SCHEDULES = {
  II: "High potential for abuse",
  III: "Moderate potential for abuse",
  IV: "Low potential for abuse",
  V: "Lowest potential for abuse",
  none: "Not a controlled substance",
} as const;

export const URGENCY_LEVELS = {
  emergency: { label: "Emergency", color: "red", maxWaitMinutes: 0 },
  urgent: { label: "Urgent", color: "orange", maxWaitMinutes: 30 },
  standard: { label: "Standard", color: "blue", maxWaitMinutes: 120 },
  routine: { label: "Routine", color: "green", maxWaitMinutes: 1440 },
} as const;

export const CONSULTATION_TYPES = ["video", "phone", "chat"] as const;

export const PRESCRIPTION_STATUSES = [
  "draft",
  "pending_review",
  "signed",
  "sent",
  "filling",
  "ready",
  "picked_up",
  "delivered",
  "cancelled",
] as const;
