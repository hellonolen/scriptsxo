import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireAuth, err, ok, type Env } from '../lib/auth';

const app = new Hono<{ Bindings: Env }>();

app.get('/conversation/:conversationId', async (c) => {
  const caller = await requireAuth(c);
  const conversationId = c.req.param('conversationId');

  // Verify caller is a participant
  const participant = await c.env.DB.prepare(`
    SELECT id FROM conversation_participants
    WHERE conversation_id = ? AND member_id = ?
  `).bind(conversationId, caller.memberId).first();

  if (!participant && !caller.isPlatformOwner) {
    return err('Forbidden', 403);
  }

  const { results } = await c.env.DB.prepare(`
    SELECT m.*, mem.email as sender_email
    FROM messages m
    LEFT JOIN members mem ON m.sender_member_id = mem.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
    LIMIT 200
  `).bind(conversationId).all();

  return ok(results ?? []);
});

app.post('/', async (c) => {
  const caller = await requireAuth(c);
  const body = await c.req.json<Record<string, unknown>>();
  if (!body.conversationId) return err('conversationId required');
  if (!body.body && !body.attachmentUrl) return err('body or attachmentUrl required');

  // Verify caller is a participant
  const participant = await c.env.DB.prepare(`
    SELECT id FROM conversation_participants
    WHERE conversation_id = ? AND member_id = ?
  `).bind(body.conversationId, caller.memberId).first();

  if (!participant && !caller.isPlatformOwner) {
    return err('Forbidden', 403);
  }

  const now = Date.now();
  const id = newId();

  await c.env.DB.prepare(`
    INSERT INTO messages (id, conversation_id, sender_member_id, body, attachment_url, read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).bind(
    id,
    body.conversationId,
    caller.memberId,
    body.body ?? null,
    body.attachmentUrl ?? null,
    now
  ).run();

  // Update conversation updated_at
  await c.env.DB.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
    .bind(now, body.conversationId).run().catch(() => {});

  return ok({ id });
});

app.patch('/:id/read', async (c) => {
  const caller = await requireAuth(c);
  const id = c.req.param('id');

  const msg = await c.env.DB.prepare('SELECT conversation_id FROM messages WHERE id = ?')
    .bind(id).first<{ conversation_id: string }>();
  if (!msg) return err('Not found', 404);

  const participant = await c.env.DB.prepare(`
    SELECT id FROM conversation_participants
    WHERE conversation_id = ? AND member_id = ?
  `).bind(msg.conversation_id, caller.memberId).first();

  if (!participant && !caller.isPlatformOwner) {
    return err('Forbidden', 403);
  }

  await c.env.DB.prepare('UPDATE messages SET read = 1, read_at = ? WHERE id = ?')
    .bind(Date.now(), id).run();

  return ok({ success: true });
});

export default app;
