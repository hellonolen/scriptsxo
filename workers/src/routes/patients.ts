import { Env } from '../types';
import { requireSession, resolveMember } from '../lib/auth';
import { hasCap, CAP } from '../lib/capabilities';
import { nanoid } from '../lib/nanoid';

export async function handlePatients(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const session = await requireSession(request, env).catch(() => null);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const member = await resolveMember(session, env);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 401 });

  // GET /api/v1/patients
  if (method === 'GET' && path === '/api/v1/patients') {
    if (!hasCap(member, CAP.PATIENT_VIEW) && member.role !== 'patient') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
    const offset = (page - 1) * limit;
    const state = url.searchParams.get('state');

    let query: string;
    let bindings: unknown[];

    if (member.role === 'patient') {
      // Patients only see their own record
      query = `SELECT p.*, m.name FROM patients p JOIN members m ON m.id = p.member_id
               WHERE p.member_id = ? LIMIT ? OFFSET ?`;
      bindings = [member.id, limit, offset];
    } else if (state) {
      query = `SELECT p.*, m.name FROM patients p JOIN members m ON m.id = p.member_id
               WHERE p.state = ? LIMIT ? OFFSET ?`;
      bindings = [state, limit, offset];
    } else {
      query = `SELECT p.*, m.name FROM patients p JOIN members m ON m.id = p.member_id
               LIMIT ? OFFSET ?`;
      bindings = [limit, offset];
    }

    const stmt = env.DB.prepare(query);
    const { results } = await stmt.bind(...bindings).all();

    const countResult = await env.DB.prepare(
      member.role === 'patient'
        ? `SELECT COUNT(*) as cnt FROM patients WHERE member_id = ?`
        : state
        ? `SELECT COUNT(*) as cnt FROM patients WHERE state = ?`
        : `SELECT COUNT(*) as cnt FROM patients`
    )
      .bind(...(member.role === 'patient' ? [member.id] : state ? [state] : []))
      .first<{ cnt: number }>();

    return Response.json({
      success: true,
      data: results,
      meta: { total: countResult?.cnt ?? 0, page, limit },
    });
  }

  // GET /api/v1/patients/:id
  const singleMatch = path.match(/^\/api\/v1\/patients\/([^/]+)$/);
  if (method === 'GET' && singleMatch) {
    const id = singleMatch[1];
    const patient = await env.DB.prepare(
      `SELECT p.*, m.name FROM patients p JOIN members m ON m.id = p.member_id WHERE p.id = ?`
    )
      .bind(id)
      .first();

    if (!patient) return Response.json({ error: 'Patient not found' }, { status: 404 });

    // Patients can only view their own
    if (member.role === 'patient' && (patient as { member_id: string }).member_id !== member.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!hasCap(member, CAP.PATIENT_VIEW) && member.role !== 'patient') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return Response.json({ success: true, data: patient });
  }

  // POST /api/v1/patients
  if (method === 'POST' && path === '/api/v1/patients') {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const required = ['email', 'date_of_birth', 'gender', 'address', 'state'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const id = nanoid();
    const now = Date.now();

    await env.DB.prepare(
      `INSERT INTO patients (
        id, member_id, email, date_of_birth, gender, address,
        insurance_provider, insurance_policy_number, insurance_group_number,
        primary_pharmacy, allergies, current_medications, medical_conditions,
        emergency_contact, id_verification_status, state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
    )
      .bind(
        id,
        member.id,
        String(body.email).toLowerCase(),
        String(body.date_of_birth),
        String(body.gender),
        typeof body.address === 'string' ? body.address : JSON.stringify(body.address),
        body.insurance_provider ?? null,
        body.insurance_policy_number ?? null,
        body.insurance_group_number ?? null,
        body.primary_pharmacy ?? null,
        JSON.stringify(body.allergies ?? []),
        JSON.stringify(body.current_medications ?? []),
        JSON.stringify(body.medical_conditions ?? []),
        body.emergency_contact ? JSON.stringify(body.emergency_contact) : null,
        String(body.state),
        now,
        now
      )
      .run();

    return Response.json({ success: true, data: { id } }, { status: 201 });
  }

  // PATCH /api/v1/patients/:id
  const patchMatch = path.match(/^\/api\/v1\/patients\/([^/]+)$/);
  if (method === 'PATCH' && patchMatch) {
    if (!hasCap(member, CAP.PATIENT_MANAGE) && member.role !== 'patient') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = patchMatch[1];
    const patient = await env.DB.prepare(`SELECT id, member_id FROM patients WHERE id = ?`)
      .bind(id)
      .first<{ id: string; member_id: string }>();

    if (!patient) return Response.json({ error: 'Patient not found' }, { status: 404 });

    if (member.role === 'patient' && patient.member_id !== member.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const updates: string[] = [];
    const vals: unknown[] = [];

    const stringFields = ['email', 'date_of_birth', 'gender', 'state',
      'insurance_provider', 'insurance_policy_number', 'insurance_group_number', 'primary_pharmacy'];
    const jsonFields = ['address', 'allergies', 'current_medications', 'medical_conditions', 'emergency_contact'];

    for (const f of stringFields) {
      if (f in body) { updates.push(`${f} = ?`); vals.push(body[f]); }
    }
    for (const f of jsonFields) {
      if (f in body) {
        updates.push(`${f} = ?`);
        vals.push(typeof body[f] === 'string' ? body[f] : JSON.stringify(body[f]));
      }
    }

    if (updates.length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });

    updates.push('updated_at = ?');
    vals.push(Date.now());
    vals.push(id);

    await env.DB.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();

    return Response.json({ success: true });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
