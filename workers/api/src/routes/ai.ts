import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireAuth, err, ok, type Env } from '../lib/auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/by-email', async (c) => {
  await requireAuth(c);
  const email = c.req.query('email');
  if (!email) return err('email required');

  const conversation = await c.env.DB.prepare(`
    SELECT * FROM ai_conversations WHERE email = ? ORDER BY updated_at DESC LIMIT 1
  `).bind(email.toLowerCase()).first();

  return ok(conversation ?? null);
});

app.post('/', async (c) => {
  await requireAuth(c);
  const body = await c.req.json<Record<string, unknown>>();
  if (!body.email) return err('email required');

  const email = (body.email as string).toLowerCase();
  const now = Date.now();

  // Upsert: if a conversation exists for this email, update it
  const existing = await c.env.DB.prepare(
    'SELECT id FROM ai_conversations WHERE email = ?'
  ).bind(email).first<{ id: string }>();

  if (existing) {
    const messages = body.messages ? JSON.stringify(body.messages) : '[]';
    await c.env.DB.prepare(
      'UPDATE ai_conversations SET messages = ?, updated_at = ? WHERE id = ?'
    ).bind(messages, now, existing.id).run();
    return ok({ id: existing.id });
  }

  const id = newId();
  await c.env.DB.prepare(`
    INSERT INTO ai_conversations (id, email, context, messages, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    email,
    body.context ? JSON.stringify(body.context) : null,
    body.messages ? JSON.stringify(body.messages) : '[]',
    now,
    now
  ).run();

  return ok({ id });
});

app.patch('/:id', async (c) => {
  const caller = await requireAuth(c);
  const id = c.req.param('id');
  const body = await c.req.json<{ role: string; content: string }>();

  if (!body.role || !body.content) return err('role and content required');

  const conversation = await c.env.DB.prepare(
    'SELECT email, messages FROM ai_conversations WHERE id = ?'
  ).bind(id).first<{ email: string; messages: string }>();

  if (!conversation) return err('Not found', 404);

  // Verify caller owns this conversation (by email match) or is platform owner
  const member = await c.env.DB.prepare('SELECT email FROM members WHERE id = ?')
    .bind(caller.memberId).first<{ email: string }>();

  if (member?.email.toLowerCase() !== conversation.email && !caller.isPlatformOwner) {
    return err('Forbidden', 403);
  }

  let messages: unknown[] = [];
  try {
    messages = JSON.parse(conversation.messages) as unknown[];
  } catch { messages = []; }

  messages.push({ role: body.role, content: body.content, ts: Date.now() });

  await c.env.DB.prepare(
    'UPDATE ai_conversations SET messages = ?, updated_at = ? WHERE id = ?'
  ).bind(JSON.stringify(messages), Date.now(), id).run();

  return ok({ success: true });
});

export default app;
