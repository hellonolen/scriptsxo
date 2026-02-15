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
