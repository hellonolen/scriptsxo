# ScriptsXO -- Project Documentation

## Overview
ScriptsXO is a luxury AI-first telehealth prescription concierge platform. It connects patients with licensed physicians for telehealth consultations and prescription fulfillment. The platform uses an agentic AI architecture where 10 specialized AI agents handle intake, triage, prescriptions, pharmacy routing, and more -- with minimal human intervention.

**Updated 2026-02-15:** ScriptsXO is now a Three-Tier Prescription Intelligence Platform with B2C, B2B, and B2E tiers. Plan v4 approved. Wave 1 in progress.

## Owner
Nolen (hellonolen@gmail.com, nolen@doclish.com) -- Admin

## Business Model (Updated 2026-02-12)

### Three-Tier Prescription Intelligence Platform (Plan v4)

| Tier | Name | Price | Audience | Key Features |
|------|------|-------|----------|--------------|
| B2C | Consumer | $97/mo | Individual patients | AI concierge, licensed provider review, Rx fulfillment |
| B2B | Clinic | $997/mo | Clinics, practices | Multi-provider org, patient management, Rx volume |
| B2E | Enterprise | $4,997/mo | Hospitals, health systems | Full platform, custom integrations, dedicated support |

Billing provider: Whop.com (not Stripe). All 5 Whop keys are set in Convex production.

## Tech Stack

**Updated 2026-02-15 -- corrects earlier entries where outdated.**

- Framework: Next.js 15.5.2 (App Router)
- Backend: Convex 1.31+ (real-time serverless)
- Auth: Passkeys (WebAuthn) -- cookie-based sessions
- AI: Google Gemini (primary, via convex/agents/llmGateway.ts), Claude API (secondary, multi-model planned)
- Styling: Tailwind CSS 4 (@tailwindcss/postcss)
- Deployment: Cloudflare Pages via @cloudflare/next-on-pages (NOT Workers, NOT Vercel)
- Storage: Cloudflare R2 (scriptsxo-assets bucket, binding: R2_ASSETS)
- Billing: Whop.com (@whop/checkout, @whop/sdk)
- Email: Emailit
- Testing: Vitest + Playwright
- Video: WebRTC (planned) + Gemini multimodal
- EHR Integration: ModMed API (planned)
- Faxing: FaxBot + BulkVS + Vultr VPS (planned, replacing Phaxio at scale)

### Key Dependencies (package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| next | 15.5.2 | Framework |
| convex | ^1.31.5 | Backend |
| @simplewebauthn/browser | ^13.2.2 | Passkey client |
| @simplewebauthn/server | ^13.2.2 | Passkey server |
| @whop/checkout | ^0.0.52 | Whop embedded checkout |
| @whop/sdk | ^0.0.27 | Whop API SDK |
| @stripe/stripe-js | ^8.7.0 | Legacy (Stripe Identity for ID verification) |
| pdf-lib | ^1.17.1 | Prescription PDF generation |
| framer-motion | ^12.26.2 | Animation |
| lucide-react | ^0.562.0 | Icons |
| zod | ^3.24.0 | Validation |
| tailwindcss | ^4 | Styling |
| @cloudflare/next-on-pages | ^1.13.16 | Cloudflare build |

## Convex Production

- Deployment: `prod:striped-caribou-797`
- URL: `https://striped-caribou-797.convex.cloud`
- Deploy command: `npx convex deploy`

### Environment Variables (10 set in Convex prod)

| Variable | Status |
|----------|--------|
| ADMIN_EMAILS | [SET] |
| GEMINI_API_KEY | [SET] |
| SITE_URL | [SET] |
| WEBAUTHN_ORIGIN | [SET] |
| WEBAUTHN_RP_ID | [SET] |
| WHOP_API_KEY | [SET] |
| WHOP_COMPANY_ID | [SET] |
| WHOP_PLAN_ID | [SET] |
| WHOP_PRODUCT_ID | [SET] |
| WHOP_WEBHOOK_SECRET | [SET] |

## Architecture

### Frontend (36 active route pages)

Pages:
- / -- Landing page
- /access -- Auth page (passkey login, deep purple branding panel)
- /start -- 11-step AI-guided intake wizard (welcome landing + chat flow)
- /portal -- Patient dashboard (bento grid, glassmorphism cards)
- /portal/prescriptions -- Patient prescription list
- /portal/messages -- Patient messages (AI agent threads)
- /portal/appointments -- Patient appointments
- /portal/billing -- Patient billing
- /dashboard -- Dashboard hub
- /dashboard/prescriptions -- Dashboard Rx view
- /dashboard/messages -- Dashboard messages
- /dashboard/appointments -- Dashboard appointments
- /dashboard/billing -- Dashboard billing
- /dashboard/order -- Dashboard order
- /consultation -- AI concierge (chat/voice/camera modes)
- /consultation/waiting-room -- Pre-consultation waiting
- /intake -- Intake wizard entry (legacy 4-step)
- /intake/medical-history -- Step 1 (legacy)
- /intake/symptoms -- Step 2 (legacy)
- /intake/id-verification -- Step 3 (legacy)
- /intake/payment -- Payment step (legacy)
- /intake/review -- Step 4 (legacy)
- /provider -- Provider dashboard
- /provider/consultation -- Provider consultation view
- /provider/patients -- Provider patient list
- /provider/prescriptions -- Provider Rx management
- /pharmacy -- Pharmacy dashboard
- /pharmacy/queue -- Incoming Rx queue
- /pharmacy/fulfillment -- Active fulfillment tracking
- /admin -- Admin dashboard
- /admin/agents -- AI agent monitoring
- /admin/analytics -- Platform analytics
- /admin/compliance -- Compliance dashboard
- /admin/fax-logs -- Fax log viewer
- /admin/prescriptions -- Admin Rx management
- /admin/providers -- Provider management
- /pay -- Payment placeholder (empty)

### Backend (57 files in /convex/, excluding _generated)

Core modules:
- schema.ts -- Full database schema (25 tables)
- settings.ts -- Platform settings (LLM prefs, feature flags) -- NEW
- organizations.ts -- Org CRUD, member management, stats -- NEW
- prescriptions.ts -- Rx CRUD, status state machine
- consultations.ts -- Consultation lifecycle
- intake.ts -- Patient intake workflow
- triage.ts -- Triage assessment storage
- pharmacies.ts -- Pharmacy management
- refills.ts -- Refill request handling
- billing.ts -- Payment processing
- passkeys.ts -- WebAuthn auth
- email.ts -- Emailit notifications
- http.ts -- HTTP endpoints (Stripe, Whop, Phaxio, Identity webhooks, health check, e-prescribe callback)
- notifications.ts -- Notification system
- patients.ts -- Patient queries (includes getByEmail, getById)
- providers.ts -- Provider management
- members.ts -- Member management
- faxLogs.ts -- Fax tracking
- messages.ts -- Patient-provider messaging
- aiConversations.ts -- Persistent AI memory
- compliance.ts -- Compliance records
- stateLicensing.ts -- State licensing rules
- followUps.ts -- Follow-up tracking
- scheduling.ts -- Appointment scheduling
- adminAudit.ts -- Admin audit log
- rateLimits.ts -- Rate limiting
- storage.ts -- File storage
- cleanup.ts -- Data cleanup
- crons.ts -- Scheduled jobs

### Convex Actions (13 files in /convex/actions/)
- aiChat.ts -- Patient-aware AI concierge (assembles patient context, runs drug screening, calls Gemini via llmGateway)
- whopCheckout.ts -- Whop embedded checkout sessions, membership verification, webhook processing
- generatePrescriptionPdf.ts -- Prescription PDF generation (pdf-lib)
- sendFax.ts -- Fax transmission pipeline
- lookupPharmacy.ts -- Pharmacy search
- assignProvider.ts -- Provider assignment
- medicalIntelligence.ts -- Drug interaction screening (OpenFDA + RxNorm)
- scanDocument.ts -- AI document scanning (gov ID, Rx, face photo via Gemini Vision)
- validateInput.ts -- AI field validation (Gemini-powered)
- verifyLicense.ts -- NPI/license verification
- stripeCheckout.ts -- Stripe checkout (legacy, being replaced by Whop)
- stripeIdentity.ts -- Stripe Identity verification
- webauthn.ts -- WebAuthn passkey actions

### AI Agents (15 files in /convex/agents/)
- conductor.ts -- Agent orchestrator/dispatcher
- triageAgent.ts -- Symptom triage, urgency classification
- prescriptionAgent.ts -- Rx validation, drug interactions
- pharmacyAgent.ts -- Pharmacy routing, fulfillment tracking
- consultationAgent.ts -- Consultation assistance
- intakeAgent.ts -- Intake processing
- billingAgent.ts -- Insurance/payment processing
- complianceAgent.ts -- HIPAA, DEA, state licensing
- qualityAgent.ts -- Clinical quality review
- followUpAgent.ts -- Post-consultation check-ins
- schedulingAgent.ts -- Appointment scheduling
- llmGateway.ts -- Centralized AI model routing (Gemini primary, model param configurable)
- agentLogger.ts -- Agent performance logging
- index.ts -- Agent exports
- types.ts -- Shared agent types

### Database Schema (25 tables)

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| passkeys | WebAuthn credentials | by_email, by_credentialId |
| authChallenges | Auth challenge storage | by_challenge |
| organizations | Org management (B2B/B2E tiers) | by_slug, by_type |
| members | System users (all roles) | by_email, by_orgId, by_role |
| patients | Patient records | by_memberId, by_email, by_state, by_created |
| providers | Physician/PA/NP records | by_memberId, by_email, by_status, by_npiNumber |
| intakes | Intake forms | by_email, by_patientId, by_status |
| triageAssessments | Triage results | by_intakeId, by_urgencyLevel |
| consultations | Consultation sessions | by_patientId, by_providerId, by_status, by_scheduledAt |
| prescriptions | Prescription records | by_consultationId, by_patientId, by_providerId, by_pharmacyId, by_status, by_patient_status, by_next_refill, by_status_created |
| pharmacies | Pharmacy directory | by_status, by_ncpdpId, by_tier |
| refillRequests | Refill tracking | by_prescriptionId, by_patientId, by_status, by_status_requested |
| followUps | Follow-up tasks | by_consultationId, by_patientId, by_status, by_scheduledFor |
| billingRecords | Billing/payment | by_patientId, by_consultationId, by_status, by_patient_type |
| complianceRecords | Compliance checks | by_entityType_entityId, by_status, by_checkType |
| stateLicensing | State telehealth rules | by_state |
| notifications | System notifications | by_recipientEmail, by_status, by_type |
| agentLogs | AI agent logs | by_agentName, by_createdAt |
| auditLog | Admin audit trail | by_actorEmail, by_entityType_entityId, by_createdAt |
| messages | Patient-provider messages | by_conversationId, by_recipientEmail |
| rateLimits | Rate limiting | by_key |
| fileStorage | File uploads | by_ownerId, by_purpose |
| aiConversations | Persistent AI memory | by_email |
| settings | Platform config/flags | by_key |
| faxLogs | Fax tracking | by_prescriptionId, by_pharmacyId, by_status, by_createdAt |

**Updated 2026-02-12:** Added `settings` table, new fields on organizations (subscriptionTier, whopMembershipId, maxProviders, maxPatients), members (orgRole), aiConversations (orgId, userRole, model). New composite indexes on prescriptions (by_patient_status, by_next_refill, by_status_created), refillRequests (by_status_requested), billingRecords (by_patient_type) for scale.

### HTTP Endpoints (convex/http.ts)

| Path | Method | Purpose |
|------|--------|---------|
| /stripe-webhook | POST | Stripe payment events |
| /whop-webhook | POST | Whop membership/payment events |
| /phaxio-callback | POST | Fax delivery status updates |
| /eprescribe-callback | POST | E-prescribe pharmacy responses |
| /stripe-identity-webhook | POST | Identity verification status |
| /health | GET | Health check |

### Key Components
- AppShell -- Main layout with deep purple sidebar, admin nav for whitelisted users
- CameraCapture -- WebRTC camera component for ID verification
- AIConcierge -- Chat/voice/camera AI interface

### Start Page (/start) -- 11-Step Intake Wizard

The primary intake flow is a single-page AI-guided wizard at `/start` with 11 steps:

1. **Welcome** -- Landing page with New/Returning client paths
2. **Intake** -- Orderer role (self / physician / nurse / caregiver / family), NPI verification for licensed providers, new vs returning
3. **Payment** -- $97/mo membership via Whop, no-refund consent
4. **Medical History** -- Conditions, medications, allergies, family history (AI-validated via Gemini)
5. **Symptoms** -- Medication request, duration, severity, previous treatments (AI-validated)
6. **Verification** -- Gov ID upload (AI-scanned), previous Rx upload (AI-scanned)
7. **Video Verification** -- 5 questions on camera, speech-to-text transcription, face capture + analysis
8. **Review** -- AI summary of all data, pharmacy selection
9. **Approved** -- Physician review in progress (3-8 min wait)
10. **Send to Pharmacy** -- Prescription transmission
11. **Fulfilled** -- Pickup confirmation

Features: NPI verification, Gemini-powered document scanning, face photo analysis, speech transcription, field validation, proxy/caregiver ordering.

## Design System
- Palette: Deep violet (#5B21B6, #7C3AED) + teal (#2DD4BF, #67E8F9)
- Background: #F8F7FF (subtle lavender)
- Sidebar: #1E1037 (deep purple)
- Cards: Glassmorphism (backdrop-blur, gradient border reveals on hover)
- Radius: 16px
- Fonts: DM Sans (body), Playfair Display (headings)
- Tags: Pill-shaped badges (.tag-active, .tag-pending, .tag-violet)
- Gradient text: .gradient-text (violet to teal), .gradient-text-soft (light violet to cyan)
- ABSOLUTE ZERO PINK: No pink/rose hex codes, Tailwind classes, or rgba values anywhere

## Prescription Flow
Patient Intake -> AI Triage -> Consultation -> Rx Creation -> AI Validation -> Provider Signs -> Pharmacy Routing -> Fulfillment -> Pickup/Delivery -> Refills

Status flow: draft -> pending_review -> signed -> sent -> filling -> ready -> picked_up | delivered | cancelled

## Admin Access
Whitelisted emails in config.ts:
- hellonolen@gmail.com
- nolen@doclish.com
Auto-granted admin cookie on login. Shows Admin Panel + Provider View nav links.

## External Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Whop.com | ACTIVE | Billing, checkout, webhooks. All 5 keys set. |
| Google Gemini | ACTIVE | Primary AI (llmGateway.ts). Text + multimodal (vision). GEMINI_API_KEY set. |
| WebAuthn/Passkeys | ACTIVE | Authentication via @simplewebauthn |
| Emailit | PLANNED | Transactional email (currently records to DB) |
| Stripe Identity | PARTIAL | ID verification webhook exists, integration started |
| ModMed EHR API | PLANNED | Prescribing backbone (separate "ScriptsXO Telehealth" location) |
| FaxBot + BulkVS | PLANNED | Self-hosted faxing (replacing Phaxio at scale) |
| OpenFDA + RxNorm | ACTIVE | Drug interaction screening in medicalIntelligence.ts |
| NPI Registry | ACTIVE | License verification in verifyLicense.ts |
| Claude API | PLANNED | Secondary AI model (multi-model support) |
| WebRTC | PLANNED | Browser-based video consultations |

## Key Decisions Log

### Session: 2026-02-12

1. DECISION: Complete design system overhaul from gold/beige to deep violet + teal
   - Reason: Original design was "boring, from 1980" per owner feedback
   - Glassmorphism cards, mesh gradient backgrounds, bento grid layouts

2. DECISION: Use ModMed as prescribing backbone, NOT standalone e-prescribe
   - Reason: Owner already uses ModMed at clinic, has DEA registration, Surescripts-certified
   - Setup: Separate "ScriptsXO Telehealth" location in ModMed, API credentials scoped to that location
   - ScriptsXO AI agents handle everything except the legal prescribing act

3. DECISION: Claude for backend agents, Gemini for multimodal (video/vision)
   - **Updated 2026-02-12:** Gemini is now PRIMARY AI for all tasks (text + multimodal). Claude is secondary. Multi-model support planned.
   - llmGateway.ts routes to Gemini (gemini-2.0-flash default). Model parameter configurable per call.

4. DECISION: Video consultation prioritized over audio/voice
   - Reason: Video is standard of care for telehealth, legally required for initial consults
   - Vapi voice deprioritized

5. DECISION: No pink in the UI
   - Reason: Owner preference
   - Changed gradients from violet-to-pink to violet-to-teal/cyan

6. DECISION: Foundation locked at v0.1.0
   - Tag: v0.1.0
   - Rule: Only build on top, never remove what exists

7. DECISION: Three-Tier Pricing (Plan v4) -- Added 2026-02-12
   - B2C: $97/mo consumer membership
   - B2B: $997/mo clinic tier (multi-provider orgs)
   - B2E: $4,997/mo enterprise tier (hospitals, health systems)
   - Billing via Whop.com (not Stripe)

8. DECISION: Whop.com for billing -- Added 2026-02-12
   - Reason: Simpler integration, embedded checkout, membership management
   - Replaces Stripe for primary billing (Stripe retained for Identity verification)

9. DECISION: One chat interface for ALL roles -- Added 2026-02-12
   - Consumer, physician, org admin, and platform admin all use the same AI chat
   - AI adapts behavior based on userRole field in aiConversations

10. DECISION: Persistent AI memory via aiConversations -- Added 2026-02-12
    - Conversations survive LLM switches (model field tracks which LLM was used)
    - Cross-page context continuity (currentPage, collectedData fields)
    - Org-aware conversations (orgId field links to org context)

11. DECISION: FaxBot + BulkVS for self-hosted faxing -- Added 2026-02-12
    - Reason: Phaxio costs too much at scale
    - Setup: FaxBot server on Vultr VPS, BulkVS for SIP trunking
    - Phaxio callback endpoint remains for backwards compatibility

12. DECISION: Cloudflare Pages (NOT Workers) -- Added 2026-02-12
    - Reason: Workers hit size limits; Pages + @cloudflare/next-on-pages works
    - R2 bucket: scriptsxo-assets
    - Deploy: scripts/deploy.sh

## Commits
- 186e4b2 -- feat: ScriptsXO initial build -- luxury telehealth prescription concierge (2026-02-12)
- 8fc0eca -- feat: design system overhaul + admin auth + AppShell migration (2026-02-12)
- 27da823 -- feat: prescription PDF generation, fax pipeline, admin provider CRUD, and pharmacy lookup (2026-02-12)
- f060311 -- chore: switch to Cloudflare Pages + R2, add deployment docs and script (2026-02-12)
- 8d9cc98 -- fix: pin Next.js 15.5.2 for Cloudflare Pages compatibility, remove @opennextjs/cloudflare (2026-02-12)
- 0a4345d -- fix: remove nonce-based CSP for Cloudflare Pages compatibility (2026-02-12)
- c9dc93a -- fix: make all inputs fully visible -- solid borders, white bg, clear labels (2026-02-12)
- 61e4cce -- chore: clarify that .vercel/ path is Cloudflare's internal convention, not Vercel (2026-02-12)

## Tags
- v0.1.0 -- Foundation lock-in: design system, AppShell, admin auth, agentic architecture, Convex schema with 10 AI agents, 27 routes

## Issues / Open Items

### Active
- [ ] Wave 1 implementation in progress (schema changes done, settings + organizations modules created)
- [ ] Paywall integration -- Whop checkout wired but needs end-to-end testing
- [ ] Patient queries -- getByEmail added, more query variants needed for org-scoped access
- [ ] WebRTC video consultation -- not yet implemented (separate from video verification in /start)
- [ ] Emailit actual sending -- currently just records to DB
- [ ] E-prescribe integration layer (convex/integrations/modmed.ts)
- [ ] Drug database integration (FDB/Lexicomp) -- currently using OpenFDA/RxNorm
- [ ] Insurance verification integration
- [ ] FaxBot + BulkVS server setup on Vultr VPS
- [ ] Provider/admin/pharmacy pages still use old Nav component (not AppShell)
- [ ] Dashboard routes overlap with portal routes -- need consolidation

### Resolved / Updated
- [x] Convex deployment -- DEPLOYED (prod:striped-caribou-797) -- Resolved 2026-02-12
- [x] Gemini integration -- DONE (llmGateway.ts calls Gemini API directly) -- Resolved 2026-02-12
- [x] Whop integration -- 5 keys set in Convex, checkout + webhook handler exist -- Resolved 2026-02-12
- [x] Settings table -- Created (convex/settings.ts) -- Resolved 2026-02-12
- [x] Organizations module -- Created (convex/organizations.ts) -- Resolved 2026-02-12
- [ ] ModMed API access -- need to request from ModMed rep (separate telehealth location) -- STILL OPEN
- [ ] Claude API key -- NOT set (Gemini is primary now, Claude secondary planned) -- Updated 2026-02-12
- [ ] Stripe webhook verification -- TODO in http.ts -- STILL OPEN
- [ ] Identity verification integration (Stripe Identity webhook exists, action exists) -- PARTIAL

## Questions / Open Research
- How to structure ModMed API integration to maintain separation of concerns?
- Best practices for HIPAA-compliant AI agent logging?
- Video consultation: build custom WebRTC or use Twilio/Daily.co?
- Drug interaction database: FDB vs Lexicomp vs open-source (currently OpenFDA/RxNorm)?
- FaxBot server provisioning: Vultr VPS sizing and BulkVS SIP configuration?
- Whop webhook signature verification -- how to implement HMAC validation?

## Session Log

### 2026-02-12 -- Foundation Build
**Topics:** Initial scaffolding, design system overhaul, admin auth, AppShell migration

**Work completed:**
- Generated complete application scaffold (47 frontend files, 40 backend files)
- Implemented deep violet + teal design system with glassmorphism
- Built AppShell component with admin navigation
- Implemented passkey-based admin authentication
- Created 14 specialized AI agents with conductor orchestration
- Set up prescription status state machine
- Configured Tailwind CSS 4 with custom design tokens

**Current State:**
- Frontend: All routes scaffolded, AppShell on patient pages only
- Backend: Full schema defined, core functions implemented
- AI: Agent architecture in place, llmGateway ready for Claude/Gemini
- Auth: Passkey login working, admin whitelist active
- Styling: Design system complete and applied to patient portal

**Next Steps:**
- Deploy Convex backend
- Set up Claude API key in Convex environment
- Migrate provider/admin/pharmacy pages to AppShell
- Implement WebRTC video consultation
- Request ModMed API access

### 2026-02-12 -- Wave 1: Schema, Billing, AI Wiring
**Topics:** Three-tier pricing, Whop integration, Gemini AI wiring, schema expansion, organizations module, settings module, 11-step intake wizard, FaxBot decision

**Work completed:**
- Approved Plan v4: Three-Tier Prescription Intelligence Platform
- Expanded schema to 25 tables (added settings table)
- Added new fields to organizations (subscriptionTier, whopMembershipId, maxProviders, maxPatients)
- Added orgRole to members, orgId/userRole/model to aiConversations
- Created composite indexes for scale on prescriptions, refillRequests, billingRecords
- Built convex/settings.ts module (get, getMany, set, remove, listAll)
- Built convex/organizations.ts module (create, getBySlug, getById, list, getMembers, addMember, removeMember, update, getStats)
- Wired Gemini API in llmGateway.ts (gemini-2.0-flash default, text + multimodal)
- Built aiChat.ts action with patient context assembly, drug screening integration, agentic awareness
- Built whopCheckout.ts (createCheckoutSession, verifyMembership, processWebhook)
- Added Whop webhook endpoint to http.ts
- Set all 5 Whop keys + GEMINI_API_KEY in Convex prod
- Built /start page: 11-step intake wizard with welcome landing, proxy ordering, NPI verification, AI-powered document scanning, video verification with speech transcription, face capture/analysis
- Built scanDocument.ts (gov ID scanning, Rx scanning, face analysis via Gemini Vision)
- Built validateInput.ts (AI field validation)
- Built verifyLicense.ts (NPI registry lookup)
- Built medicalIntelligence.ts (drug interaction screening)
- Deployed Convex to production
- Switched from Cloudflare Workers to Cloudflare Pages
- Multiple fixes: input visibility, CSP, Next.js pinning

**Current State:**
- Frontend: 36 active route pages, /start is primary intake flow
- Backend: 57 Convex files, 25 tables, 13 actions, 15 agents
- AI: Gemini wired and active as primary model
- Billing: Whop checkout + webhooks wired, keys set in prod
- Auth: Passkey login + admin whitelist active
- Deployment: Convex prod deployed, Cloudflare Pages configured

**Decisions Made:**
- ADR-008 through ADR-012 (see DECISIONS.md)

**Next Steps:**
- End-to-end Whop checkout testing
- WebRTC video consultation build
- FaxBot server setup (Vultr VPS + BulkVS)
- ModMed API access request
- Dashboard/portal route consolidation

### 2026-02-15 -- Documentation Update
**Topics:** Project documentation refresh, codemap accuracy

**Work completed:**
- Updated PROJECT.md with current state (25 tables, 36 routes, 57 backend files)
- Updated DECISIONS.md with ADR-008 through ADR-012
- Updated ENVIRONMENT.md with current env var status
- Updated SESSIONS.md with session entries

**Current State:**
- All documentation reflects actual codebase state as of 2026-02-15
