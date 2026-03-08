import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireAnyCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  await requireAnyCap(c, [CAP.PATIENT_WRITE, CAP.ADMIN_WRITE]);
  const body = await c.req.json<Record<string, unknown>>();
  const now = Date.now();
  const id = newId();

  await c.env.DB.prepare(`
    INSERT INTO intakes (
      id, patient_id, consultation_id, form_type, status,
      current_step, total_steps, data, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.patientId,
    body.consultationId ?? null,
    body.formType ?? 'general',
    body.currentStep ?? 1,
    body.totalSteps ?? 1,
    body.data ? JSON.stringify(body.data) : '{}',
    now,
    now
  ).run();

  return ok({ id });
});

app.get('/by-patient/:patientId', async (c) => {
  await requireAnyCap(c, [CAP.PATIENT_READ, CAP.ADMIN_READ]);
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM intakes
    WHERE patient_id = ?
    ORDER BY created_at DESC
  `).bind(c.req.param('patientId')).all();

  return ok(results ?? []);
});

app.get('/:id', async (c) => {
  await requireAnyCap(c, [CAP.PATIENT_READ, CAP.ADMIN_READ]);
  const intake = await c.env.DB.prepare('SELECT * FROM intakes WHERE id = ?')
    .bind(c.req.param('id')).first();
  if (!intake) return err('Not found', 404);
  return ok(intake);
});

app.patch('/:id', async (c) => {
  await requireAnyCap(c, [CAP.PATIENT_WRITE, CAP.ADMIN_WRITE]);
  const id = c.req.param('id');
  const body = await c.req.json<Record<string, unknown>>();

  const existing = await c.env.DB.prepare('SELECT * FROM intakes WHERE id = ?')
    .bind(id).first<Record<string, unknown>>();
  if (!existing) return err('Not found', 404);

  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [Date.now()];

  if (body.currentStep !== undefined) { updates.push('current_step = ?'); values.push(body.currentStep); }
  if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
  if (body.data !== undefined) { updates.push('data = ?'); values.push(JSON.stringify(body.data)); }

  values.push(id);
  await c.env.DB.prepare(`UPDATE intakes SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values).run();

  return ok({ success: true });
});

app.post('/:id/complete', async (c) => {
  await requireAnyCap(c, [CAP.PATIENT_WRITE, CAP.ADMIN_WRITE]);
  const id = c.req.param('id');

  const intake = await c.env.DB.prepare('SELECT status FROM intakes WHERE id = ?')
    .bind(id).first<{ status: string }>();
  if (!intake) return err('Not found', 404);
  if (intake.status === 'completed') return err('Intake already completed');

  await c.env.DB.prepare('UPDATE intakes SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?')
    .bind('completed', Date.now(), Date.now(), id).run();

  return ok({ success: true });
});

export default app;
