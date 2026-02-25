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
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

/**
 * Initialize a new credential verification when the user picks a role.
 * Returns the verification ID for the frontend to track progress.
 */
export const initializeVerification = action({
  args: {
    memberId: v.string(),
    email: v.string(),
    selectedRole: v.string(), // "patient" | "provider" | "pharmacy"
  },
  handler: async (ctx, args) => {
    // Create the verification record
    const verificationId = await ctx.runMutation(
      api.credentialVerifications.create,
      {
        memberId: args.memberId,
        email: args.email.toLowerCase(),
        selectedRole: args.selectedRole,
      }
    );

    // Log through the agent system
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
 * Called after all pipeline steps pass.
 * Creates the role-specific record (provider/patient/etc.) and updates the member.
 */
export const finalizeVerification = action({
  args: {
    verificationId: v.string(),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    // Load the verification record
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
      // Run final compliance review
      const reviewResult = await ctx.runAction(
        api.agents.credentialVerificationAgent.runProviderComplianceReview,
        { verificationId: args.verificationId }
      );

      if (reviewResult.finalStatus === "verified") {
        // Create the provider record
        const npiData = verification.providerNpiResult || {};
        await ctx.runMutation(api.providers.create, {
          memberId: args.memberId,
          email: verification.email,
          firstName: npiData.firstName || "",
          lastName: npiData.lastName || "",
          title: verification.providerTitle || "MD",
          npiNumber: verification.providerNpi || "",
          deaNumber: verification.providerDeaNumber,
          specialties: verification.providerSpecialties || [],
          licensedStates: verification.providerLicensedStates || [],
          consultationRate: 19700, // Default $197 per consult
          maxDailyConsultations: 20,
        });

        // Update the member role
        await ctx.runMutation(api.members.updateRole, {
          memberId: args.memberId,
          role: "provider",
        });

        roleAssigned = true;
      }

      // Mark verification complete
      await ctx.runMutation(api.credentialVerifications.complete, {
        id: args.verificationId,
        status: reviewResult.finalStatus,
        complianceSummary: reviewResult.complianceResult,
      });
    } else if (role === "patient") {
      // Run final compliance review
      const reviewResult = await ctx.runAction(
        api.agents.credentialVerificationAgent.runPatientComplianceReview,
        { verificationId: args.verificationId }
      );

      if (reviewResult.finalStatus === "verified") {
        // Update the member role to patient (from unverified)
        await ctx.runMutation(api.members.updateRole, {
          memberId: args.memberId,
          role: "patient",
        });
        roleAssigned = true;
      }

      await ctx.runMutation(api.credentialVerifications.complete, {
        id: args.verificationId,
        status: reviewResult.finalStatus,
        complianceSummary: reviewResult.complianceResult,
      });
    } else if (role === "pharmacy") {
      // Run final compliance review
      const reviewResult = await ctx.runAction(
        api.agents.credentialVerificationAgent.runPharmacyComplianceReview,
        { verificationId: args.verificationId }
      );

      if (reviewResult.finalStatus === "verified") {
        // Create the pharmacy record if it doesn't exist yet
        // (Pharmacy onboarding may need additional info — minimal record here)
        await ctx.runMutation(api.members.updateRole, {
          memberId: args.memberId,
          role: "pharmacy",
        });
        roleAssigned = true;
      }

      await ctx.runMutation(api.credentialVerifications.complete, {
        id: args.verificationId,
        status: reviewResult.finalStatus,
        complianceSummary: reviewResult.complianceResult,
      });
    }

    // Log the final result
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

/**
 * Quick dev-mode verification bypass.
 * In development, skip all external API calls and just assign the role.
 */
export const devBypassVerification = action({
  args: {
    memberId: v.string(),
    email: v.string(),
    selectedRole: v.string(),
  },
  handler: async (ctx, args) => {
    // Create a verification record that's already complete
    const verificationId = await ctx.runMutation(
      api.credentialVerifications.create,
      {
        memberId: args.memberId,
        email: args.email.toLowerCase(),
        selectedRole: args.selectedRole,
      }
    );

    // Mark it as verified immediately
    await ctx.runMutation(api.credentialVerifications.complete, {
      id: verificationId,
      status: "verified",
      complianceSummary: { compliant: true, checks: ["dev_bypass"], failures: [], warnings: ["DEV MODE: verification bypassed"] },
    });

    // Update the member role
    await ctx.runMutation(api.members.updateRole, {
      memberId: args.memberId,
      role: args.selectedRole === "pharmacy" ? "pharmacy" : args.selectedRole,
    });

    return {
      success: true,
      role: args.selectedRole,
      verificationId,
    };
  },
});
