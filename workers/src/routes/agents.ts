import { Env } from '../types';
import { requireSession, resolveMember } from '../lib/auth';
import { hasCap, CAP } from '../lib/capabilities';
import { nanoid } from '../lib/nanoid';

function buildTicketId(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const suffix = nanoid(6).toUpperCase();
  return `TKT-${dateStr}-${suffix}`;
}

export async function handleAgents(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const session = await requireSession(request, env).catch(() => null);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const member = await resolveMember(session, env);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 401 });

  if (!hasCap(member, CAP.AGENTS_VIEW)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // GET /api/v1/agents/tickets
  if (method === 'GET' && path === '/api/v1/agents/tickets') {
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status');
    const agent = url.searchParams.get('agent');
    const type = url.searchParams.get('type');

    const conditions: string[] = [];
    const bindings: unknown[] = [];

    if (status) { conditions.push('status = ?'); bindings.push(status); }
    if (agent) { conditions.push('assigned_agent = ?'); bindings.push(agent); }
    if (type) { conditions.push('type = ?'); bindings.push(type); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { results } = await env.DB.prepare(
      `SELECT id, ticket_id, type, status, priority, assigned_agent,
              patient_email, consultation_id, intake_id,
              tokens_used, started_at, completed_at, created_at, error
       FROM agent_tickets ${where}
       ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...bindings, limit, offset)
      .all();

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM agent_tickets ${where}`
    )
      .bind(...bindings)
      .first<{ cnt: number }>();

    return Response.json({
      success: true,
      data: results,
      meta: { total: countResult?.cnt ?? 0, page, limit },
    });
  }

  // POST /api/v1/agents/tickets
  if (method === 'POST' && path === '/api/v1/agents/tickets') {
    if (!hasCap(member, CAP.AGENTS_MANAGE)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const required = ['type', 'assigned_agent', 'input'];
    const missing = required.filter(f => body[f] === undefined || body[f] === null);
    if (missing.length > 0) {
      return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const id = nanoid();
    const ticketId = buildTicketId();
    const now = Date.now();

    await env.DB.prepare(
      `INSERT INTO agent_tickets (
        id, ticket_id, type, status, priority, assigned_agent,
        patient_email, consultation_id, intake_id,
        input, created_at
      ) VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        ticketId,
        String(body.type),
        Number(body.priority ?? 5),
        String(body.assigned_agent),
        body.patient_email ?? null,
        body.consultation_id ?? null,
        body.intake_id ?? null,
        typeof body.input === 'string' ? body.input : JSON.stringify(body.input),
        now
      )
      .run();

    return Response.json({ success: true, data: { id, ticketId } }, { status: 201 });
  }

  // PATCH /api/v1/agents/tickets/:id
  const patchMatch = path.match(/^\/api\/v1\/agents\/tickets\/([^/]+)$/);
  if (method === 'PATCH' && patchMatch) {
    if (!hasCap(member, CAP.AGENTS_MANAGE)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = patchMatch[1];
    const ticket = await env.DB.prepare(`SELECT id FROM agent_tickets WHERE id = ?`)
      .bind(id)
      .first<{ id: string }>();

    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const updates: string[] = [];
    const vals: unknown[] = [];

    const stringFields = ['status', 'error'];
    const jsonFields = ['output'];
    const intFields = ['tokens_used', 'started_at', 'completed_at', 'priority'];

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

    vals.push(id);

    await env.DB.prepare(`UPDATE agent_tickets SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();

    return Response.json({ success: true });
  }

  // GET /api/v1/agents/budgets
  if (method === 'GET' && path === '/api/v1/agents/budgets') {
    const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

    const { results } = await env.DB.prepare(
      `SELECT ab.*, ar.title, ar.department
       FROM agent_budgets ab
       LEFT JOIN agent_roles ar ON ar.agent_name = ab.agent_name
       WHERE ab.month = ?
       ORDER BY ab.agent_name`
    )
      .bind(month)
      .all();

    return Response.json({ success: true, data: results });
  }

  // GET /api/v1/agents/roles
  if (method === 'GET' && path === '/api/v1/agents/roles') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM agent_roles ORDER BY department, agent_name`
    ).all();

    return Response.json({ success: true, data: results });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
