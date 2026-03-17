import { callClaude } from './claude';
import { newId } from './id';
import type { Env } from './auth';
import { auditLog } from './audit';

// ─── Agent input types ────────────────────────────────────────────────────────

interface TriageInput {
  intakeData?: Record<string, unknown>;
  demographics?: Record<string, unknown>;
  serviceCategory?: string;
  [key: string]: unknown;
}

interface ClinicalReviewInput {
  caseData?: Record<string, unknown>;
  patientChart?: Record<string, unknown>;
  intakeData?: Record<string, unknown>;
  contraindications?: string[];
  [key: string]: unknown;
}

interface RouterInput {
  patientState?: string;
  serviceCategory?: string;
  availableProviders?: Array<{ id: string; licensedStates: string[] }>;
  [key: string]: unknown;
}

interface PharmacyInput {
  prescriptionData?: Record<string, unknown>;
  pharmacyStatus?: string;
  exceptionType?: string;
  [key: string]: unknown;
}

// ─── AutoReviewAgent types and prompt ────────────────────────────────────────

interface AutoReviewOutput {
  verdict: 'approved' | 'denied' | 'needs_provider_review';
  confidence: number;
  reasoning: string;
  clinical_summary: string;
  suggested_rx: {
    medication_name: string;
    dosage: string;
    form: string;
    quantity: number;
    days_supply: number;
    refills_authorized: number;
    directions: string;
  } | null;
  denial_reason: string | null;
  flags: string[];
  provider_review_reason: string | null;
}

interface AgentOutput extends AutoReviewOutput {
  tokensUsed: number;
}

const AUTO_REVIEW_SYSTEM_PROMPT = `You are an autonomous clinical review agent for a telehealth prescription platform. Your job is to review patient intake data and make a greenlight determination for prescription issuance.

You will receive:
- Patient demographics and medical history
- Service category and medication requested
- Intake form answers (symptoms, duration, severity, prior treatments)
- Video intake transcript (if available)
- Contraindication flags
- Red flags detected by the rules engine

Your task: Determine whether this patient should receive the requested prescription.

Return ONLY valid JSON in this exact format:
{
  "verdict": "approved" | "denied" | "needs_provider_review",
  "confidence": 0.0-1.0,
  "reasoning": "2-3 sentence explanation of your decision",
  "clinical_summary": "Brief clinical summary for provider records",
  "suggested_rx": {
    "medication_name": "...",
    "dosage": "...",
    "form": "...",
    "quantity": 30,
    "days_supply": 30,
    "refills_authorized": 0,
    "directions": "..."
  } | null,
  "denial_reason": "string if denied, null otherwise",
  "flags": ["list of any concerns even if approved"],
  "provider_review_reason": "string if needs_provider_review, null otherwise"
}

Deny if: emergency red flags present, clear contraindications, incomplete intake, signs of diversion, pediatric age, psychiatric crisis indicators.
Approve if: appropriate indication, no contraindications, complete intake, plausible symptom presentation.
Escalate to provider if: borderline case, complex medical history, multiple medications, unclear symptom picture.
Be conservative — when in doubt, escalate to provider rather than deny.`;

// ─── Individual agent functions ───────────────────────────────────────────────

async function runTriageAgent(
  env: Env,
  input: TriageInput
): Promise<Record<string, unknown>> {
  const result = await callClaude(env, {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1024,
    system:
      'You are a clinical triage agent for a telehealth platform. Analyze this patient intake and return JSON with: urgency_score (1-10), contraindication_flags (array of strings), routing_recommendation (service_category string), summary (2-sentence clinical summary), recommended_next_step (string). Return ONLY valid JSON with no markdown.',
    messages: [
      {
        role: 'user',
        content: JSON.stringify(input),
      },
    ],
  });

  return JSON.parse(result.content) as Record<string, unknown>;
}

async function runClinicalReviewAgent(
  env: Env,
  input: ClinicalReviewInput
): Promise<Record<string, unknown>> {
  const result = await callClaude(env, {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
    system:
      'You are a clinical decision support agent. Review this telehealth case and return JSON with: clinical_summary (paragraph for provider), risk_level ("low"|"medium"|"high"), suggested_rx (object with medication_name, dosage, directions or null), contraindication_highlights (array), confidence_score (0-1), provider_notes_template (draft notes the provider can use). Return ONLY valid JSON with no markdown.',
    messages: [
      {
        role: 'user',
        content: JSON.stringify(input),
      },
    ],
  });

  return JSON.parse(result.content) as Record<string, unknown>;
}

async function runRouterAgent(
  env: Env,
  input: RouterInput
): Promise<Record<string, unknown>> {
  const result = await callClaude(env, {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 512,
    system:
      'You are a provider routing agent. Match this patient to the best available provider. Return JSON with: recommended_provider_id (string), reasoning (string), fallback_provider_ids (array), estimated_review_time ("< 1 hour"|"1-4 hours"|"4-8 hours"). Return ONLY valid JSON with no markdown.',
    messages: [
      {
        role: 'user',
        content: JSON.stringify(input),
      },
    ],
  });

  return JSON.parse(result.content) as Record<string, unknown>;
}

async function runPharmacyAgent(
  env: Env,
  input: PharmacyInput
): Promise<Record<string, unknown>> {
  const result = await callClaude(env, {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 512,
    system:
      'You are a pharmacy operations agent. A prescription has encountered an exception. Return JSON with: recommended_action ("retry"|"alternative_pharmacy"|"cancel"|"contact_prescriber"), patient_message (SMS-length update for patient), pharmacy_note (short note for staff), urgency ("routine"|"urgent"). Return ONLY valid JSON with no markdown.',
    messages: [
      {
        role: 'user',
        content: JSON.stringify(input),
      },
    ],
  });

  return JSON.parse(result.content) as Record<string, unknown>;
}

// ─── AutoReviewAgent ──────────────────────────────────────────────────────────

async function runAutoReviewAgent(
  env: Env,
  db: D1Database,
  caseId: string
): Promise<AgentOutput> {
  // 1. Fetch full consultation record with patient and intake data
  const consultation = await db.prepare(`
    SELECT c.*, p.email as patient_email, p.first_name, p.last_name, p.dob, p.state as patient_state,
           p.medications_current, p.allergies, p.medical_conditions,
           i.answers as intake_answers, i.contraindications, i.red_flags
    FROM consultations c
    LEFT JOIN patients p ON c.patient_id = p.id
    LEFT JOIN intake_forms i ON i.consultation_id = c.id
    WHERE c.id = ?
  `).bind(caseId).first<Record<string, unknown>>();

  if (!consultation) throw new Error(`Case not found: ${caseId}`);

  // 2. Build the review payload
  const reviewPayload = {
    patient: {
      name: `${consultation.first_name ?? ''} ${consultation.last_name ?? ''}`.trim() || 'Unknown',
      dob: consultation.dob,
      state: consultation.patient_state,
      currentMedications: consultation.medications_current,
      allergies: consultation.allergies,
      medicalConditions: consultation.medical_conditions,
    },
    serviceCategory: consultation.service_category,
    chiefComplaint: consultation.chief_complaint,
    medicationRequested: consultation.medication_requested,
    intakeAnswers: consultation.intake_answers
      ? JSON.parse(consultation.intake_answers as string)
      : {},
    videoTranscript: consultation.video_transcript ?? null,
    contraindications: consultation.contraindications
      ? JSON.parse(consultation.contraindications as string)
      : [],
    redFlags: consultation.red_flags
      ? JSON.parse(consultation.red_flags as string)
      : [],
    symptomsDescription: consultation.symptoms_description,
    symptomDuration: consultation.symptom_duration,
    symptomSeverity: consultation.symptom_severity,
    previousTreatments: consultation.previous_treatments,
  };

  // 3. Call Claude with the auto-review system prompt
  const result = await callClaude(env, {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1024,
    system: AUTO_REVIEW_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(reviewPayload, null, 2) }],
  });

  // 4. Parse JSON response — strip markdown fences if present
  let rawContent = result.content.trim();
  if (rawContent.startsWith('```')) {
    rawContent = rawContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  const output = JSON.parse(rawContent) as AutoReviewOutput;

  // 5. Update consultation with verdict
  const now = Date.now();
  await db.prepare(`
    UPDATE consultations
    SET auto_review_verdict = ?, auto_review_confidence = ?, auto_review_reasoning = ?,
        auto_review_rx = ?, auto_review_at = ?
    WHERE id = ?
  `).bind(
    output.verdict,
    output.confidence,
    output.reasoning,
    output.suggested_rx ? JSON.stringify(output.suggested_rx) : null,
    now,
    caseId
  ).run();

  // 6. Auto-advance case state based on verdict
  if (output.verdict === 'approved' && output.confidence >= 0.80) {
    await db.prepare(`UPDATE consultations SET case_state = 'approved', updated_at = ? WHERE id = ?`)
      .bind(now, caseId).run();
    await auditLog({
      db,
      eventType: 'case.approved',
      entityType: 'consultation',
      entityId: caseId,
      actorEmail: 'system:AutoReviewAgent',
      actorRole: 'agent',
      payload: {
        verdict: output.verdict,
        confidence: output.confidence,
        reasoning: output.reasoning,
        auto: true,
      },
    });
  } else if (output.verdict === 'denied') {
    await db.prepare(`
      UPDATE consultations SET case_state = 'denied', denial_reason = ?, updated_at = ? WHERE id = ?
    `).bind(output.denial_reason, now, caseId).run();
    await auditLog({
      db,
      eventType: 'case.denied',
      entityType: 'consultation',
      entityId: caseId,
      actorEmail: 'system:AutoReviewAgent',
      actorRole: 'agent',
      payload: {
        verdict: output.verdict,
        confidence: output.confidence,
        denial_reason: output.denial_reason,
        auto: true,
      },
    });
  } else {
    // needs_provider_review — advance to provider_review queue
    await db.prepare(`UPDATE consultations SET case_state = 'provider_review', updated_at = ? WHERE id = ?`)
      .bind(now, caseId).run();
    await auditLog({
      db,
      eventType: 'case.state_changed',
      entityType: 'consultation',
      entityId: caseId,
      actorEmail: 'system:AutoReviewAgent',
      actorRole: 'agent',
      payload: {
        from: 'ready_for_clinical_review',
        to: 'provider_review',
        reason: output.provider_review_reason,
        auto: true,
      },
    });
  }

  return { ...output, tokensUsed: result.inputTokens + result.outputTokens };
}

// ─── Dispatch table ───────────────────────────────────────────────────────────

type AgentFn = (env: Env, input: Record<string, unknown>) => Promise<Record<string, unknown>>;

const AGENT_MAP: Record<string, AgentFn> = {
  TriageAgent: (env, input) => runTriageAgent(env, input as TriageInput),
  ClinicalReviewAgent: (env, input) => runClinicalReviewAgent(env, input as ClinicalReviewInput),
  RouterAgent: (env, input) => runRouterAgent(env, input as RouterInput),
  PharmacyAgent: (env, input) => runPharmacyAgent(env, input as PharmacyInput),
  // AutoReviewAgent is handled separately in runAgent — needs direct DB access
};

// ─── runAgent — fire-and-forget safe ─────────────────────────────────────────

export async function runAgent(
  env: Env,
  agentName: string,
  triggerEvent: string,
  entityType: string,
  entityId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const runId = newId();
  const now = Date.now();

  // 1. Create the run record
  await env.DB.prepare(
    `INSERT INTO agent_runs (id, agent_name, trigger_event, entity_type, entity_id, input, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'running', ?)`
  )
    .bind(runId, agentName, triggerEvent, entityType, entityId, JSON.stringify(input), now)
    .run();

  try {
    let output: Record<string, unknown>;

    if (agentName === 'AutoReviewAgent') {
      // AutoReviewAgent needs direct DB access and caseId — special dispatch
      const caseId = (input.caseId as string) ?? entityId;
      output = await runAutoReviewAgent(env, env.DB, caseId) as unknown as Record<string, unknown>;
    } else {
      const agentFn = AGENT_MAP[agentName];
      if (!agentFn) {
        await env.DB.prepare(
          `UPDATE agent_runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?`
        )
          .bind(`Unknown agent: ${agentName}`, Date.now(), runId)
          .run();
        return null;
      }
      output = await agentFn(env, input);
    }

    // 2. Mark completed
    const tokensUsed = typeof output.tokensUsed === 'number' ? output.tokensUsed : 0;
    await env.DB.prepare(
      `UPDATE agent_runs SET status = 'completed', output = ?, tokens_used = ?, completed_at = ? WHERE id = ?`
    )
      .bind(JSON.stringify(output), tokensUsed, Date.now(), runId)
      .run();

    return output;
  } catch (error) {
    // 3. Mark failed — do NOT re-throw (fire-and-forget safe)
    const errorMessage = error instanceof Error ? error.message : String(error);
    await env.DB.prepare(
      `UPDATE agent_runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?`
    )
      .bind(errorMessage, Date.now(), runId)
      .run()
      .catch(() => {});

    return null;
  }
}

// ─── agentChat — ScriptsXO concierge on-demand ───────────────────────────────

export async function agentChat(
  env: Env,
  _db: D1Database,
  message: string,
  context?: Record<string, unknown>
): Promise<string> {
  const systemPrompt =
    'You are the ScriptsXO clinical operations concierge. You have access to the current user\'s dashboard context. Answer questions about cases, prescriptions, patients, and workflow. Be concise, clinical, and professional.';

  const userContent = context
    ? `Context:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${message}`
    : message;

  const result = await callClaude(env, {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  return result.content;
}
