import { Env } from '../types';
import { requireSession, resolveMember } from '../lib/auth';
import { hasCap, CAP } from '../lib/capabilities';
import { nanoid } from '../lib/nanoid';

export async function handleVideoReviews(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const session = await requireSession(request, env).catch(() => null);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const member = await resolveMember(session, env);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 401 });

  // GET /api/v1/video-reviews
  if (method === 'GET' && path === '/api/v1/video-reviews') {
    if (!hasCap(member, CAP.INTAKE_REVIEW) && !hasCap(member, CAP.CONSULT_HISTORY)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
    const offset = (page - 1) * limit;
    const agentStatus = url.searchParams.get('agent_status') ?? 'pending_review';

    const { results } = await env.DB.prepare(
      `SELECT vr.*,
              p.email AS patient_email,
              c.type AS consultation_type, c.scheduled_at
       FROM video_reviews vr
       LEFT JOIN patients p ON p.id = vr.patient_id
       LEFT JOIN consultations c ON c.id = vr.consultation_id
       WHERE vr.agent_status = ?
       ORDER BY c.scheduled_at ASC LIMIT ? OFFSET ?`
    )
      .bind(agentStatus, limit, offset)
      .all();

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM video_reviews WHERE agent_status = ?`
    )
      .bind(agentStatus)
      .first<{ cnt: number }>();

    return Response.json({
      success: true,
      data: results,
      meta: { total: countResult?.cnt ?? 0, page, limit },
    });
  }

  // GET /api/v1/video-reviews/:id
  const singleMatch = path.match(/^\/api\/v1\/video-reviews\/([^/]+)$/);
  if (method === 'GET' && singleMatch) {
    if (!hasCap(member, CAP.INTAKE_REVIEW) && !hasCap(member, CAP.CONSULT_HISTORY)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = singleMatch[1];
    const review = await env.DB.prepare(
      `SELECT vr.*,
              p.email AS patient_email, p.date_of_birth, p.gender, p.allergies, p.medical_conditions,
              c.type AS consultation_type, c.scheduled_at, c.notes AS consultation_notes
       FROM video_reviews vr
       LEFT JOIN patients p ON p.id = vr.patient_id
       LEFT JOIN consultations c ON c.id = vr.consultation_id
       WHERE vr.id = ?`
    )
      .bind(id)
      .first();

    if (!review) return Response.json({ error: 'Video review not found' }, { status: 404 });
    return Response.json({ success: true, data: review });
  }

  // POST /api/v1/video-reviews
  if (method === 'POST' && path === '/api/v1/video-reviews') {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const required = ['consultation_id', 'patient_id', 'transcript', 'summary',
      'chief_complaint', 'recommended_action', 'recommendation_reason', 'urgency_level', 'confidence'];
    const missing = required.filter(f => body[f] === undefined || body[f] === null);
    if (missing.length > 0) {
      return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const id = nanoid();

    await env.DB.prepare(
      `INSERT INTO video_reviews (
        id, consultation_id, patient_id, transcript, summary, chief_complaint,
        requested_medications, red_flags, contraindications,
        recommended_action, recommendation_reason, urgency_level, confidence, agent_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')`
    )
      .bind(
        id,
        String(body.consultation_id),
        String(body.patient_id),
        String(body.transcript),
        String(body.summary),
        String(body.chief_complaint),
        JSON.stringify(body.requested_medications ?? []),
        JSON.stringify(body.red_flags ?? []),
        JSON.stringify(body.contraindications ?? []),
        String(body.recommended_action),
        String(body.recommendation_reason),
        Number(body.urgency_level),
        Number(body.confidence)
      )
      .run();

    return Response.json({ success: true, data: { id } }, { status: 201 });
  }

  // POST /api/v1/video-reviews/:id/decide
  const decideMatch = path.match(/^\/api\/v1\/video-reviews\/([^/]+)\/decide$/);
  if (method === 'POST' && decideMatch) {
    if (!hasCap(member, CAP.RX_SIGN) && !hasCap(member, CAP.INTAKE_REVIEW)) {
      return Response.json({ error: 'Forbidden: provider role required' }, { status: 403 });
    }

    const id = decideMatch[1];
    const review = await env.DB.prepare(`SELECT id FROM video_reviews WHERE id = ?`)
      .bind(id)
      .first<{ id: string }>();

    if (!review) return Response.json({ error: 'Video review not found' }, { status: 404 });

    let body: { decision: string; notes?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const validDecisions = ['approved', 'rejected', 'needs_followup'];
    if (!body.decision || !validDecisions.includes(body.decision)) {
      return Response.json({
        error: `decision must be one of: ${validDecisions.join(', ')}`,
      }, { status: 400 });
    }

    await env.DB.prepare(
      `UPDATE video_reviews SET
        provider_decision = ?, provider_notes = ?, provider_email = ?,
        agent_status = 'reviewed', decided_at = ?
       WHERE id = ?`
    )
      .bind(body.decision, body.notes ?? null, session.email, Date.now(), id)
      .run();

    return Response.json({ success: true });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
