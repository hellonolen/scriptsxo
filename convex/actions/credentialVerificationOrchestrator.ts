"use node";
// @ts-nocheck
/**
 * CREDENTIAL VERIFICATION ORCHESTRATOR
 * Coordinates the agentic verification pipeline:
 *   1. User selects a role (patient / provider / pharmacy)
 *   2. Creates a verification record
 *   3. Routes through role-specific agent pipeline
 *   4. On completion: updates member role + creates role-specific records
 *
 * Frontend pages call these orchestrator actions; the orchestrator
 * calls the credentialVerificationAgent under the hood.
 *
 * Authorization model:
 *   callerId — memberId of the person initiating verification (themselves).
 *   finalizeVerification must be called with a caller that has INTAKE_REVIEW +
 *   USER_MANAGE (admin or platform owner). The typical caller is the agentic
 *   orchestration triggered by an admin-level process.
 *
 * NOTE: devBypassVerification has been removed. It was a role-elevation backdoor.
 * To test verification flows in dev, create a real verification record and
 * manually complete it via the Convex dashboard.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

/**
 * Initialize a new credential verification when the user picks a role.
 * callerId must be the same member as memberId (self-service start).
 */
export const initializeVerification = action({
  args: {
    callerId: v.optional(v.string()),
    memberId: v.string(),
    email: v.string(),
    selectedRole: v.string(), // "patient" | "provider" | "pharmacy"
  },
  handler: async (ctx, args) => {
    const verificationId = await ctx.runMutation(
      api.credentialVerifications.create,
      {
        callerId: args.callerId,
        memberId: args.memberId,
        email: args.email.toLowerCase(),
        selectedRole: args.selectedRole,
      }
    );

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "credentialVerificationOrchestrator",
      action: "initialize",
      input: { memberId: args.memberId, role: args.selectedRole },
      output: { verificationId },
      success: true,
    });

    return { verificationId };
  },
});

/**
 * Complete verification and assign the role.
 * callerId must be an admin or platform owner (INTAKE_REVIEW + USER_MANAGE).
 * Typically called by the agent orchestration pipeline.
 */
export const finalizeVerification = action({
  args: {
    callerId: v.optional(v.string()),
    verificationId: v.string(),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.runQuery(
      api.credentialVerifications.getById,
      { id: args.verificationId }
    );

    if (!verification) {
      throw new Error("Verification record not found");
    }

    const role = verification.selectedRole;
    let roleAssigned = false;

    if (role === "provider") {
      const reviewResult = await ctx.runAction(
        api.agents.credentialVerificationAgent.runProviderComplianceReview,
        { verificationId: args.verificationId }
      );

      if (reviewResult.finalStatus === "verified") {
        const npiData = verification.providerNpiResult || {};
        await ctx.runMutation(api.providers.create, {
          callerId: args.callerId,
          memberId: args.memberId,
          email: verification.email,
          firstName: npiData.firstName || "",
          lastName: npiData.lastName || "",
          title: verification.providerTitle || "MD",
          npiNumber: verification.providerNpi || "",
          deaNumber: verification.providerDeaNumber,
          specialties: verification.providerSpecialties || [],
          licensedStates: verification.providerLicensedStates || [],
          consultationRate: 19700,
          maxDailyConsultations: 20,
        });

        await ctx.runMutation(api.members.updateRole, {
          callerId: args.callerId,
          memberId: args.memberId,
          role: "provider",
        });

        roleAssigned = true;
      }

      await ctx.runMutation(api.credentialVerifications.complete, {
        callerId: args.callerId,
        id: args.verificationId,
        status: reviewResult.finalStatus,
        complianceSummary: reviewResult.complianceResult,
      });

    } else if (role === "patient") {
      const reviewResult = await ctx.runAction(
        api.agents.credentialVerificationAgent.runPatientComplianceReview,
        { verificationId: args.verificationId }
      );

      if (reviewResult.finalStatus === "verified") {
        await ctx.runMutation(api.members.updateRole, {
          callerId: args.callerId,
          memberId: args.memberId,
          role: "patient",
        });
        roleAssigned = true;
      }

      await ctx.runMutation(api.credentialVerifications.complete, {
        callerId: args.callerId,
        id: args.verificationId,
        status: reviewResult.finalStatus,
        complianceSummary: reviewResult.complianceResult,
      });

    } else if (role === "pharmacy") {
      const reviewResult = await ctx.runAction(
        api.agents.credentialVerificationAgent.runPharmacyComplianceReview,
        { verificationId: args.verificationId }
      );

      if (reviewResult.finalStatus === "verified") {
        await ctx.runMutation(api.members.updateRole, {
          callerId: args.callerId,
          memberId: args.memberId,
          role: "pharmacy",
        });
        roleAssigned = true;
      }

      await ctx.runMutation(api.credentialVerifications.complete, {
        callerId: args.callerId,
        id: args.verificationId,
        status: reviewResult.finalStatus,
        complianceSummary: reviewResult.complianceResult,
      });
    }

    await ctx.runMutation(internal.agents.agentLogger.logAgentAction, {
      agentName: "credentialVerificationOrchestrator",
      action: "finalize",
      input: { verificationId: args.verificationId, role },
      output: { roleAssigned, role },
      success: roleAssigned,
    });

    return {
      success: roleAssigned,
      role: roleAssigned ? role : "unverified",
      verificationStatus: roleAssigned ? "verified" : "rejected",
    };
  },
});
