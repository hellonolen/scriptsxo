import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

// Trigger fax to pharmacy via VPS (Asterisk + SpanDSP)
app.post('/send', async (c) => {
  await requireCap(c, CAP.FAX_SEND);
  const { prescriptionId, pharmacyId, faxNumber, pdfR2Key } =
    await c.req.json<{ prescriptionId: string; pharmacyId: string; faxNumber: string; pdfR2Key: string }>();

  const db = c.env.DB;
  const logId = newId();
  const now = Date.now();

  // Create fax log entry
  await db.prepare(`
    INSERT INTO fax_logs (id, prescription_id, pharmacy_id, fax_number, status, pdf_r2_key, attempts, created_at)
    VALUES (?, ?, ?, ?, 'queued', ?, 0, ?)
  `).bind(logId, prescriptionId, pharmacyId, faxNumber, pdfR2Key, now).run();

  // Trigger VPS fax endpoint
  const vpsUrl = c.env.VPS_FAX_URL ?? 'http://144.202.25.33:8088/fax/send';
  const vpsSecret = c.env.VPS_FAX_SECRET ?? '';

  try {
    const vpsRes = await fetch(vpsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fax-Secret': vpsSecret,
      },
      body: JSON.stringify({
        faxLogId: logId,
        prescriptionId,
        faxNumber: faxNumber.replace(/\D/g, ''),
        pdfR2Key,
      }),
    });

    if (vpsRes.ok) {
      const { jobId } = await vpsRes.json() as { jobId?: string };
      await db.prepare('UPDATE fax_logs SET status = ?, phaxio_fax_id = ?, attempts = 1, sent_at = ? WHERE id = ?')
        .bind('sending', jobId ?? null, now, logId).run();
      return ok({ success: true, faxLogId: logId, jobId });
    } else {
      const errorText = await vpsRes.text();
      await db.prepare('UPDATE fax_logs SET status = ?, error_message = ? WHERE id = ?')
        .bind('failed', errorText.slice(0, 500), logId).run();
      return ok({ success: false, faxLogId: logId, error: 'VPS fax trigger failed' });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    await db.prepare('UPDATE fax_logs SET status = ?, error_message = ? WHERE id = ?')
      .bind('failed', msg, logId).run();
    return ok({ success: false, faxLogId: logId, error: msg });
  }
});

// VPS callback — updates fax status
app.post('/callback', async (c) => {
  const { faxLogId, status, pages, error } =
    await c.req.json<{ faxLogId: string; status: string; pages?: number; error?: string }>();

  const sets: string[] = ['status = ?', 'attempts = attempts + 1'];
  const vals: unknown[] = [status];

  if (pages !== undefined) { sets.push('pages = ?'); vals.push(pages); }
  if (error)   { sets.push('error_message = ?'); vals.push(error); }
  if (status === 'sent') { sets.push('sent_at = ?'); vals.push(Date.now()); }
  if (status === 'confirmed') { sets.push('confirmed_at = ?'); vals.push(Date.now()); }
  vals.push(faxLogId);

  await c.env.DB.prepare(`UPDATE fax_logs SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return ok({ success: true });
});

app.get('/by-prescription/:prescriptionId', async (c) => {
  await requireCap(c, CAP.FAX_SEND);
  const { results } = await c.env.DB.prepare('SELECT * FROM fax_logs WHERE prescription_id = ? ORDER BY created_at DESC')
    .bind(c.req.param('prescriptionId')).all();
  return ok(results ?? []);
});

app.get('/:id', async (c) => {
  await requireCap(c, CAP.FAX_SEND);
  const log = await c.env.DB.prepare('SELECT * FROM fax_logs WHERE id = ?').bind(c.req.param('id')).first();
  if (!log) return err('Not found', 404);
  return ok(log);
});

export default app;
