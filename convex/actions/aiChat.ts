"use node";
// @ts-nocheck
/**
 * AI CHAT
 * Role-aware AI concierge powered by Gemini (primary) + Claude (secondary).
 * Assembles context dynamically based on user role:
 *   - Client: medical history, intake data, prescriptions, drug screening
 *   - Provider: patient queue, pending Rx, clinical context
 *   - Admin: platform stats, any client record, revenue
 * Integrates Medical Intelligence agent for drug interaction screening.
 * All interactions persisted in aiConversations for memory across LLM switches.
 */
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import { requireCap, CAP } from "../lib/capabilities";

// ============================================
// SYSTEM PROMPTS BY ROLE
// ============================================

const CLIENT_SYSTEM_PROMPT = `You are ScriptsXO's AI health concierge. You are warm, professional, concise, and medically knowledgeable.

You have access to the patient's self-reported medical history, medications, allergies, and current symptoms. Our Medical Intelligence system has automatically screened their medications for drug interactions using FDA and NIH databases.

Your role is to:
1. Verify their self-reported information with probing follow-up questions
2. Discuss any drug interaction warnings flagged by our screening system
3. Ask about symptom severity, duration, and progression
4. Flag any red flags that require immediate medical attention
5. Guide them through the consultation process
6. Ask clarifying questions about medications, dosages, and how long they have been taking them

IMPORTANT RULES:
- NEVER diagnose conditions. You screen and guide only.
- NEVER prescribe medications. Only licensed providers can prescribe.
- If symptoms suggest an emergency (chest pain, difficulty breathing, severe bleeding, suicidal ideation), immediately advise calling 911 or going to the nearest ER.
- Be conversational and human, not robotic.
- Keep responses concise (2-4 sentences typical, longer only when medically necessary).
- Reference the patient's specific data when relevant (e.g., "I see you mentioned you are taking Lisinopril...").
- If drug interaction warnings are present, mention them naturally.
- If no medical data is available, ask the patient about their current medications, allergies, medical conditions, and what brings them in today.`;

const PROVIDER_SYSTEM_PROMPT = `You are ScriptsXO's clinical assistant for healthcare providers. You help physicians, PAs, and NPs manage their practice efficiently.

Your role is to:
1. Help review patient cases and intake data
2. Summarize patient medical history, medications, and allergies
3. Flag potential drug interactions and contraindications
4. Assist with prescription decisions (but NEVER make the final prescribing decision)
5. Help manage the consultation queue
6. Answer questions about platform features

Keep responses clinical, concise, and actionable. Use medical terminology appropriately.
When a provider says "pull up [patient]" or "show my queue", provide the relevant data.`;

const ADMIN_SYSTEM_PROMPT = `You are ScriptsXO's platform intelligence assistant for administrators. You have access to platform-wide data and help admins manage the business.

Your role is to:
1. Report platform statistics (client counts, Rx volumes, revenue)
2. Look up any client record when asked
3. Help with compliance and audit questions
4. Monitor prescription trends and anomalies
5. Assist with organization and provider management

Keep responses data-driven and concise. Present numbers clearly.
When asked about a specific client, fetch and present their full record.`;

// ============================================
// CONTEXT BUILDERS
// ============================================

function buildPatientContext(
  intake: Record<string, unknown> | null,
  patient: Record<string, unknown> | null
): string {
  const parts: string[] = [];

  if (patient) {
    const meds = (patient.currentMedications as string[]) || [];
    const allergies = (patient.allergies as string[]) || [];
    const conditions = (patient.medicalConditions as string[]) || [];

    if (conditions.length > 0) {
      parts.push(`Medical conditions: ${conditions.join(", ")}`);
    }
    if (meds.length > 0) {
      parts.push(`Current medications: ${meds.join(", ")}`);
    }
    if (allergies.length > 0) {
      parts.push(`Allergies: ${allergies.join(", ")}`);
    }
    if (patient.gender) {
      parts.push(`Gender: ${patient.gender}`);
    }
    if (patient.dateOfBirth) {
      parts.push(`DOB: ${patient.dateOfBirth}`);
    }
  }

  if (intake) {
    if (intake.chiefComplaint) {
      parts.push(`Chief complaint: ${intake.chiefComplaint}`);
    }
    if (intake.symptomDuration) {
      parts.push(`Symptom duration: ${intake.symptomDuration}`);
    }
    if (intake.severityLevel) {
      parts.push(`Severity: ${intake.severityLevel}/10`);
    }
    if (intake.currentSymptoms) {
      const symptoms = intake.currentSymptoms as Record<string, unknown>;
      if (symptoms.relatedSymptoms) {
        parts.push(
          `Related symptoms: ${(symptoms.relatedSymptoms as string[]).join(", ")}`
        );
      }
      if (symptoms.previousTreatments) {
        parts.push(`Previous treatments: ${symptoms.previousTreatments}`);
      }
    }
    if (intake.medicalHistory) {
      const history = intake.medicalHistory as Record<string, unknown>;
      if (history.surgeries) {
        parts.push(`Previous surgeries: ${history.surgeries}`);
      }
      if (history.familyHistory) {
        parts.push(
          `Family history: ${(history.familyHistory as string[]).join(", ")}`
        );
      }
    }
  }

  if (parts.length === 0) {
    return "No patient records available yet. This appears to be a new client. Ask them about their current medications, allergies, medical conditions, and what brings them in today.";
  }

  return parts.join("\n");
}

async function buildProviderContext(
  ctx: any,
  providerEmail: string
): Promise<string> {
  const parts: string[] = [];

  try {
    const queue = await ctx.runQuery(api.consultations.getProviderQueue, {
      providerEmail,
    });

    const waiting = queue.filter((c: any) => c.status === "waiting" || c.status === "scheduled");
    const inProgress = queue.filter((c: any) => c.status === "in_progress");
    const completedToday = queue.filter((c: any) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return c.status === "completed" && c.endedAt && c.endedAt >= today.getTime();
    });

    parts.push(`Queue: ${waiting.length} waiting, ${inProgress.length} in progress, ${completedToday.length} completed today`);
    parts.push(`Total consultations in queue: ${queue.length}`);

    if (waiting.length > 0) {
      parts.push("Next in queue:");
      for (const c of waiting.slice(0, 3)) {
        parts.push(`  - Consultation ${c._id} (${c.type}, scheduled ${new Date(c.scheduledAt).toLocaleTimeString()})`);
      }
    }
  } catch {
    parts.push("Could not load provider queue.");
  }

  return parts.length > 0 ? parts.join("\n") : "No provider data available.";
}

async function buildAdminContext(ctx: any): Promise<string> {
  const parts: string[] = [];

  try {
    // Get total patient count (limited scan)
    const patients = await ctx.runQuery(api.patients.list, {
      paginationOpts: { numItems: 1, cursor: null },
    });
    parts.push(`Platform has clients on file (paginated query available)`);

    // Get pending prescriptions
    const pendingRx = await ctx.runQuery(api.prescriptions.listAll, {});
    if (pendingRx) {
      const pending = pendingRx.filter((rx: any) => rx.status === "pending_review");
      const active = pendingRx.filter((rx: any) =>
        ["signed", "sent", "filling", "ready"].includes(rx.status)
      );
      parts.push(`Prescriptions: ${pending.length} pending review, ${active.length} active`);
      parts.push(`Total prescriptions: ${pendingRx.length}`);
    }
  } catch {
    parts.push("Platform stats: query unavailable.");
  }

  return parts.length > 0 ? parts.join("\n") : "No admin data available.";
}

// ============================================
// MAIN CHAT ACTION
// ============================================

/**
 * Chat with the AI concierge.
 * Role-aware: adapts context and system prompt based on userRole.
 * Supports provider selection (gemini/claude).
 */
export const chat = action({
  args: {
    message: v.string(),
    conversationHistory: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
    patientEmail: v.string(),
    intakeId: v.optional(v.string()),
    userRole: v.optional(v.string()), // "client" | "provider" | "admin"
    llmProvider: v.optional(v.string()), // "gemini" | "claude"
    callerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.callerId, CAP.VIEW_DASHBOARD);
    const role = args.userRole || "client";
    const emailLower = args.patientEmail.toLowerCase();

    // Select system prompt based on role
    let systemPrompt = CLIENT_SYSTEM_PROMPT;
    if (role === "provider") systemPrompt = PROVIDER_SYSTEM_PROMPT;
    if (role === "admin") systemPrompt = ADMIN_SYSTEM_PROMPT;

    // Build role-specific context
    let roleContext = "";

    if (role === "client") {
      // Fetch patient data
      let patient = null;
      let intake = null;

      try {
        patient = await ctx.runQuery(api.patients.getByEmail, { email: emailLower });
      } catch {
        // Patient may not exist yet
      }

      if (args.intakeId) {
        try {
          intake = await ctx.runQuery(api.intake.getById, { intakeId: args.intakeId as any });
        } catch {}
      } else {
        try {
          intake = await ctx.runQuery(api.intake.getLatestByEmail, { email: emailLower });
        } catch {}
      }

      roleContext = buildPatientContext(intake, patient);

      // Drug screening for clients with medications
      if (patient) {
        const meds = (patient.currentMedications as string[]) || [];
        const allergies = (patient.allergies as string[]) || [];
        const conditions = (patient.medicalConditions as string[]) || [];

        if (meds.length > 0) {
          try {
            const screening = await ctx.runAction(
              api.actions.medicalIntelligence.screenMedications,
              { medications: meds, allergies, conditions }
            );

            if (screening.warnings.length > 0 || screening.interactions.length > 0) {
              const screenParts: string[] = [];
              screenParts.push(`Drug Screening Summary: ${screening.summary}`);
              if (screening.warnings.length > 0) {
                screenParts.push("Warnings:");
                for (const w of screening.warnings) screenParts.push(`  - ${w}`);
              }
              if (screening.interactions.length > 0) {
                screenParts.push("Interactions found:");
                for (const i of screening.interactions) {
                  screenParts.push(`  - ${i.drug1} + ${i.drug2}: ${i.description.substring(0, 150)}`);
                }
              }
              roleContext += `\n\n--- DRUG SCREENING ---\n${screenParts.join("\n")}`;
            }
          } catch {
            // Drug screening not critical
          }
        }
      }
    } else if (role === "provider") {
      roleContext = await buildProviderContext(ctx, emailLower);
    } else if (role === "admin") {
      roleContext = await buildAdminContext(ctx);
    }

    // Pull persistent memory (agentic awareness)
    let agenticContext = "";
    try {
      const conversation = await ctx.runQuery(api.aiConversations.getByEmail, {
        email: emailLower,
      });
      if (conversation) {
        const memParts: string[] = [];
        if (conversation.currentPage) {
          memParts.push(`User is currently on: ${conversation.currentPage}`);
        }
        if (conversation.collectedData) {
          const data = conversation.collectedData as Record<string, unknown>;
          const entries = Object.entries(data).filter(([, v]) => v != null);
          if (entries.length > 0) {
            memParts.push("Data collected across pages:");
            for (const [key, val] of entries) {
              memParts.push(`  ${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`);
            }
          }
        }
        const recentMessages = conversation.messages.slice(-10);
        const pagesVisited = [...new Set(recentMessages.map((m: any) => m.page).filter(Boolean))];
        if (pagesVisited.length > 0) {
          memParts.push(`Recent pages visited: ${pagesVisited.join(", ")}`);
        }
        if (memParts.length > 0) {
          agenticContext = memParts.join("\n");
        }
      }
    } catch {
      // Conversation may not exist yet
    }

    // Assemble full system prompt with context
    let fullContext = `${systemPrompt}\n\n--- ${role.toUpperCase()} CONTEXT ---\n${roleContext}`;
    if (agenticContext) {
      fullContext += `\n\n--- PERSISTENT MEMORY ---\n${agenticContext}`;
    }
    fullContext += "\n--- END CONTEXT ---";

    // Build messages array
    const messages = [
      { role: "system", content: fullContext },
      ...args.conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: args.message },
    ];

    // Call LLM via gateway (supports gemini/claude switching)
    const response = await ctx.runAction(api.agents.llmGateway.callLLM, {
      messages,
      provider: args.llmProvider || "gemini",
      maxTokens: 1024,
      temperature: 0.4,
    });

    return {
      content: response.content,
      model: response.model,
      provider: response.provider,
    };
  },
});
