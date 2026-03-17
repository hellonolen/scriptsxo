import { Hono } from 'hono';
import { requireAuth, err, ok, type Env } from '../lib/auth';
import { runAgent, agentChat } from '../lib/agents';

const app = new Hono<{ Bindings: Env }>();

// GET /agents/runs — list recent runs (last 50), filterable by ?entity_id=
app.get('/runs', async (c) => {
  await requireAuth(c);
  const entityId = c.req.query('entity_id');

  let query: string;
  let rows: { results: unknown[] };

  if (entityId) {
    query = `SELECT * FROM agent_runs WHERE entity_id = ? ORDER BY created_at DESC LIMIT 50`;
    rows = await c.env.DB.prepare(query).bind(entityId).all();
  } else {
    query = `SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT 50`;
    rows = await c.env.DB.prepare(query).all();
  }

  return ok(rows.results ?? []);
});

// GET /agents/runs/:id — get single run
app.get('/runs/:id', async (c) => {
  await requireAuth(c);
  const row = await c.env.DB.prepare('SELECT * FROM agent_runs WHERE id = ?')
    .bind(c.req.param('id'))
    .first();

  if (!row) return err('Run not found', 404);

  const result = { ...row } as Record<string, unknown>;
  for (const field of ['input', 'output']) {
    if (typeof result[field] === 'string') {
      try {
        result[field] = JSON.parse(result[field] as string);
      } catch {
        // keep raw
      }
    }
  }

  return ok(result);
});

// POST /agents/chat — ScriptsXO concierge chat
app.post('/chat', async (c) => {
  await requireAuth(c);
  const body = await c.req.json<{ message: string; context?: Record<string, unknown> }>();

  if (!body.message?.trim()) {
    return err('message is required', 400);
  }

  const reply = await agentChat(c.env, c.env.DB, body.message, body.context);
  return ok({ reply });
});

// POST /agents/trigger/:agentName — manually trigger an agent
app.post('/trigger/:agentName', async (c) => {
  await requireAuth(c);
  const agentName = c.req.param('agentName');
  const body = await c.req.json<{
    entityType: string;
    entityId: string;
    input?: Record<string, unknown>;
  }>();

  if (!body.entityType || !body.entityId) {
    return err('entityType and entityId are required', 400);
  }

  const VALID_AGENTS = ['TriageAgent', 'ClinicalReviewAgent', 'RouterAgent', 'PharmacyAgent'];
  if (!VALID_AGENTS.includes(agentName)) {
    return err(`Unknown agent: ${agentName}. Valid agents: ${VALID_AGENTS.join(', ')}`, 400);
  }

  // Fire and wait (manual trigger should return result)
  const output = await runAgent(
    c.env,
    agentName,
    'manual_trigger',
    body.entityType,
    body.entityId,
    body.input ?? {}
  );

  return ok({ triggered: true, agentName, output });
});

export default app;
