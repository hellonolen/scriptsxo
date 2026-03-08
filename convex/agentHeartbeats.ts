// @ts-nocheck
/**
 * AGENT HEARTBEATS
 * Each function is called by cron. Agents wake, check their ticket queue,
 * process work, close tickets, then sleep until next heartbeat.
 *
 * Pattern:
 *   1. Check if agent is budget-paused
 *   2. Get queued tickets for this agent (max 5 per heartbeat to avoid timeouts)
 *   3. Atomically check out each ticket
 *   4. Run agent logic
 *   5. Close ticket with output
 *   6. Record token usage
 *   7. Create downstream tickets (self-driving pipeline)
 */
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const MAX_PER_HEARTBEAT = 5;
const HOURS_48 = 48 * 60 * 60 * 1000;

// ─── VideoReview Heartbeat ────────────────────────────────────

export const videoReviewHeartbeat = internalAction({
  args: {},
  handler: async (ctx) => {
    const paused = await ctx.runQuery(internal.agentOrg.isAgentPaused, {
      agentName: "VideoReviewAgent",
    });
    if (paused) return;

    const queue = await ctx.runQuery(internal.agentOrg.getAgentQueue, {
      agentName: "VideoReviewAgent",
    });
    const batch = queue.slice(0, MAX_PER_HEARTBEAT);

    for (const ticket of batch) {
      const checkedOut = await ctx.runMutation(internal.agentOrg.checkoutTicket, {
        ticketId: ticket.ticketId,
        agentName: "VideoReviewAgent",
      });
      if (!checkedOut) continue;

      try {
        const input = JSON.parse(ticket.input);

        // Run AI video review
        const result = await ctx.runAction(api.agents.videoReviewAgent.run, {
          consultationId: input.consultationId,
          patientId: input.patientId,
          transcript: input.transcript,
          patientHistory: input.patientHistory ?? {},
        });

        const tokensUsed = 5000;
        await ctx.runMutation(internal.agentOrg.closeTicket, {
          ticketId: ticket.ticketId,
          output: JSON.stringify(result),
          tokensUsed,
        });

        await ctx.runMutation(internal.agentOrg.recordTokenUsage, {
          agentName: "VideoReviewAgent",
          tokens: tokensUsed,
        });

        // Chain: create notification ticket for patient
        if (ticket.patientEmail) {
          await ctx.runMutation(internal.agentOrg.createTicket, {
            type: "notification",
            assignedAgent: "NotificationAgent",
            input: JSON.stringify({
              task: "sendVideoReceived",
              patientEmail: ticket.patientEmail,
              consultationId: input.consultationId,
            }),
            priority: 3,
            patientEmail: ticket.patientEmail,
            consultationId: ticket.consultationId,
            parentTicketId: ticket.ticketId,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await ctx.runMutation(internal.agentOrg.failTicket, {
          ticketId: ticket.ticketId,
          error: message,
        });
      }
    }
  },
});

// ─── Notification Heartbeat ───────────────────────────────────

export const notificationHeartbeat = internalAction({
  args: {},
  handler: async (ctx) => {
    const paused = await ctx.runQuery(internal.agentOrg.isAgentPaused, {
      agentName: "NotificationAgent",
    });
    if (paused) return;

    const queue = await ctx.runQuery(internal.agentOrg.getAgentQueue, {
      agentName: "NotificationAgent",
    });
    const batch = queue.slice(0, MAX_PER_HEARTBEAT);

    for (const ticket of batch) {
      const checkedOut = await ctx.runMutation(internal.agentOrg.checkoutTicket, {
        ticketId: ticket.ticketId,
        agentName: "NotificationAgent",
      });
      if (!checkedOut) continue;

      try {
        const input = JSON.parse(ticket.input);

        let result;
        switch (input.task) {
          case "sendVideoReceived":
            result = await ctx.runAction(api.agents.notificationAgent.sendVideoReceived, {
              patientEmail: input.patientEmail,
              consultationId: input.consultationId,
            });
            break;
          case "sendApproved":
            result = await ctx.runAction(api.agents.notificationAgent.sendApproved, {
              patientEmail: input.patientEmail,
              consultationId: input.consultationId,
              pharmacyDetails: input.pharmacyDetails,
            });
            break;
          case "sendRejected":
            result = await ctx.runAction(api.agents.notificationAgent.sendRejected, {
              patientEmail: input.patientEmail,
              consultationId: input.consultationId,
              reason: input.reason,
              nextSteps: input.nextSteps,
            });
            break;
          case "sendPrescriptionSent":
            result = await ctx.runAction(api.agents.notificationAgent.sendPrescriptionSent, {
              patientEmail: input.patientEmail,
              prescriptionDetails: input.prescriptionDetails,
            });
            break;
          default:
            throw new Error(`Unknown notification task: ${input.task}`);
        }

        const tokensUsed = 1000;
        await ctx.runMutation(internal.agentOrg.closeTicket, {
          ticketId: ticket.ticketId,
          output: JSON.stringify(result),
          tokensUsed,
        });

        await ctx.runMutation(internal.agentOrg.recordTokenUsage, {
          agentName: "NotificationAgent",
          tokens: tokensUsed,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await ctx.runMutation(internal.agentOrg.failTicket, {
          ticketId: ticket.ticketId,
          error: message,
        });
      }
    }
  },
});

// ─── Follow-Up Heartbeat ──────────────────────────────────────

export const followUpHeartbeat = internalAction({
  args: {},
  handler: async (ctx) => {
    const paused = await ctx.runQuery(internal.agentOrg.isAgentPaused, {
      agentName: "FollowUpAgent",
    });
    if (paused) return;

    // Find prescriptions that are "ready" and older than 48h with no follow-up ticket
    const cutoff = Date.now() - HOURS_48;
    const pendingFollowUps = await ctx.runQuery(
      internal.agentOrg.getPrescriptionsNeedingFollowUp,
      { cutoff }
    );

    const batch = pendingFollowUps.slice(0, MAX_PER_HEARTBEAT);

    for (const prescription of batch) {
      // Create follow-up ticket
      const { ticketId } = await ctx.runMutation(internal.agentOrg.createTicket, {
        type: "followUp",
        assignedAgent: "FollowUpAgent",
        input: JSON.stringify({
          prescriptionId: prescription._id,
          patientId: prescription.patientId,
          consultationId: prescription.consultationId,
        }),
        priority: 2,
        consultationId: prescription.consultationId,
      });

      // Immediately check out and process
      const checkedOut = await ctx.runMutation(internal.agentOrg.checkoutTicket, {
        ticketId,
        agentName: "FollowUpAgent",
      });
      if (!checkedOut) continue;

      try {
        const result = await ctx.runAction(api.agents.followUpAgent.run, {
          prescriptionId: prescription._id,
          consultationId: prescription.consultationId,
          patientId: prescription.patientId,
        });

        const tokensUsed = 2000;
        await ctx.runMutation(internal.agentOrg.closeTicket, {
          ticketId,
          output: JSON.stringify(result),
          tokensUsed,
        });

        await ctx.runMutation(internal.agentOrg.recordTokenUsage, {
          agentName: "FollowUpAgent",
          tokens: tokensUsed,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await ctx.runMutation(internal.agentOrg.failTicket, {
          ticketId,
          error: message,
        });
      }
    }
  },
});

// ─── Marketing Heartbeat ──────────────────────────────────────

const BLOG_TOPICS = [
  "blood pressure management",
  "cholesterol medication guide",
  "thyroid health",
  "diabetes type 2",
  "common allergy treatments",
];

export const marketingHeartbeat = internalAction({
  args: {},
  handler: async (ctx) => {
    const paused = await ctx.runQuery(internal.agentOrg.isAgentPaused, {
      agentName: "MarketingAgent",
    });
    if (paused) return;

    // Check how many articles were published this week
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const articleCount = await ctx.runQuery(
      internal.agentOrg.getMarketingArticleCountThisWeek,
      { since: weekStart }
    );

    if (articleCount >= 3) return;

    // Pick the next topic in rotation based on total published count
    const totalPublished = await ctx.runQuery(
      internal.agentOrg.getTotalMarketingArticleCount,
      {}
    );
    const topic = BLOG_TOPICS[totalPublished % BLOG_TOPICS.length];

    // Create marketing ticket
    const { ticketId } = await ctx.runMutation(internal.agentOrg.createTicket, {
      type: "marketing",
      assignedAgent: "MarketingAgent",
      input: JSON.stringify({ topic, action: "generateBlogPost" }),
      priority: 1,
    });

    const checkedOut = await ctx.runMutation(internal.agentOrg.checkoutTicket, {
      ticketId,
      agentName: "MarketingAgent",
    });
    if (!checkedOut) return;

    try {
      const result = await ctx.runAction(api.agents.marketingAgent.run, {
        task: "generateBlogPost",
        input: { topic },
      });

      const tokensUsed = 8000;
      await ctx.runMutation(internal.agentOrg.closeTicket, {
        ticketId,
        output: JSON.stringify(result),
        tokensUsed,
      });

      await ctx.runMutation(internal.agentOrg.recordTokenUsage, {
        agentName: "MarketingAgent",
        tokens: tokensUsed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await ctx.runMutation(internal.agentOrg.failTicket, {
        ticketId,
        error: message,
      });
    }
  },
});
