import { Hono } from 'hono';
import { newId } from '../lib/id';
import { requireAuth, requireCap, err, ok, type Env } from '../lib/auth';
import { CAP } from '../lib/caps';

const app = new Hono<{ Bindings: Env }>();

const PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  patient:    ['patient:read', 'patient:write'],
  provider:   ['provider:read', 'provider:write', 'patient:read'],
  pharmacist: ['pharmacy:read', 'pharmacy:write'],
  admin:      ['admin:read', 'admin:write', 'provider:read', 'provider:write', 'patient:read', 'patient:write', 'pharmacy:read', 'pharmacy:write'],
  staff:      ['patient:read'],
  unverified: [],
};

app.post('/get-or-create', async (c) => {
  const { email, name, firstName, lastName } = await c.req.json<{ email: string; name?: string; firstName?: string; lastName?: string }>();
  const db = c.env.DB;
  const emailLower = email.toLowerCase();

  const existing = await db.prepare('SELECT id FROM members WHERE email = ?').bind(emailLower).first<{ id: string }>();
  if (existing) return ok({ memberId: existing.id, created: false });

  const displayName = name ?? [firstName, lastName].filter(Boolean).join(' ') ?? emailLower.split('@')[0];
  const id = newId();
  await db.prepare(
    'INSERT INTO members (id, email, name, first_name, last_name, role, permissions, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, emailLower, displayName, firstName ?? null, lastName ?? null, 'unverified', '[]', 'active', Date.now()).run();

  return ok({ memberId: id, created: true });
});

app.get('/by-email', async (c) => {
  const email = c.req.query('email');
  if (!email) return err('email required');
  const member = await c.env.DB.prepare('SELECT * FROM members WHERE email = ?').bind(email.toLowerCase()).first();
  return ok(member ?? null);
});

app.get('/:id', async (c) => {
  await requireAuth(c);
  const member = await c.env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(c.req.param('id')).first();
  if (!member) return err('Not found', 404);
  return ok(member);
});

app.get('/', async (c) => {
  await requireCap(c, CAP.USER_MANAGE);
  const { results } = await c.env.DB.prepare('SELECT * FROM members ORDER BY joined_at DESC LIMIT 100').all();
  return ok(results ?? []);
});

app.get('/count-by-role', async (c) => {
  await requireCap(c, CAP.USER_MANAGE);
  const { results } = await c.env.DB.prepare('SELECT role, COUNT(*) as count FROM members GROUP BY role').all<{ role: string; count: number }>();
  const counts: Record<string, number> = {};
  for (const r of results ?? []) counts[r.role] = r.count;
  return ok(counts);
});

app.patch('/:id/role', async (c) => {
  await requireCap(c, CAP.USER_MANAGE);
  const { role } = await c.req.json<{ role: string }>();
  const id = c.req.param('id');
  const perms = PERMISSIONS_BY_ROLE[role] ?? [];
  await c.env.DB.prepare('UPDATE members SET role = ?, permissions = ? WHERE id = ?')
    .bind(role, JSON.stringify(perms), id).run();
  return ok({ success: true });
});

app.patch('/:id/profile', async (c) => {
  const caller = await requireAuth(c);
  const id = c.req.param('id');
  if (caller.memberId !== id && !caller.caps.has(CAP.USER_MANAGE)) return err('Forbidden', 403);

  const { name, firstName, lastName, phone, dob } = await c.req.json<{ name?: string; firstName?: string; lastName?: string; phone?: string; dob?: string }>();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (name !== undefined)      { sets.push('name = ?');       vals.push(name); }
  if (firstName !== undefined) { sets.push('first_name = ?'); vals.push(firstName); }
  if (lastName !== undefined)  { sets.push('last_name = ?');  vals.push(lastName); }
  if (phone !== undefined)     { sets.push('phone = ?');      vals.push(phone); }
  if (dob !== undefined)       { sets.push('dob = ?');        vals.push(dob); }
  sets.push('last_login_at = ?'); vals.push(Date.now());
  vals.push(id);

  await c.env.DB.prepare(`UPDATE members SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return ok({ success: true });
});

app.patch('/:id/caps', async (c) => {
  await requireCap(c, CAP.USER_MANAGE);
  const { capAllow, capDeny } = await c.req.json<{ capAllow?: string[]; capDeny?: string[] }>();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (capAllow !== undefined) { sets.push('cap_allow = ?'); vals.push(JSON.stringify(capAllow)); }
  if (capDeny !== undefined)  { sets.push('cap_deny = ?');  vals.push(JSON.stringify(capDeny)); }
  vals.push(c.req.param('id'));
  await c.env.DB.prepare(`UPDATE members SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return ok({ success: true });
});

export default app;
