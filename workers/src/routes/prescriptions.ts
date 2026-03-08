import { Env } from '../types';
import { requireSession, resolveMember } from '../lib/auth';
import { hasCap, CAP } from '../lib/capabilities';
import { nanoid } from '../lib/nanoid';

export async function handlePrescriptions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const session = await requireSession(request, env).catch(() => null);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const member = await resolveMember(session, env);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 401 });

  if (!hasCap(member, CAP.RX_VIEW)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // GET /api/v1/prescriptions
  if (method === 'GET' && path === '/api/v1/prescriptions') {
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status');

    let conditions = ['1=1'];
    const bindings: unknown[] = [];

    if (member.role === 'patient') {
      const patient = await env.DB.prepare(`SELECT id FROM patients WHERE member_id = ?`)
        .bind(member.id)
        .first<{ id: string }>();
      if (!patient) return Response.json({ success: true, data: [], meta: { total: 0, page, limit } });
      conditions.push('rx.patient_id = ?');
      bindings.push(patient.id);
    } else if (member.role === 'provider') {
      const provider = await env.DB.prepare(`SELECT id FROM providers WHERE member_id = ?`)
        .bind(member.id)
        .first<{ id: string }>();
      if (provider) {
        conditions.push('rx.provider_id = ?');
        bindings.push(provider.id);
      }
    } else if (member.role === 'pharmacy') {
      const filterPharmacy = url.searchParams.get('pharmacy_id');
      if (filterPharmacy) {
        conditions.push('rx.pharmacy_id = ?');
        bindings.push(filterPharmacy);
      }
    }

    if (status) {
      conditions.push('rx.status = ?');
      bindings.push(status);
    }

    const where = conditions.join(' AND ');

    const { results } = await env.DB.prepare(
      `SELECT rx.*,
              p.email AS patient_email,
              pr.first_name AS provider_first_name, pr.last_name AS provider_last_name
       FROM prescriptions rx
       LEFT JOIN patients p ON p.id = rx.patient_id
       LEFT JOIN providers pr ON pr.id = rx.provider_id
       WHERE ${where}
       ORDER BY rx.created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...bindings, limit, offset)
      .all();

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM prescriptions rx WHERE ${where}`
    )
      .bind(...bindings)
      .first<{ cnt: number }>();

    return Response.json({
      success: true,
      data: results,
      meta: { total: countResult?.cnt ?? 0, page, limit },
    });
  }

  // GET /api/v1/prescriptions/:id
  const singleMatch = path.match(/^\/api\/v1\/prescriptions\/([^/]+)$/);
  if (method === 'GET' && singleMatch) {
    const id = singleMatch[1];
    const rx = await env.DB.prepare(
      `SELECT rx.*,
              p.email AS patient_email,
              pr.first_name AS provider_first_name, pr.last_name AS provider_last_name
       FROM prescriptions rx
       LEFT JOIN patients p ON p.id = rx.patient_id
       LEFT JOIN providers pr ON pr.id = rx.provider_id
       WHERE rx.id = ?`
    )
      .bind(id)
      .first<Record<string, unknown>>();

    if (!rx) return Response.json({ error: 'Prescription not found' }, { status: 404 });

    if (member.role === 'patient') {
      const patient = await env.DB.prepare(`SELECT id FROM patients WHERE member_id = ?`)
        .bind(member.id)
        .first<{ id: string }>();
      if (!patient || rx.patient_id !== patient.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return Response.json({ success: true, data: rx });
  }

  // POST /api/v1/prescriptions
  if (method === 'POST' && path === '/api/v1/prescriptions') {
    if (!hasCap(member, CAP.RX_WRITE)) {
      return Response.json({ error: 'Forbidden: requires rx:write' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const required = ['consultation_id', 'patient_id', 'provider_id', 'medication_name',
      'dosage', 'form', 'quantity', 'days_supply', 'refills_authorized', 'directions', 'expires_at'];
    const missing = required.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
    if (missing.length > 0) {
      return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const id = nanoid();
    const now = Date.now();

    await env.DB.prepare(
      `INSERT INTO prescriptions (
        id, consultation_id, patient_id, provider_id, pharmacy_id,
        medication_name, generic_name, ndc, dosage, form,
        quantity, days_supply, refills_authorized, refills_used,
        directions, dea_schedule, status, expires_at,
        prior_auth_required, drug_interactions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        String(body.consultation_id),
        String(body.patient_id),
        String(body.provider_id),
        body.pharmacy_id ?? null,
        String(body.medication_name),
        body.generic_name ?? null,
        body.ndc ?? null,
        String(body.dosage),
        String(body.form),
        Number(body.quantity),
        Number(body.days_supply),
        Number(body.refills_authorized),
        String(body.directions),
        body.dea_schedule ?? null,
        Number(body.expires_at),
        body.prior_auth_required ? 1 : 0,
        body.drug_interactions ? JSON.stringify(body.drug_interactions) : null,
        now,
        now
      )
      .run();

    return Response.json({ success: true, data: { id } }, { status: 201 });
  }

  // PATCH /api/v1/prescriptions/:id/status
  const statusMatch = path.match(/^\/api\/v1\/prescriptions\/([^/]+)\/status$/);
  if (method === 'PATCH' && statusMatch) {
    if (!hasCap(member, CAP.RX_SIGN) && !hasCap(member, CAP.PHARMACY_FILL)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = statusMatch[1];
    const rx = await env.DB.prepare(`SELECT id FROM prescriptions WHERE id = ?`)
      .bind(id)
      .first<{ id: string }>();

    if (!rx) return Response.json({ error: 'Prescription not found' }, { status: 404 });

    let body: { status: string; pharmacy_id?: string; sent_to_pharmacy_at?: number; filled_at?: number; prior_auth_status?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.status) return Response.json({ error: 'status required' }, { status: 400 });

    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const vals: unknown[] = [body.status, Date.now()];

    if (body.pharmacy_id) { updates.push('pharmacy_id = ?'); vals.push(body.pharmacy_id); }
    if (body.sent_to_pharmacy_at) { updates.push('sent_to_pharmacy_at = ?'); vals.push(body.sent_to_pharmacy_at); }
    if (body.filled_at) { updates.push('filled_at = ?'); vals.push(body.filled_at); }
    if (body.prior_auth_status) { updates.push('prior_auth_status = ?'); vals.push(body.prior_auth_status); }

    vals.push(id);

    await env.DB.prepare(`UPDATE prescriptions SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();

    return Response.json({ success: true });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
