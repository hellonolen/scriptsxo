import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireCap, requireAnyCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  await requireCap(c, CAP.RX_WRITE);
  const body = await c.req.json<Record<string, unknown>>();
  const now = Date.now();
  const id = newId();

  await c.env.DB.prepare(`
    INSERT INTO prescriptions (
      id, consultation_id, patient_id, provider_id, pharmacy_id,
      medication_name, generic_name, ndc, dosage, form,
      quantity, days_supply, refills_authorized, refills_used, directions,
      dea_schedule, status, prior_auth_required, prior_auth_status,
      expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'draft', ?, ?, ?, ?, ?)
  `).bind(
    id, body.consultationId, body.patientId, body.providerId, body.pharmacyId ?? null,
    body.medicationName, body.genericName ?? null, body.ndc ?? null,
    body.dosage, body.form, body.quantity, body.daysSupply, body.refillsAuthorized,
    body.directions, body.deaSchedule ?? null,
    body.priorAuthRequired ? 1 : 0,
    body.priorAuthRequired ? 'pending' : null,
    body.expiresAt, now, now
  ).run();

  return ok({ id });
});

app.get('/by-provider', async (c) => {
  await requireCap(c, CAP.RX_READ);
  const email = c.req.query('email');
  if (!email) return err('email required');

  const provider = await c.env.DB.prepare('SELECT id FROM providers WHERE email = ?').bind(email.toLowerCase()).first<{ id: string }>();
  if (!provider) return ok([]);

  const { results } = await c.env.DB.prepare(`
    SELECT p.*, pt.email as patient_email, ph.name as pharmacy_name, ph.fax as pharmacy_fax
    FROM prescriptions p
    LEFT JOIN patients pt ON p.patient_id = pt.id
    LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
    WHERE p.provider_id = ?
    ORDER BY p.created_at DESC
    LIMIT 50
  `).bind(provider.id).all();

  return ok(results ?? []);
});

app.get('/by-patient', async (c) => {
  await requireCap(c, CAP.PATIENT_READ);
  const patientId = c.req.query('patientId');
  if (!patientId) return err('patientId required');

  const { results } = await c.env.DB.prepare(`
    SELECT p.*, ph.name as pharmacy_name
    FROM prescriptions p
    LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
    WHERE p.patient_id = ?
    ORDER BY p.created_at DESC
  `).bind(patientId).all();

  return ok(results ?? []);
});

app.get('/:id', async (c) => {
  await requireAnyCap(c, [CAP.RX_READ, CAP.RX_WRITE]);
  const rx = await c.env.DB.prepare(`
    SELECT p.*, pt.email as patient_email, ph.name as pharmacy_name, ph.fax as pharmacy_fax
    FROM prescriptions p
    LEFT JOIN patients pt ON p.patient_id = pt.id
    LEFT JOIN pharmacies ph ON p.pharmacy_id = ph.id
    WHERE p.id = ?
  `).bind(c.req.param('id')).first();
  if (!rx) return err('Not found', 404);
  return ok(rx);
});

app.post('/:id/sign', async (c) => {
  await requireCap(c, CAP.RX_SIGN);
  const { providerId } = await c.req.json<{ providerId: string }>();
  const id = c.req.param('id');
  const rx = await c.env.DB.prepare('SELECT * FROM prescriptions WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!rx) return err('Not found', 404);
  if (rx.provider_id !== providerId) return err('Only the prescribing provider can sign', 403);

  await c.env.DB.prepare('UPDATE prescriptions SET status = ?, updated_at = ? WHERE id = ?')
    .bind('signed', Date.now(), id).run();
  return ok({ success: true });
});

app.post('/:id/send-to-pharmacy', async (c) => {
  await requireCap(c, CAP.RX_WRITE);
  const { pharmacyId, ePrescribeId } = await c.req.json<{ pharmacyId: string; ePrescribeId?: string }>();
  const id = c.req.param('id');
  const rx = await c.env.DB.prepare('SELECT status FROM prescriptions WHERE id = ?').bind(id).first<{ status: string }>();
  if (!rx) return err('Not found', 404);
  if (rx.status !== 'signed') return err('Prescription must be signed before sending');

  await c.env.DB.prepare('UPDATE prescriptions SET status = ?, pharmacy_id = ?, eprescribe_id = ?, sent_to_pharmacy_at = ?, updated_at = ? WHERE id = ?')
    .bind('sent', pharmacyId, ePrescribeId ?? null, Date.now(), Date.now(), id).run();
  return ok({ success: true });
});

app.patch('/:id/status', async (c) => {
  await requireAnyCap(c, [CAP.RX_WRITE, CAP.PHARMACY_WRITE]);
  const { status } = await c.req.json<{ status: string }>();
  const validStatuses = ['draft', 'pending_review', 'signed', 'sent', 'filling', 'ready', 'picked_up', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return err('Invalid status');

  await c.env.DB.prepare('UPDATE prescriptions SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, Date.now(), c.req.param('id')).run();
  return ok({ success: true });
});

export default app;
