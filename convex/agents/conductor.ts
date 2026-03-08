// @ts-nocheck
/**
 * AGENT CONDUCTOR
 * Orchestrates agent tasks - routes work to the appropriate agent.
 * Also exposes autoPilot for the full async intake-to-prescription pipeline.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { requireCap } from "../lib/serverAuth";
import { CAP } from "../lib/capabilities";

export const dispatch = action({
  args: {
    agentName: v.string(),
    action: v.string(),
    input: v.any(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.VIEW_DASHBOARD);
    const startTime = Date.now();

    try {
      let result: unknown;

      switch (args.agentName) {
        case "intake":
          result = await ctx.runAction(api.agents.intakeAgent.run, args.input);
          break;
        case "triage":
          result = await ctx.runAction(api.agents.triageAgent.run, args.input);
          break;
        case "scheduling":
          result = await ctx.runAction(
            api.agents.schedulingAgent.run,
            args.input
          );
          break;
        case "compliance":
          result = await ctx.runAction(
            api.agents.complianceAgent.run,
            args.input
          );
          break;
        case "consultation":
          result = await ctx.runAction(
            api.agents.consultationAgent.run,
            args.input
          );
          break;
        case "prescription":
          result = await ctx.runAction(
            api.agents.prescriptionAgent.run,
            args.input
          );
          break;
        case "pharmacy":
          result = await ctx.runAction(
            api.agents.pharmacyAgent.run,
            args.input
          );
          break;
        case "followUp":
          result = await ctx.runAction(
            api.agents.followUpAgent.run,
            args.input
          );
          break;
        case "billing":
          result = await ctx.runAction(
            api.agents.billingAgent.run,
            args.input
          );
          break;
        case "quality":
          result = await ctx.runAction(
            api.agents.qualityAgent.run,
            args.input
          );
          break;
        case "credentialVerification":
          // Route to credential verification agent
          result = await ctx.runAction(
            api.agents.credentialVerificationAgent[args.input.method || "verifyProviderNpi"],
            args.input.params || {}
          );
          break;
        case "videoReview":
          result = await ctx.runAction(api.agents.videoReviewAgent.run, args.input);
          break;
        case "marketing":
          result = await ctx.runAction(api.agents.marketingAgent.run, args.input);
          break;
        case "notification":
          result = await ctx.runAction(api.agents.notificationAgent.run, args.input);
          break;
        case "composio":
          // Route to Composio for external service integrations
          result = await ctx.runAction(api.integrations.composio.execute, {
            toolkit: args.input.toolkit,
            actionName: args.input.actionName,
            params: args.input.params || {},
            userId: args.input.userId,
          });
          break;
        default:
          throw new Error(`Unknown agent: ${args.agentName}`);
      }

      const durationMs = Date.now() - startTime;

      await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
        agentName: args.agentName,
        action: args.action,
        input: args.input,
        output: result,
        success: true,
        durationMs,
      });

      return { success: true, data: result, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
        agentName: args.agentName,
        action: args.action,
        input: args.input,
        success: false,
        errorMessage,
        durationMs,
      });

      return { success: false, error: errorMessage, durationMs };
    }
  },
});

/**
 * autoPilot
 * Entry point for the self-driving intake-to-pharmacy pipeline.
 *
 * Creates tickets for each pipeline stage and lets the heartbeat crons
 * process them autonomously. Each stage creates the next stage's ticket.
 *
 * Pipeline:
 *   1. Patient submits video  → videoReview ticket (IntakeAgent/VideoReviewAgent)
 *   2. Video reviewed         → notification ticket (patient notified)
 *   3. Provider approves      → prescription ticket + notification ticket (parallel)
 *   4. Prescription drafted   → pharmacy ticket + notification ticket (parallel)
 *   5. Pharmacy confirms      → notification ticket ("ready for pickup")
 *   6. 48h later              → followUp ticket (FollowUpAgent)
 *
 * No human required until provider calls providerDecide.
 */
export const autoPilot = action({
  args: {
    videoStorageId: v.string(),
    intakeId: v.optional(v.id("intakes")),
    consultationId: v.id("consultations"),
    transcript: v.string(),
    patientEmail: v.string(),
    patientId: v.id("patients"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.VIEW_DASHBOARD);

    const startTime = Date.now();

    // Load patient history for richer AI analysis
    const patient = await ctx.runQuery(
      internal.asyncReview.getPatientInternal,
      { patientId: args.patientId }
    );

    const patientHistory = patient
      ? {
          medicalConditions: patient.medicalConditions,
          currentMedications: patient.currentMedications,
          allergies: patient.allergies,
          chiefComplaint: undefined,
        }
      : {};

    // Stage 1: Create videoReview ticket — VideoReviewAgent picks this up on next heartbeat
    const { ticketId: videoTicketId } = await ctx.runMutation(
      internal.agentOrg.createTicket,
      {
        type: "videoReview",
        assignedAgent: "VideoReviewAgent",
        input: JSON.stringify({
          consultationId: args.consultationId,
          patientId: args.patientId,
          transcript: args.transcript,
          patientHistory,
          videoStorageId: args.videoStorageId,
        }),
        priority: 3,
        patientEmail: args.patientEmail,
        consultationId: args.consultationId,
        intakeId: args.intakeId,
      }
    );

    // Trigger immediate processing (don't wait for next 5-min heartbeat)
    await ctx.scheduler.runAfter(0, internal.agentHeartbeats.videoReviewHeartbeat, {});

    // Log the pipeline kickoff
    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "conductor.autoPilot",
      action: "pipelineKickoff",
      input: {
        consultationId: args.consultationId,
        patientId: args.patientId,
        videoStorageId: args.videoStorageId,
        intakeId: args.intakeId,
      },
      output: { videoTicketId },
      success: true,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      videoTicketId,
      durationMs: Date.now() - startTime,
      message: "Pipeline initiated. VideoReviewAgent processing asynchronously.",
    };
  },
});

/**
 * onProviderApproved
 * Called after a provider approves a video review. Creates the downstream
 * prescription and notification tickets in parallel.
 *
 * This is stage 3 of the self-driving pipeline.
 */
export const onProviderApproved = action({
  args: {
    consultationId: v.id("consultations"),
    patientId: v.id("patients"),
    patientEmail: v.string(),
    providerId: v.id("providers"),
    pharmacyDetails: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.VIEW_DASHBOARD);

    // Prescription ticket — PrescriptionAgent drafts the Rx
    const { ticketId: rxTicketId } = await ctx.runMutation(
      internal.agentOrg.createTicket,
      {
        type: "prescription",
        assignedAgent: "PrescriptionAgent",
        input: JSON.stringify({
          consultationId: args.consultationId,
          patientId: args.patientId,
          providerId: args.providerId,
        }),
        priority: 4,
        patientEmail: args.patientEmail,
        consultationId: args.consultationId,
      }
    );

    // Notification ticket — patient notified of approval in parallel
    await ctx.runMutation(internal.agentOrg.createTicket, {
      type: "notification",
      assignedAgent: "NotificationAgent",
      input: JSON.stringify({
        task: "sendApproved",
        patientEmail: args.patientEmail,
        consultationId: args.consultationId,
        pharmacyDetails: args.pharmacyDetails,
      }),
      priority: 4,
      patientEmail: args.patientEmail,
      consultationId: args.consultationId,
      parentTicketId: rxTicketId,
    });

    // Trigger notification processing immediately
    await ctx.scheduler.runAfter(0, internal.agentHeartbeats.notificationHeartbeat, {});

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "conductor.onProviderApproved",
      action: "createDownstreamTickets",
      input: { consultationId: args.consultationId },
      output: { rxTicketId },
      success: true,
      durationMs: 0,
    });

    return { success: true, rxTicketId };
  },
});

/**
 * onPharmacyConfirmed
 * Called after pharmacy confirms the prescription is ready for pickup.
 * Creates a notification ticket to alert the patient.
 *
 * This is stage 5 of the self-driving pipeline.
 */
export const onPharmacyConfirmed = action({
  args: {
    consultationId: v.id("consultations"),
    patientEmail: v.string(),
    prescriptionDetails: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.VIEW_DASHBOARD);

    await ctx.runMutation(internal.agentOrg.createTicket, {
      type: "notification",
      assignedAgent: "NotificationAgent",
      input: JSON.stringify({
        task: "sendPrescriptionSent",
        patientEmail: args.patientEmail,
        prescriptionDetails: args.prescriptionDetails,
      }),
      priority: 4,
      patientEmail: args.patientEmail,
      consultationId: args.consultationId,
    });

    await ctx.scheduler.runAfter(0, internal.agentHeartbeats.notificationHeartbeat, {});

    return { success: true };
  },
});
