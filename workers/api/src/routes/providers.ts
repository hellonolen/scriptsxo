import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireCap, requireAuth, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  await requireCap(c, CAP.PROVIDER_WRITE);
  const body = await c.req.json<Record<string, unknown>>();
  const id = newId();
  const now = Date.now();

  await c.env.DB.prepare(`
    INSERT INTO providers (id, member_id, email, first_name, last_name, title, npi_number, dea_number,
      specialties, licensed_states, accepting_patients, consultation_rate, max_daily_consultations,
      current_queue_size, total_consultations, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'onboarding', ?, ?)
  `).bind(
    id, body.memberId, (body.email as string).toLowerCase(),
    body.firstName, body.lastName, body.title, body.npiNumber, body.deaNumber ?? null,
    JSON.stringify(body.specialties ?? []), JSON.stringify(body.licensedStates ?? []),
    body.acceptingPatients ? 1 : 0, body.consultationRate,
    body.maxDailyConsultations ?? 20, now, now
  ).run();

  return ok({ id });
});

app.get('/active', async (c) => {
  await requireAnyCap_inline(c, [CAP.CONSULT_START, CAP.ADMIN_READ]);
  const state = c.req.query('state');
  let query = 'SELECT * FROM providers WHERE status = ? AND accepting_patients = 1';
  const params: unknown[] = ['active'];
  if (state) {
    query += ' AND licensed_states LIKE ?';
    params.push(`%${state}%`);
  }
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return ok(results ?? []);
});

app.get('/by-email', async (c) => {
  await requireAuth(c);
  const email = c.req.query('email');
  if (!email) return err('email required');
  const provider = await c.env.DB.prepare('SELECT * FROM providers WHERE email = ?').bind(email.toLowerCase()).first();
  return ok(provider ?? null);
});

app.get('/:id', async (c) => {
  await requireCap(c, CAP.PROVIDER_READ);
  const provider = await c.env.DB.prepare('SELECT * FROM providers WHERE id = ?').bind(c.req.param('id')).first();
  if (!provider) return err('Not found', 404);
  return ok(provider);
});

app.patch('/:id/status', async (c) => {
  await requireCap(c, CAP.PROVIDER_WRITE);
  const { status } = await c.req.json<{ status: string }>();
  await c.env.DB.prepare('UPDATE providers SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, Date.now(), c.req.param('id')).run();
  return ok({ success: true });
});

app.patch('/:id/availability', async (c) => {
  await requireCap(c, CAP.PROVIDER_WRITE);
  const { accepting, maxDaily } = await c.req.json<{ accepting?: boolean; maxDaily?: number }>();
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [Date.now()];
  if (accepting !== undefined) { sets.push('accepting_patients = ?'); vals.push(accepting ? 1 : 0); }
  if (maxDaily !== undefined) { sets.push('max_daily_consultations = ?'); vals.push(maxDaily); }
  vals.push(c.req.param('id'));
  await c.env.DB.prepare(`UPDATE providers SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return ok({ success: true });
});

// Inline helper to avoid circular import
async function requireAnyCap_inline(c: Parameters<typeof requireCap>[0], caps: Parameters<typeof requireCap>[1][]) {
  const { requireAnyCap } = await import('../lib/auth');
  return requireAnyCap(c, caps as never);
}

export default app;
