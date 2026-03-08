// @ts-nocheck
/**
 * ASYNC REVIEW API
 * Public API for the async video review workflow.
 *
 * Flow:
 *   Patient uploads video → submitVideoForReview
 *   → videoReviewAgent runs AI analysis automatically
 *   → notificationAgent fires "video_received" email
 *   → Provider sees pending review in getProviderQueue
 *   → Provider calls providerDecide (approve/reject)
 *   → notificationAgent fires decision email to patient
 */
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ─── Submit video for AI review ───────────────────────────────

export const submitVideoForReview = mutation({
  args: {
    consultationId: v.id("consultations"),
    videoStorageId: v.string(),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    // Load consultation to get patientId and patient email
    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation) {
      throw new Error("Consultation not found");
    }

    // Store the video recording reference on the consultation
    await ctx.db.patch(args.consultationId, {
      recording: args.videoStorageId,
      status: "waiting",
      updatedAt: Date.now(),
    });

    // Schedule AI analysis + notification as a follow-on action
    // (mutations cannot call actions directly — caller must call runVideoReviewPipeline)
    return {
      consultationId: args.consultationId,
      patientId: consultation.patientId,
      status: "submitted",
      message: "Video stored. Call runVideoReviewPipeline to start AI analysis.",
    };
  },
});

// ─── Run the full pipeline (action — can call other actions) ──

export const runVideoReviewPipeline = action({
  args: {
    consultationId: v.id("consultations"),
    transcript: v.string(),
    patientEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // Load consultation
    const consultation = await ctx.runQuery(
      internal.asyncReview.getConsultationInternal,
      { consultationId: args.consultationId }
    );
    if (!consultation) {
      throw new Error("Consultation not found");
    }

    // Load patient history
    const patient = await ctx.runQuery(
      internal.asyncReview.getPatientInternal,
      { patientId: consultation.patientId }
    );

    const patientHistory = patient
      ? {
          medicalConditions: patient.medicalConditions,
          currentMedications: patient.currentMedications,
          allergies: patient.allergies,
          chiefComplaint: undefined,
        }
      : {};

    // Run AI video analysis
    const reviewResult = await ctx.runAction(
      internal.agents.videoReviewAgent.run,
      {
        consultationId: args.consultationId,
        patientId: consultation.patientId,
        transcript: args.transcript,
        patientHistory,
      }
    );

    // Notify patient: video received and under review
    await ctx.runAction(internal.agents.notificationAgent.sendVideoReceived, {
      patientEmail: args.patientEmail,
      consultationId: args.consultationId,
    });

    return {
      reviewId: reviewResult.reviewId,
      agentStatus: reviewResult.agentStatus,
      recommendedAction: reviewResult.recommendedAction,
      urgencyLevel: reviewResult.urgencyLevel,
      durationMs: Date.now() - startTime,
    };
  },
});

// ─── Get AI review for a consultation ────────────────────────

export const getVideoReview = query({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videoReviews")
      .withIndex("by_consultation", (q) =>
        q.eq("consultationId", args.consultationId)
      )
      .first();
  },
});

// ─── Get AI review by its own ID ──────────────────────────────

export const getVideoReviewById = query({
  args: { reviewId: v.id("videoReviews") },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) return null;

    const consultation = await ctx.db.get(review.consultationId);
    const patient = consultation
      ? await ctx.db.get(consultation.patientId)
      : null;

    // Resolve patient name from members table if available
    let patientName: string | null = null;
    let patientEmail: string | null = null;
    if (patient) {
      const member = await ctx.db.get(patient.memberId);
      patientName = member?.name ?? null;
      patientEmail = patient.email;
    }

    return {
      ...review,
      patientName,
      patientEmail,
      patientDob: patient?.dateOfBirth ?? null,
      recordingUrl: consultation?.recording ?? null,
    };
  },
});

// ─── Provider: approve or reject ─────────────────────────────

export const providerDecide = action({
  args: {
    reviewId: v.id("videoReviews"),
    decision: v.string(), // "approved" | "rejected"
    notes: v.optional(v.string()),
    providerEmail: v.string(),
    patientEmail: v.string(),
    pharmacyDetails: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    rejectionNextSteps: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.decision !== "approved" && args.decision !== "rejected") {
      throw new Error("Decision must be 'approved' or 'rejected'");
    }

    // Record the provider's decision
    await ctx.runMutation(internal.agents.videoReviewAgent.recordDecision, {
      reviewId: args.reviewId,
      providerDecision: args.decision,
      providerNotes: args.notes,
      providerEmail: args.providerEmail,
      decidedAt: Date.now(),
    });

    // Fire decision notification to patient immediately
    if (args.decision === "approved") {
      await ctx.runAction(internal.agents.notificationAgent.sendApproved, {
        patientEmail: args.patientEmail,
        consultationId: await ctx.runQuery(
          internal.asyncReview.getConsultationIdFromReview,
          { reviewId: args.reviewId }
        ),
        pharmacyDetails: args.pharmacyDetails,
      });
    } else {
      await ctx.runAction(internal.agents.notificationAgent.sendRejected, {
        patientEmail: args.patientEmail,
        consultationId: await ctx.runQuery(
          internal.asyncReview.getConsultationIdFromReview,
          { reviewId: args.reviewId }
        ),
        reason: args.rejectionReason,
        nextSteps: args.rejectionNextSteps,
      });
    }

    // Chain prescription pipeline via conductor if approved
    if (args.decision === "approved") {
      try {
        const consultationId = await ctx.runQuery(
          internal.asyncReview.getConsultationIdFromReview,
          { reviewId: args.reviewId }
        );
        await ctx.runAction(internal.asyncReview.triggerApprovedPipeline, {
          reviewId: args.reviewId,
          consultationId,
          patientEmail: args.patientEmail,
          pharmacyDetails: args.pharmacyDetails ?? "",
        });
      } catch (e) {
        // Non-fatal — prescription drafting can be retried via ticket queue
        console.error("Conductor chain failed:", e);
      }
    }

    return { success: true, decision: args.decision, reviewId: args.reviewId };
  },
});

// ─── Provider queue: all pending reviews ─────────────────────

export const getProviderQueue = query({
  args: {
    includeDecided: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeDecided) {
      // All complete reviews, newest first
      const reviews = await ctx.db
        .query("videoReviews")
        .withIndex("by_status", (q) => q.eq("agentStatus", "complete"))
        .order("desc")
        .collect();
      return reviews;
    }

    // Only pending (complete but no provider decision yet)
    const reviews = await ctx.db
      .query("videoReviews")
      .withIndex("by_status", (q) => q.eq("agentStatus", "complete"))
      .order("desc")
      .collect();

    return reviews.filter((r) => !r.providerDecision);
  },
});

// ─── Full intake submission (called by /start wizard) ─────────

/**
 * Full intake submission — called by the /start wizard after video recording.
 * Creates member + patient records (if needed), creates consultation, stores
 * video, and runs the AI pipeline. Does NOT require an existing patientId
 * or providerId — the provider is assigned after they approve.
 */
export const submitIntakeVideoForReview = action({
  args: {
    patientEmail: v.string(),
    patientName: v.string(),
    transcript: v.string(),
    medicalHistory: v.object({
      conditions: v.optional(v.string()),
      medications: v.optional(v.string()),
      allergies: v.optional(v.string()),
    }),
    chiefComplaint: v.string(),
    pharmacyLocation: v.string(),
    videoStorageId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Upsert member + patient records
    const patientId = await ctx.runMutation(
      internal.asyncReview.upsertPatientForIntake,
      {
        email: args.patientEmail,
        name: args.patientName,
        conditions: args.medicalHistory.conditions ?? "",
        medications: args.medicalHistory.medications ?? "",
        allergies: args.medicalHistory.allergies ?? "",
      }
    );

    // 2. Create an async consultation (no provider assigned yet)
    const consultationId = await ctx.runMutation(
      internal.asyncReview.createAsyncConsultation,
      {
        patientId,
        patientEmail: args.patientEmail,
        chiefComplaint: args.chiefComplaint,
        pharmacyLocation: args.pharmacyLocation,
        videoStorageId: args.videoStorageId,
      }
    );

    // 3. Run the full AI review pipeline
    const reviewResult = await ctx.runAction(
      internal.asyncReview.runVideoReviewPipelineInternal,
      {
        consultationId,
        transcript: args.transcript,
        patientEmail: args.patientEmail,
        chiefComplaint: args.chiefComplaint,
        medicalHistory: args.medicalHistory,
        patientId,
      }
    );

    return {
      consultationId,
      patientId,
      reviewId: reviewResult.reviewId,
      status: "submitted",
      message:
        "Video submitted for physician review. You will be notified by email when a decision is made.",
    };
  },
});

// ─── FIX 2: conductor chain in providerDecide ─────────────────
// (see providerDecide above — conductor call is appended via the existing action)

// ─── Internal helpers ─────────────────────────────────────────

export const getConsultationInternal = internalQuery({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.consultationId);
  },
});

export const getPatientInternal = internalQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.patientId);
  },
});

export const getConsultationIdFromReview = internalQuery({
  args: { reviewId: v.id("videoReviews") },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found");
    return review.consultationId;
  },
});

// ─── FIX 1 internal helpers ────────────────────────────────────

/**
 * Upsert member + patient by email.
 * Creates a member row first (if needed), then upserts the patient record
 * linked to that member. Returns the patient ID.
 */
export const upsertPatientForIntake = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    conditions: v.string(),
    medications: v.string(),
    allergies: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    // 1. Upsert the member record (email is the identity key)
    let memberId;
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    if (existingMember) {
      memberId = existingMember._id;
    } else {
      const displayName = args.name || emailLower.split("@")[0];
      memberId = await ctx.db.insert("members", {
        email: emailLower,
        name: displayName,
        role: "unverified",
        permissions: [],
        status: "active",
        joinedAt: Date.now(),
      });
    }

    // 2. Check if a patient record is already linked to this member
    const existingPatient = await ctx.db
      .query("patients")
      .withIndex("by_memberId", (q) => q.eq("memberId", memberId))
      .first();

    if (existingPatient) {
      // Update medical history fields if new values were provided
      await ctx.db.patch(existingPatient._id, {
        medicalConditions: args.conditions
          ? [args.conditions]
          : existingPatient.medicalConditions,
        currentMedications: args.medications
          ? [args.medications]
          : existingPatient.currentMedications,
        allergies: args.allergies
          ? [args.allergies]
          : existingPatient.allergies,
        updatedAt: Date.now(),
      });
      return existingPatient._id;
    }

    // 3. Create new patient record — use defaults for required fields not
    //    collected at video-intake time (patient fills these in full profile later)
    const now = Date.now();
    return await ctx.db.insert("patients", {
      memberId,
      email: emailLower,
      dateOfBirth: "unknown",           // placeholder until full profile is completed
      gender: "unknown",
      address: {
        street: "",
        city: "",
        state: "FL",                    // default, updated during full onboarding
        zip: "",
      },
      insuranceProvider: undefined,
      insurancePolicyNumber: undefined,
      insuranceGroupNumber: undefined,
      primaryPharmacy: undefined,
      allergies: args.allergies ? [args.allergies] : [],
      currentMedications: args.medications ? [args.medications] : [],
      medicalConditions: args.conditions ? [args.conditions] : [],
      emergencyContact: undefined,
      consentSignedAt: undefined,
      idVerifiedAt: undefined,
      idVerificationStatus: "pending",
      state: "FL",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Create an async consultation record.
 * No provider is assigned at submission time — assigned after provider approves.
 * patientEmail and pharmacyLocation are stored in notes as JSON since the
 * consultations schema does not have dedicated columns for these.
 */
export const createAsyncConsultation = internalMutation({
  args: {
    patientId: v.id("patients"),
    patientEmail: v.string(),
    chiefComplaint: v.string(),
    pharmacyLocation: v.string(),
    videoStorageId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const notesPayload = JSON.stringify({
      chiefComplaint: args.chiefComplaint,
      patientEmail: args.patientEmail,
      pharmacyLocation: args.pharmacyLocation,
    });

    return await ctx.db.insert("consultations", {
      patientId: args.patientId,
      providerId: undefined,            // assigned after provider approves
      intakeId: undefined,
      triageId: undefined,
      type: "async_video",
      status: "waiting",
      scheduledAt: now,
      startedAt: now,
      endedAt: undefined,
      duration: undefined,
      roomUrl: undefined,
      roomToken: undefined,
      notes: notesPayload,
      diagnosis: undefined,
      diagnosisCodes: undefined,
      treatmentPlan: undefined,
      followUpRequired: false,
      followUpDate: undefined,
      aiSummary: undefined,
      aiSuggestedQuestions: undefined,
      recording: args.videoStorageId,
      patientState: "FL",              // updated after patient provides state
      cost: 9700,                      // $97.00 in cents
      paymentStatus: "paid",           // payment completed during wizard
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal action: run video review pipeline without re-checking session.
 * Called by submitIntakeVideoForReview to keep the outer action clean.
 */
export const runVideoReviewPipelineInternal = internalAction({
  args: {
    consultationId: v.id("consultations"),
    transcript: v.string(),
    patientEmail: v.string(),
    chiefComplaint: v.string(),
    medicalHistory: v.object({
      conditions: v.optional(v.string()),
      medications: v.optional(v.string()),
      allergies: v.optional(v.string()),
    }),
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const patientHistory = {
      medicalConditions: args.medicalHistory.conditions,
      currentMedications: args.medicalHistory.medications,
      allergies: args.medicalHistory.allergies,
      chiefComplaint: args.chiefComplaint,
    };

    const reviewResult = await ctx.runAction(
      internal.agents.videoReviewAgent.run,
      {
        consultationId: args.consultationId,
        patientId: args.patientId,
        transcript: args.transcript,
        patientHistory,
      }
    );

    await ctx.runAction(internal.agents.notificationAgent.sendVideoReceived, {
      patientEmail: args.patientEmail,
      consultationId: args.consultationId,
    });

    return {
      reviewId: reviewResult.reviewId,
      agentStatus: reviewResult.agentStatus,
      recommendedAction: reviewResult.recommendedAction,
    };
  },
});

/**
 * Internal action: trigger the downstream prescription pipeline after approval.
 * Creates a ticket in the agent org queue (non-blocking, non-fatal).
 * Does not require a sessionToken — runs server-side from providerDecide.
 */
export const triggerApprovedPipeline = internalAction({
  args: {
    reviewId: v.id("videoReviews"),
    consultationId: v.id("consultations"),
    patientEmail: v.string(),
    pharmacyDetails: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.agentOrg.createTicket, {
      type: "prescription",
      assignedAgent: "PrescriptionAgent",
      input: JSON.stringify({
        consultationId: args.consultationId,
        reviewId: args.reviewId,
        pharmacyDetails: args.pharmacyDetails,
      }),
      priority: 4,
      patientEmail: args.patientEmail,
      consultationId: args.consultationId,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.agentHeartbeats.notificationHeartbeat,
      {}
    );
  },
});

// ─── FIX 4: Poll for provider decision ────────────────────────

/**
 * Get the current status of a consultation and its associated video review.
 * Used by the /start wizard to poll for provider decision.
 */
export const getConsultationStatus = query({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, args) => {
    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation) return null;

    const review = await ctx.db
      .query("videoReviews")
      .withIndex("by_consultation", (q) =>
        q.eq("consultationId", args.consultationId)
      )
      .first();

    return {
      status: consultation.status,
      providerDecision: review?.providerDecision ?? null,
      providerNotes: review?.providerNotes ?? null,
      decidedAt: review?.decidedAt ?? null,
    };
  },
});
