import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireAnyCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

const VALID_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'cancelled'] as const;

app.post('/', async (c) => {
  await requireAnyCap(c, [CAP.BILLING_WRITE, CAP.ADMIN_WRITE]);
  const body = await c.req.json<Record<string, unknown>>();
  const now = Date.now();
  const id = newId();

  await c.env.DB.prepare(`
    INSERT INTO billing_records (
      id, patient_id, consultation_id, prescription_id,
      amount_cents, currency, description, status,
      stripe_payment_intent_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).bind(
    id,
    body.patientId,
    body.consultationId ?? null,
    body.prescriptionId ?? null,
    body.amountCents,
    body.currency ?? 'usd',
    body.description ?? null,
    body.stripePaymentIntentId ?? null,
    now,
    now
  ).run();

  return ok({ id });
});

app.get('/by-patient/:patientId', async (c) => {
  await requireAnyCap(c, [CAP.BILLING_READ, CAP.ADMIN_READ]);
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM billing_records
    WHERE patient_id = ?
    ORDER BY created_at DESC
  `).bind(c.req.param('patientId')).all();

  return ok(results ?? []);
});

app.patch('/:id/status', async (c) => {
  await requireAnyCap(c, [CAP.BILLING_WRITE, CAP.ADMIN_WRITE]);
  const { status } = await c.req.json<{ status: string }>();
  if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return err(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM billing_records WHERE id = ?')
    .bind(c.req.param('id')).first();
  if (!existing) return err('Not found', 404);

  await c.env.DB.prepare('UPDATE billing_records SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, Date.now(), c.req.param('id')).run();

  return ok({ success: true });
});

// Stripe webhook — no auth header, verify via Stripe signature
app.post('/webhook/stripe', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const eventType = body.type as string | undefined;

  if (eventType === 'payment_intent.succeeded') {
    const pi = (body.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
    if (pi?.id) {
      await c.env.DB.prepare(`
        UPDATE billing_records SET status = 'paid', updated_at = ? WHERE stripe_payment_intent_id = ?
      `).bind(Date.now(), pi.id).run();
    }
  } else if (eventType === 'payment_intent.payment_failed') {
    const pi = (body.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
    if (pi?.id) {
      await c.env.DB.prepare(`
        UPDATE billing_records SET status = 'failed', updated_at = ? WHERE stripe_payment_intent_id = ?
      `).bind(Date.now(), pi.id).run();
    }
  } else if (eventType === 'charge.refunded') {
    const charge = (body.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;
    const piId = charge?.payment_intent as string | undefined;
    if (piId) {
      await c.env.DB.prepare(`
        UPDATE billing_records SET status = 'refunded', updated_at = ? WHERE stripe_payment_intent_id = ?
      `).bind(Date.now(), piId).run();
    }
  }

  return ok({ received: true });
});

export default app;
