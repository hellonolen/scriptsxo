# ScriptsXO -- Architecture Decisions

Decisions are permanent. Never deleted, only marked as superseded.

---

## ADR-001: Design System -- Deep Violet + Teal
- Date: 2026-02-12
- Status: ACTIVE
- Context: Original gold/beige design was rejected as "boring, from 1980"
- Decision: Complete overhaul to deep violet (#5B21B6, #7C3AED) with teal accent (#2DD4BF). Glassmorphism cards, mesh gradient backgrounds, deep purple sidebar (#1E1037), bento grid layouts.
- Consequence: All UI follows this system. No pink allowed.

## ADR-002: ModMed as Prescribing Backbone
- Date: 2026-02-12
- Status: ACTIVE
- Context: Need e-prescribe capability. Owner uses ModMed at existing clinic. Standalone Surescripts certification costs $50k+ and takes months.
- Decision: Use ModMed API with a separate "ScriptsXO Telehealth" location. ScriptsXO AI agents handle everything except the legal prescribing act. ModMed handles Surescripts, DEA compliance, pharmacy routing via its existing infrastructure.
- Consequence: Dependency on ModMed API availability. Need multi-location setup. Main clinic operations remain untouched.

## ADR-003: Dual AI Model Strategy
- Date: 2026-02-12
- Status: SUPERSEDED by ADR-009 (2026-02-12)
- Context: Need both structured reasoning (triage, Rx validation) and multimodal capabilities (video, vision, voice).
- Decision: Claude API (Anthropic) for backend agents. Google Gemini for multimodal patient-facing features (video consultation, ID verification, medication photo reading). llmGateway.ts routes to appropriate model.
- Consequence: Two API keys to manage. Model routing logic in gateway.
- Superseded: Gemini is now primary for ALL tasks. Claude is secondary. See ADR-009.

## ADR-004: Video Over Audio
- Date: 2026-02-12
- Status: ACTIVE
- Context: Platform originally had Vapi voice integration. Owner wants video consultation prioritized.
- Decision: WebRTC video consultation with Gemini multimodal analysis. Vapi voice deprioritized.
- Consequence: Vapi integration paused. WebRTC implementation needed.

## ADR-005: Foundation Lock at v0.1.0
- Date: 2026-02-12
- Status: ACTIVE
- Context: Design system, AppShell, admin auth, agentic architecture, 27 routes are stable.
- Decision: Tag v0.1.0 as immutable foundation. All future work is additive only. Never remove existing functionality.
- Consequence: Any changes to locked code require owner approval.

## ADR-006: No Pink in UI
- Date: 2026-02-12
- Status: ACTIVE
- Context: Owner preference.
- Decision: All gradient endpoints changed from pink/rose to teal/cyan. No pink (#E11D48, #FB7185) in user-visible UI.
- Consequence: Gradient classes use violet-to-teal instead of violet-to-pink.

## ADR-007: Cookie-Based Auth with Admin Whitelist
- Date: 2026-02-12
- Status: ACTIVE
- Context: Need simple auth before Convex passkey integration is complete.
- Decision: Cookie-based sessions (60-day). Admin emails whitelisted in config.ts. Admin cookie auto-set on login for whitelisted emails.
- Consequence: Will be replaced by Convex passkey auth when backend is deployed. Whitelist pattern stays.

## ADR-008: Three-Tier Pricing (Plan v4)
- Date: 2026-02-12
- Status: ACTIVE
- Context: ScriptsXO needs a scalable revenue model that serves consumers, clinics, and enterprise health systems.
- Decision: Three-tier pricing:
  - B2C Consumer: $97/mo -- individual patients, AI concierge, licensed provider review, Rx fulfillment
  - B2B Clinic: $997/mo -- multi-provider organizations, patient management, Rx volume
  - B2E Enterprise: $4,997/mo -- hospitals, full platform access, custom integrations, dedicated support
- Consequence: Schema must support organizations with subscription tiers, member roles, and capacity limits. Organizations table expanded. Settings table added for config.

## ADR-009: Gemini as Primary AI Model
- Date: 2026-02-12
- Status: ACTIVE (supersedes ADR-003)
- Context: Initially planned Claude for backend reasoning and Gemini for multimodal only. After evaluation, Gemini handles both text and multimodal well enough to be primary.
- Decision: Google Gemini (gemini-2.0-flash) is the primary AI model for all tasks -- text generation, patient chat, document scanning, face analysis, field validation, drug screening. Claude API remains as a secondary/fallback. Multi-model support via model parameter in llmGateway.ts.
- Consequence: Only GEMINI_API_KEY required in production (set). Claude API key not yet needed. aiConversations.model field tracks which LLM was used for audit trail.

## ADR-010: Whop.com for Billing (Not Stripe)
- Date: 2026-02-12
- Status: ACTIVE
- Context: Need a billing solution for the $97/mo consumer membership. Stripe is complex. Whop.com offers simpler membership management with embedded checkout.
- Decision: Whop.com for all billing. Embedded checkout via @whop/checkout SDK. Webhook handler at /whop-webhook for payment.succeeded, membership.activated, membership.deactivated events. Stripe retained only for Identity verification (ID scanning).
- Consequence: 5 Whop env vars required (WHOP_API_KEY, WHOP_COMPANY_ID, WHOP_PLAN_ID, WHOP_PRODUCT_ID, WHOP_WEBHOOK_SECRET). All set in Convex prod. Stripe checkout action is legacy.

## ADR-011: Self-Hosted Faxing (FaxBot + BulkVS)
- Date: 2026-02-12
- Status: ACTIVE
- Context: Phaxio works for initial faxing but costs too much at scale. Need a self-hosted alternative.
- Decision: FaxBot open-source fax server on a Vultr VPS with BulkVS for SIP trunking. Phaxio callback endpoint remains for backwards compatibility during migration.
- Consequence: Need to provision Vultr VPS, install FaxBot, configure BulkVS SIP trunk. Fax pipeline in sendFax.ts will need to support both Phaxio and FaxBot backends.

## ADR-012: Cloudflare Pages (Not Workers)
- Date: 2026-02-12
- Status: ACTIVE
- Context: Cloudflare Workers hit size limits for Next.js apps. @opennextjs/cloudflare worker.js exceeded the 1MB limit.
- Decision: Cloudflare Pages via @cloudflare/next-on-pages. Output goes to .vercel/output/static (Cloudflare's internal convention, not related to Vercel). R2 bucket (scriptsxo-assets) for static assets.
- Consequence: Deploy via `npm run build:cf && npm run deploy:pages`. Next.js pinned to 15.5.2 for Pages compatibility. No nonce-based CSP (not supported on Pages).

## ADR-013: Persistent AI Memory
- Date: 2026-02-12
- Status: ACTIVE
- Context: AI conversations must persist across page navigations, LLM switches, and sessions. The AI needs to remember context across the entire intake flow.
- Decision: aiConversations table stores full message history with page tags, collected data, org context, user role, and LLM model used. aiChat.ts action assembles patient context from patients table, intake table, and aiConversations table before each LLM call.
- Consequence: All AI conversations are durable. Cross-page context works. Model switching is auditable. Org-scoped conversations support B2B/B2E tiers.

## ADR-014: One Chat Interface for All Roles
- Date: 2026-02-12
- Status: ACTIVE
- Context: Building separate UIs for consumers, physicians, org admins, and platform admins is wasteful and inconsistent.
- Decision: A single AI chat interface adapts to the user's role. The userRole field in aiConversations determines the AI's behavior and persona. Consumer sees a patient concierge. Physician sees a clinical assistant. Admin sees a platform management tool.
- Consequence: aiChat.ts system prompt must be role-aware. UI components remain the same across roles. Role-based feature gating happens via the AI's behavior, not separate pages.

## ADR-015: Agentic Credential Verification
- Date: 2026-02-25
- Status: ACTIVE
- Context: Manual email lists for provider/pharmacy role assignment (providerEmails, pharmacyEmails in config.ts) were completely counter to the agentic architecture. Admins shouldn't manually manage who is a provider or pharmacy.
- Decision: All non-admin users start as "unverified" after auth. An AI-agent-driven pipeline verifies credentials: providers via NPI Registry + license OCR + DEA, patients via Stripe Identity (gov ID + selfie), pharmacies via NCPDP/NPI lookup. On verification, the orchestrator assigns the role and creates role-specific records. Admin emails in config stay as a platform-level override.
- Consequence: Zero manual role management. New users must complete onboarding at /onboard before accessing any portal. Credential verification agent creates compliance audit trail automatically. Dev mode has a bypass for local testing.

## ADR-016: Admin-Only Context Switcher
- Date: 2026-02-25
- Status: ACTIVE
- Context: The context switcher (Patient/Provider/Pharmacy/Admin portals) was visible to all users. Patients could see that provider and pharmacy portals exist, which is a security and UX concern.
- Decision: Context switcher renders ONLY for admin users. All other roles (patient, provider, pharmacy) see their single portal with no switching capability and no awareness that other portals exist.
- Consequence: Strict role isolation in the UI. Non-admin users have a cleaner, focused experience. Admins retain full cross-portal access for support and oversight.

## ADR-017: Configurable Terminology (Patient vs Client)
- Date: 2026-02-25
- Status: ACTIVE
- Context: Different organizations using the platform call the same person by different terms — healthcare practices say "patient," wellness clinics say "client." The DB schema is the same. Only display text differs. Hardcoded "patient" throughout the UI would require per-org forks.
- Decision: Add a `terminology` block to `SITECONFIG` in `src/lib/config.ts` with four fields (`clientTerm`, `clientTermPlural`, `clientTermTitle`, `clientTermPluralTitle`). Add a `term()` helper function that accepts a form param and returns the configured string. All user-facing references to "patient" use `term()` instead of literals. Change one line in config to swap the entire platform.
- Consequence: Zero DB schema impact. Single source of truth for terminology. Future plan: move to organizations table for per-org config in B2B/B2E tier.

## ADR-018: Nurse / Clinical Staff Role
- Date: 2026-02-25
- Status: ACTIVE
- Context: The platform initially had four roles: patient, provider, pharmacy, admin. Clinical staff (RNs, LPNs, APRNs, CNAs) are distinct from providers (physicians, NPs, PAs) and need their own verification pipeline and access level.
- Decision: Add "nurse" as a first-class role. Onboarding flow at `/onboard/nurse` collects government-issued ID and nursing license (type + number + state). Dev bypass assigns the role immediately. Prod path records credentials for admin review. The nurse role gets its own portal access level, distinct from provider and patient.
- Consequence: 5 roles total: unverified, patient, provider, nurse, pharmacy (admin is config-based, not onboarded). Credential verification agent needs nurse-specific logic added. License verification against state boards is a future step (currently manual admin review).

## ADR-019: Self-Hosted WebRTC on Existing Asterisk Infrastructure
- Date: 2026-02-25
- Status: ACTIVE
- Context: Owner already has a Vultr VPS (144.202.25.33) running Asterisk + Skyetel SIP + Gemini transcription for IntakeBella and FaxBella. Daily.co costs $0.00456/participant-minute for video. At any real call volume, self-hosted wins decisively. Breakeven vs Daily.co is ~43 calls/month.
- Decision: Build ScriptsXO telehealth on the existing Asterisk + SIP infrastructure. Add Coturn (STUN/TURN server) for WebRTC NAT traversal. Add SIP.js or JsSIP as the browser-to-Asterisk bridge. Phone numbers auto-provisioned via Skyetel API at org signup. No Daily.co, no Zoom, no external video SaaS.
- Consequence: Near-zero marginal cost per call beyond VPS hosting ($6/mo baseline). Requires: (1) Coturn installation on VPS, (2) Asterisk WebRTC config, (3) SIP.js integration in consultation room UI. HIPAA compliance baked in (protected environment, no third-party video processor). Nolen manages the VPS.

## ADR-020: Multi-Tenant Asterisk via Context Isolation
- Date: 2026-02-25
- Status: ACTIVE
- Context: Owner runs multiple products on the same Vultr VPS (IntakeBella, FaxBella, ScriptsXO). These products have separate customers, phone numbers, and call flows. They must never share context or allow cross-product bleed.
- Decision: Use Asterisk dialplan contexts as the isolation mechanism. Each product gets a dedicated context namespace: `scriptsxo-inbound`, `scriptsxo-outbound`, `scriptsxo-internal` vs `intakebella-inbound`, `intakebella-outbound`, etc. Traffic cannot cross context boundaries without an explicit bridge. Each org within ScriptsXO gets a sub-context or context variable. Phone number provisioning (Skyetel DID) is auto-assigned to the correct context at org signup.
- Consequence: Zero bleed between products — architecturally enforced at the dialplan level. Adding a new tenant is a config append, not a new server. Skyetel API handles DID provisioning programmatically. Future: per-org number porting.

## ADR-021: Product Separation (ScriptsXO vs AmazingXO)
- Date: 2026-02-25
- Status: ACTIVE
- Context: AmazingXO (peptides/compounds) and ScriptsXO (prescription telehealth) are both Nolen products on related tech stacks. The question arose: should peptides move to ScriptsXO, and should AmazingXO's telehealth UI be reused?
- Decision: Keep the products separate. Different audiences (compound enthusiasts vs standard telehealth patients), different regulatory context (compound pharmacy vs standard Rx/Surescripts), different brand experience. Extract reusable UI components from AmazingXO (chat bubbles, voice interaction hooks, glassmorphism card patterns) but build ScriptsXO consultation room from scratch with real WebRTC. Do not merge codebases.
- Consequence: ScriptsXO is standalone. AmazingXO remains standalone. Shared patterns are extracted as component primitives, not as a shared codebase. No cross-product auth or data sharing.

## ADR-022: Front-End-First Build Approach
- Date: 2026-02-25
- Status: ACTIVE
- Context: Owner preference explicitly stated: "I would prefer to see the front end built out first before you do the back end setup." Previous sessions showed that back-end work done before the UI was approved sometimes had to be redone when the UX changed.
- Decision: For all new features (especially consultation UI, multi-tenant onboarding, scheduling), build and approve the front-end UI first. Back-end wiring happens only after the UI is signed off. This applies specifically to the 3-screen consultation flow: build Waiting Room, Consultation Room, and Post-Call UIs as functional shells before writing a single line of WebRTC, Asterisk, or SIP code.
- Consequence: Faster iteration on UX without back-end coupling. Back end is written to match a confirmed interface, not guessed. Slight risk of UI-to-backend mismatch caught early. Owner reviews UI at each stage before wiring commences.

## ADR-031: Capability Activation Gate in getMemberEffectiveCaps
- Date: 2026-02-25
- Status: ACTIVE
- Context: Even with role-based capability bundles, a user who has a role assigned but has not completed credential verification should not be granted capabilities. Belt-and-suspenders enforcement is needed so that even if a role is set prematurely, capabilities remain inactive until credentials are verified.
- Decision: Add a verification state check inside `getMemberEffectiveCaps` before granting role bundle caps. Query `credentialVerifications` by `by_memberId` index, check `status === "verified"`, then apply per-role field checks: patient needs Stripe session + identity, provider needs NPI + license, pharmacy needs NCPDP + registry, nurse needs license + orgId.
- Consequence: Admin role and platform owners are exempt from the gate. Unverified role returns an empty bundle anyway. All other roles must have a verified credential record with the correct fields populated before capabilities activate. This is a defense-in-depth layer on top of role assignment.

## ADR-032: /access/setup Replaces /onboard for Post-Auth Routing
- Date: 2026-02-25
- Status: ACTIVE
- Context: The `/onboard` page used "Select Your Role" language and referenced AI/role concepts that should not appear in production UI. A new screen was needed that frames the same flow as "access path selection" without exposing internal role or AI terminology.
- Decision: Unverified users route to `/access/setup` instead of `/onboard`. New page at `src/app/access/setup/page.tsx` with "Complete Your Access Setup" heading and four access paths (Client, Provider, Clinical Staff, Pharmacy). `/access` redirects to `/access/setup`. Actual verification flows remain at `/onboard/*` sub-routes.
- Consequence: Clean user-facing language. Internal routing to `/onboard/patient`, `/onboard/provider`, `/onboard/nurse`, `/onboard/pharmacy` remains unchanged. The `/onboard` root page still exists but is no longer the entry point for unverified users.

## ADR-033: Homepage Intent Capture Before Auth
- Date: 2026-02-25
- Status: ACTIVE
- Context: The original homepage showed an email form immediately. This missed the opportunity to differentiate client vs provider entry intent and lacked conversion-first marketing copy.
- Decision: Homepage shows a marketing hero with "Prescriptions, done right." copy and two CTAs: "Start as a Client" and "Provider & Clinic Login". An `intent` state (`client` | `provider`) is captured when the user clicks a CTA, before the email auth step begins. Post-auth routing uses this intent to inform the experience.
- Consequence: Better conversion UX. Client and provider entry paths are visually separated from the first interaction. The email form only appears after the user has self-identified their intent. ArrowRight CTAs set intent state then advance to the email step.
