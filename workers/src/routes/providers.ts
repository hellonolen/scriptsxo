import { Env } from '../types';
import { requireSession, resolveMember } from '../lib/auth';
import { hasCap, CAP } from '../lib/capabilities';
import { nanoid } from '../lib/nanoid';

export async function handleProviders(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const session = await requireSession(request, env).catch(() => null);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const member = await resolveMember(session, env);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 401 });

  // GET /api/v1/providers
  if (method === 'GET' && path === '/api/v1/providers') {
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
    const offset = (page - 1) * limit;
    const state = url.searchParams.get('state');
    const specialty = url.searchParams.get('specialty');

    let conditions = ['1=1'];
    const bindings: unknown[] = [];

    if (state) {
      conditions.push(`p.licensed_states LIKE ?`);
      bindings.push(`%${state}%`);
    }
    if (specialty) {
      conditions.push(`p.specialties LIKE ?`);
      bindings.push(`%${specialty}%`);
    }
    if (url.searchParams.get('accepting') === 'true') {
      conditions.push(`p.accepting_patients = 1`);
    }

    const where = conditions.join(' AND ');
    const { results } = await env.DB.prepare(
      `SELECT p.id, p.first_name, p.last_name, p.title, p.npi_number, p.specialties,
              p.licensed_states, p.accepting_patients, p.consultation_rate,
              p.current_queue_size, p.max_daily_consultations, p.rating,
              p.total_consultations, p.status
       FROM providers p WHERE ${where}
       ORDER BY p.rating DESC LIMIT ? OFFSET ?`
    )
      .bind(...bindings, limit, offset)
      .all();

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM providers p WHERE ${where}`
    )
      .bind(...bindings)
      .first<{ cnt: number }>();

    return Response.json({
      success: true,
      data: results,
      meta: { total: countResult?.cnt ?? 0, page, limit },
    });
  }

  // GET /api/v1/providers/:id
  const singleMatch = path.match(/^\/api\/v1\/providers\/([^/]+)$/);
  if (method === 'GET' && singleMatch) {
    const id = singleMatch[1];
    const provider = await env.DB.prepare(
      `SELECT p.*, m.name, m.avatar FROM providers p JOIN members m ON m.id = p.member_id WHERE p.id = ?`
    )
      .bind(id)
      .first();

    if (!provider) return Response.json({ error: 'Provider not found' }, { status: 404 });

    // Hide sensitive fields from non-admin roles
    if (member.role !== 'admin' && member.isPlatformOwner !== 1) {
      const { dea_number: _, ...safe } = provider as Record<string, unknown>;
      return Response.json({ success: true, data: safe });
    }

    return Response.json({ success: true, data: provider });
  }

  // POST /api/v1/providers
  if (method === 'POST' && path === '/api/v1/providers') {
    if (!hasCap(member, CAP.PROVIDER_MANAGE)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const required = ['email', 'first_name', 'last_name', 'title', 'npi_number'];
    const missing = required.filter(f => !body[f]);
    if (missing.length > 0) {
      return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const existing = await env.DB.prepare(`SELECT id FROM providers WHERE npi_number = ?`)
      .bind(String(body.npi_number))
      .first<{ id: string }>();

    if (existing) {
      return Response.json({ error: 'NPI number already registered' }, { status: 409 });
    }

    // Find or create member for this provider
    let targetMemberId = member.id;
    if (body.member_id) {
      targetMemberId = String(body.member_id);
    }

    const id = nanoid();
    const now = Date.now();

    await env.DB.prepare(
      `INSERT INTO providers (
        id, member_id, email, first_name, last_name, title, npi_number, dea_number,
        specialties, licensed_states, license_numbers, accepting_patients,
        consultation_rate, max_daily_consultations, current_queue_size,
        total_consultations, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'onboarding', ?, ?)`
    )
      .bind(
        id,
        targetMemberId,
        String(body.email).toLowerCase(),
        String(body.first_name),
        String(body.last_name),
        String(body.title),
        String(body.npi_number),
        body.dea_number ?? null,
        JSON.stringify(body.specialties ?? []),
        JSON.stringify(body.licensed_states ?? []),
        body.license_numbers ? JSON.stringify(body.license_numbers) : null,
        body.accepting_patients ? 1 : 0,
        Number(body.consultation_rate ?? 0),
        Number(body.max_daily_consultations ?? 20),
        now,
        now
      )
      .run();

    return Response.json({ success: true, data: { id } }, { status: 201 });
  }

  // PATCH /api/v1/providers/:id
  const patchMatch = path.match(/^\/api\/v1\/providers\/([^/]+)$/);
  if (method === 'PATCH' && patchMatch) {
    const id = patchMatch[1];
    const provider = await env.DB.prepare(`SELECT id, member_id FROM providers WHERE id = ?`)
      .bind(id)
      .first<{ id: string; member_id: string }>();

    if (!provider) return Response.json({ error: 'Provider not found' }, { status: 404 });

    // Providers can update their own record; admins can update any
    const isOwnRecord = provider.member_id === member.id;
    if (!isOwnRecord && !hasCap(member, CAP.PROVIDER_MANAGE)) {
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

    const stringFields = ['dea_number', 'title', 'status'];
    const jsonFields = ['specialties', 'licensed_states', 'license_numbers', 'availability'];
    const intFields = ['accepting_patients', 'consultation_rate', 'max_daily_consultations'];

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

    await env.DB.prepare(`UPDATE providers SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();

    return Response.json({ success: true });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
