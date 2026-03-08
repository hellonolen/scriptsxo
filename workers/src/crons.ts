import { Env } from './types';
import { nanoid } from './lib/nanoid';

export async function handleCron(cron: string, env: Env): Promise<void> {
  switch (cron) {
    case '*/2 * * * *':
      await videoReviewHeartbeat(env);
      break;
    case '*/5 * * * *':
      await notificationHeartbeat(env);
      await followUpHeartbeat(env);
      break;
    case '0 * * * *':
      await cleanupHeartbeat(env);
      break;
    case '0 9 * * *':
      await marketingHeartbeat(env);
      break;
    case '0 0 1 * *':
      await agentBudgetResetHeartbeat(env);
      break;
    default:
      break;
  }
}

async function videoReviewHeartbeat(env: Env): Promise<void> {
  const { results } = await env.DB.prepare(
    `SELECT vr.id, vr.consultation_id, vr.patient_id, vr.transcript, vr.summary,
            vr.chief_complaint, vr.urgency_level
     FROM video_reviews vr
     WHERE vr.agent_status = 'pending_review'
     ORDER BY vr.urgency_level DESC
     LIMIT 5`
  ).all<{ id: string; consultation_id: string; patient_id: string; urgency_level: number }>();

  for (const review of results ?? []) {
    // Create an agent ticket for each pending review
    const existing = await env.DB.prepare(
      `SELECT id FROM agent_tickets WHERE consultation_id = ? AND type = 'video_review' AND status != 'completed'`
    )
      .bind(review.consultation_id)
      .first<{ id: string }>();

    if (existing) continue;

    const ticketId = buildTicketId();
    await env.DB.prepare(
      `INSERT INTO agent_tickets (id, ticket_id, type, status, priority, assigned_agent,
        consultation_id, input, created_at)
       VALUES (?, ?, 'video_review', 'queued', ?, 'VideoReviewAgent', ?, ?, ?)`
    )
      .bind(
        nanoid(),
        ticketId,
        review.urgency_level,
        review.consultation_id,
        JSON.stringify({ reviewId: review.id, patientId: review.patient_id }),
        Date.now()
      )
      .run();
  }
}

async function notificationHeartbeat(env: Env): Promise<void> {
  const { results } = await env.DB.prepare(
    `SELECT id, recipient_email, type, subject, body, channel
     FROM notifications
     WHERE status = 'pending'
     LIMIT 10`
  ).all<{ id: string; recipient_email: string; type: string; subject: string; body: string; channel: string }>();

  for (const notification of results ?? []) {
    if (notification.channel !== 'email') {
      await env.DB.prepare(`UPDATE notifications SET status = 'skipped', sent_at = ? WHERE id = ?`)
        .bind(Date.now(), notification.id)
        .run();
      continue;
    }

    try {
      const resp = await fetch('https://app.emailit.com/api/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.EMAILIT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: notification.recipient_email,
          subject: notification.subject,
          html: notification.body,
          from: 'noreply@scriptsxo.com',
        }),
      });

      const newStatus = resp.ok ? 'sent' : 'failed';
      await env.DB.prepare(`UPDATE notifications SET status = ?, sent_at = ? WHERE id = ?`)
        .bind(newStatus, Date.now(), notification.id)
        .run();
    } catch {
      await env.DB.prepare(`UPDATE notifications SET status = 'failed' WHERE id = ?`)
        .bind(notification.id)
        .run();
    }
  }
}

async function followUpHeartbeat(env: Env): Promise<void> {
  const now = Date.now();

  const { results } = await env.DB.prepare(
    `SELECT fu.id, fu.consultation_id, fu.patient_id, fu.provider_id, fu.type,
            fu.scheduled_for, p.email AS patient_email
     FROM follow_ups fu
     JOIN patients p ON p.id = fu.patient_id
     WHERE fu.status = 'pending' AND fu.scheduled_for <= ?
     LIMIT 10`
  )
    .bind(now)
    .all<{ id: string; consultation_id: string; patient_email: string; type: string }>();

  for (const followUp of results ?? []) {
    // Create notification
    const notifId = nanoid();
    await env.DB.prepare(
      `INSERT INTO notifications (id, recipient_email, type, channel, subject, body, status, created_at)
       VALUES (?, ?, 'follow_up', 'email', 'Follow-up reminder from ScriptsXO',
               'Your provider has requested a follow-up. Please log in to respond.', 'pending', ?)`
    )
      .bind(notifId, followUp.patient_email, Date.now())
      .run();

    await env.DB.prepare(`UPDATE follow_ups SET status = 'sent', sent_at = ? WHERE id = ?`)
      .bind(Date.now(), followUp.id)
      .run();
  }

  // Check for overdue prescriptions needing refill follow-up
  const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;
  const { results: refillDue } = await env.DB.prepare(
    `SELECT rx.id, rx.patient_id, p.email AS patient_email, rx.medication_name
     FROM prescriptions rx
     JOIN patients p ON p.id = rx.patient_id
     WHERE rx.status = 'active'
       AND rx.refills_authorized > rx.refills_used
       AND rx.next_refill_date IS NOT NULL
       AND rx.next_refill_date <= ?
     LIMIT 5`
  )
    .bind(threeDaysFromNow)
    .all<{ id: string; patient_email: string; medication_name: string }>();

  for (const rx of refillDue ?? []) {
    const notifId = nanoid();
    await env.DB.prepare(
      `INSERT INTO notifications (id, recipient_email, type, channel, subject, body, status, created_at)
       VALUES (?, ?, 'refill_reminder', 'email', 'Prescription refill reminder',
               ?, 'pending', ?)`
    )
      .bind(
        notifId,
        rx.patient_email,
        `Your prescription for ${rx.medication_name} is due for a refill soon. Log in to request a refill.`,
        Date.now()
      )
      .run();
  }
}

async function marketingHeartbeat(env: Env): Promise<void> {
  // Create a Gemini-powered marketing content generation ticket
  const ticketId = buildTicketId();
  await env.DB.prepare(
    `INSERT INTO agent_tickets (id, ticket_id, type, status, priority, assigned_agent, input, created_at)
     VALUES (?, ?, 'marketing_content', 'queued', 3, 'MarketingAgent', ?, ?)`
  )
    .bind(
      nanoid(),
      ticketId,
      JSON.stringify({ trigger: 'daily', date: new Date().toISOString().slice(0, 10) }),
      Date.now()
    )
    .run();
}

async function cleanupHeartbeat(env: Env): Promise<void> {
  const now = Date.now();

  // Clean expired sessions
  const sessionResult = await env.DB.prepare(
    `DELETE FROM sessions WHERE expires_at < ?`
  )
    .bind(now)
    .run();

  // Clean expired auth challenges
  const challengeResult = await env.DB.prepare(
    `DELETE FROM auth_challenges WHERE expires_at < ?`
  )
    .bind(now)
    .run();

  // Clean expired magic links
  await env.DB.prepare(`DELETE FROM magic_links WHERE expires_at < ?`).bind(now).run();

  // Log cleanup to agent_logs
  await env.DB.prepare(
    `INSERT INTO agent_logs (id, agent_name, action, output, success, duration_ms, created_at)
     VALUES (?, 'CleanupAgent', 'cleanup_heartbeat', ?, 1, 0, ?)`
  )
    .bind(
      nanoid(),
      JSON.stringify({
        sessionsDeleted: sessionResult.meta?.changes ?? 0,
        challengesDeleted: challengeResult.meta?.changes ?? 0,
      }),
      Date.now()
    )
    .run();
}

async function agentBudgetResetHeartbeat(env: Env): Promise<void> {
  const now = Date.now();
  const month = new Date().toISOString().slice(0, 7);

  // Reset token counts for new month
  await env.DB.prepare(
    `UPDATE agent_budgets SET tokens_used_this_month = 0, last_reset_at = ?, month = ? WHERE month != ?`
  )
    .bind(now, month, month)
    .run();
}

function buildTicketId(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const suffix = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 6);
  return `TKT-${dateStr}-${suffix}`;
}
