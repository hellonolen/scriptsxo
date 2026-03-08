import { Hono } from 'hono';
import { newId, newSessionToken } from '../lib/id';
import { ApiError, err, ok, type Env } from '../lib/auth';

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const RECOVERY_EXPIRY_MS = 15 * 60 * 1000;
const SESSION_EXPIRY_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
const MAX_PASSKEYS = 2;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

const app = new Hono<{ Bindings: Env }>();

// ─── Helpers ────────────────────────────────────────────────────────

function uint8ToBase64Url(bytes: Uint8Array): string {
  const bin = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8(b64: string): Uint8Array {
  const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const bin = atob(base64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyECDSA(publicKeyJwk: string, signature: string, challenge: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey('jwk', JSON.parse(publicKeyJwk) as JsonWebKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      base64UrlToUint8(signature).buffer as ArrayBuffer,
      new TextEncoder().encode(challenge).buffer as ArrayBuffer
    );
  } catch { return false; }
}

async function isAdminEmail(db: D1Database, adminEnv: string | undefined, email: string): Promise<boolean> {
  const list = (adminEnv ?? '').split(',').map(e => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}

// ─── Challenge ──────────────────────────────────────────────────────

app.post('/challenge/create', async (c) => {
  const { email, type, clientFingerprint } = await c.req.json<{ email?: string; type: string; clientFingerprint?: string }>();
  const db = c.env.DB;
  const now = Date.now();
  const rateLimitKey = email?.toLowerCase() ?? clientFingerprint;

  if (rateLimitKey) {
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const { count } = await db.prepare(
      'SELECT COUNT(*) as count FROM auth_challenges WHERE (email = ? OR rate_limit_key = ?) AND created_at > ?'
    ).bind(rateLimitKey, rateLimitKey, windowStart).first<{ count: number }>() ?? { count: 0 };
    if (count >= RATE_LIMIT_MAX) return err('Too many attempts. Wait a minute.', 429);
  }

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const challenge = uint8ToBase64Url(bytes);

  await db.prepare(
    'INSERT INTO auth_challenges (id, challenge, email, type, expires_at, created_at, rate_limit_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(newId(), challenge, email ?? null, type, now + CHALLENGE_EXPIRY_MS, now, rateLimitKey ?? null).run();

  return ok({ challenge });
});

app.post('/challenge/verify', async (c) => {
  const { challenge } = await c.req.json<{ challenge: string }>();
  const db = c.env.DB;
  const row = await db.prepare('SELECT * FROM auth_challenges WHERE challenge = ?').bind(challenge).first<Record<string, unknown>>();
  if (!row) return ok({ valid: false, error: 'Challenge not found' });
  if ((row.expires_at as number) < Date.now()) {
    await db.prepare('DELETE FROM auth_challenges WHERE id = ?').bind(row.id).run();
    return ok({ valid: false, error: 'Challenge expired' });
  }
  await db.prepare('DELETE FROM auth_challenges WHERE id = ?').bind(row.id).run();
  return ok({ valid: true, email: row.email, type: row.type });
});

// ─── Passkey Registration ────────────────────────────────────────────

app.get('/passkeys/eligible', async (c) => {
  const email = c.req.query('email')?.toLowerCase();
  if (!email) return err('email required');
  const db = c.env.DB;

  if (await isAdminEmail(db, c.env.ADMIN_EMAILS, email)) return ok({ eligible: true, reason: 'admin' });

  const member = await db.prepare('SELECT id FROM members WHERE email = ?').bind(email).first();
  if (member) return ok({ eligible: true, reason: 'member' });

  const existing = await db.prepare('SELECT id FROM passkeys WHERE email = ?').bind(email).first();
  if (existing) return ok({ eligible: true, reason: 'existing_account' });

  return ok({ eligible: false, reason: 'no_account' });
});

app.post('/passkeys/store', async (c) => {
  const { email, credentialId, publicKey, counter, deviceType, backedUp, transports } =
    await c.req.json<{ email: string; credentialId: string; publicKey: string; counter: number; deviceType?: string; backedUp?: boolean; transports?: string[] }>();
  const db = c.env.DB;
  const emailLower = email.toLowerCase();

  const isAdmin = await isAdminEmail(db, c.env.ADMIN_EMAILS, emailLower);
  const member = await db.prepare('SELECT id FROM members WHERE email = ?').bind(emailLower).first();
  const existingPasskey = await db.prepare('SELECT id FROM passkeys WHERE email = ?').bind(emailLower).first();

  if (!isAdmin && !member && !existingPasskey) {
    return ok({ success: false, error: 'Email not associated with an account.' });
  }

  const allowed = ['platform', 'singleDevice', 'multiDevice'];
  if (deviceType && !allowed.includes(deviceType)) return ok({ success: false, error: 'Only device-specific keys allowed.' });

  const dup = await db.prepare('SELECT id FROM passkeys WHERE credential_id = ?').bind(credentialId).first();
  if (dup) return ok({ success: false, error: 'Credential already registered.' });

  const { count } = await db.prepare('SELECT COUNT(*) as count FROM passkeys WHERE email = ?').bind(emailLower).first<{ count: number }>() ?? { count: 0 };
  if (count >= MAX_PASSKEYS) return ok({ success: false, error: `Maximum of ${MAX_PASSKEYS} device keys allowed.` });

  const id = newId();
  await db.prepare(
    'INSERT INTO passkeys (id, email, credential_id, public_key, counter, device_type, backed_up, transports, login_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)'
  ).bind(id, emailLower, credentialId, publicKey, counter, deviceType ?? null, backedUp ? 1 : 0, transports ? JSON.stringify(transports) : null, Date.now()).run();

  return ok({ success: true, id });
});

app.post('/passkeys/verify', async (c) => {
  const { credentialId, counter, signature, challenge } =
    await c.req.json<{ credentialId: string; counter?: number; signature?: string; challenge?: string }>();
  const db = c.env.DB;

  const cred = await db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').bind(credentialId).first<Record<string, unknown>>();
  if (!cred) return ok({ success: false, error: 'Credential not found' });

  if (signature && challenge) {
    const stored = await db.prepare('SELECT * FROM auth_challenges WHERE challenge = ?').bind(challenge).first<Record<string, unknown>>();
    if (!stored) return ok({ success: false, error: 'Challenge not found or expired' });
    if ((stored.expires_at as number) < Date.now()) {
      await db.prepare('DELETE FROM auth_challenges WHERE id = ?').bind(stored.id).run();
      return ok({ success: false, error: 'Challenge expired' });
    }
    const valid = await verifyECDSA(cred.public_key as string, signature, challenge);
    if (!valid) return ok({ success: false, error: 'Invalid signature' });
    await db.prepare('DELETE FROM auth_challenges WHERE id = ?').bind(stored.id).run();
  } else if (counter !== undefined) {
    if (counter <= (cred.counter as number)) return ok({ success: false, error: 'Invalid counter' });
  } else {
    return ok({ success: false, error: 'No verification data provided' });
  }

  const newCount = (cred.login_count as number || 0) + 1;
  await db.prepare('UPDATE passkeys SET counter = ?, last_used_at = ?, login_count = ? WHERE credential_id = ?')
    .bind(counter ?? (cred.counter as number) + 1, Date.now(), newCount, credentialId).run();

  return ok({ success: true, email: cred.email, loginCount: newCount });
});

app.get('/passkeys/list', async (c) => {
  const email = c.req.query('email');
  if (!email) return err('email required');
  const { results } = await c.env.DB.prepare('SELECT * FROM passkeys WHERE email = ?').bind(email.toLowerCase()).all<Record<string, unknown>>();
  return ok({
    passkeys: (results ?? []).map(p => ({
      id: p.id,
      credentialId: (p.credential_id as string).slice(0, 8) + '...',
      deviceType: p.device_type,
      createdAt: p.created_at,
      lastUsedAt: p.last_used_at,
    })),
    count: results?.length ?? 0,
    maxAllowed: MAX_PASSKEYS,
    canAddMore: (results?.length ?? 0) < MAX_PASSKEYS,
    hasRecovery: !!(results?.[0] as Record<string, unknown>)?.recovery_pin_hash,
  });
});

app.delete('/passkeys/:credentialId', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  const credentialId = c.req.param('credentialId');
  const db = c.env.DB;

  const passkey = await db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').bind(credentialId).first<Record<string, unknown>>();
  if (!passkey) return ok({ success: false, error: 'Not found' });
  if ((passkey.email as string) !== email.toLowerCase()) return ok({ success: false, error: 'Unauthorized' });

  const { count } = await db.prepare('SELECT COUNT(*) as count FROM passkeys WHERE email = ?').bind(email).first<{ count: number }>() ?? { count: 0 };
  if (count === 1) return ok({ success: false, error: 'Cannot delete your only device key' });

  await db.prepare('DELETE FROM passkeys WHERE credential_id = ?').bind(credentialId).run();
  return ok({ success: true });
});

// ─── Sessions ────────────────────────────────────────────────────────

app.post('/sessions/create', async (c) => {
  const { memberId, email, userAgent, ipAddress } = await c.req.json<{ memberId: string; email: string; userAgent?: string; ipAddress?: string }>();
  const db = c.env.DB;
  const now = Date.now();
  const token = newSessionToken();

  await db.prepare(
    'INSERT INTO sessions (id, session_token, member_id, email, created_at, expires_at, last_used_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(newId(), token, memberId, email, now, now + SESSION_EXPIRY_MS, now, userAgent ?? null, ipAddress ?? null).run();

  return ok({ sessionToken: token });
});

app.post('/sessions/validate', async (c) => {
  const { sessionToken } = await c.req.json<{ sessionToken: string }>();
  const session = await c.env.DB
    .prepare('SELECT s.*, m.email as member_email FROM sessions s JOIN members m ON s.member_id = m.id WHERE s.session_token = ? AND s.expires_at > ?')
    .bind(sessionToken, Date.now())
    .first<Record<string, unknown>>();
  if (!session) return ok({ valid: false });
  return ok({ valid: true, email: session.email });
});

app.post('/sessions/revoke', async (c) => {
  const { sessionToken } = await c.req.json<{ sessionToken: string }>();
  await c.env.DB.prepare('DELETE FROM sessions WHERE session_token = ?').bind(sessionToken).run();
  return ok({ success: true });
});

// ─── Recovery PIN ────────────────────────────────────────────────────

app.post('/passkeys/recovery/generate', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  const db = c.env.DB;
  const passkey = await db.prepare('SELECT id FROM passkeys WHERE email = ?').bind(email.toLowerCase()).first<{ id: string }>();
  if (!passkey) return ok({ success: false, error: 'Account not found' });

  const digits = new Uint8Array(6);
  crypto.getRandomValues(digits);
  const pin = Array.from(digits, d => (d % 10).toString()).join('');
  const pinHash = await sha256Hex(pin);

  await db.prepare('UPDATE passkeys SET recovery_pin_hash = ?, recovery_setup_at = ? WHERE id = ?')
    .bind(pinHash, Date.now(), passkey.id).run();

  return ok({ success: true, pin });
});

app.post('/passkeys/recovery/verify', async (c) => {
  const { email, pin } = await c.req.json<{ email: string; pin: string }>();
  const db = c.env.DB;
  const passkey = await db.prepare('SELECT * FROM passkeys WHERE email = ?').bind(email.toLowerCase()).first<Record<string, unknown>>();
  if (!passkey) return ok({ success: false, error: 'Account not found' });
  if (!passkey.recovery_pin_hash) return ok({ success: false, error: 'No recovery PIN set' });

  const inputHash = await sha256Hex(pin);
  if (inputHash !== passkey.recovery_pin_hash) return ok({ success: false, error: 'Invalid PIN' });

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const challenge = uint8ToBase64Url(bytes);

  await db.prepare('INSERT INTO auth_challenges (id, challenge, email, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(newId(), challenge, email.toLowerCase(), 'recovery', Date.now() + RECOVERY_EXPIRY_MS, Date.now()).run();

  return ok({ success: true, challenge });
});

// ─── Magic Links ─────────────────────────────────────────────────────

app.post('/magic-links/create', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  const db = c.env.DB;
  const digits = new Uint8Array(3);
  crypto.getRandomValues(digits);
  const code = Array.from(digits, d => (d % 10).toString().padStart(2, '0')).join('').slice(0, 6);
  const now = Date.now();

  await db.prepare('INSERT INTO magic_links (id, email, code, expires_at, consumed, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .bind(newId(), email.toLowerCase(), code, now + 15 * 60 * 1000, now).run();

  return ok({ success: true, code });
});

app.post('/magic-links/verify', async (c) => {
  const { email, code } = await c.req.json<{ email: string; code: string }>();
  const db = c.env.DB;
  const link = await db.prepare('SELECT * FROM magic_links WHERE email = ? AND code = ? AND consumed = 0 AND expires_at > ?')
    .bind(email.toLowerCase(), code, Date.now()).first<Record<string, unknown>>();
  if (!link) return ok({ valid: false, error: 'Invalid or expired code' });

  await db.prepare('UPDATE magic_links SET consumed = 1 WHERE id = ?').bind(link.id).run();
  return ok({ valid: true, email: link.email });
});

export default app;
