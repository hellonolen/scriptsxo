import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireAnyCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  await requireAnyCap(c, [CAP.PATIENT_WRITE, CAP.CONSULT_START]);
  const body = await c.req.json<Record<string, unknown>>();
  if (!body.consultationId) return err('consultationId required');
  if (!body.videoUrl) return err('videoUrl required');

  const now = Date.now();
  const id = newId();

  await c.env.DB.prepare(`
    INSERT INTO video_reviews (
      id, consultation_id, patient_id, video_url,
      duration_seconds, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(
    id,
    body.consultationId,
    body.patientId ?? null,
    body.videoUrl,
    body.durationSeconds ?? null,
    now,
    now
  ).run();

  return ok({ id });
});

app.get('/by-consultation/:consultationId', async (c) => {
  await requireAnyCap(c, [CAP.PATIENT_READ, CAP.CONSULT_JOIN, CAP.ADMIN_READ]);
  const { results } = await c.env.DB.prepare(`
    SELECT vr.*, m.email as patient_email
    FROM video_reviews vr
    LEFT JOIN members m ON vr.patient_id = m.id
    WHERE vr.consultation_id = ?
    ORDER BY vr.created_at DESC
  `).bind(c.req.param('consultationId')).all();

  return ok(results ?? []);
});

app.get('/:id', async (c) => {
  await requireAnyCap(c, [CAP.PATIENT_READ, CAP.CONSULT_JOIN, CAP.ADMIN_READ]);
  const review = await c.env.DB.prepare('SELECT * FROM video_reviews WHERE id = ?')
    .bind(c.req.param('id')).first();
  if (!review) return err('Not found', 404);
  return ok(review);
});

app.patch('/:id/decision', async (c) => {
  await requireAnyCap(c, [CAP.RX_SIGN, CAP.CONSULT_JOIN]);
  const id = c.req.param('id');
  const body = await c.req.json<{ decision: string; notes?: string; providerId?: string }>();

  const validDecisions = ['approved', 'rejected', 'needs_revision'];
  if (!validDecisions.includes(body.decision)) {
    return err(`Invalid decision. Must be one of: ${validDecisions.join(', ')}`);
  }

  const review = await c.env.DB.prepare('SELECT id, status FROM video_reviews WHERE id = ?')
    .bind(id).first<{ id: string; status: string }>();
  if (!review) return err('Not found', 404);
  if (review.status !== 'pending') return err('Review already decided');

  await c.env.DB.prepare(`
    UPDATE video_reviews
    SET status = ?, provider_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    body.decision,
    body.notes ?? null,
    body.providerId ?? null,
    Date.now(),
    Date.now(),
    id
  ).run();

  return ok({ success: true });
});

export default app;
