import { Hono } from 'hono';
import { requireCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';
import { newId } from '../lib/id';
import { snsPublish, snsCreateTopic } from '../lib/sns';

const app = new Hono<{ Bindings: Env }>();

function buildPrescriptionMessage(rx: Record<string, unknown>, prescriptionId: string, now: number): string {
  const providerName = `${rx.title ?? 'Dr.'} ${rx.provider_first} ${rx.provider_last}`;
  const patientName = `${rx.patient_first} ${rx.patient_last}`;

  return [
    'PRESCRIPTION NOTIFICATION — ScriptsXO',
    '',
    `Prescription ID: ${prescriptionId}`,
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
}

// Send prescription notification to pharmacy via SNS
app.post('/send-prescription', async (c) => {
  await requireCap(c, CAP.RX_WRITE);

  const { prescriptionId, pharmacyId, channel = 'email' } = await c.req.json<{
    prescriptionId: string;
    pharmacyId: string;
    channel?: 'email' | 'sms';
  }>();

  const rx = await c.env.DB.prepare(`
    SELECT p.*, pt.email as patient_email, pt.first_name as patient_first, pt.last_name as patient_last,
           pr.first_name as provider_first, pr.last_name as provider_last, pr.npi_number, pr.title,
           ph.name as pharmacy_name, ph.email as pharmacy_email, ph.fax as pharmacy_fax,
           ph.notification_email, ph.notification_phone, ph.sns_topic_arn
    FROM prescriptions p
    LEFT JOIN patients pt ON p.patient_id = pt.id
    LEFT JOIN providers pr ON p.provider_id = pr.id
    LEFT JOIN pharmacies ph ON ph.id = ?
    WHERE p.id = ?
  `).bind(pharmacyId, prescriptionId).first<Record<string, unknown>>();

  if (!rx) return err('Prescription not found', 404);

  const deliveryId = newId();
  const now = Date.now();

  const patientName = `${rx.patient_first} ${rx.patient_last}`;
  const providerName = `${rx.title ?? 'Dr.'} ${rx.provider_first} ${rx.provider_last}`;
  const subject = `New Prescription: ${rx.medication_name} for ${patientName}`;
  const message = buildPrescriptionMessage(rx, prescriptionId, now);

  let snsMessageId: string | null = null;
  let topicArn = rx.sns_topic_arn as string | null;
  const recipient = channel === 'sms'
    ? (rx.notification_phone as string | null)
    : ((rx.notification_email ?? rx.pharmacy_email) as string | null);

  try {
    if (channel === 'sms' && rx.notification_phone) {
      const result = await snsPublish(c.env, {
        phoneNumber: rx.notification_phone as string,
        message: `ScriptsXO Rx: ${rx.medication_name} for ${patientName}. Provider: ${providerName}. NPI: ${rx.npi_number}. Rx ID: ${prescriptionId}`,
      });
      snsMessageId = result?.MessageId ?? null;
    } else if (recipient) {
      if (!topicArn) {
        const safeName = pharmacyId.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 50);
        const topicName = `scriptsxo-pharmacy-${safeName}`;
        topicArn = await snsCreateTopic(c.env, topicName);
        if (topicArn) {
          await c.env.DB.prepare('UPDATE pharmacies SET sns_topic_arn = ? WHERE id = ?')
            .bind(topicArn, pharmacyId).run();
        }
      }

      if (topicArn) {
        const result = await snsPublish(c.env, { topicArn, subject, message });
        snsMessageId = result?.MessageId ?? null;
      }
    }
  } catch (e) {
    console.error('[SNS route] publish error:', e);
  }

  await c.env.DB.prepare(`
    INSERT INTO sns_deliveries (id, prescription_id, pharmacy_id, channel, sns_message_id, sns_topic_arn, recipient, status, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    deliveryId, prescriptionId, pharmacyId, channel,
    snsMessageId, topicArn ?? null, recipient ?? null,
    snsMessageId ? 'sent' : 'failed',
    JSON.stringify({ subject, message }),
    now
  ).run();

  await c.env.DB.prepare('UPDATE prescriptions SET status = ?, sent_to_pharmacy_at = ?, updated_at = ? WHERE id = ?')
    .bind('sent', now, now, prescriptionId).run();

  return ok({
    deliveryId,
    snsMessageId,
    status: snsMessageId ? 'sent' : 'failed',
    channel,
    recipient: recipient ?? null,
  });
});

// Delivery history for a prescription
app.get('/deliveries/:prescriptionId', async (c) => {
  await requireCap(c, CAP.RX_READ);
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM sns_deliveries WHERE prescription_id = ? ORDER BY created_at DESC
  `).bind(c.req.param('prescriptionId')).all();
  return ok(results ?? []);
});

// Admin: all recent deliveries
app.get('/deliveries', async (c) => {
  await requireCap(c, CAP.ADMIN_READ);
  const { results } = await c.env.DB.prepare(`
    SELECT d.*, p.medication_name, p.dosage, ph.name as pharmacy_name
    FROM sns_deliveries d
    LEFT JOIN prescriptions p ON d.prescription_id = p.id
    LEFT JOIN pharmacies ph ON d.pharmacy_id = ph.id
    ORDER BY d.created_at DESC
    LIMIT 100
  `).all();
  return ok(results ?? []);
});

// Subscribe a pharmacy email to their SNS topic (creates topic on first send)
app.post('/subscribe-pharmacy', async (c) => {
  await requireCap(c, CAP.ADMIN_WRITE);
  const { pharmacyId, email } = await c.req.json<{ pharmacyId: string; email: string }>();

  const pharmacy = await c.env.DB.prepare('SELECT * FROM pharmacies WHERE id = ?').bind(pharmacyId).first();
  if (!pharmacy) return err('Pharmacy not found', 404);

  await c.env.DB.prepare('UPDATE pharmacies SET notification_email = ? WHERE id = ?')
    .bind(email, pharmacyId).run();

  return ok({
    success: true,
    message: 'Pharmacy notification email updated. SNS topic will be created on first prescription send.',
  });
});

// SNS delivery receipt webhook
app.post('/delivery-receipt', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const messageId = body.MessageId as string | undefined;
  const deliveryStatus = (body.notification as Record<string, unknown> | undefined)?.deliveryStatus as string | undefined;

  if (messageId && deliveryStatus) {
    await c.env.DB.prepare(`
      UPDATE sns_deliveries SET status = ?, delivered_at = ? WHERE sns_message_id = ?
    `).bind(
      deliveryStatus === 'SUCCESS' ? 'delivered' : 'failed',
      Date.now(),
      messageId
    ).run();
  }

  return c.text('OK', 200);
});

export default app;
