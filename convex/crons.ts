// @ts-nocheck
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ─── Maintenance ──────────────────────────────────────────────

// Clean up expired auth challenges every 15 minutes
crons.interval(
  "cleanup expired challenges",
  { minutes: 15 },
  internal.cleanup.cleanupExpiredChallenges
);

// Clean up expired rate limit records every hour
crons.interval(
  "cleanup expired rate limits",
  { hours: 1 },
  internal.cleanup.cleanupExpiredRateLimits
);

// Expire stale intake forms daily at 3am
crons.cron(
  "expire stale intakes",
  "0 3 * * *",
  internal.cleanup.cleanupStaleIntakes
);

// Clean up old agent logs weekly on Sunday at 4am
crons.cron(
  "cleanup old agent logs",
  "0 4 * * 0",
  internal.cleanup.cleanupOldAuditLogs
);

// ─── Paperclip Agent Heartbeats ───────────────────────────────

// CEO — audit pipeline health, escalate stalled tickets every 15 minutes
crons.interval(
  "conductor-heartbeat",
  { minutes: 15 },
  internal.agentOrg.conductorHeartbeat
);

// VideoReviewAgent — process queued video review tickets every 5 minutes
crons.interval(
  "video-review-heartbeat",
  { minutes: 5 },
  internal.agentHeartbeats.videoReviewHeartbeat
);

// NotificationAgent — dispatch pending notifications every 2 minutes
crons.interval(
  "notification-heartbeat",
  { minutes: 2 },
  internal.agentHeartbeats.notificationHeartbeat
);

// FollowUpAgent — check for patients needing 48h follow-up, runs hourly
crons.interval(
  "followup-heartbeat",
  { hours: 1 },
  internal.agentHeartbeats.followUpHeartbeat
);

// MarketingAgent — daily content generation at 9am UTC
crons.cron(
  "marketing-heartbeat",
  "0 9 * * *",
  internal.agentHeartbeats.marketingHeartbeat
);

// Budget reset — first of each month at midnight UTC, reset all agent budgets
crons.cron(
  "budget-reset",
  "0 0 1 * *",
  internal.agentOrg.resetMonthlyBudgets
);

export default crons;
