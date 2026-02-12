# ScriptsXO — Claude Code Project Instructions

## Project Overview
ScriptsXO is a luxury AI-first telehealth prescription concierge. Agentic architecture with 10 AI agents. Next.js 15 + Convex + Tailwind CSS 4.

## Foundation Lock (v0.1.0)
The current codebase is the locked foundation. NEVER remove existing functionality. Only build on top. If something needs to change, discuss with the owner first.

## Owner
Nolen (hellonolen@gmail.com, nolen@doclish.com)

## Design Rules
- NO PINK anywhere in the UI. Gradients use violet-to-teal/cyan.
- NO emojis in code, UI, or responses.
- Deep violet (#5B21B6, #7C3AED) is the primary brand color.
- Teal (#2DD4BF, #67E8F9) is the accent gradient endpoint.
- Sidebar is deep purple (#1E1037) — this is NOT dark mode, just a rich panel.
- Light mode is default. Never ship dark-only.
- Glassmorphism cards with backdrop-blur.
- Use CSS classes (.gradient-text, .glass-card, etc.) instead of inline styles for backgrounds and gradients — Tailwind v4 layer system overrides inline styles.
- Fonts: DM Sans (body), Playfair Display (headings). Use CSS variables (--font-dm-sans, --font-playfair).

## Tech Stack
- Framework: Next.js 15+ (App Router)
- Backend: Convex (real-time serverless)
- Auth: Passkeys (WebAuthn), cookie-based sessions
- AI Backend: Claude API (Anthropic) via convex/agents/llmGateway.ts
- AI Multimodal: Google Gemini (video, vision, voice)
- Styling: Tailwind CSS 4 with @tailwindcss/postcss
- Deployment: Cloudflare Pages via @cloudflare/next-on-pages
- Storage: Cloudflare R2 (scriptsxo-assets bucket)
- Email: Emailit (NOT Resend, NOT Nodemailer)
- EHR: ModMed API (planned — separate telehealth location)
- Video: WebRTC + Gemini multimodal (prioritized over audio)

## Architecture Rules
- All patient-facing pages use the AppShell component (not Nav)
- Provider/admin/pharmacy pages may use different layouts
- AI agents live in /convex/agents/ — each agent is a specialist
- The conductor.ts orchestrates agent dispatch
- External API integrations go in /convex/integrations/ (to be created)
- llmGateway.ts routes AI calls to Claude or Gemini based on task type
- Prescriptions flow through ModMed API as the legal prescribing backbone
- ScriptsXO agents handle everything except the legal act of prescribing

## Admin Access
- Admin emails whitelisted in src/lib/config.ts (auth.adminEmails)
- Currently: hellonolen@gmail.com, nolen@doclish.com
- Admin cookie auto-set on login when email matches whitelist
- AppShell shows admin nav links when admin cookie present

## Key Decisions
- ModMed integration over standalone e-prescribe (Surescripts already certified via ModMed)
- Claude for backend reasoning, Gemini for multimodal (video/vision)
- Video prioritized over audio for consultations
- No pink in UI (violet-to-teal gradients instead)
- Foundation locked at v0.1.0 — only additive changes

## Dev Server
- Default port: 3001 (next dev -p 3001)
- Convex not yet deployed (console warns about missing NEXT_PUBLIC_CONVEX_URL)

## Documentation
- /docs/PROJECT.md — Living project documentation (auto-updated each session)
- /docs/DECISIONS.md — Architecture decision log
- /docs/ENVIRONMENT.md — Environment setup and API keys
- /docs/SESSIONS.md — Session conversation log
- CLAUDE.md — This file (project-level Claude Code instructions)

## Session Protocol
At END of each session:
1. Update /docs/PROJECT.md with work done
2. Add session entry to /docs/SESSIONS.md
3. Add any new decisions to /docs/DECISIONS.md
4. Commit documentation updates

At START of each session:
1. Read /docs/PROJECT.md for context
2. Read /docs/SESSIONS.md for recent history
3. Check /docs/DECISIONS.md for constraints
