import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireCap, requireAnyCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  await requireAnyCap(c, [CAP.CONSULT_START, CAP.CONSULT_JOIN]);
  const body = await c.req.json<Record<string, unknown>>();
  const id = newId();
  const now = Date.now();

  await c.env.DB.prepare(`
    INSERT INTO consultations (id, patient_id, provider_id, intake_id, triage_id, type, status, scheduled_at, patient_state, cost, payment_status, follow_up_required, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, 'pending', 0, ?, ?)
  `).bind(id, body.patientId, body.providerId ?? null, body.intakeId ?? null, body.triageId ?? null, body.type, body.scheduledAt, body.patientState, body.cost, now, now).run();

  return ok({ id });
});

app.get('/queue', async (c) => {
  await requireAnyCap(c, [CAP.CONSULT_START, CAP.CONSULT_JOIN]);
  const { results } = await c.env.DB.prepare(`
    SELECT c.*, p.email as patient_email, m.name as patient_name
    FROM consultations c
    JOIN patients p ON c.patient_id = p.id
    JOIN members m ON p.member_id = m.id
    WHERE c.status = 'waiting'
    ORDER BY c.scheduled_at ASC
    LIMIT 50
  `).all();
  return ok(results ?? []);
});

app.get('/by-patient/:patientId', async (c) => {
  await requireCap(c, CAP.PATIENT_READ);
  const { results } = await c.env.DB.prepare(`
    SELECT c.*, pr.first_name as provider_first_name, pr.last_name as provider_last_name
    FROM consultations c
    LEFT JOIN providers pr ON c.provider_id = pr.id
    WHERE c.patient_id = ?
    ORDER BY c.scheduled_at DESC
  `).bind(c.req.param('patientId')).all();
  return ok(results ?? []);
});

app.get('/:id', async (c) => {
  await requireAnyCap(c, [CAP.CONSULT_START, CAP.CONSULT_JOIN, CAP.PATIENT_READ]);
  const row = await c.env.DB.prepare(`
    SELECT c.*, p.email as patient_email, m.name as patient_name
    FROM consultations c
    JOIN patients p ON c.patient_id = p.id
    JOIN members m ON p.member_id = m.id
    WHERE c.id = ?
  `).bind(c.req.param('id')).first();
  if (!row) return err('Not found', 404);
  return ok(row);
});

app.post('/:id/start', async (c) => {
  await requireCap(c, CAP.CONSULT_START);
  await c.env.DB.prepare('UPDATE consultations SET status = ?, started_at = ?, updated_at = ? WHERE id = ?')
    .bind('in_progress', Date.now(), Date.now(), c.req.param('id')).run();
  return ok({ success: true });
});

app.post('/:id/complete', async (c) => {
  await requireCap(c, CAP.CONSULT_START);
  const { notes, diagnosis, treatmentPlan, followUpRequired, followUpDate } =
    await c.req.json<{ notes?: string; diagnosis?: string; treatmentPlan?: string; followUpRequired?: boolean; followUpDate?: number }>();
  const now = Date.now();

  const consultation = await c.env.DB.prepare('SELECT started_at FROM consultations WHERE id = ?')
    .bind(c.req.param('id')).first<{ started_at: number | null }>();
  const duration = consultation?.started_at ? Math.round((now - consultation.started_at) / 60000) : null;

  await c.env.DB.prepare(`
    UPDATE consultations SET status = 'completed', ended_at = ?, duration = ?, notes = ?, diagnosis = ?,
    treatment_plan = ?, follow_up_required = ?, follow_up_date = ?, updated_at = ? WHERE id = ?
  `).bind(now, duration, notes ?? null, diagnosis ?? null, treatmentPlan ?? null, followUpRequired ? 1 : 0, followUpDate ?? null, now, c.req.param('id')).run();

  return ok({ success: true });
});

app.post('/:id/enqueue', async (c) => {
  await requireCap(c, CAP.CONSULT_JOIN);
  await c.env.DB.prepare('UPDATE consultations SET status = ?, updated_at = ? WHERE id = ?')
    .bind('waiting', Date.now(), c.req.param('id')).run();
  return ok({ success: true });
});

app.post('/:id/claim', async (c) => {
  await requireCap(c, CAP.CONSULT_START);
  const { providerId } = await c.req.json<{ providerId: string }>();
  const now = Date.now();

  const row = await c.env.DB.prepare('SELECT status FROM consultations WHERE id = ?').bind(c.req.param('id')).first<{ status: string }>();
  if (row?.status !== 'waiting') return err('Consultation is not in waiting state');

  await c.env.DB.prepare('UPDATE consultations SET status = ?, provider_id = ?, updated_at = ? WHERE id = ?')
    .bind('in_progress', providerId, now, c.req.param('id')).run();
  await c.env.DB.prepare('UPDATE providers SET current_queue_size = current_queue_size + 1 WHERE id = ?').bind(providerId).run();

  return ok({ success: true });
});

export default app;
