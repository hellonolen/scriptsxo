import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireAuth, requireAnyCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const caller = await requireAuth(c);

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM notifications
    WHERE member_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(caller.memberId).all();

  return ok(results ?? []);
});

app.post('/', async (c) => {
  await requireAnyCap(c, [CAP.ADMIN_WRITE, CAP.PLATFORM_OWNER]);
  const body = await c.req.json<Record<string, unknown>>();
  if (!body.memberId) return err('memberId required');
  if (!body.message) return err('message required');

  const now = Date.now();
  const id = newId();

  await c.env.DB.prepare(`
    INSERT INTO notifications (id, member_id, type, title, message, read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).bind(
    id,
    body.memberId,
    body.type ?? 'info',
    body.title ?? null,
    body.message,
    now
  ).run();

  return ok({ id });
});

app.patch('/:id/read', async (c) => {
  const caller = await requireAuth(c);
  const id = c.req.param('id');

  const notif = await c.env.DB.prepare('SELECT member_id FROM notifications WHERE id = ?')
    .bind(id).first<{ member_id: string }>();
  if (!notif) return err('Not found', 404);
  if (notif.member_id !== caller.memberId && !caller.isPlatformOwner) {
    return err('Forbidden', 403);
  }

  await c.env.DB.prepare('UPDATE notifications SET read = 1, read_at = ? WHERE id = ?')
    .bind(Date.now(), id).run();

  return ok({ success: true });
});

app.delete('/:id', async (c) => {
  const caller = await requireAuth(c);
  const id = c.req.param('id');

  const notif = await c.env.DB.prepare('SELECT member_id FROM notifications WHERE id = ?')
    .bind(id).first<{ member_id: string }>();
  if (!notif) return err('Not found', 404);
  if (notif.member_id !== caller.memberId && !caller.isPlatformOwner) {
    return err('Forbidden', 403);
  }

  await c.env.DB.prepare('DELETE FROM notifications WHERE id = ?').bind(id).run();

  return ok({ success: true });
});

export default app;
