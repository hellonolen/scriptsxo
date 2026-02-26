"use node";
// @ts-nocheck
/**
 * CREDENTIAL VERIFICATION AGENT
 * AI-driven credential verification for all roles:
 *   - Patient: Stripe Identity (gov ID + selfie)
 *   - Provider: NPI Registry + license OCR + DEA + compliance
 *   - Pharmacy: NCPDP / NPI registry lookup + compliance
 *
 * Each pipeline calls existing action modules (verifyLicense, stripeIdentity,
 * scanDocument, complianceAgent) and records results to the credentialVerifications
 * state machine.
 */
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Verify a provider's NPI number via the NPPES registry.
 * Stores result on the credentialVerification record.
 */
export const verifyProviderNpi = action({
  args: {
    verificationId: v.string(),
    npiNumber: v.string(),
    expectedFirstName: v.optional(v.string()),
    expectedLastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Call existing NPI verification action
    const npiResult = await ctx.runAction(api.actions.verifyLicense.verifyNpi, {
      npiNumber: args.npiNumber,
      expectedFirstName: args.expectedFirstName,
      expectedLastName: args.expectedLastName,
    });

    // Store NPI result on the verification record
    await ctx.runMutation(api.credentialVerifications.updateProviderNpi, {
      id: args.verificationId,
      npiNumber: args.npiNumber,
      npiResult,
    });

    // If NPI is verified, extract provider details
    if (npiResult.verified) {
      // Determine title from credential
      let title = "MD";
      if (npiResult.credential) {
        const cred = npiResult.credential.toUpperCase();
        if (cred.includes("DO")) title = "DO";
        else if (cred.includes("NP") || cred.includes("DNP")) title = "NP";
        else if (cred.includes("PA")) title = "PA";
        else if (cred.includes("APRN")) title = "APRN";
      }

      await ctx.runMutation(api.credentialVerifications.updateProviderDetails, {
        id: args.verificationId,
        title,
        specialties: npiResult.taxonomyDescription
          ? [npiResult.taxonomyDescription]
          : [],
      });

      // If state info available, store licensed states
      if (npiResult.state) {
        await ctx.runMutation(api.credentialVerifications.updateProviderLicense, {
          id: args.verificationId,
          licensedStates: [npiResult.state],
        });
      }

      // Advance step
      await ctx.runMutation(api.credentialVerifications.advanceStep, {
        id: args.verificationId,
        completedStep: "npi_check",
        nextStep: "license_scan",
      });
    } else {
      // Record error but don't fail the whole verification yet
      await ctx.runMutation(api.credentialVerifications.recordError, {
        id: args.verificationId,
        step: "npi_check",
        message: `NPI verification failed: ${npiResult.issues.join("; ")}`,
      });
    }

    // Also check prescribing authority
    let prescribingResult = null;
    if (npiResult.verified) {
      prescribingResult = await ctx.runAction(
        api.actions.verifyLicense.checkPrescribingAuthority,
        { npiNumber: args.npiNumber }
      );
    }

    return {
      npiResult,
      prescribingResult,
      verified: npiResult.verified,
    };
  },
});

/**
 * Process a provider license scan result.
 * Called after the frontend uploads and OCR scans the document.
 */
export const processProviderLicense = action({
  args: {
    verificationId: v.string(),
    licenseScanResult: v.any(), // from scanDocument OCR
    licenseFileId: v.optional(v.string()),
    npiFirstName: v.optional(v.string()),
    npiLastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Store the license scan result
    await ctx.runMutation(api.credentialVerifications.updateProviderLicense, {
      id: args.verificationId,
      licenseFileId: args.licenseFileId,
      licenseScanResult: args.licenseScanResult,
    });

    // Cross-reference name from license with NPI data
    const issues: string[] = [];
    if (args.licenseScanResult && args.npiFirstName) {
      const scanName = (args.licenseScanResult.name || "").toLowerCase();
      if (
        scanName &&
        !scanName.includes(args.npiFirstName.toLowerCase()) &&
        !scanName.includes((args.npiLastName || "").toLowerCase())
      ) {
        issues.push(
          `License name "${args.licenseScanResult.name}" does not match NPI name "${args.npiFirstName} ${args.npiLastName}"`
        );
      }
    }

    // Extract state from license if available
    if (args.licenseScanResult?.state) {
      const currentVerification = await ctx.runQuery(
        api.credentialVerifications.getById,
        { id: args.verificationId }
      );
      const existingStates = currentVerification?.providerLicensedStates || [];
      const licenseState = args.licenseScanResult.state;
      if (!existingStates.includes(licenseState)) {
        await ctx.runMutation(api.credentialVerifications.updateProviderLicense, {
          id: args.verificationId,
          licensedStates: [...existingStates, licenseState],
        });
      }
    }

    if (issues.length > 0) {
      await ctx.runMutation(api.credentialVerifications.recordError, {
        id: args.verificationId,
        step: "license_scan",
        message: issues.join("; "),
      });
    }

    // Advance to DEA entry (optional) step
    await ctx.runMutation(api.credentialVerifications.advanceStep, {
      id: args.verificationId,
      completedStep: "license_scan",
      nextStep: "dea_entry",
    });

    return {
      issues,
      crossReferenceOk: issues.length === 0,
    };
  },
});

/**
 * Store the provider's optional DEA number and advance.
 */
export const processProviderDea = action({
  args: {
    verificationId: v.string(),
    deaNumber: v.optional(v.string()),
    skipDea: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.deaNumber && !args.skipDea) {
      await ctx.runMutation(api.credentialVerifications.updateProviderDea, {
        id: args.verificationId,
        deaNumber: args.deaNumber,
      });
    }

    // Advance to compliance review
    await ctx.runMutation(api.credentialVerifications.advanceStep, {
      id: args.verificationId,
      completedStep: "dea_entry",
      nextStep: "compliance_review",
    });

    return { success: true };
  },
});

/**
 * Run the compliance agent review for a provider verification.
 */
export const runProviderComplianceReview = action({
  args: {
    verificationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Load the current verification record
    const verification = await ctx.runQuery(
      api.credentialVerifications.getById,
      { id: args.verificationId }
    );
    if (!verification) throw new Error("Verification record not found");

    // Run the compliance agent
    const complianceResult = await ctx.runAction(api.agents.complianceAgent.run, {
      checkType: "provider_credential_verification",
      providerId: verification.memberId,
      providerLicense: verification.providerNpi || "",
      deaNumber: verification.providerDeaNumber || "",
    });

    // Store compliance result
    await ctx.runMutation(api.credentialVerifications.updateCompliance, {
      id: args.verificationId,
      complianceSummary: complianceResult,
    });

    // Create compliance records
    const complianceRecordIds: string[] = [];

    // NPI compliance record
    const npiRecordId = await ctx.runMutation(api.compliance.createCheck, {
      entityType: "credential_verification",
      entityId: args.verificationId,
      checkType: "npi_verification",
      status: verification.providerNpiResult?.verified ? "passed" : "failed",
      details: verification.providerNpiResult,
      checkedBy: "credential_verification_agent",
    });
    complianceRecordIds.push(npiRecordId);

    // License compliance record
    if (verification.providerLicenseScanResult) {
      const licenseRecordId = await ctx.runMutation(api.compliance.createCheck, {
        entityType: "credential_verification",
        entityId: args.verificationId,
        checkType: "license_scan",
        status: "passed",
        details: verification.providerLicenseScanResult,
        checkedBy: "credential_verification_agent",
      });
      complianceRecordIds.push(licenseRecordId);
    }

    // Store compliance record IDs
    await ctx.runMutation(api.credentialVerifications.updateCompliance, {
      id: args.verificationId,
      complianceSummary: complianceResult,
      complianceRecordIds,
    });

    // Determine final status
    const npiOk = verification.providerNpiResult?.verified === true;
    const hasErrors = (verification.errors || []).length > 0;
    const isCompliant = complianceResult.compliant !== false;
    const finalStatus = npiOk && !hasErrors && isCompliant ? "verified" : "rejected";

    return {
      complianceResult,
      finalStatus,
      npiOk,
      hasErrors,
      isCompliant,
    };
  },
});

/**
 * Initialize a patient Stripe Identity verification session.
 */
export const initPatientVerification = action({
  args: {
    verificationId: v.string(),
    email: v.string(),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    // Create Stripe Identity session using existing action
    // Note: existing action uses "patientEmail" arg and returns "verificationSessionId"
    const stripeResult = await ctx.runAction(
      api.actions.stripeIdentity.createVerificationSession,
      {
        patientEmail: args.email,
      }
    );

    const sessionId = stripeResult.verificationSessionId;

    // Store Stripe session data
    await ctx.runMutation(api.credentialVerifications.updatePatientStripe, {
      id: args.verificationId,
      stripeSessionId: sessionId,
      stripeStatus: "requires_input",
    });

    // Advance step
    await ctx.runMutation(api.credentialVerifications.advanceStep, {
      id: args.verificationId,
      completedStep: "role_selected",
      nextStep: "stripe_identity",
    });

    return {
      clientSecret: stripeResult.clientSecret,
      sessionId,
    };
  },
});

/**
 * Check and finalize patient Stripe Identity verification status.
 */
export const checkPatientVerification = action({
  args: {
    verificationId: v.string(),
    stripeSessionId: v.string(),
    patientEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Load verification to get the email if not passed
    let email = args.patientEmail;
    if (!email) {
      const verification = await ctx.runQuery(
        api.credentialVerifications.getById,
        { id: args.verificationId }
      );
      email = verification?.email || "";
    }

    // Check Stripe Identity status
    // Note: existing action uses "verificationSessionId" and "patientEmail" args
    const statusResult = await ctx.runAction(
      api.actions.stripeIdentity.checkVerificationStatus,
      {
        verificationSessionId: args.stripeSessionId,
        patientEmail: email,
      }
    );

    // Update verification record
    await ctx.runMutation(api.credentialVerifications.updatePatientStripe, {
      id: args.verificationId,
      stripeStatus: statusResult.status,
      idScanResult: statusResult,
    });

    if (statusResult.status === "verified") {
      // Create compliance record
      await ctx.runMutation(api.compliance.createCheck, {
        entityType: "credential_verification",
        entityId: args.verificationId,
        checkType: "id_verification",
        status: "passed",
        details: { method: "stripe_identity", result: statusResult },
        checkedBy: "credential_verification_agent",
      });

      await ctx.runMutation(api.credentialVerifications.advanceStep, {
        id: args.verificationId,
        completedStep: "stripe_identity",
        nextStep: "compliance_review",
      });
    } else if (
      statusResult.status === "canceled" ||
      statusResult.status === "requires_input"
    ) {
      // Not yet complete, don't advance
    }

    return {
      status: statusResult.status,
      verified: statusResult.status === "verified",
    };
  },
});

/**
 * Run compliance review for patient verification and finalize.
 */
export const runPatientComplianceReview = action({
  args: {
    verificationId: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.runQuery(
      api.credentialVerifications.getById,
      { id: args.verificationId }
    );
    if (!verification) throw new Error("Verification record not found");

    // Run compliance agent for patient
    const complianceResult = await ctx.runAction(api.agents.complianceAgent.run, {
      checkType: "patient_identity_verification",
      patientId: verification.memberId,
    });

    await ctx.runMutation(api.credentialVerifications.updateCompliance, {
      id: args.verificationId,
      complianceSummary: complianceResult,
    });

    const stripeOk = verification.patientStripeStatus === "verified";
    const isCompliant = complianceResult.compliant !== false;
    const finalStatus = stripeOk && isCompliant ? "verified" : "rejected";

    return { complianceResult, finalStatus, stripeOk, isCompliant };
  },
});

/**
 * Verify a pharmacy via NPI lookup (pharmacies also have NPIs).
 */
export const verifyPharmacy = action({
  args: {
    verificationId: v.string(),
    ncpdpId: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    pharmacyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let npiResult = null;
    let verified = false;

    // If NPI provided, verify via NPPES
    if (args.npiNumber) {
      npiResult = await ctx.runAction(api.actions.verifyLicense.verifyNpi, {
        npiNumber: args.npiNumber,
      });
      verified = npiResult.verified;
    }

    // Store pharmacy data
    await ctx.runMutation(api.credentialVerifications.updatePharmacy, {
      id: args.verificationId,
      ncpdpId: args.ncpdpId,
      npi: args.npiNumber,
      pharmacyName: args.pharmacyName || npiResult?.organizationName || "",
      registryResult: npiResult,
    });

    if (verified || args.ncpdpId) {
      // Advance to compliance review
      await ctx.runMutation(api.credentialVerifications.advanceStep, {
        id: args.verificationId,
        completedStep: "ncpdp_check",
        nextStep: "compliance_review",
      });
    } else {
      await ctx.runMutation(api.credentialVerifications.recordError, {
        id: args.verificationId,
        step: "ncpdp_check",
        message: npiResult
          ? `Pharmacy NPI verification failed: ${npiResult.issues.join("; ")}`
          : "No NPI or NCPDP ID provided",
      });
    }

    return { npiResult, verified: verified || !!args.ncpdpId };
  },
});

/**
 * Run compliance review for pharmacy verification and finalize.
 */
export const runPharmacyComplianceReview = action({
  args: {
    verificationId: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.runQuery(
      api.credentialVerifications.getById,
      { id: args.verificationId }
    );
    if (!verification) throw new Error("Verification record not found");

    // Run compliance agent
    const complianceResult = await ctx.runAction(api.agents.complianceAgent.run, {
      checkType: "pharmacy_verification",
    });

    await ctx.runMutation(api.credentialVerifications.updateCompliance, {
      id: args.verificationId,
      complianceSummary: complianceResult,
    });

    const registryOk =
      verification.pharmacyRegistryResult?.verified === true ||
      !!verification.pharmacyNcpdpId;
    const isCompliant = complianceResult.compliant !== false;
    const finalStatus = registryOk && isCompliant ? "verified" : "rejected";

    return { complianceResult, finalStatus, registryOk, isCompliant };
  },
});
