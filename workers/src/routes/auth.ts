import { Env } from '../types';
import { nanoid } from '../lib/nanoid';
import { checkRateLimit } from '../lib/rateLimit';
import { resolveSession, resolveMember } from '../lib/auth';

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const SESSION_COOKIE = 'scriptsxo_session';

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyECDSASignature(
  publicKeyJwk: string,
  signature: string,
  challenge: string
): Promise<boolean> {
  try {
    const jwk = JSON.parse(publicKeyJwk) as JsonWebKey;
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const signatureBytes = base64urlToUint8Array(signature);
    const encoder = new TextEncoder();
    const challengeBytes = encoder.encode(challenge);
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signatureBytes.buffer as ArrayBuffer,
      challengeBytes.buffer as ArrayBuffer
    );
  } catch {
    return false;
  }
}

// Also supports SPKI format for native WebAuthn passkeys
async function verifyECDSASpki(
  publicKeyBase64: string,
  authenticatorDataBytes: Uint8Array,
  clientDataJSONBytes: Uint8Array,
  signatureBytes: Uint8Array
): Promise<boolean> {
  try {
    const publicKeyBytes = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'spki',
      publicKeyBytes.buffer as ArrayBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const clientDataHash = await crypto.subtle.digest('SHA-256', clientDataJSONBytes);
    const signedData = new Uint8Array(authenticatorDataBytes.length + 32);
    signedData.set(authenticatorDataBytes);
    signedData.set(new Uint8Array(clientDataHash), authenticatorDataBytes.length);
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signatureBytes,
      signedData
    );
  } catch {
    return false;
  }
}

function sessionCookie(token: string, ttlMs: number): string {
  const maxAge = Math.floor(ttlMs / 1000);
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}

export async function handleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'POST' && path === '/api/v1/auth/challenge') {
    return handleChallenge(request, env);
  }
  if (method === 'POST' && path === '/api/v1/auth/register') {
    return handleRegister(request, env);
  }
  if (method === 'POST' && path === '/api/v1/auth/verify') {
    return handleVerify(request, env);
  }
  if (method === 'DELETE' && path === '/api/v1/auth/session') {
    return handleLogout(request, env);
  }
  if (method === 'GET' && path === '/api/v1/auth/me') {
    return handleMe(request, env);
  }
  if (method === 'GET' && path === '/api/v1/auth/eligibility') {
    return handleEligibility(request, env);
  }
  if (method === 'GET' && path === '/api/v1/auth/credentials') {
    return handleGetCredentials(request, env);
  }
  if (method === 'POST' && path === '/api/v1/auth/recovery/generate') {
    return handleGenerateRecoveryPin(request, env);
  }
  if (method === 'POST' && path === '/api/v1/auth/recovery/verify') {
    return handleVerifyRecoveryPin(request, env);
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function handleChallenge(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { allowed } = await checkRateLimit(env, `challenge:ip:${ip}`, 5, 60_000);
  if (!allowed) {
    return Response.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }

  let body: { email?: string; type?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = body.type ?? 'authentication';
  const email = body.email?.toLowerCase();

  if (email) {
    const { allowed: emailAllowed } = await checkRateLimit(env, `challenge:email:${email}`, 10, 60_000);
    if (!emailAllowed) {
      return Response.json({ error: 'Too many authentication attempts.' }, { status: 429 });
    }
  }

  const challengeBytes = new Uint8Array(32);
  crypto.getRandomValues(challengeBytes);
  const challenge = uint8ArrayToBase64Url(challengeBytes);
  const challengeId = nanoid();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO auth_challenges (id, challenge, email, type, expires_at, created_at, rate_limit_key)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(challengeId, challenge, email ?? null, type, now + CHALLENGE_EXPIRY_MS, now, ip)
    .run();

  return Response.json({ challenge, challengeId });
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  let body: {
    email: string;
    challengeId?: string;
    challenge?: string;
    credentialId: string;
    publicKey: string;
    deviceType?: string;
    transports?: string[];
    counter?: number;
    backedUp?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.email || !body.credentialId || !body.publicKey) {
    return Response.json({ error: 'Missing required fields: email, credentialId, publicKey' }, { status: 400 });
  }

  const emailLower = body.email.toLowerCase();

  // Verify challenge
  if (body.challengeId) {
    const storedChallenge = await env.DB.prepare(
      `SELECT id, expires_at FROM auth_challenges WHERE id = ?`
    )
      .bind(body.challengeId)
      .first<{ id: string; expires_at: number }>();

    if (!storedChallenge) {
      return Response.json({ error: 'Challenge not found' }, { status: 400 });
    }
    if (storedChallenge.expires_at < Date.now()) {
      await env.DB.prepare(`DELETE FROM auth_challenges WHERE id = ?`).bind(body.challengeId).run();
      return Response.json({ error: 'Challenge expired' }, { status: 400 });
    }
    await env.DB.prepare(`DELETE FROM auth_challenges WHERE id = ?`).bind(body.challengeId).run();
  }

  // Eligibility check
  const adminEmailsRaw = env.ADMIN_EMAILS ?? '';
  const adminEmails = adminEmailsRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAdminEmail = adminEmails.includes(emailLower);

  const member = await env.DB.prepare(`SELECT id FROM members WHERE email = ?`)
    .bind(emailLower)
    .first<{ id: string }>();

  const existingPasskey = await env.DB.prepare(`SELECT id FROM passkeys WHERE email = ?`)
    .bind(emailLower)
    .first<{ id: string }>();

  if (!isAdminEmail && !member && !existingPasskey) {
    return Response.json({
      success: false,
      error: 'This email is not associated with an account. Please contact your clinic or provider to get started.',
    }, { status: 403 });
  }

  // Device type check
  const allowedDeviceTypes = ['platform', 'singleDevice', 'multiDevice'];
  if (body.deviceType && !allowedDeviceTypes.includes(body.deviceType)) {
    return Response.json({ success: false, error: 'Only device-specific keys are allowed.' }, { status: 400 });
  }

  // Duplicate check
  const duplicate = await env.DB.prepare(`SELECT id FROM passkeys WHERE credential_id = ?`)
    .bind(body.credentialId)
    .first<{ id: string }>();

  if (duplicate) {
    return Response.json({ success: false, error: 'Credential already registered' }, { status: 409 });
  }

  // Max passkeys check
  const maxPasskeys = parseInt(env.MAX_PASSKEYS_PER_USER ?? '2');
  const countResult = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM passkeys WHERE email = ?`)
    .bind(emailLower)
    .first<{ cnt: number }>();

  if ((countResult?.cnt ?? 0) >= maxPasskeys) {
    return Response.json({
      success: false,
      error: `Maximum of ${maxPasskeys} device keys allowed per account.`,
    }, { status: 400 });
  }

  const passkeyId = nanoid();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO passkeys (id, email, credential_id, public_key, counter, device_type, backed_up, transports, login_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  )
    .bind(
      passkeyId,
      emailLower,
      body.credentialId,
      body.publicKey,
      body.counter ?? 0,
      body.deviceType ?? null,
      body.backedUp ? 1 : 0,
      body.transports ? JSON.stringify(body.transports) : null,
      now
    )
    .run();

  // Create member row if first registration
  if (!member) {
    const memberId = nanoid();
    await env.DB.prepare(
      `INSERT INTO members (id, email, name, role, org_role, permissions, status, joined_at)
       VALUES (?, ?, ?, ?, NULL, '[]', 'active', ?)`
    )
      .bind(memberId, emailLower, emailLower, isAdminEmail ? 'admin' : 'patient', now)
      .run();

    return Response.json({ success: true, memberId });
  }

  return Response.json({ success: true, memberId: member.id });
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  let body: {
    credentialId: string;
    signature: string;
    challenge: string;
    // SPKI variant fields
    authenticatorData?: string;
    clientDataJSON?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.credentialId || !body.signature || !body.challenge) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Look up credential
  const credential = await env.DB.prepare(
    `SELECT id, email, public_key, counter, login_count FROM passkeys WHERE credential_id = ?`
  )
    .bind(body.credentialId)
    .first<{ id: string; email: string; public_key: string; counter: number; login_count: number | null }>();

  if (!credential) {
    return Response.json({ success: false, error: 'Credential not found' }, { status: 401 });
  }

  // Verify challenge exists
  const storedChallenge = await env.DB.prepare(
    `SELECT id, expires_at FROM auth_challenges WHERE challenge = ?`
  )
    .bind(body.challenge)
    .first<{ id: string; expires_at: number }>();

  if (!storedChallenge) {
    return Response.json({ success: false, error: 'Challenge not found or expired' }, { status: 401 });
  }

  if (storedChallenge.expires_at < Date.now()) {
    await env.DB.prepare(`DELETE FROM auth_challenges WHERE id = ?`).bind(storedChallenge.id).run();
    return Response.json({ success: false, error: 'Challenge expired' }, { status: 401 });
  }

  // Try JWK verification (device-memory auth)
  let isValid = false;
  try {
    if (body.authenticatorData && body.clientDataJSON) {
      // SPKI / WebAuthn native path
      const authDataBytes = base64urlToUint8Array(body.authenticatorData);
      const clientDataBytes = base64urlToUint8Array(body.clientDataJSON);
      const sigBytes = base64urlToUint8Array(body.signature);
      isValid = await verifyECDSASpki(credential.public_key, authDataBytes, clientDataBytes, sigBytes);
    } else {
      // JWK path (device-memory)
      isValid = await verifyECDSASignature(credential.public_key, body.signature, body.challenge);
    }
  } catch {
    return Response.json({ success: false, error: 'Signature verification failed' }, { status: 401 });
  }

  if (!isValid) {
    return Response.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }

  // Consume challenge (one-time use)
  await env.DB.prepare(`DELETE FROM auth_challenges WHERE id = ?`).bind(storedChallenge.id).run();

  // Update login count
  const newLoginCount = (credential.login_count ?? 0) + 1;
  await env.DB.prepare(
    `UPDATE passkeys SET counter = counter + 1, last_used_at = ?, login_count = ? WHERE id = ?`
  )
    .bind(Date.now(), newLoginCount, credential.id)
    .run();

  // Create session
  const sessionToken = nanoid(48);
  const sessionId = nanoid();
  const now = Date.now();
  const ttlMs = parseInt(env.SESSION_TTL_MS ?? '5184000000');

  const ip = request.headers.get('CF-Connecting-IP') ?? null;
  const userAgent = request.headers.get('User-Agent') ?? null;

  // Ensure member exists for this email
  let member = await env.DB.prepare(`SELECT id, email, role FROM members WHERE email = ?`)
    .bind(credential.email.toLowerCase())
    .first<{ id: string; email: string; role: string }>();

  if (!member) {
    const memberId = nanoid();
    await env.DB.prepare(
      `INSERT INTO members (id, email, name, role, org_role, permissions, status, joined_at)
       VALUES (?, ?, ?, 'patient', NULL, '[]', 'active', ?)`
    )
      .bind(memberId, credential.email.toLowerCase(), credential.email, now)
      .run();
    member = { id: memberId, email: credential.email, role: 'patient' };
  }

  await env.DB.prepare(
    `INSERT INTO sessions (id, session_token, member_id, email, created_at, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(sessionId, sessionToken, member.id, credential.email.toLowerCase(), now, now + ttlMs, userAgent, ip)
    .run();

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', sessionCookie(sessionToken, ttlMs));

  return new Response(
    JSON.stringify({ success: true, email: credential.email, role: member.role }),
    { status: 200, headers }
  );
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const session = await resolveSession(request, env);
  if (session) {
    await env.DB.prepare(`DELETE FROM sessions WHERE session_token = ?`)
      .bind(session.sessionToken)
      .run();
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', clearSessionCookie());
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const session = await resolveSession(request, env);
  if (!session) {
    return Response.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const member = await resolveMember(session, env);

  return Response.json({
    success: true,
    data: {
      email: session.email,
      memberId: session.memberId,
      role: member?.role ?? null,
      name: member?.name ?? null,
    },
  });
}

async function handleEligibility(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.toLowerCase();
  if (!email) {
    return Response.json({ error: 'email query param required' }, { status: 400 });
  }

  const adminEmailsRaw = env.ADMIN_EMAILS ?? '';
  const adminEmails = adminEmailsRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  if (adminEmails.includes(email)) {
    return Response.json({ eligible: true, reason: 'admin' });
  }

  const member = await env.DB.prepare(`SELECT id FROM members WHERE email = ?`)
    .bind(email)
    .first<{ id: string }>();

  if (member) return Response.json({ eligible: true, reason: 'member' });

  const existingPasskey = await env.DB.prepare(`SELECT id FROM passkeys WHERE email = ?`)
    .bind(email)
    .first<{ id: string }>();

  if (existingPasskey) return Response.json({ eligible: true, reason: 'existing_account' });

  return Response.json({ eligible: false, reason: 'no_account' });
}

async function handleGetCredentials(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.toLowerCase();
  if (!email) {
    return Response.json({ error: 'email query param required' }, { status: 400 });
  }

  const { results } = await env.DB.prepare(
    `SELECT credential_id, transports FROM passkeys WHERE email = ?`
  )
    .bind(email)
    .all<{ credential_id: string; transports: string | null }>();

  return Response.json({
    success: true,
    data: (results ?? []).map(r => ({
      credentialId: r.credential_id,
      transports: r.transports ? JSON.parse(r.transports) : [],
    })),
  });
}

async function handleGenerateRecoveryPin(request: Request, env: Env): Promise<Response> {
  const session = await resolveSession(request, env);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const passkey = await env.DB.prepare(`SELECT id FROM passkeys WHERE email = ?`)
    .bind(session.email)
    .first<{ id: string }>();

  if (!passkey) return Response.json({ success: false, error: 'Account not found' }, { status: 404 });

  const digits = new Uint8Array(6);
  crypto.getRandomValues(digits);
  const pin = Array.from(digits, d => (d % 10).toString()).join('');

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(pin));
  const pinHash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');

  await env.DB.prepare(`UPDATE passkeys SET recovery_pin_hash = ?, recovery_setup_at = ? WHERE id = ?`)
    .bind(pinHash, Date.now(), passkey.id)
    .run();

  return Response.json({
    success: true,
    pin,
    message: 'Save this PIN securely. You will need it to recover your account if you lose access to your device key.',
  });
}

async function handleVerifyRecoveryPin(request: Request, env: Env): Promise<Response> {
  let body: { email: string; pin: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.email || !body.pin) {
    return Response.json({ error: 'email and pin required' }, { status: 400 });
  }

  const passkey = await env.DB.prepare(
    `SELECT id, recovery_pin_hash FROM passkeys WHERE email = ?`
  )
    .bind(body.email.toLowerCase())
    .first<{ id: string; recovery_pin_hash: string | null }>();

  if (!passkey) return Response.json({ success: false, error: 'Account not found' }, { status: 404 });
  if (!passkey.recovery_pin_hash) return Response.json({ success: false, error: 'No recovery PIN set up' }, { status: 400 });

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(body.pin));
  const inputHash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');

  if (inputHash !== passkey.recovery_pin_hash) {
    return Response.json({ success: false, error: 'Invalid recovery PIN' }, { status: 401 });
  }

  const challengeBytes = new Uint8Array(32);
  crypto.getRandomValues(challengeBytes);
  const challenge = uint8ArrayToBase64Url(challengeBytes);
  const challengeId = nanoid();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO auth_challenges (id, challenge, email, type, expires_at, created_at)
     VALUES (?, ?, ?, 'recovery', ?, ?)`
  )
    .bind(challengeId, challenge, body.email.toLowerCase(), now + 15 * 60 * 1000, now)
    .run();

  return Response.json({
    success: true,
    challenge,
    message: 'PIN verified. You can now register a new device key.',
  });
}
