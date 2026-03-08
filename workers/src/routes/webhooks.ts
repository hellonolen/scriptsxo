import { Env } from '../types';
import { nanoid } from '../lib/nanoid';

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',');
  const tPart = parts.find(p => p.startsWith('t='));
  const v1Part = parts.find(p => p.startsWith('v1='));

  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const signature = v1Part.slice(3);
  const signedPayload = `${timestamp}.${payload}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computed = Array.from(new Uint8Array(mac), b => b.toString(16).padStart(2, '0')).join('');

  // Constant-time compare
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  // Replay protection: reject events older than 5 minutes
  const eventTime = parseInt(timestamp) * 1000;
  if (Math.abs(Date.now() - eventTime) > 5 * 60 * 1000) return false;

  return mismatch === 0;
}

export async function handleWebhooks(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (path === '/api/v1/webhooks/stripe') {
    return handleStripeWebhook(request, env);
  }

  if (path === '/api/v1/webhooks/phaxio') {
    return handlePhaxioWebhook(request, env);
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.text();
  const sigHeader = request.headers.get('Stripe-Signature') ?? '';

  // Try main webhook secret first, then identity webhook secret
  const primaryVerified = env.STRIPE_WEBHOOK_SECRET
    ? await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET)
    : false;

  const identityVerified = !primaryVerified && env.STRIPE_IDENTITY_WEBHOOK_SECRET
    ? await verifyStripeSignature(payload, sigHeader, env.STRIPE_IDENTITY_WEBHOOK_SECRET)
    : false;

  if (!primaryVerified && !identityVerified) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      await handleCheckoutCompleted(obj, env);
      break;
    }
    case 'identity.verification_session.verified': {
      await handleIdentityVerified(obj, env);
      break;
    }
    case 'identity.verification_session.requires_input': {
      await handleIdentityFailed(obj, env);
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      await handleSubscriptionChange(obj, event.type, env);
      break;
    }
    default:
      // Unhandled event type — acknowledge silently
      break;
  }

  return Response.json({ received: true });
}

async function handleCheckoutCompleted(session: Record<string, unknown>, env: Env): Promise<void> {
  const email = (session.customer_email as string | undefined)
    ?? (session.customer_details as { email?: string } | undefined)?.email;
  const stripeCustomerId = session.customer as string | undefined;
  const stripeSessionId = session.id as string | undefined;

  if (!email) return;

  await env.DB.prepare(
    `UPDATE passkeys SET payment_status = 'active', stripe_customer_id = ?, stripe_session_id = ?, paid_at = ?
     WHERE email = ?`
  )
    .bind(stripeCustomerId ?? null, stripeSessionId ?? null, Date.now(), email.toLowerCase())
    .run();

  // Log security event
  await env.DB.prepare(
    `INSERT INTO security_events (id, action, target_type, target_id, success, timestamp)
     VALUES (?, 'payment_completed', 'passkey', ?, 1, ?)`
  )
    .bind(nanoid(), email.toLowerCase(), Date.now())
    .run();
}

async function handleIdentityVerified(session: Record<string, unknown>, env: Env): Promise<void> {
  const metadata = session.metadata as Record<string, string> | undefined;
  const memberId = metadata?.member_id;
  if (!memberId) return;

  await env.DB.prepare(
    `UPDATE credential_verifications SET patient_stripe_status = 'verified', updated_at = ?
     WHERE member_id = ?`
  )
    .bind(Date.now(), memberId)
    .run();

  await env.DB.prepare(
    `UPDATE patients SET id_verification_status = 'verified', id_verified_at = ? WHERE member_id = ?`
  )
    .bind(Date.now(), memberId)
    .run();
}

async function handleIdentityFailed(session: Record<string, unknown>, env: Env): Promise<void> {
  const metadata = session.metadata as Record<string, string> | undefined;
  const memberId = metadata?.member_id;
  if (!memberId) return;

  await env.DB.prepare(
    `UPDATE credential_verifications SET patient_stripe_status = 'failed', updated_at = ?
     WHERE member_id = ?`
  )
    .bind(Date.now(), memberId)
    .run();
}

async function handleSubscriptionChange(
  subscription: Record<string, unknown>,
  eventType: string,
  env: Env
): Promise<void> {
  const stripeCustomerId = subscription.customer as string | undefined;
  if (!stripeCustomerId) return;

  const newStatus = eventType === 'customer.subscription.deleted' ? 'cancelled' : 'active';

  await env.DB.prepare(
    `UPDATE passkeys SET payment_status = ? WHERE stripe_customer_id = ?`
  )
    .bind(newStatus, stripeCustomerId)
    .run();
}

async function handlePhaxioWebhook(request: Request, env: Env): Promise<Response> {
  // Phaxio sends form-encoded data
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const faxId = formData.get('fax[id]') as string | null;
  const direction = formData.get('fax[direction]') as string | null;
  const status = formData.get('fax[status]') as string | null;

  if (!faxId) {
    return Response.json({ error: 'Missing fax ID' }, { status: 400 });
  }

  const phaxioFaxId = faxId;
  const now = Date.now();

  const logEntry = await env.DB.prepare(
    `SELECT id FROM fax_logs WHERE phaxio_fax_id = ?`
  )
    .bind(phaxioFaxId)
    .first<{ id: string }>();

  if (logEntry) {
    const newStatus = status === 'success' ? 'delivered' : status === 'failure' ? 'failed' : status ?? 'unknown';
    const confirmedAt = status === 'success' ? now : null;

    await env.DB.prepare(
      `UPDATE fax_logs SET status = ?, confirmed_at = ? WHERE phaxio_fax_id = ?`
    )
      .bind(newStatus, confirmedAt, phaxioFaxId)
      .run();
  }

  // Phaxio expects success=true in response
  return Response.json({ success: true });
}
