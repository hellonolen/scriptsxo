// @ts-nocheck
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

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

export default crons;
