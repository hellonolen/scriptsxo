export type AgentName =
  | "intake"
  | "triage"
  | "scheduling"
  | "compliance"
  | "consultation"
  | "prescription"
  | "pharmacy"
  | "followUp"
  | "billing"
  | "quality"
  | "composio";

export type AgentAction = {
  agentName: AgentName;
  action: string;
  input: Record<string, unknown>;
};

export type AgentResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
};

export type UrgencyLevel = "emergency" | "urgent" | "standard" | "routine";

export type ConsultationStatus =
  | "scheduled"
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type PrescriptionStatus =
  | "draft"
  | "pending_review"
  | "signed"
  | "sent"
  | "filling"
  | "ready"
  | "picked_up"
  | "delivered"
  | "cancelled";
