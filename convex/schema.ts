import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // === AUTH ===
  passkeys: defineTable({
    email: v.string(),
    credentialId: v.string(),
    publicKey: v.string(),
    counter: v.number(),
    deviceType: v.optional(v.string()),
    backedUp: v.optional(v.boolean()),
    transports: v.optional(v.array(v.string())),
    loginCount: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    recoveryPinHash: v.optional(v.string()),
    recoverySetupAt: v.optional(v.number()),
    paymentStatus: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    discordUserId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_credentialId", ["credentialId"]),

  authChallenges: defineTable({
    challenge: v.string(),
    email: v.optional(v.string()),
    type: v.string(),
    expiresAt: v.number(),
    createdAt: v.optional(v.number()),
    rateLimitKey: v.optional(v.string()),
  }).index("by_challenge", ["challenge"]),

  // === MAGIC LINK CODES (email-based auth fallback) ===
  magicLinks: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    consumed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_email_code", ["email", "code"]),

  // === ORGANIZATIONS ===
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    type: v.string(), // "clinic" | "pharmacy" | "admin" | "hospital"
    status: v.string(),
    subscriptionTier: v.optional(v.string()), // "consumer" | "clinic" | "enterprise"
    whopMembershipId: v.optional(v.string()),
    maxProviders: v.optional(v.number()),
    maxPatients: v.optional(v.number()),
    // Capability overrides — applied to all members of this org (deny wins)
    capAllow: v.optional(v.array(v.string())),
    capDeny: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_type", ["type"]),

  // === MEMBERS (one row per user-per-org membership) ===
  // Each row is a scoped membership: a user may have multiple rows across orgs.
  // orgId is optional for standalone users (patients, solo providers).
  // requireOrgMember() verifies member.orgId === targetOrgId before org mutations.
  members: defineTable({
    orgId: v.optional(v.id("organizations")),
    email: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dob: v.optional(v.string()),
    role: v.string(), // "patient" | "provider" | "pharmacist" | "admin" | "staff"
    orgRole: v.optional(v.string()), // "owner" | "admin" | "member" — role within the org
    permissions: v.array(v.string()),
    // Platform owner — grants all capabilities; set only via grantPlatformOwner mutation
    // or seed script. Never set programmatically based on email.
    isPlatformOwner: v.optional(v.boolean()),
    // Per-member capability overrides (applied after role bundle + org overrides; deny wins)
    capAllow: v.optional(v.array(v.string())),
    capDeny: v.optional(v.array(v.string())),
    status: v.string(),
    avatar: v.optional(v.string()),
    governmentIdUrl: v.optional(v.string()),
    lastLoginAt: v.optional(v.number()),
    joinedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_orgId", ["orgId"])
    .index("by_role", ["role"]),

  // === PATIENTS ===
  patients: defineTable({
    memberId: v.id("members"),
    email: v.string(),
    dateOfBirth: v.string(),
    gender: v.string(),
    address: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    primaryPharmacy: v.optional(v.id("pharmacies")),
    allergies: v.array(v.string()),
    currentMedications: v.array(v.string()),
    medicalConditions: v.array(v.string()),
    emergencyContact: v.optional(
      v.object({
        name: v.string(),
        phone: v.string(),
        relationship: v.string(),
      })
    ),
    consentSignedAt: v.optional(v.number()),
    idVerifiedAt: v.optional(v.number()),
    idVerificationStatus: v.string(), // "pending" | "verified" | "rejected"
    state: v.string(), // Patient's state of residence
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_email", ["email"])
    .index("by_state", ["state"])
    .index("by_created", ["createdAt"]),

  // === PROVIDERS (physicians, PAs, NPs) ===
  providers: defineTable({
    memberId: v.id("members"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    title: v.string(), // "MD" | "DO" | "PA" | "NP" | "APRN"
    npiNumber: v.string(), // National Provider Identifier
    deaNumber: v.optional(v.string()), // DEA number for prescribing
    specialties: v.array(v.string()),
    licensedStates: v.array(v.string()), // States where licensed
    licenseNumbers: v.optional(v.any()), // { state: licenseNumber }
    acceptingPatients: v.boolean(),
    consultationRate: v.number(), // in cents
    availability: v.optional(v.any()), // Schedule config
    maxDailyConsultations: v.number(),
    currentQueueSize: v.number(),
    rating: v.optional(v.number()),
    totalConsultations: v.number(),
    status: v.string(), // "active" | "inactive" | "suspended" | "onboarding"
    credentialVerifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_npiNumber", ["npiNumber"]),

  // === INTAKE FORMS ===
  intakes: defineTable({
    patientId: v.optional(v.id("patients")),
    email: v.string(),
    status: v.string(), // "draft" | "in_progress" | "completed" | "expired"
    medicalHistory: v.optional(v.any()),
    currentSymptoms: v.optional(v.any()),
    medications: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
    chiefComplaint: v.optional(v.string()),
    symptomDuration: v.optional(v.string()),
    severityLevel: v.optional(v.number()), // 1-10
    vitalSigns: v.optional(v.any()),
    idVerified: v.boolean(),
    consentGiven: v.boolean(),
    completedSteps: v.array(v.string()),
    triageResult: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_patientId", ["patientId"])
    .index("by_status", ["status"]),

  // === TRIAGE ===
  triageAssessments: defineTable({
    intakeId: v.id("intakes"),
    patientId: v.optional(v.id("patients")),
    urgencyLevel: v.string(), // "emergency" | "urgent" | "standard" | "routine"
    urgencyScore: v.number(), // 0-100
    recommendedAction: v.string(),
    suggestedSpecialty: v.optional(v.string()),
    redFlags: v.array(v.string()),
    differentialDiagnoses: v.optional(v.array(v.string())),
    drugInteractions: v.optional(v.array(v.any())),
    aiConfidenceScore: v.number(),
    aiReasoning: v.optional(v.string()),
    reviewedByProvider: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_intakeId", ["intakeId"])
    .index("by_urgencyLevel", ["urgencyLevel"]),

  // === CONSULTATIONS ===
  consultations: defineTable({
    patientId: v.id("patients"),
    providerId: v.id("providers"),
    intakeId: v.optional(v.id("intakes")),
    triageId: v.optional(v.id("triageAssessments")),
    type: v.string(), // "video" | "phone" | "chat"
    status: v.string(), // "scheduled" | "waiting" | "in_progress" | "completed" | "cancelled" | "no_show"
    scheduledAt: v.number(),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    duration: v.optional(v.number()), // minutes
    roomUrl: v.optional(v.string()), // Video room URL
    roomToken: v.optional(v.string()),
    notes: v.optional(v.string()), // Provider notes
    diagnosis: v.optional(v.string()),
    diagnosisCodes: v.optional(v.array(v.string())), // ICD-10 codes
    treatmentPlan: v.optional(v.string()),
    followUpRequired: v.boolean(),
    followUpDate: v.optional(v.number()),
    aiSummary: v.optional(v.string()),
    aiSuggestedQuestions: v.optional(v.array(v.string())),
    recording: v.optional(v.string()), // Storage ID for recording
    patientState: v.string(), // State where patient is located during consultation
    cost: v.number(), // in cents
    paymentStatus: v.string(), // "pending" | "paid" | "insurance" | "waived"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patientId", ["patientId"])
    .index("by_providerId", ["providerId"])
    .index("by_status", ["status"])
    .index("by_scheduledAt", ["scheduledAt"]),

  // === PRESCRIPTIONS ===
  prescriptions: defineTable({
    consultationId: v.id("consultations"),
    patientId: v.id("patients"),
    providerId: v.id("providers"),
    pharmacyId: v.optional(v.id("pharmacies")),
    medicationName: v.string(),
    genericName: v.optional(v.string()),
    ndc: v.optional(v.string()), // National Drug Code
    dosage: v.string(),
    form: v.string(), // "tablet" | "capsule" | "injection" | "cream" | "liquid"
    quantity: v.number(),
    daysSupply: v.number(),
    refillsAuthorized: v.number(),
    refillsUsed: v.number(),
    directions: v.string(), // Sig
    deaSchedule: v.optional(v.string()), // "II" | "III" | "IV" | "V" | "none"
    status: v.string(), // "draft" | "pending_review" | "signed" | "sent" | "filling" | "ready" | "picked_up" | "delivered" | "cancelled"
    ePrescribeId: v.optional(v.string()),
    sentToPharmacyAt: v.optional(v.number()),
    filledAt: v.optional(v.number()),
    expiresAt: v.number(),
    nextRefillDate: v.optional(v.number()),
    drugInteractions: v.optional(v.array(v.any())),
    priorAuthRequired: v.boolean(),
    priorAuthStatus: v.optional(v.string()),
    cost: v.optional(v.number()),
    insuranceCovered: v.optional(v.boolean()),
    copay: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_consultationId", ["consultationId"])
    .index("by_patientId", ["patientId"])
    .index("by_providerId", ["providerId"])
    .index("by_pharmacyId", ["pharmacyId"])
    .index("by_status", ["status"])
    .index("by_patient_status", ["patientId", "status"])
    .index("by_next_refill", ["nextRefillDate"])
    .index("by_status_created", ["status", "createdAt"]),

  // === PHARMACIES ===
  pharmacies: defineTable({
    name: v.string(),
    ncpdpId: v.optional(v.string()), // NCPDP Provider ID
    npiNumber: v.optional(v.string()),
    address: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
    phone: v.string(),
    fax: v.optional(v.string()),
    email: v.optional(v.string()),
    type: v.string(), // "retail" | "compounding" | "mail_order" | "specialty"
    acceptsEPrescribe: v.boolean(),
    operatingHours: v.optional(v.any()),
    capabilities: v.array(v.string()), // e.g., ["compounding", "controlled_substances", "refrigerated"]
    tier: v.number(), // Priority tier 1-5
    status: v.string(), // "active" | "inactive" | "suspended"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_ncpdpId", ["ncpdpId"])
    .index("by_tier", ["tier"]),

  // === REFILL REQUESTS ===
  refillRequests: defineTable({
    prescriptionId: v.id("prescriptions"),
    patientId: v.id("patients"),
    pharmacyId: v.optional(v.id("pharmacies")),
    status: v.string(), // "requested" | "approved" | "denied" | "filling" | "ready"
    requestedAt: v.number(),
    processedAt: v.optional(v.number()),
    processedBy: v.optional(v.id("providers")),
    denialReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_prescriptionId", ["prescriptionId"])
    .index("by_patientId", ["patientId"])
    .index("by_status", ["status"])
    .index("by_status_requested", ["status", "requestedAt"]),

  // === FOLLOW-UPS ===
  followUps: defineTable({
    consultationId: v.id("consultations"),
    patientId: v.id("patients"),
    providerId: v.optional(v.id("providers")),
    type: v.string(), // "check_in" | "side_effect_report" | "lab_review" | "medication_adjustment"
    status: v.string(), // "scheduled" | "sent" | "responded" | "reviewed" | "escalated"
    scheduledFor: v.number(),
    sentAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    patientResponse: v.optional(v.string()),
    providerNotes: v.optional(v.string()),
    sideEffects: v.optional(v.array(v.string())),
    satisfactionRating: v.optional(v.number()),
    escalated: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_consultationId", ["consultationId"])
    .index("by_patientId", ["patientId"])
    .index("by_status", ["status"])
    .index("by_scheduledFor", ["scheduledFor"]),

  // === BILLING ===
  billingRecords: defineTable({
    patientId: v.id("patients"),
    consultationId: v.optional(v.id("consultations")),
    type: v.string(), // "consultation" | "prescription" | "follow_up" | "lab"
    amount: v.number(), // cents
    insuranceAmount: v.optional(v.number()),
    copay: v.optional(v.number()),
    status: v.string(), // "pending" | "submitted" | "paid" | "denied" | "appealed"
    stripePaymentIntentId: v.optional(v.string()),
    insuranceClaimId: v.optional(v.string()),
    cptCodes: v.optional(v.array(v.string())),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patientId", ["patientId"])
    .index("by_consultationId", ["consultationId"])
    .index("by_status", ["status"])
    .index("by_patient_type", ["patientId", "type"]),

  // === COMPLIANCE ===
  complianceRecords: defineTable({
    entityType: v.string(), // "provider" | "patient" | "consultation" | "prescription"
    entityId: v.string(),
    checkType: v.string(), // "id_verification" | "license_check" | "dea_check" | "state_compliance" | "prescribing_audit"
    status: v.string(), // "passed" | "failed" | "pending" | "expired"
    details: v.optional(v.any()),
    checkedAt: v.number(),
    expiresAt: v.optional(v.number()),
    checkedBy: v.optional(v.string()), // "system" | agent name | admin email
  })
    .index("by_entityType_entityId", ["entityType", "entityId"])
    .index("by_status", ["status"])
    .index("by_checkType", ["checkType"]),

  // === STATE LICENSING ===
  stateLicensing: defineTable({
    state: v.string(), // Two-letter state code
    telehealthAllowed: v.boolean(),
    prescribingRules: v.optional(v.any()),
    controlledSubstanceRules: v.optional(v.any()),
    requiredLicenseTypes: v.array(v.string()),
    crossStatePrescribing: v.boolean(),
    inPersonRequiredFirst: v.boolean(),
    consentRequirements: v.optional(v.string()),
    effectiveDate: v.number(),
    updatedAt: v.number(),
  }).index("by_state", ["state"]),

  // === NOTIFICATIONS ===
  notifications: defineTable({
    recipientEmail: v.string(),
    recipientId: v.optional(v.id("members")),
    type: v.string(), // "appointment_reminder" | "prescription_ready" | "follow_up" | "compliance_alert" | "billing"
    channel: v.string(), // "email" | "sms" | "push" | "in_app"
    subject: v.string(),
    body: v.string(),
    status: v.string(), // "pending" | "sent" | "delivered" | "failed" | "read"
    sentAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_recipientEmail", ["recipientEmail"])
    .index("by_status", ["status"])
    .index("by_type", ["type"]),

  // === AGENT LOGS ===
  agentLogs: defineTable({
    agentName: v.string(),
    action: v.string(),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_agentName", ["agentName"])
    .index("by_createdAt", ["createdAt"]),

  // === AUDIT LOG (general) ===
  auditLog: defineTable({
    action: v.string(),
    actorEmail: v.string(),
    actorRole: v.optional(v.string()),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actorEmail", ["actorEmail"])
    .index("by_entityType_entityId", ["entityType", "entityId"])
    .index("by_createdAt", ["createdAt"]),

  // === SECURITY EVENTS (append-only privileged-action trail) ===
  // Logged for: role changes, platform owner grant/revoke, cap overrides, PHI exports.
  // Rows are NEVER deleted or updated — immutable audit record.
  securityEvents: defineTable({
    action: v.string(),           // e.g. "PLATFORM_OWNER_GRANT_REQUESTED", "ROLE_CHANGE"
    actorMemberId: v.optional(v.string()),
    actorOrgId: v.optional(v.string()),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.string()),  // "member" | "org" | "platform"
    diff: v.optional(v.any()),           // { from, to }
    success: v.boolean(),
    reason: v.optional(v.string()),      // failure reason or descriptive context
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_action", ["action"])
    .index("by_actorMemberId", ["actorMemberId"])
    .index("by_timestamp", ["timestamp"]),

  // === PENDING PLATFORM OWNER GRANTS (two-step cooldown) ===
  // Created by requestPlatformOwnerGrant, confirmed after 60s by confirmPlatformOwnerGrant.
  pendingPlatformOwnerGrants: defineTable({
    requestedBy: v.id("members"),
    targetMemberId: v.id("members"),
    requestedAt: v.number(),
    confirmsAfter: v.number(),  // requestedAt + 60_000 (60s cooldown)
    expiresAt: v.number(),      // requestedAt + 300_000 (5 min confirmation window)
    status: v.string(),         // "pending" | "confirmed" | "cancelled" | "expired"
  })
    .index("by_requestedBy", ["requestedBy"])
    .index("by_status", ["status"]),

  // === MESSAGES (patient-provider) ===
  messages: defineTable({
    conversationId: v.string(),
    senderEmail: v.string(),
    senderRole: v.string(),
    recipientEmail: v.string(),
    content: v.string(),
    attachments: v.optional(v.array(v.string())),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_recipientEmail", ["recipientEmail"]),

  // === RATE LIMITS ===
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
    windowMs: v.number(),
  }).index("by_key", ["key"]),

  // === FILE STORAGE ===
  fileStorage: defineTable({
    ownerId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    storageId: v.optional(v.string()),
    url: v.optional(v.string()),
    purpose: v.string(), // "government_id" | "insurance_card" | "lab_results" | "consultation_recording"
    createdAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_purpose", ["purpose"]),

  // === AI CONVERSATIONS (persistent across pages) ===
  aiConversations: defineTable({
    email: v.string(),
    messages: v.array(
      v.object({
        role: v.string(), // "user" | "assistant"
        content: v.string(),
        page: v.optional(v.string()), // which page the message was sent from
        timestamp: v.number(),
      })
    ),
    currentPage: v.optional(v.string()),
    intakeId: v.optional(v.id("intakes")),
    patientType: v.optional(v.string()), // "new" | "returning"
    collectedData: v.optional(v.any()), // structured data collected across pages
    orgId: v.optional(v.id("organizations")), // links conversation to org context
    userRole: v.optional(v.string()), // captures role at time of conversation
    model: v.optional(v.string()), // which LLM was used (for audit trail)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"]),

  // === SETTINGS (platform config, LLM preferences, feature flags) ===
  settings: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }).index("by_key", ["key"]),

  // === CREDENTIAL VERIFICATIONS (agentic role verification pipeline) ===
  credentialVerifications: defineTable({
    memberId: v.id("members"),
    email: v.string(),
    selectedRole: v.string(), // "patient" | "provider" | "pharmacy"
    status: v.string(), // "pending" | "in_progress" | "verified" | "rejected" | "expired"
    currentStep: v.string(), // e.g. "role_selected" | "npi_check" | "license_scan" | "dea_entry" | "compliance_review" | "stripe_identity" | "ncpdp_check" | "complete"
    completedSteps: v.array(v.string()),

    // === Provider-specific verification data ===
    providerNpi: v.optional(v.string()),
    providerNpiResult: v.optional(v.any()), // NPI Registry response data
    providerLicenseFileId: v.optional(v.string()), // file storage ID for license scan
    providerLicenseScanResult: v.optional(v.any()), // Gemini OCR result
    providerDeaNumber: v.optional(v.string()),
    providerTitle: v.optional(v.string()), // "MD" | "DO" | "PA" | "NP" | "APRN"
    providerSpecialties: v.optional(v.array(v.string())),
    providerLicensedStates: v.optional(v.array(v.string())),

    // === Patient-specific verification data ===
    patientStripeSessionId: v.optional(v.string()),
    patientStripeStatus: v.optional(v.string()), // "requires_input" | "processing" | "verified" | "canceled"
    patientIdScanResult: v.optional(v.any()), // Gemini or Stripe result

    // === Pharmacy-specific verification data ===
    pharmacyNcpdpId: v.optional(v.string()),
    pharmacyNpi: v.optional(v.string()),
    pharmacyName: v.optional(v.string()),
    pharmacyRegistryResult: v.optional(v.any()), // lookup result

    // === Compliance / AI review ===
    complianceSummary: v.optional(v.any()), // compliance agent output
    complianceRecordIds: v.optional(v.array(v.string())), // IDs of created complianceRecords

    // === Error tracking ===
    errors: v.optional(v.array(v.object({
      step: v.string(),
      message: v.string(),
      timestamp: v.number(),
    }))),
    retryCount: v.optional(v.number()),

    // === Timestamps ===
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_selectedRole", ["selectedRole"]),

  // === FAX LOGS ===
  faxLogs: defineTable({
    prescriptionId: v.id("prescriptions"),
    pharmacyId: v.id("pharmacies"),
    faxNumber: v.string(),
    status: v.string(), // "queued" | "sending" | "sent" | "failed" | "confirmed"
    phaxioFaxId: v.optional(v.string()),
    pdfStorageId: v.optional(v.string()),
    pages: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    attempts: v.number(),
    sentAt: v.optional(v.number()),
    confirmedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_prescriptionId", ["prescriptionId"])
    .index("by_pharmacyId", ["pharmacyId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),
});
