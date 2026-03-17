import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireCap, requireAnyCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';
import { snsPublish, snsCreateTopic } from '../lib/sns';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  await requireAnyCap(c, [CAP.RX_READ, CAP.ADMIN_READ]);
  const { results } = await c.env.DB.prepare(`
    SELECT rx.*, p.email as patient_email, m.name as patient_name
    FROM prescriptions rx
    LEFT JOIN patients p ON rx.patient_id = p.id
    LEFT JOIN members m ON p.member_id = m.id
    ORDER BY rx.created_at DESC LIMIT 200
  `).all();
  return ok(results ?? []);
});

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

  const rxCheck = await c.env.DB.prepare('SELECT status FROM prescriptions WHERE id = ?').bind(id).first<{ status: string }>();
  if (!rxCheck) return err('Not found', 404);
  if (rxCheck.status !== 'signed') return err('Prescription must be signed before sending');

  const now = Date.now();
  await c.env.DB.prepare('UPDATE prescriptions SET status = ?, pharmacy_id = ?, eprescribe_id = ?, sent_to_pharmacy_at = ?, updated_at = ? WHERE id = ?')
    .bind('sent', pharmacyId, ePrescribeId ?? null, now, now, id).run();

  // Fire SNS notification to pharmacy (fire-and-forget)
  c.executionCtx?.waitUntil(
    (async () => {
      try {
        const rx = await c.env.DB.prepare(`
          SELECT p.*, pt.email as patient_email, pt.first_name as patient_first, pt.last_name as patient_last,
                 pr.first_name as provider_first, pr.last_name as provider_last, pr.npi_number, pr.title,
                 ph.name as pharmacy_name, ph.notification_email, ph.notification_phone, ph.sns_topic_arn
          FROM prescriptions p
          LEFT JOIN patients pt ON p.patient_id = pt.id
          LEFT JOIN providers pr ON p.provider_id = pr.id
          LEFT JOIN pharmacies ph ON ph.id = ?
          WHERE p.id = ?
        `).bind(pharmacyId, id).first<Record<string, unknown>>();

        if (!rx) return;

        const patientName = `${rx.patient_first} ${rx.patient_last}`;
        const providerName = `${rx.title ?? 'Dr.'} ${rx.provider_first} ${rx.provider_last}`;
        const recipient = (rx.notification_email ?? rx.pharmacy_email) as string | null;

        if (!recipient) return;

        let topicArn = rx.sns_topic_arn as string | null;
        if (!topicArn) {
          const safeName = pharmacyId.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 50);
          topicArn = await snsCreateTopic(c.env, `scriptsxo-pharmacy-${safeName}`);
          if (topicArn) {
            await c.env.DB.prepare('UPDATE pharmacies SET sns_topic_arn = ? WHERE id = ?')
              .bind(topicArn, pharmacyId).run();
          }
        }

        if (!topicArn) return;

        const subject = `New Prescription: ${rx.medication_name} for ${patientName}`;
        const message = [
          'PRESCRIPTION NOTIFICATION — ScriptsXO',
          '',
          `Prescription ID: ${id}`,
          `Medication: ${rx.medication_name}${rx.dosage ? ` ${rx.dosage}` : ''}`,
          `Form: ${rx.form ?? 'N/A'} | Quantity: ${rx.quantity ?? 'N/A'} | Days Supply: ${rx.days_supply ?? 'N/A'}`,
          `Directions: ${rx.directions ?? 'N/A'}`,
          `Refills: ${rx.refills_authorized ?? 0}`,
          '',
          `Patient: ${patientName}`,
          `Patient Email: ${rx.patient_email}`,
          '',
          `Prescriber: ${providerName}`,
          `NPI: ${rx.npi_number ?? 'N/A'}`,
          '',
          `Sent: ${new Date(now).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`,
          '',
          '— ScriptsXO Prescription Management Platform',
        ].join('\n');

        const result = await snsPublish(c.env, { topicArn, subject, message });

        const deliveryId = newId();
        await c.env.DB.prepare(`
          INSERT INTO sns_deliveries (id, prescription_id, pharmacy_id, channel, sns_message_id, sns_topic_arn, recipient, status, payload, created_at)
          VALUES (?, ?, ?, 'email', ?, ?, ?, ?, ?, ?)
        `).bind(
          deliveryId, id, pharmacyId,
          result?.MessageId ?? null, topicArn, recipient,
          result ? 'sent' : 'failed',
          JSON.stringify({ subject, message }),
          now
        ).run();
      } catch (e) {
        console.error('[send-to-pharmacy] SNS error:', e);
      }
    })()
  );

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
