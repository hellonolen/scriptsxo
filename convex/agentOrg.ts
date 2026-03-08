// @ts-nocheck
/**
 * AGENT ORG — Paperclip-pattern organizational layer
 * Ticket checkout, budget enforcement, heartbeat dispatch, audit trail.
 *
 * Every unit of agentic work is a ticket. Agents atomically check out a ticket,
 * do work, and close it. The ConductorAgent audits the pipeline on a heartbeat
 * and escalates anything stalled.
 */
import { internalMutation, internalQuery, internalAction, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const ADMIN_EMAIL = "hellonolen@gmail.com";
const FROM_ADDRESS = "ScriptsXO Agents <noreply@scriptsxo.com>";

// ─── Budget config (mirrors AGENTS.md) ───────────────────────

const AGENT_BUDGETS = [
  { agentName: "ConductorAgent",     monthlyTokenBudget: 5_000_000,  alertThreshold: 0.8 },
  { agentName: "IntakeAgent",        monthlyTokenBudget: 2_000_000,  alertThreshold: 0.8 },
  { agentName: "TriageAgent",        monthlyTokenBudget: 3_000_000,  alertThreshold: 0.8 },
  { agentName: "VideoReviewAgent",   monthlyTokenBudget: 8_000_000,  alertThreshold: 0.8 },
  { agentName: "ComplianceAgent",    monthlyTokenBudget: 2_000_000,  alertThreshold: 0.8 },
  { agentName: "PrescriptionAgent",  monthlyTokenBudget: 3_000_000,  alertThreshold: 0.8 },
  { agentName: "PharmacyAgent",      monthlyTokenBudget: 1_000_000,  alertThreshold: 0.8 },
  { agentName: "NotificationAgent",  monthlyTokenBudget: 500_000,    alertThreshold: 0.8 },
  { agentName: "FollowUpAgent",      monthlyTokenBudget: 2_000_000,  alertThreshold: 0.8 },
  { agentName: "BillingAgent",       monthlyTokenBudget: 1_000_000,  alertThreshold: 0.8 },
  { agentName: "MarketingAgent",     monthlyTokenBudget: 10_000_000, alertThreshold: 0.8 },
];

// ─── Org chart (mirrors AGENTS.md) ───────────────────────────

const ORG_CHART = [
  {
    agentName: "ConductorAgent",
    title: "CEO",
    department: "Executive",
    reportsTo: null,
    manages: ["IntakeAgent", "TriageAgent", "VideoReviewAgent", "ComplianceAgent", "PrescriptionAgent", "PharmacyAgent", "NotificationAgent", "FollowUpAgent", "BillingAgent", "MarketingAgent"],
    goal: "Ensure all patient cases move through the pipeline without stalling",
    heartbeatIntervalMinutes: 15,
    active: true,
  },
  {
    agentName: "IntakeAgent",
    title: "Clinical Intake Specialist",
    department: "Clinical",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Process every new patient submission within 5 minutes",
    heartbeatIntervalMinutes: null,
    active: true,
  },
  {
    agentName: "TriageAgent",
    title: "Clinical Triage Officer",
    department: "Clinical",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Assess every intake for urgency and eligibility within 2 minutes",
    heartbeatIntervalMinutes: null,
    active: true,
  },
  {
    agentName: "VideoReviewAgent",
    title: "Async Consultation Analyst",
    department: "Clinical",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Analyze every patient video within 10 minutes of upload",
    heartbeatIntervalMinutes: 5,
    active: true,
  },
  {
    agentName: "ComplianceAgent",
    title: "HIPAA & Licensing Officer",
    department: "Clinical",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Validate provider credentials and state licensing for every prescription",
    heartbeatIntervalMinutes: null,
    active: true,
  },
  {
    agentName: "PrescriptionAgent",
    title: "Rx Drafter",
    department: "Prescription",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Draft prescription within 2 minutes of provider approval",
    heartbeatIntervalMinutes: null,
    active: true,
  },
  {
    agentName: "PharmacyAgent",
    title: "Fulfillment Coordinator",
    department: "Prescription",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Route prescription to optimal pharmacy and track to delivery",
    heartbeatIntervalMinutes: null,
    active: true,
  },
  {
    agentName: "NotificationAgent",
    title: "Patient Communications",
    department: "PatientExperience",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Notify patient at every status change within 60 seconds",
    heartbeatIntervalMinutes: 2,
    active: true,
  },
  {
    agentName: "FollowUpAgent",
    title: "Care Continuity Specialist",
    department: "PatientExperience",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Check in with every patient 48 hours post-prescription",
    heartbeatIntervalMinutes: 60,
    active: true,
  },
  {
    agentName: "BillingAgent",
    title: "Revenue Operations",
    department: "PatientExperience",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Process and reconcile all payments, flag failed charges",
    heartbeatIntervalMinutes: null,
    active: true,
  },
  {
    agentName: "MarketingAgent",
    title: "Content & SEO Strategist",
    department: "Marketing",
    reportsTo: "ConductorAgent",
    manages: [],
    goal: "Publish 3 SEO articles/week, generate ad copy for active campaigns",
    heartbeatIntervalMinutes: 1440, // daily
    active: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function generateTicketId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `TKT-${ts}-${rand}`;
}

// ─── Mutations ────────────────────────────────────────────────

export const createTicket = internalMutation({
  args: {
    type: v.string(),
    assignedAgent: v.string(),
    input: v.string(),
    priority: v.number(),
    patientEmail: v.optional(v.string()),
    consultationId: v.optional(v.id("consultations")),
    intakeId: v.optional(v.id("intakes")),
    parentTicketId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ticketId = generateTicketId();
    const id = await ctx.db.insert("agentTickets", {
      ticketId,
      type: args.type,
      status: "queued",
      priority: args.priority,
      assignedAgent: args.assignedAgent,
      patientEmail: args.patientEmail,
      consultationId: args.consultationId,
      intakeId: args.intakeId,
      input: args.input,
      output: undefined,
      error: undefined,
      tokensUsed: undefined,
      startedAt: undefined,
      completedAt: undefined,
      createdAt: Date.now(),
      parentTicketId: args.parentTicketId,
      childTicketIds: [],
    });

    // If this is a child ticket, append to parent's childTicketIds
    if (args.parentTicketId) {
      const parent = await ctx.db
        .query("agentTickets")
        .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.parentTicketId))
        .first();
      if (parent) {
        const existing = parent.childTicketIds ?? [];
        await ctx.db.patch(parent._id, { childTicketIds: [...existing, ticketId] });
      }
    }

    return { id, ticketId };
  },
});

export const checkoutTicket = internalMutation({
  args: {
    ticketId: v.string(),
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("agentTickets")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .first();

    if (!ticket) return false;
    if (ticket.status !== "queued") return false;
    if (ticket.assignedAgent !== args.agentName) return false;

    await ctx.db.patch(ticket._id, {
      status: "in_progress",
      startedAt: Date.now(),
    });
    return true;
  },
});

export const closeTicket = internalMutation({
  args: {
    ticketId: v.string(),
    output: v.string(),
    tokensUsed: v.number(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("agentTickets")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .first();
    if (!ticket) return;

    await ctx.db.patch(ticket._id, {
      status: "complete",
      output: args.output,
      tokensUsed: args.tokensUsed,
      completedAt: Date.now(),
    });
  },
});

export const failTicket = internalMutation({
  args: {
    ticketId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("agentTickets")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .first();
    if (!ticket) return;

    await ctx.db.patch(ticket._id, {
      status: "failed",
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

export const escalateTicket = internalMutation({
  args: {
    ticketId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("agentTickets")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .first();
    if (!ticket) return;

    await ctx.db.patch(ticket._id, {
      status: "escalated",
      error: args.reason,
    });
  },
});

export const recordTokenUsage = internalMutation({
  args: {
    agentName: v.string(),
    tokens: v.number(),
  },
  handler: async (ctx, args) => {
    const month = currentMonth();
    const budget = await ctx.db
      .query("agentBudgets")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .filter((q) => q.eq(q.field("month"), month))
      .first();

    if (!budget) return;

    const newTotal = budget.tokensUsedThisMonth + args.tokens;
    const ratio = newTotal / budget.monthlyTokenBudget;

    const updates: Record<string, unknown> = { tokensUsedThisMonth: newTotal };

    if (ratio >= 1.0 && !budget.paused) {
      updates.paused = true;
    }

    await ctx.db.patch(budget._id, updates);
  },
});

// ─── Queries ──────────────────────────────────────────────────

export const getAgentQueue = internalQuery({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query("agentTickets")
      .withIndex("by_agent", (q) => q.eq("assignedAgent", args.agentName))
      .filter((q) => q.eq(q.field("status"), "queued"))
      .collect();

    // Sort by priority descending (5 = emergency first)
    return tickets.sort((a, b) => b.priority - a.priority);
  },
});

export const isAgentPaused = internalQuery({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    const month = currentMonth();
    const budget = await ctx.db
      .query("agentBudgets")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .filter((q) => q.eq(q.field("month"), month))
      .first();

    return budget?.paused ?? false;
  },
});

// Public query for dashboard use
export const getOrgChart = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agentRoles").collect();
  },
});

export const getBudgetStatus = query({
  args: {},
  handler: async (ctx) => {
    const month = currentMonth();
    return await ctx.db
      .query("agentBudgets")
      .withIndex("by_month", (q) => q.eq("month", month))
      .collect();
  },
});

export const getTicketQueue = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("agentTickets")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .order("desc")
        .take(100);
    }
    return await ctx.db.query("agentTickets").order("desc").take(100);
  },
});

// ─── Actions ──────────────────────────────────────────────────

export const initializeBudgets = internalAction({
  args: {},
  handler: async (ctx) => {
    const month = currentMonth();
    for (const cfg of AGENT_BUDGETS) {
      const existing = await ctx.runQuery(internal.agentOrg.isAgentPaused, {
        agentName: cfg.agentName,
      });
      // Check if row already exists for this month by querying
      const rows = await ctx.runQuery(internal.agentOrg.getBudgetRowForAgent, {
        agentName: cfg.agentName,
        month,
      });
      if (!rows) {
        await ctx.runMutation(internal.agentOrg.insertBudgetRow, {
          agentName: cfg.agentName,
          monthlyTokenBudget: cfg.monthlyTokenBudget,
          tokensUsedThisMonth: 0,
          alertThreshold: cfg.alertThreshold,
          paused: false,
          month,
          lastResetAt: Date.now(),
        });
      }
    }
  },
});

export const seedOrgChart = internalAction({
  args: {},
  handler: async (ctx) => {
    for (const role of ORG_CHART) {
      const existing = await ctx.runQuery(internal.agentOrg.getAgentRole, {
        agentName: role.agentName,
      });
      if (!existing) {
        await ctx.runMutation(internal.agentOrg.insertAgentRole, role);
      }
    }
  },
});

export const conductorHeartbeat = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stalledThresholdMs = 30 * 60 * 1000; // 30 minutes

    // Find all in_progress tickets stalled for >30 minutes
    const inProgress = await ctx.runQuery(internal.agentOrg.getInProgressTickets, {});
    let escalatedCount = 0;

    for (const ticket of inProgress) {
      const startedAt = ticket.startedAt ?? ticket.createdAt;
      if (now - startedAt > stalledThresholdMs) {
        await ctx.runMutation(internal.agentOrg.escalateTicket, {
          ticketId: ticket.ticketId,
          reason: `Stalled: no progress for >${Math.round((now - startedAt) / 60000)} minutes`,
        });
        escalatedCount++;

        // Send escalation email to admin
        await sendEscalationEmail(ticket.ticketId, ticket.assignedAgent, ticket.type);
      }
    }

    // Find priority-5 queued tickets and immediately trigger processing
    const urgentQueued = await ctx.runQuery(internal.agentOrg.getUrgentQueuedTickets, {});
    for (const ticket of urgentQueued) {
      // Fire immediately via scheduler
      if (ticket.assignedAgent === "VideoReviewAgent") {
        await ctx.scheduler.runAfter(0, internal.agentHeartbeats.videoReviewHeartbeat, {});
      } else if (ticket.assignedAgent === "NotificationAgent") {
        await ctx.scheduler.runAfter(0, internal.agentHeartbeats.notificationHeartbeat, {});
      }
    }

    // Log conductor summary
    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "ConductorAgent",
      action: "heartbeat",
      input: { checkedAt: now },
      output: {
        inProgressCount: inProgress.length,
        escalatedCount,
        urgentFiredCount: urgentQueued.length,
      },
      success: true,
      durationMs: Date.now() - now,
    });
  },
});

export const resetMonthlyBudgets = internalAction({
  args: {},
  handler: async (ctx) => {
    const month = currentMonth();
    await ctx.runMutation(internal.agentOrg.resetAllBudgets, { month });
  },
});

// ─── Internal support mutations/queries ──────────────────────

export const insertBudgetRow = internalMutation({
  args: {
    agentName: v.string(),
    monthlyTokenBudget: v.number(),
    tokensUsedThisMonth: v.number(),
    alertThreshold: v.number(),
    paused: v.boolean(),
    month: v.string(),
    lastResetAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentBudgets", args);
  },
});

export const insertAgentRole = internalMutation({
  args: {
    agentName: v.string(),
    title: v.string(),
    department: v.string(),
    reportsTo: v.optional(v.string()),
    manages: v.optional(v.array(v.string())),
    goal: v.string(),
    heartbeatIntervalMinutes: v.optional(v.number()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentRoles", args);
  },
});

export const getBudgetRowForAgent = internalQuery({
  args: { agentName: v.string(), month: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentBudgets")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .filter((q) => q.eq(q.field("month"), args.month))
      .first();
  },
});

export const getAgentRole = internalQuery({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentRoles")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .first();
  },
});

export const getInProgressTickets = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agentTickets")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .collect();
  },
});

export const getUrgentQueuedTickets = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agentTickets")
      .withIndex("by_priority", (q) => q.eq("priority", 5))
      .filter((q) => q.eq(q.field("status"), "queued"))
      .collect();
  },
});

export const resetAllBudgets = internalMutation({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentBudgets")
      .withIndex("by_month", (q) => q.eq("month", args.month))
      .collect();

    for (const row of existing) {
      await ctx.db.patch(row._id, {
        tokensUsedThisMonth: 0,
        paused: false,
        lastResetAt: Date.now(),
      });
    }
  },
});

// Find prescriptions "ready" older than cutoff with no follow-up scheduled
export const getPrescriptionsNeedingFollowUp = internalQuery({
  args: { cutoff: v.number() },
  handler: async (ctx, args) => {
    // Get all prescriptions in "ready" status created before cutoff
    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_status_created", (q) => q.eq("status", "ready"))
      .filter((q) => q.lt(q.field("createdAt"), args.cutoff))
      .take(20);

    // Filter to only those without an existing followUp
    const results = [];
    for (const rx of prescriptions) {
      const existingFollowUp = await ctx.db
        .query("followUps")
        .withIndex("by_consultationId", (q) => q.eq("consultationId", rx.consultationId))
        .first();

      if (!existingFollowUp) {
        results.push(rx);
      }
    }
    return results;
  },
});

export const getMarketingArticleCountThisWeek = internalQuery({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("marketingContent")
      .withIndex("by_type", (q) => q.eq("type", "blog_post"))
      .filter((q) => q.gte(q.field("generatedAt"), args.since))
      .collect();
    return articles.length;
  },
});

export const getTotalMarketingArticleCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db
      .query("marketingContent")
      .withIndex("by_type", (q) => q.eq("type", "blog_post"))
      .collect();
    return articles.length;
  },
});

// ─── Email helper (used internally, no Convex ctx) ───────────

async function sendEscalationEmail(ticketId: string, agentName: string, ticketType: string) {
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (!emailitKey) return;

  const subject = `[ScriptsXO] Escalation: Stalled ticket ${ticketId}`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #b00020;">Agent Ticket Escalated</h2>
      <p><strong>Ticket:</strong> ${ticketId}</p>
      <p><strong>Agent:</strong> ${agentName}</p>
      <p><strong>Type:</strong> ${ticketType}</p>
      <p>This ticket has been in-progress for more than 30 minutes with no completion. Human review required.</p>
    </div>
  `;

  try {
    await fetch("https://api.emailit.com/v1/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${emailitKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: ADMIN_EMAIL,
        subject,
        html,
      }),
    });
  } catch (_) {
    // Non-critical — log was already written to agentLogs
  }
}
