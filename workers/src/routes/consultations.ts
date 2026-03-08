import { Env } from '../types';
import { requireSession, resolveMember } from '../lib/auth';
import { hasCap, CAP } from '../lib/capabilities';
import { nanoid } from '../lib/nanoid';

export async function handleConsultations(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const session = await requireSession(request, env).catch(() => null);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const member = await resolveMember(session, env);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 401 });

  // GET /api/v1/consultations
  if (method === 'GET' && path === '/api/v1/consultations') {
    if (!hasCap(member, CAP.CONSULT_HISTORY) && !hasCap(member, CAP.CONSULT_JOIN)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status');

    let conditions = ['1=1'];
    const bindings: unknown[] = [];

    if (member.role === 'patient') {
      // Look up patient record by member_id
      const patient = await env.DB.prepare(`SELECT id FROM patients WHERE member_id = ?`)
        .bind(member.id)
        .first<{ id: string }>();
      if (patient) {
        conditions.push('c.patient_id = ?');
        bindings.push(patient.id);
      } else {
        return Response.json({ success: true, data: [], meta: { total: 0, page, limit } });
      }
    } else if (member.role === 'provider') {
      const provider = await env.DB.prepare(`SELECT id FROM providers WHERE member_id = ?`)
        .bind(member.id)
        .first<{ id: string }>();
      if (provider) {
        conditions.push('c.provider_id = ?');
        bindings.push(provider.id);
      }
    }

    if (status) {
      conditions.push('c.status = ?');
      bindings.push(status);
    }

    const where = conditions.join(' AND ');

    const { results } = await env.DB.prepare(
      `SELECT c.*,
              p.email AS patient_email,
              pr.first_name AS provider_first_name, pr.last_name AS provider_last_name
       FROM consultations c
       LEFT JOIN patients p ON p.id = c.patient_id
       LEFT JOIN providers pr ON pr.id = c.provider_id
       WHERE ${where}
       ORDER BY c.scheduled_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...bindings, limit, offset)
      .all();

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM consultations c WHERE ${where}`
    )
      .bind(...bindings)
      .first<{ cnt: number }>();

    return Response.json({
      success: true,
      data: results,
      meta: { total: countResult?.cnt ?? 0, page, limit },
    });
  }

  // GET /api/v1/consultations/:id
  const singleMatch = path.match(/^\/api\/v1\/consultations\/([^/]+)$/);
  if (method === 'GET' && singleMatch) {
    if (!hasCap(member, CAP.CONSULT_HISTORY) && !hasCap(member, CAP.CONSULT_JOIN)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = singleMatch[1];
    const consultation = await env.DB.prepare(
      `SELECT c.*,
              p.email AS patient_email, p.gender AS patient_gender, p.date_of_birth AS patient_dob,
              pr.first_name AS provider_first_name, pr.last_name AS provider_last_name, pr.title AS provider_title
       FROM consultations c
       LEFT JOIN patients p ON p.id = c.patient_id
       LEFT JOIN providers pr ON pr.id = c.provider_id
       WHERE c.id = ?`
    )
      .bind(id)
      .first<Record<string, unknown>>();

    if (!consultation) return Response.json({ error: 'Consultation not found' }, { status: 404 });

    // Verify access
    if (member.role === 'patient') {
      const patient = await env.DB.prepare(`SELECT id FROM patients WHERE member_id = ?`)
        .bind(member.id)
        .first<{ id: string }>();
      if (!patient || consultation.patient_id !== patient.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (member.role === 'provider') {
      const provider = await env.DB.prepare(`SELECT id FROM providers WHERE member_id = ?`)
        .bind(member.id)
        .first<{ id: string }>();
      if (!provider || consultation.provider_id !== provider.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return Response.json({ success: true, data: consultation });
  }

  // POST /api/v1/consultations
  if (method === 'POST' && path === '/api/v1/consultations') {
    if (!hasCap(member, CAP.CONSULT_START) && !hasCap(member, CAP.CONSULT_JOIN)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const required = ['patient_id', 'type', 'scheduled_at', 'cost'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const patient = await env.DB.prepare(`SELECT id, state FROM patients WHERE id = ?`)
      .bind(String(body.patient_id))
      .first<{ id: string; state: string }>();

    if (!patient) return Response.json({ error: 'Patient not found' }, { status: 404 });

    const id = nanoid();
    const now = Date.now();

    await env.DB.prepare(
      `INSERT INTO consultations (
        id, patient_id, provider_id, intake_id, triage_id, type, status,
        scheduled_at, patient_state, cost, payment_status, follow_up_required, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, 'pending', 0, ?, ?)`
    )
      .bind(
        id,
        String(body.patient_id),
        body.provider_id ?? null,
        body.intake_id ?? null,
        body.triage_id ?? null,
        String(body.type),
        Number(body.scheduled_at),
        patient.state,
        Number(body.cost),
        now,
        now
      )
      .run();

    return Response.json({ success: true, data: { id } }, { status: 201 });
  }

  // PATCH /api/v1/consultations/:id
  const patchMatch = path.match(/^\/api\/v1\/consultations\/([^/]+)$/);
  if (method === 'PATCH' && patchMatch) {
    const id = patchMatch[1];
    const consultation = await env.DB.prepare(`SELECT id, provider_id, patient_id FROM consultations WHERE id = ?`)
      .bind(id)
      .first<{ id: string; provider_id: string | null; patient_id: string }>();

    if (!consultation) return Response.json({ error: 'Consultation not found' }, { status: 404 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const updates: string[] = [];
    const vals: unknown[] = [];

    const stringFields = ['status', 'notes', 'diagnosis', 'treatment_plan', 'ai_summary', 'room_url', 'room_token', 'payment_status'];
    const jsonFields = ['diagnosis_codes', 'ai_suggested_questions'];
    const intFields = ['started_at', 'ended_at', 'duration', 'follow_up_date', 'follow_up_required'];

    for (const f of stringFields) {
      if (f in body) { updates.push(`${f} = ?`); vals.push(body[f]); }
    }
    for (const f of jsonFields) {
      if (f in body) {
        updates.push(`${f} = ?`);
        vals.push(typeof body[f] === 'string' ? body[f] : JSON.stringify(body[f]));
      }
    }
    for (const f of intFields) {
      if (f in body) { updates.push(`${f} = ?`); vals.push(Number(body[f])); }
    }

    if (updates.length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });

    updates.push('updated_at = ?');
    vals.push(Date.now());
    vals.push(id);

    await env.DB.prepare(`UPDATE consultations SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();

    return Response.json({ success: true });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
