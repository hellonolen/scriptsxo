# ScriptsXO — Product Requirements Document

**Version:** 1.0  
**Owner:** Nolen (hellonolen@gmail.com)  
**Status:** Active  
**Last Updated:** 2026-02-26

---

## 1. Executive Summary

ScriptsXO is a luxury, AI-first telehealth prescription concierge platform. It connects patients with licensed physicians for telehealth consultations and prescription fulfillment. The platform uses an agentic AI architecture — 15 specialized AI agents handle intake, triage, prescriptions, pharmacy routing, compliance, and follow-ups with minimal human intervention.

ScriptsXO serves three markets simultaneously:

| Tier | Audience | Price | Core Value |
|------|----------|-------|------------|
| B2C Consumer | Individual patients | $97/mo | AI concierge, licensed provider review, Rx fulfillment |
| B2B Clinic | Clinics and practices | $997/mo | Multi-provider orgs, patient management, Rx volume |
| B2E Enterprise | Hospitals, health systems | $4,997/mo | Full platform, custom integrations, dedicated support |

Billing is via Whop.com (not Stripe). All five Whop production keys are live.

---

## 2. Problem Statement

Getting a prescription today requires:
- Booking an appointment (days to weeks out)
- Traveling to the office
- A 15-minute visit for something the doctor could decide in 2 minutes
- Then waiting at a pharmacy

ScriptsXO eliminates every unnecessary step. A patient completes an AI-guided intake, gets matched to a licensed provider in their state, has a telehealth consultation, and receives a prescription — all within the same session. The AI handles 90% of the workflow. The licensed provider handles only what requires their legal authority.

---

## 3. Product Vision

> A luxury, AI-first prescription experience that makes getting the right medication as frictionless as ordering from Amazon — while maintaining clinical rigor, HIPAA compliance, and physician oversight.

### Design Principles
- **AI-first, not AI-only** — Agents handle the volume. Providers handle the clinical judgment.
- **Front-end-first** — UI is designed and approved before any backend wiring begins.
- **No shortcuts on compliance** — HIPAA, DEA, and state telehealth rules are enforced agentic­ally, not manually.
- **Luxury experience** — Deep violet + teal design system. No generic healthcare aesthetics.
- **Zero pink** — Absolute rule. No pink/rose in any UI.

---

## 4. User Roles

### 4.1 Client (Patient)
A consumer seeking a telehealth consultation and prescription. Goes through the `/start` 11-step intake wizard and the `/portal` experience.

**Needs:**
- Fast, frictionless intake
- AI-guided symptom + medication request flow
- Secure video consultation with a licensed provider
- Prescription delivery confirmation
- Refill management
- Transparent billing

### 4.2 Provider (Physician / PA / NP / APRN)
A licensed clinician who reviews AI-prepared consults and signs prescriptions. Accesses the `/provider` portal.

**Needs:**
- Pre-populated AI consult summary so they can decide in < 2 minutes
- Ability to approve, modify, or deny the prescription request
- E-prescription send via ModMed
- Consultation history
- Queue management (current vs max daily load)

### 4.3 Clinical Staff (Nurse / RN / LPN)
Support role for clinical coordination. Accesses a staff-level portal.

**Needs:**
- Patient record access
- Workflow task management
- Messaging with providers
- No prescribing authority

### 4.4 Pharmacy
A licensed pharmacy that receives, fills, and tracks prescriptions. Accesses the `/pharmacy` portal.

**Needs:**
- Incoming Rx queue (faxed or electronic)
- Fulfillment status updates
- Patient pickup / delivery tracking
- Refill request handling

### 4.5 Organization Admin (B2B / B2E)
A clinic or hospital administrator managing providers, patients, and billing access.

**Needs:**
- Multi-provider management
- Patient roster management
- Billing and subscription management
- Usage reporting

### 4.6 Platform Admin
ScriptsXO staff with full system access. Whitelisted emails in `config.ts`.

**Needs:**
- Full cross-portal visibility
- Provider and pharmacy credential verification
- Compliance dashboard
- AI agent monitoring
- Audit log access
- System settings management

---

## 5. Core Features

### 5.1 AI-Guided Intake Wizard (`/start`) — 11 Steps

The primary patient entry point. A single-page, AI-guided flow.

| Step | Name | Description |
|------|------|-------------|
| 1 | Welcome | New vs Returning client. Platform intro. |
| 2 | Orderer Role | Self / Physician / Nurse / Caregiver / Family. NPI verification for licensed providers. |
| 3 | Payment | $97/mo membership via Whop embedded checkout. No-refund consent. |
| 4 | Medical History | Conditions, medications, allergies, family history. Gemini-validated fields. |
| 5 | Symptoms | Medication request, duration, severity, previous treatments. Gemini-validated. |
| 6 | Document Verification | Government ID upload (AI-scanned). Previous Rx upload (AI-scanned). |
| 7 | Video Verification | 5 on-camera questions. Speech-to-text transcription. Face capture + Gemini analysis. |
| 8 | Review | AI summary of all collected data. Pharmacy selection. |
| 9 | Approved | Physician review in progress (3–8 min). Loading state. |
| 10 | Send to Pharmacy | Prescription transmission (ModMed → Surescripts / eFax). |
| 11 | Fulfilled | Pickup confirmation. |

**Acceptance Criteria:**
- [ ] All 11 steps render and advance correctly
- [ ] AI validation fires on steps 4 and 5 before advancing
- [ ] NPI registry lookup works on step 2 for provider orderers
- [ ] Whop checkout completes before step 4
- [ ] Document scanning returns AI analysis within 10 seconds
- [ ] Video verification records and transcribes in-browser
- [ ] Pharmacy search returns results within 3 seconds
- [ ] Flow is fully mobile-responsive

---

### 5.2 Patient Portal (`/portal`)

Post-intake authenticated patient experience.

**Pages:**
- `/portal` — Dashboard (bento grid with glassmorphism cards). Upcoming consults, active Rxs, refill alerts.
- `/portal/prescriptions` — Full Rx list with status tracking
- `/portal/appointments` — Upcoming and past appointments. Book a provider call.
- `/portal/messages` — AI agent message threads
- `/portal/billing` — Membership status, payment history, invoice downloads

**Acceptance Criteria:**
- [ ] All portal pages load within 2 seconds
- [ ] Prescription status updates in real-time (Convex subscription)
- [ ] Appointment booking is self-serve (no admin required)
- [ ] Message threads are persistent across sessions

---

### 5.3 Telehealth Consultation (`/consultation`)

**Pre-Consultation:**
- `/consultation` — Telehealth Center hub. Upcoming sessions, session history, active session banner.
- `/consultation/waiting-room` — Real-time wait state. Estimated wait time. AI prep questions.

**In-Consultation:**
- `/consultation/room` — Live video consultation. Provider + patient face-to-face. AI sidebar summarizing intake. Prescription draft visible to provider.
- Powered by self-hosted WebRTC on existing Asterisk + Skyetel infrastructure (ADR-019)

**Post-Consultation:**
- `/consultation/complete` — Summary, prescription status, next steps, refill schedule

**Acceptance Criteria:**
- [ ] Video connects in < 5 seconds on standard broadband
- [ ] Audio and video quality meet HIPAA standards
- [ ] AI sidebar loads the correct patient's intake summary
- [ ] Provider can approve / modify / deny the Rx from within the room
- [ ] Post-call summary emails patient within 60 seconds

---

### 5.4 Prescription Management

**Status State Machine:**
```
draft → pending_review → signed → sent → filling → ready → picked_up | delivered | cancelled
```

**Admin Tracking (`/admin/tracking`):**
- Status cards (Pending, Dispensed, Shipped, Delivered, Cancelled)
- Filterable + searchable Rx order list
- Per-order detail with medication info, patient, pharmacy, and timeline
- Delivery status updates in real-time

**Acceptance Criteria:**
- [ ] Rx PDF generates correctly (pdf-lib) with all required fields
- [ ] eFax to pharmacy fires within 30 seconds of provider signing
- [ ] Status updates are auditable (full timeline on each order)
- [ ] Refill alerts fire 7 days before next fill date

---

### 5.5 Provider Portal (`/provider`)

Licensed clinician portal.

**Pages:**
- `/provider` — Dashboard. Today's queue, pending reviews, recent signatures.
- `/provider/patients` — Full patient roster
- `/provider/prescriptions` — Rx management (sign, modify, deny)
- `/provider/consultation` — Consultation view (in-room experience)

**Acceptance Criteria:**
- [ ] Queue loads current + max daily consultations
- [ ] Provider can filter patients by state (only see states where licensed)
- [ ] Signing a prescription triggers immediate eFax to pharmacy
- [ ] Provider receives push notification for new consult requests

---

### 5.6 Pharmacy Portal (`/pharmacy`)

**Pages:**
- `/pharmacy` — Dashboard. Incoming Rx count, fulfillment rate, pending faxes.
- `/pharmacy/queue` — Incoming Rx queue (new arrivals)
- `/pharmacy/fulfillment` — Active fulfillment tracking with status updates

**Acceptance Criteria:**
- [ ] Fax receipt triggers a queue entry in < 60 seconds
- [ ] Pharmacy can update fulfillment status (received → filling → ready → picked up)
- [ ] Status changes propagate to patient portal in real-time

---

### 5.7 Admin Dashboard (`/admin`)

**Pages:**

| Page | Purpose |
|------|---------|
| `/admin` | Dashboard — system stats, agent status, recent activity |
| `/admin/clients` | Client management — search, filter, detail panel, quick actions |
| `/admin/providers` | Provider management — credentials, queue, status toggle |
| `/admin/prescriptions` | Rx administration |
| `/admin/tracking` | Prescription delivery tracking |
| `/admin/analytics` | Platform analytics — volume, conversion, revenue |
| `/admin/compliance` | Compliance dashboard — DEA, HIPAA, state licensing |
| `/admin/agents` | AI agent monitoring — health, success rate, latency |
| `/admin/audit-logs` | Full audit trail — every action, timestamped |
| `/admin/users` | Users and access management |
| `/admin/office-hours` | Provider office hours scheduling |
| `/admin/settings` | Platform configuration + feature flags |
| `/admin/profile` | Admin profile management |

**Acceptance Criteria:**
- [ ] All admin pages are accessible only to whitelisted admin emails
- [ ] Audit log records every mutation with actor email, timestamp, and diff
- [ ] Agent monitoring shows real-time success/failure rates
- [ ] Settings changes take effect without a deploy

---

### 5.8 AI Agent Architecture

15 specialized agents orchestrated by a conductor. All agents route through `llmGateway.ts` (Gemini primary, Claude secondary).

| Agent | Responsibility |
|-------|---------------|
| Conductor | Orchestrator — routes tasks to the right agent |
| Triage | Symptom triage, urgency classification |
| Prescription | Rx validation, drug interactions |
| Pharmacy | Pharmacy routing, fulfillment tracking |
| Consultation | In-consultation assistance |
| Intake | Intake form processing |
| Billing | Insurance and payment processing |
| Compliance | HIPAA, DEA, state licensing checks |
| Quality | Clinical quality review |
| Follow-Up | Post-consultation check-ins |
| Scheduling | Appointment management |
| LLM Gateway | Central model router |
| Agent Logger | Performance logging |

**Acceptance Criteria:**
- [ ] Every agent call is logged to `agentLogs` table
- [ ] Drug interaction screening returns results in < 3 seconds (OpenFDA + RxNorm)
- [ ] Triage agent correctly classifies urgency at > 95% accuracy
- [ ] Compliance agent verifies provider license against state licensing rules before routing

---

### 5.9 Credential Verification Pipeline (ADR-015)

New users start as `unverified`. An AI-agent-driven pipeline verifies credentials:

| Role | Verification Requirements |
|------|--------------------------|
| Patient / Client | Stripe Identity — gov ID + selfie |
| Provider | NPI Registry + license OCR + DEA number |
| Nurse | Government ID + nursing license (type, number, state) |
| Pharmacy | NCPDP lookup + NPI registry |

On successful verification: conductor assigns role, creates role-specific record, logs to compliance trail.

**Acceptance Criteria:**
- [ ] Unverified users cannot access any portal
- [ ] All verification attempts are logged to `credentialVerifications`
- [ ] NPI lookup returns result in < 5 seconds
- [ ] Dev mode bypass available for local testing

---

### 5.10 Prescription Tracking (`/admin/tracking`)

**Features:**
- Status overview cards: Pending, Dispensed, Shipped, Delivered, Cancelled
- Filterable + searchable order list
- Click-to-expand detail: medication, patient info, pharmacy, full delivery timeline
- Real-time status updates via Convex subscription

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Page load < 2 seconds (FCP) on 4G
- Convex subscriptions update UI within 500ms of backend change
- AI agent responses < 5 seconds for standard queries
- PDF generation < 10 seconds

### 6.2 Security
- All PHI encrypted at rest (Convex managed)
- All requests over TLS 1.3
- Cookie-based sessions, 60-day expiry
- Admin access via email whitelist
- Capability-gate system enforced at `getMemberEffectiveCaps` — verified credentials required

### 6.3 Compliance
- HIPAA: All PHI access logged to `auditLog`
- DEA: Compliance agent verifies DEA registration before any controlled Rx
- State telehealth laws: `stateLicensing` table enforces per-state rules
- Surescripts: Routed via ModMed under "ScriptsXO Telehealth" location

### 6.4 Availability
- Target: 99.9% uptime
- Convex handles backend scaling automatically
- Cloudflare Pages CDN for frontend

### 6.5 Design System (Non-Negotiable)
- Primary: `#5B21B6` (deep violet) — **solid only, no gradients on buttons**
- Accent: `#2DD4BF` (teal) — decorative only
- Background: `#F8F7FF` (lavender)
- Sidebar: `#1E1037` (deep purple)
- No pink, no rose. Zero tolerance.
- Fonts: DM Sans (body), Playfair Display (headings)
- Radius: 16px
- Cards: glass morphism (backdrop-blur, border reveals on hover)

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.5.2 (App Router) |
| Backend | Convex 1.31+ (real-time serverless) |
| Authentication | Passkeys (WebAuthn via @simplewebauthn) |
| Primary AI | Google Gemini (gemini-2.0-flash via llmGateway.ts) |
| Secondary AI | Claude API (planned fallback) |
| Styling | Tailwind CSS 4 |
| Deployment | Cloudflare Pages (@cloudflare/next-on-pages) |
| Storage | Cloudflare R2 (scriptsxo-assets bucket) |
| Billing | Whop.com (@whop/checkout, @whop/sdk) |
| Email | Emailit |
| Video | Self-hosted WebRTC (Asterisk + Skyetel on Vultr VPS 144.202.25.33) |
| EHR / Rx | ModMed API ("ScriptsXO Telehealth" location) |
| Drug Data | OpenFDA + RxNorm |
| Faxing | FaxBot + BulkVS (replacing Phaxio at scale) |
| Convex DB | 25 tables |
| Testing | Vitest + Playwright |

---

## 8. Database (25 Tables)

| Table | Purpose |
|-------|---------|
| passkeys | WebAuthn credentials |
| authChallenges | Auth challenge storage |
| organizations | B2B/B2E org management |
| members | All system users (all roles) |
| patients | Patient records |
| providers | Physician/PA/NP records |
| intakes | Intake forms |
| triageAssessments | Triage results |
| consultations | Consultation sessions |
| prescriptions | Prescription records + status machine |
| pharmacies | Pharmacy directory |
| refillRequests | Refill tracking |
| followUps | Follow-up tasks |
| billingRecords | Billing / payment |
| complianceRecords | HIPAA / DEA / state compliance |
| stateLicensing | Telehealth rules by state |
| notifications | System notifications |
| agentLogs | AI agent performance logs |
| auditLog | Full admin audit trail |
| messages | Patient–provider messaging |
| rateLimits | Rate limiting |
| fileStorage | File uploads (IDs, Rx images) |
| aiConversations | Persistent AI memory |
| settings | Platform config + feature flags |
| faxLogs | Fax delivery tracking |

---

## 9. External Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Whop.com | ✅ Active | Billing, checkout, webhooks (5 keys set) |
| Google Gemini | ✅ Active | Primary AI for all tasks |
| WebAuthn / Passkeys | ✅ Active | Authentication |
| OpenFDA + RxNorm | ✅ Active | Drug interaction screening |
| NPI Registry | ✅ Active | License verification |
| Stripe Identity | 🔶 Partial | ID verification webhook + action exist |
| Emailit | 🔶 Planned | Records to DB only, no actual send yet |
| ModMed EHR API | 📋 Planned | E-prescribe backbone — access request needed |
| FaxBot + BulkVS | 📋 Planned | Self-hosted fax (Vultr VPS) |
| WebRTC / Asterisk | 📋 Planned | Self-hosted video (existing VPS) |
| Claude API | 📋 Planned | Secondary AI model |

---

## 10. Prioritized Backlog

### P0 — Critical Path (Required Before First Client)

| # | Feature | Notes |
|---|---------|-------|
| 1 | End-to-end Whop checkout | Payment must complete before intake advances |
| 2 | WebRTC video consultation | Legal requirement for initial consults |
| 3 | ModMed e-prescribe integration | Legal requirement for sending Rx |
| 4 | Emailit actual sending | Patient needs email confirmation |
| 5 | Stripe Identity integration | ID verification required |
| 6 | Prescription PDF + fax pipeline | End-to-end Rx delivery |
| 7 | Provider NPI verification | Must verify before allowing consults |

### P1 — Core Experience (Wave 1)

| # | Feature | Notes |
|---|---------|-------|
| 1 | Consultation waiting room | Pre-consult experience |
| 2 | In-room AI sidebar | Provider sees intake summary |
| 3 | Post-call summary | Email + portal update |
| 4 | Refill request workflow | Patient self-serve |
| 5 | Pharmacy portal (full) | Queue + fulfillment tracking |
| 6 | Audit log (admin) | HIPAA compliance |
| 7 | Analytics dashboard | Revenue + volume metrics |

### P2 — Scale (Wave 2)

| # | Feature | Notes |
|---|---------|-------|
| 1 | B2B org onboarding | Multi-provider clinic setup |
| 2 | B2E enterprise tier | Custom integration support |
| 3 | FaxBot + BulkVS migration | Self-hosted fax at scale |
| 4 | Drug database upgrade | FDB or Lexicomp vs open-source |
| 5 | Insurance verification | Insurance eligibility check |
| 6 | Multi-state compliance automation | State telehealth rule enforcement |
| 7 | Claude as secondary AI | Multi-model fallback |
| 8 | Coturn / Asterisk WebRTC | Self-hosted video infrastructure |

### P3 — Future

| # | Feature | Notes |
|---|---------|-------|
| 1 | Mobile app | iOS/Android native |
| 2 | Provider scheduling calendar | Live availability management |
| 3 | Patient health record timeline | Full longitudinal view |
| 4 | Compound Rx support | Specialty pharmacy integration |
| 5 | Whop B2B tier integration | Clinic/enterprise billing via Whop |

---

## 11. Terminology

The platform uses configurable terminology (ADR-017). Current config (`src/lib/config.ts`):

| Term | Value |
|------|-------|
| Single | Client |
| Plural | Clients |
| Chief concern vs complaint | **Always use "concern"** (never "complaint") |

To change platform-wide terminology: update `SITECONFIG.terminology` in `config.ts`.

---

## 12. Key Architectural Decisions (Summary)

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Deep violet + teal design system | Active |
| ADR-002 | ModMed as prescribing backbone | Active |
| ADR-004 | Video over audio (WebRTC first) | Active |
| ADR-005 | Foundation locked at v0.1.0 — additive only | Active |
| ADR-006 | No pink in the UI — ever | Active |
| ADR-008 | Three-tier pricing ($97/$997/$4,997) | Active |
| ADR-009 | Gemini as primary AI model | Active |
| ADR-010 | Whop.com for billing | Active |
| ADR-012 | Cloudflare Pages (not Workers) | Active |
| ADR-015 | Agentic credential verification | Active |
| ADR-019 | Self-hosted WebRTC on Asterisk/Skyetel | Active |
| ADR-022 | Front-end-first build approach | Active |

---

## 13. Open Questions

- What is the target state count for provider licensing at launch? (Florida + which others?)
- Is $97/mo billed monthly only, or offer annual?
- What's the SLA for provider response time in the queue?
- Will the enterprise tier be self-serve or sales-assisted?
- What's the plan for controlled substances (Schedule II–V)? DEA requirements apply.
- FaxBot VPS: Vultr VPS provisioned and available?

---

## 14. Out of Scope

- AmazingXO peptide/compound products — separate platform
- Vapi voice integration — deprioritized (ADR-004)
- Insurance claims processing — future, not Wave 1
- Mobile app — future, not Wave 1
- Medicare/Medicaid billing — out of scope for v1
