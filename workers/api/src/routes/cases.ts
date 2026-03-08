import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireCap, requireAnyCap, err, ok, type Env } from '../lib/auth';
import { auditLog } from '../lib/audit';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

// Valid case state transitions
const TRANSITIONS: Record<string, string[]> = {
  draft: ['identity_pending', 'payment_pending'],
  identity_pending: ['payment_pending', 'draft'],
  payment_pending: ['ready_for_clinical_review'],
  ready_for_clinical_review: ['provider_review'],
  provider_review: ['more_info_requested', 'synchronous_visit_required', 'approved', 'denied'],
  more_info_requested: ['provider_review', 'denied'],
  synchronous_visit_required: ['provider_review', 'denied', 'approved'],
  approved: ['rx_sent'],
  rx_sent: ['pharmacy_exception', 'completed'],
  pharmacy_exception: ['rx_sent', 'denied'],
  denied: [],
  completed: [],
};

// GET /cases/:id — get full case details
app.get('/:id', async (c) => {
  await requireAnyCap(c, [CAP.CONSULT_START, CAP.CONSULT_JOIN, CAP.PATIENT_READ]);
  const row = await c.env.DB.prepare(`
    SELECT c.*, p.email as patient_email_field, m.name as patient_name,
      pr.first_name as provider_first, pr.last_name as provider_last
    FROM consultations c
    LEFT JOIN patients p ON c.patient_id = p.id
    LEFT JOIN members m ON p.member_id = m.id
    LEFT JOIN providers pr ON c.provider_id = pr.id
    WHERE c.id = ?
  `).bind(c.req.param('id')).first();
  if (!row) return err('Not found', 404);

  // Parse JSON fields
  const result = { ...row } as Record<string, unknown>;
  for (const field of ['intake_data', 'contraindications', 'red_flags']) {
    if (typeof result[field] === 'string') {
      try { result[field] = JSON.parse(result[field] as string); } catch { /* keep raw */ }
    }
  }
  return ok(result);
});

// POST /cases/:id/advance — advance case state
app.post('/:id/advance', async (c) => {
  await requireAnyCap(c, [CAP.CONSULT_START, CAP.CONSULT_JOIN]);
  const { toState, notes, actorEmail } = await c.req.json<{
    toState: string; notes?: string; actorEmail?: string;
  }>();

  const row = await c.env.DB.prepare('SELECT case_state, patient_email FROM consultations WHERE id = ?')
    .bind(c.req.param('id')).first<{ case_state: string; patient_email: string }>();
  if (!row) return err('Case not found', 404);

  const allowed = TRANSITIONS[row.case_state] ?? [];
  if (!allowed.includes(toState)) {
    return err(`Invalid transition: ${row.case_state} → ${toState}. Allowed: ${allowed.join(', ')}`, 400);
  }

  const now = Date.now();
  await c.env.DB.prepare('UPDATE consultations SET case_state = ?, provider_notes = ?, updated_at = ? WHERE id = ?')
    .bind(toState, notes ?? null, now, c.req.param('id')).run();

  await auditLog({
    db: c.env.DB,
    eventType: 'case.state_changed',
    entityType: 'consultation',
    entityId: c.req.param('id'),
    actorEmail,
    patientEmail: row.patient_email,
    payload: { from: row.case_state, to: toState },
  });

  return ok({ success: true, state: toState });
});

// GET /cases — list cases by state (admin)
app.get('/', async (c) => {
  await requireCap(c, CAP.ADMIN_READ);
  const state = c.req.query('state');
  const query = state
    ? `SELECT c.*, m.name as patient_name FROM consultations c LEFT JOIN patients p ON c.patient_id = p.id LEFT JOIN members m ON p.member_id = m.id WHERE c.case_state = ? ORDER BY c.created_at DESC LIMIT 100`
    : `SELECT c.*, m.name as patient_name FROM consultations c LEFT JOIN patients p ON c.patient_id = p.id LEFT JOIN members m ON p.member_id = m.id ORDER BY c.created_at DESC LIMIT 100`;
  const { results } = state
    ? await c.env.DB.prepare(query).bind(state).all()
    : await c.env.DB.prepare(query).all();
  return ok(results ?? []);
});

// POST /cases/:id/intake — save intake form data
app.post('/:id/intake', async (c) => {
  await requireAnyCap(c, [CAP.CONSULT_START, CAP.CONSULT_JOIN]);
  const body = await c.req.json<Record<string, unknown>>();
  const intakeId = newId();
  const now = Date.now();

  // Check for red flags in answers
  const redFlags = detectRedFlags(body.answers as Record<string, unknown> ?? {});
  const contraindications = detectContraindications(
    body.answers as Record<string, unknown> ?? {},
    body.serviceCategory as string
  );

  await c.env.DB.prepare(`
    INSERT INTO intake_forms (id, consultation_id, patient_email, service_category, patient_state,
      dob, answers, contraindications, red_flags, pharmacy_preference, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET answers=excluded.answers, updated_at=excluded.updated_at
  `).bind(
    intakeId,
    c.req.param('id'),
    body.patientEmail ?? null,
    body.serviceCategory ?? 'general',
    body.patientState ?? null,
    body.dob ?? null,
    JSON.stringify(body.answers ?? {}),
    JSON.stringify(contraindications),
    JSON.stringify(redFlags),
    body.pharmacyPreference ?? null,
    now, now,
  ).run();

  // Save intake data to consultation
  await c.env.DB.prepare('UPDATE consultations SET intake_data = ?, service_category = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(body.answers ?? {}), body.serviceCategory ?? null, now, c.req.param('id')).run();

  return ok({ success: true, intakeId, redFlags, contraindications });
});

// GET /cases/:id/audit — audit trail for a case
app.get('/:id/audit', async (c) => {
  await requireAnyCap(c, [CAP.CONSULT_START, CAP.ADMIN_READ]);
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM audit_log WHERE entity_id = ? ORDER BY created_at ASC'
  ).bind(c.req.param('id')).all();
  return ok(results ?? []);
});

// --- Rules Engine helpers ---

function detectRedFlags(answers: Record<string, unknown>): string[] {
  const flags: string[] = [];
  const text = JSON.stringify(answers).toLowerCase();

  if (text.includes('chest pain') || text.includes('chest tightness')) flags.push('chest_pain');
  if (text.includes('shortness of breath') || text.includes('difficulty breathing')) flags.push('breathing');
  if (text.includes('suicidal') || text.includes('self harm')) flags.push('mental_health_crisis');
  if (text.includes('pregnant') || text.includes('pregnancy')) flags.push('pregnancy_screening');
  if (text.includes('severe') && text.includes('abdominal')) flags.push('abdominal_emergency');
  if (text.includes('stroke') || text.includes('numbness') || text.includes('paralysis')) flags.push('stroke_symptoms');
  if (text.includes('under 18') || text.includes('minor') || text.includes('age: 1') || text.includes('age: 2') || text.includes('years old: 1')) flags.push('pediatric');

  return flags;
}

function detectContraindications(answers: Record<string, unknown>, serviceCategory: string): string[] {
  const flags: string[] = [];
  const text = JSON.stringify(answers).toLowerCase();
  const meds = (answers.medications as string ?? '').toLowerCase();
  const conditions = (answers.conditions as string ?? '').toLowerCase();

  // GLP-1 / weight management contraindications
  if (serviceCategory === 'weight_management' || serviceCategory === 'glp1') {
    if (conditions.includes('pancreatitis')) flags.push('contraindicated_pancreatitis');
    if (conditions.includes('thyroid cancer') || conditions.includes('medullary')) flags.push('contraindicated_thyroid_cancer');
    if (conditions.includes('type 1 diabetes')) flags.push('caution_type1_diabetes');
    if (text.includes('pregnant')) flags.push('contraindicated_pregnancy');
  }

  // Testosterone contraindications
  if (serviceCategory === 'mens_health' || serviceCategory === 'testosterone') {
    if (conditions.includes('prostate cancer')) flags.push('contraindicated_prostate_cancer');
    if (conditions.includes('breast cancer')) flags.push('contraindicated_breast_cancer');
    if (conditions.includes('polycythemia')) flags.push('contraindicated_polycythemia');
  }

  // Drug interactions
  if (meds.includes('monoamine') || meds.includes('maoi')) {
    flags.push('drug_interaction_maoi');
  }
  if (meds.includes('warfarin') || meds.includes('coumadin')) {
    flags.push('drug_interaction_anticoagulant');
  }

  return flags;
}

export default app;
