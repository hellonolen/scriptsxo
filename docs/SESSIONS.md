# ScriptsXO -- Session Log

Each session is logged with date, topics, decisions, and work completed.

---

## Session: 2026-02-12 (Foundation Build)

### Topics Discussed
- Complete visual design system overhaul (gold/beige rejected, replaced with deep violet + teal)
- AppShell migration for all patient-facing pages
- Admin auth setup for owner emails
- Prescription routing and fulfillment architecture review
- ModMed EHR integration strategy
- AI model selection (Claude vs Gemini -- using both)
- Video vs audio consultation priority
- Foundation lock-in at v0.1.0

### Work Completed
- Rewrote globals.css with new design system (glassmorphism, mesh gradients, deep purple sidebar)
- Built AppShell component (deep purple sidebar with admin nav support)
- Migrated portal, prescriptions, messages, appointments, billing pages to AppShell
- Rewrote consultation page with horizontal mode tabs
- Rewrote intake page with AppShell
- Updated camera-capture and ai-concierge components to new palette
- Updated access/login page with deep purple branding panel
- Added admin email whitelist to config.ts
- Added isAdminEmail() helper to auth.ts
- Session-based login with auto-admin for whitelisted emails
- Dynamic user display in AppShell (name, initials, role from session cookie)
- Created gradient text CSS classes (.gradient-text, .gradient-text-soft)
- Fixed Tailwind v4 compatibility: converted inline background styles to utility classes
- Fixed gradient text descender clipping (padding-bottom trick)
- Removed pink from all gradients, replaced with teal/cyan
- Committed and tagged as v0.1.0

### Decisions Made
- ADR-001 through ADR-007 (see DECISIONS.md)

### Open Items After This Session
- ModMed API access request (contact rep)
- Convex deployment
- Claude API key setup
- Gemini integration in llmGateway.ts
- WebRTC video consultation implementation
- Provider/admin/pharmacy pages still use old Nav component
- convex/integrations/modmed.ts needs to be built

---

## Session: 2026-02-12 (Wave 1: Schema, Billing, AI Wiring)

### Topics Discussed
- Three-Tier Prescription Intelligence Platform (Plan v4)
- Whop.com payment integration (replacing Stripe for billing)
- Gemini AI wiring as primary model
- Schema expansion for organizations and settings
- 11-step intake wizard design and implementation
- AI-powered document scanning (gov ID, Rx, face)
- NPI license verification
- Drug interaction screening (OpenFDA + RxNorm)
- FaxBot + BulkVS self-hosted faxing decision
- Cloudflare Pages (replacing Workers due to size limits)
- Persistent AI memory architecture

### Work Completed
- Approved Plan v4: Three-Tier Prescription Intelligence Platform (B2C $97/mo, B2B $997/mo, B2E $4,997/mo)
- Expanded schema to 25 tables (added settings table)
- Added org tier fields (subscriptionTier, whopMembershipId, maxProviders, maxPatients)
- Added orgRole to members, orgId/userRole/model to aiConversations
- Created composite indexes for scale (prescriptions, refillRequests, billingRecords)
- Built convex/settings.ts (get, getMany, set, remove, listAll)
- Built convex/organizations.ts (create, getBySlug, getById, list, getMembers, addMember, removeMember, update, getStats)
- Wired Gemini API in llmGateway.ts (gemini-2.0-flash, text + multimodal)
- Built aiChat.ts (patient context assembly, drug screening, agentic awareness, cross-page memory)
- Built whopCheckout.ts (createCheckoutSession, verifyMembership, processWebhook)
- Added Whop webhook endpoint to http.ts (/whop-webhook)
- Set 10 env vars in Convex prod (ADMIN_EMAILS, GEMINI_API_KEY, SITE_URL, WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID, 5x WHOP_*)
- Built /start page: 11-step AI-guided intake wizard
  - Welcome landing with New/Returning paths
  - Proxy ordering (self, physician, nurse, caregiver, family)
  - NPI verification for licensed providers
  - $97/mo Whop payment with no-refund consent
  - Medical history + symptoms with AI field validation
  - Gov ID + Rx document scanning via Gemini Vision
  - Video recording with 5 questions + speech transcription
  - Face capture + analysis
  - AI-generated review summary
  - Pharmacy selection with validation
  - Approval wait + fulfillment flow
- Built scanDocument.ts (scanGovernmentId, scanPrescription, analyzeFacePhoto)
- Built validateInput.ts (validateFormStep via Gemini)
- Built verifyLicense.ts (NPI registry lookup via NPPES API)
- Built medicalIntelligence.ts (screenMedications via OpenFDA + RxNorm)
- Deployed Convex to production (prod:striped-caribou-797)
- Switched from Cloudflare Workers to Cloudflare Pages
- Pinned Next.js to 15.5.2 for Pages compatibility
- Removed nonce-based CSP for Pages compatibility
- Fixed all inputs to be fully visible (solid borders, white bg)
- Added /admin/fax-logs, /admin/prescriptions routes
- Added /dashboard/* routes, /intake/payment, /start routes
- Added prescription PDF generation, fax pipeline, admin provider CRUD, pharmacy lookup

### Decisions Made
- ADR-008: Three-Tier Pricing (Plan v4)
- ADR-009: Gemini as Primary AI (supersedes ADR-003)
- ADR-010: Whop.com for Billing
- ADR-011: Self-Hosted Faxing (FaxBot + BulkVS)
- ADR-012: Cloudflare Pages (not Workers)
- ADR-013: Persistent AI Memory
- ADR-014: One Chat Interface for All Roles

### Commits
- 27da823 -- feat: prescription PDF generation, fax pipeline, admin provider CRUD, and pharmacy lookup
- f060311 -- chore: switch to Cloudflare Pages + R2, add deployment docs and script
- 8d9cc98 -- fix: pin Next.js 15.5.2 for Cloudflare Pages compatibility
- 0a4345d -- fix: remove nonce-based CSP for Cloudflare Pages compatibility
- c9dc93a -- fix: make all inputs fully visible
- 61e4cce -- chore: clarify .vercel/ path is Cloudflare internal convention

### Open Items After This Session
- End-to-end Whop checkout testing (checkout action exists, needs frontend wiring test)
- WebRTC video consultation build (separate from video verification in /start)
- FaxBot server provisioning (Vultr VPS + BulkVS)
- ModMed API access request (still pending)
- Dashboard/portal route consolidation (overlap exists)
- Provider/admin/pharmacy pages still on old Nav component
- Claude API integration as secondary model
- Emailit actual email sending (currently DB-only)

---

## Session: 2026-02-15 (Documentation Update)

### Topics Discussed
- Full documentation refresh to match codebase state
- Accurate route counting, table counting, module inventory

### Work Completed
- Updated PROJECT.md with comprehensive current state:
  - 25 database tables (with all indexes documented)
  - 36 active route pages (with descriptions)
  - 57 Convex backend files, 13 actions, 15 agents
  - Business model section (three-tier pricing)
  - Key dependencies table from package.json
  - HTTP endpoints table
  - External integrations status table
  - Complete /start page 11-step wizard documentation
  - Updated issue tracker (resolved vs active items)
- Updated DECISIONS.md:
  - Marked ADR-003 as SUPERSEDED by ADR-009
  - Added ADR-008 through ADR-014 (7 new decisions)
- Updated ENVIRONMENT.md:
  - All 10 active env vars marked as SET
  - Added Convex prod deployment info
  - Added webhook URL reference table
  - Added FaxBot setup plan
  - Updated deployment commands for Cloudflare Pages
- Updated SESSIONS.md with entries for all sessions

### Open Items After This Session
- Same as previous session (no code changes, documentation only)

---

## Session: 2026-02-25 (Agentic Credential Verification Pipeline)

### Topics Discussed
- Eliminating all manual email lists for role assignment (provider/pharmacy)
- AI-agent-driven credential verification pipeline
- NPI Registry integration for provider verification
- Stripe Identity for patient ID verification
- NCPDP / pharmacy NPI verification
- Role-based view isolation (no context switcher for non-admins)
- Onboarding flow for unverified users

### Work Completed

#### Backend (Convex)
- Added `credentialVerifications` table to schema.ts (26 fields, 4 indexes)
- Created convex/credentialVerifications.ts -- state machine with 14 mutations/queries
- Created convex/agents/credentialVerificationAgent.ts -- 9 agent actions:
  - Provider: verifyProviderNpi, processProviderLicense, processProviderDea, runProviderComplianceReview
  - Patient: initPatientVerification, checkPatientVerification, runPatientComplianceReview
  - Pharmacy: verifyPharmacy, runPharmacyComplianceReview
- Created convex/actions/credentialVerificationOrchestrator.ts -- 3 actions:
  - initializeVerification, finalizeVerification, devBypassVerification
- Updated convex/members.ts: default role "unverified", added updateRole mutation
- Updated convex/agents/conductor.ts: added credentialVerification dispatch case

#### Frontend (Next.js)
- Created /src/app/onboard/page.tsx -- role selection UI (Patient/Provider/Pharmacy)
- Created /src/app/onboard/provider/page.tsx -- multi-step NPI/License/DEA/Review flow
- Created /src/app/onboard/patient/page.tsx -- Stripe Identity consent/verify flow
- Created /src/app/onboard/pharmacy/page.tsx -- NCPDP/NPI entry and verification

#### Auth, Routing, Config
- Updated src/lib/auth.ts: removed email-list role detection, role from session only
- Updated src/lib/config.ts: removed providerEmails and pharmacyEmails arrays
- Updated src/middleware.ts: added onboard routes, unverified user routing block
- Updated src/app/page.tsx: role-based routing (unverified -> /onboard)
- Updated src/components/app-shell.tsx: context switcher admin-only

#### Bug Fixes (this continuation session)
- Fixed Stripe Identity arg mismatch: createVerificationSession uses `patientEmail` not `email`
- Fixed Stripe Identity return value: `verificationSessionId` not `sessionId`
- Fixed checkVerificationStatus args: `verificationSessionId` + `patientEmail` required

### Decisions Made
- ADR-015: Agentic Credential Verification -- AI agents verify credentials, no manual email lists
- ADR-016: Admin-Only Context Switcher -- non-admin users see only their portal, no switching

### Open Items After This Session
- Deploy Convex schema changes (`npx convex deploy` or `npx convex dev`)
- Test end-to-end onboarding flow in dev mode
- Test with real NPI number (e.g., 1234567893) in production
- Verify Stripe Identity flow end-to-end with real Stripe keys
- Add license document upload + Gemini OCR step (provider onboarding placeholder exists)
- NCPDP registry lookup (currently only NPI-based pharmacy verification)
- End-to-end testing for all three role paths

---

## Session: 2026-02-25 (Telehealth Architecture, Terminology, Consultation UI Plan)

### Topics Discussed
- Convex schema deployment (emailAuth.ts "use node" bug, credentialVerifications + magicLinks tables going live)
- Dev onboard flow E2E test: memberId bug found and fixed
- Configurable terminology: "patient" vs "client" platform-wide without DB schema changes
- Nurse / clinical staff role added to onboarding
- Commit, push, deploy to Cloudflare Pages
- Telehealth status audit: no real WebRTC built yet, consultation pages are UI placeholders
- Composio integration audit: wired but not connected to video; covers downstream workflows (ModMed, pharmacy, fax, scheduling)
- Daily.co pricing analysis vs self-hosted Asterisk + WebRTC cost comparison
- IntakeBella and FaxBella VPS infrastructure audit (Vultr VPS 144.202.25.33, Asterisk + Skyetel + Gemini)
- Multi-tenant Asterisk architecture: context-based isolation so ScriptsXO and IntakeBella never bleed
- AmazingXO telehealth UI audit: dark-only, no real WebRTC, ~40% component reuse possible
- Product separation decision: keep ScriptsXO and AmazingXO separate (different audiences, regulatory contexts, brands)
- ScriptsXO consultation UI plan: 3 screens (Waiting Room → Consultation Room → Post-Call)
- Explicit owner instruction: build front end first before wiring any back end

### Work Completed

#### Backend (Convex)
- Fixed `convex/actions/emailAuth.ts`: added missing `"use node"` directive (was blocking `npx convex deploy`)
- Deployed schema to prod:striped-caribou-797 — `credentialVerifications` (26 fields, 4 indexes) and `magicLinks` tables now live
- Confirmed COMPOSIO_API_KEY already set in Convex prod

#### Bug Fix: memberId (Critical)
- Root cause: `handleDevLogin()` on homepage created a session cookie but never created a Convex member record
- All onboard pages query `members.getByEmail` to get `memberId` for credential verification; returned null for new dev accounts
- Fix: added `useMutation(api.members.getOrCreate)` call in `handleDevLogin` before `completeAuth`
  - `getOrCreate` is idempotent — returns existing member if email already exists
  - One fix covers all three onboard paths (provider, patient, pharmacy)
- E2E re-test: all 10 steps passed after fix

#### Terminology System
- Added `terminology` block to `SITECONFIG` in `src/lib/config.ts`
  - `clientTerm: "client"`, `clientTermPlural: "clients"`, `clientTermTitle: "Client"`, `clientTermPluralTitle: "Clients"`
  - Change one line to swap "patient"↔"client" platform-wide — no DB schema changes
- Added `term()` helper function to `src/lib/config.ts` (4 forms: singular, plural, title, titlePlural)
- Updated `src/app/provider/page.tsx` — term() for "Patient Queue", nav cards, column header
- Updated `src/app/admin/page.tsx` — term() for "Patients Today" stat
- Updated `src/app/pharmacy/page.tsx` — term() for Patient column header
- Updated `src/app/onboard/page.tsx` — term() for Patient role label and description

#### Nurse Role
- Added nurse/clinical staff as 4th role in `src/app/onboard/page.tsx` (between Provider and Pharmacy)
- Created `src/app/onboard/nurse/page.tsx` — 3-step flow:
  - Step 1: Gov ID (simulated in dev, upload placeholder in prod)
  - Step 2: Nursing License (type selector: RN/LPN/APRN/CNA/Other, license number, issuing state)
  - Step 3: Review + Complete Verification
  - Dev bypass: calls `devBypassVerification` action, assigns "nurse" role
  - Prod path: placeholder with error directing to admin (to be wired later)

#### Commit / Deploy
- Committed all changes (terminology, nurse role, memberId fix, emailAuth fix)
- Pushed to `feature/full-agentic-build` on GitHub
- Deployed to Cloudflare Pages (scriptsxo project)

### Key Architecture Decisions
- ADR-017: Configurable Terminology (patient/client) — see DECISIONS.md
- ADR-018: Nurse / Clinical Staff Role — see DECISIONS.md
- ADR-019: Self-Hosted WebRTC on Existing Asterisk Infrastructure — see DECISIONS.md
- ADR-020: Multi-Tenant Asterisk via Context Isolation — see DECISIONS.md
- ADR-021: Product Separation (ScriptsXO vs AmazingXO) — see DECISIONS.md
- ADR-022: Front-End-First Build Approach — see DECISIONS.md

### Telehealth Architecture Plan (Next Build)
Three-screen consultation flow to build (front end first):

**Screen 1 — Waiting Room** (`/consultation/waiting-room`)
- Patient view: "Your provider will join shortly" with timer, tips carousel, AI concierge chat
- Provider view: patient queue, accept/decline, quick chart review

**Screen 2 — Consultation Room** (`/consultation/room` or `/provider/consultation/room`)
- Full-screen video grid (local + remote streams via WebRTC)
- Sidebar: AI live transcription, suggested Dx, drug lookup
- Controls: mute, camera, screen share, end call
- Built on existing Asterisk + Coturn (STUN/TURN) + SIP.js browser bridge

**Screen 3 — Post-Call** (`/consultation/complete`)
- AI-generated visit summary
- Prescription decision (approve, modify, decline)
- Patient messaging: next steps, Rx routing to pharmacy
- Follow-up scheduling

### Infrastructure Notes
- Vultr VPS: 144.202.25.33 (Asterisk + Skyetel + Gemini transcription already running)
- SIP carriers available: Skyetel (primary), Thinq, QuestBlue
- Need to install: Coturn (STUN/TURN for WebRTC NAT traversal)
- Browser bridge: SIP.js or JsSIP (WebRTC ↔ Asterisk SIP)
- Phone provisioning: Skyetel API for auto-provisioning DID at org signup (not manual)
- Multi-tenant isolation: Asterisk dialplan contexts (scriptsxo-*, intakebella-* namespaces)
- Breakeven vs Daily.co: ~43 calls/month (self-hosted wins at any real volume)

### Open Items After This Session
- **NEXT: Build consultation UI front end** (3 screens, no back end wiring yet — owner's explicit instruction)
- Set STRIPE_SECRET_KEY in Convex prod (owner to add)
- Set GEMINI_API_KEY, WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID in Convex prod if not already set
- Update SITE_URL in Convex prod (currently set to localhost)
- Install Coturn on Vultr VPS 144.202.25.33 for WebRTC STUN/TURN
- Configure Asterisk multi-tenant contexts (scriptsxo-*, intakebella-*)
- Wire SIP.js browser bridge in consultation room
- Auto-provision phone numbers via Skyetel API at org signup
- Stripe Identity end-to-end test (once key set)
- Real NPI test in production (use 1003000126, not 1234567893 — 1234567893 is not a real NPI)
- License document upload + Gemini OCR for provider onboarding
- NCPDP registry for pharmacy verification
- Activate Composio toolkits (need individual credentials per toolkit in Composio dashboard)
- Google Calendar OAuth for scheduling sync via Composio
- ModMed API credentials for e-prescribe and EHR
- Per-org terminology config (move clientTerm to organizations table for true multi-tenant)
- AmazingXO component extraction (chat bubbles, voice hooks, glassmorphism patterns)
