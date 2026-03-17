import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

// POST /erx/transmit — initiate eRx transmission (Surescripts mock)
app.post('/transmit', async (c) => {
  await requireCap(c, CAP.RX_WRITE);
  const body = await c.req.json<{ prescriptionId: string; pharmacyNpi?: string; pharmacyNcpdp?: string }>();

  const rx = await c.env.DB.prepare('SELECT * FROM prescriptions WHERE id = ?')
    .bind(body.prescriptionId).first<Record<string, unknown>>();
  if (!rx) return err('Prescription not found', 404);
  if (rx.status !== 'signed') return err('Prescription must be signed before transmitting', 400);

  // Generate a mock transaction ID (real: Surescripts NCPDP SCRIPT transaction)
  const transactionId = `SXO-${Date.now().toString(36).toUpperCase()}`;
  const now = Date.now();

  // Update prescription status to 'sent'
  await c.env.DB.prepare(`
    UPDATE prescriptions SET status = 'sent', erx_transaction_id = ?, erx_sent_at = ?, updated_at = ? WHERE id = ?
  `).bind(transactionId, now, now, body.prescriptionId).run();

  // Log to audit (best effort)
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, event_type, entity_type, entity_id, payload, success, created_at)
    VALUES (?, 'prescription.sent', 'prescription', ?, ?, 1, ?)
  `).bind(newId(), body.prescriptionId, JSON.stringify({ transactionId, pharmacyNpi: body.pharmacyNpi }), now)
    .run()
    .catch(() => {});

  return ok({ success: true, transactionId, status: 'transmitted' });
});

// POST /erx/status-update — pharmacy status callback (sent/received/changed/canceled/rejected)
app.post('/status-update', async (c) => {
  const body = await c.req.json<{
    transactionId: string;
    status: 'received' | 'changed' | 'canceled' | 'refill_requested' | 'rejected' | 'out_of_stock';
    pharmacyNote?: string;
  }>();

  const rx = await c.env.DB.prepare('SELECT id FROM prescriptions WHERE erx_transaction_id = ?')
    .bind(body.transactionId).first<{ id: string }>();
  if (!rx) return err('Transaction not found', 404);

  const rxStatus = body.status === 'received' ? 'at_pharmacy'
    : body.status === 'canceled' ? 'cancelled'
    : body.status === 'rejected' || body.status === 'out_of_stock' ? 'pharmacy_exception'
    : 'at_pharmacy';

  await c.env.DB.prepare('UPDATE prescriptions SET status = ?, erx_pharmacy_status = ?, updated_at = ? WHERE id = ?')
    .bind(rxStatus, body.status, Date.now(), rx.id).run();

  return ok({ success: true });
});

// GET /erx/exceptions — admin: prescriptions with pharmacy exceptions
app.get('/exceptions', async (c) => {
  await requireCap(c, CAP.ADMIN_READ);
  const { results } = await c.env.DB.prepare(`
    SELECT rx.*, p.email as patient_email, m.name as patient_name, ph.name as pharmacy_name
    FROM prescriptions rx
    LEFT JOIN patients p ON rx.patient_id = p.id
    LEFT JOIN members m ON p.member_id = m.id
    LEFT JOIN pharmacies ph ON rx.pharmacy_id = ph.id
    WHERE rx.status = 'pharmacy_exception' OR rx.erx_pharmacy_status IN ('rejected', 'out_of_stock', 'canceled')
    ORDER BY rx.updated_at DESC LIMIT 100
  `).all();
  return ok(results ?? []);
});

export default app;
