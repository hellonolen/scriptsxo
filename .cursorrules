# Nolen Development Rules — Universal Standards

**Owner:** Nolen
**Last Updated:** 2026-02-10
**Purpose:** These are the global rules for every project built under this system. If you're an AI, LLM, coding assistant, or IDE — read this entire file and follow it. No exceptions.

**This file is self-contained.** Drop it into any project root. The AI will read the rules AND create the required documentation structure automatically. No external templates, scripts, or dependencies needed.

---

## 0. Security — READ FIRST

### NEVER Display Secrets
- **NEVER print, echo, display, or output API keys, tokens, or secrets** in chat, terminal output, or any response
- When listing env vars, show the KEY NAME only — never the value (e.g., `GOOGLE_GENAI_API_KEY = [SET]`)
- When setting env vars, confirm success without echoing the value back
- When running `npx convex env list` or similar, **redact all values** in your response
- If a command output contains a secret, summarize — don't paste
- **Do NOT ask the user for API keys in chat** — direct them to set keys via CLI commands they run themselves
- This applies to: API keys, tokens, passwords, webhook secrets, signing keys, database URLs, and any credential

---

## 1. Code Quality — No Shortcuts

### No Hardcoding — EVER
- Colors, sizes, spacing, fonts, API URLs, user data, and content must NEVER be inline literals
- Use **CSS custom properties (variables)** for all design tokens
- Use **global CSS classes** — define reusable classes in a global stylesheet
- Use **constants/config files** for any value that appears more than once
- Use **environment variables** for anything environment-specific
- Components accept **props** for dynamic content — no baked-in text or data

### Reusable & Modular
- Every component must be **reusable** — if you build a card, it works anywhere
- Extract shared logic into **hooks** (React) or **utility functions**
- **DRY** — if you write it twice, extract it
- **One source of truth** — data lives in one place, components read from it
- Define a **design system with tokens** (colors, typography, spacing, shadows) before building components
- Prefer editing existing files over creating new ones
- Match patterns already in the codebase

### Design System Tokens (every project needs these in globals.css)
```css
:root {
  --color-primary: ;
  --color-secondary: ;
  --color-accent: ;
  --color-background: ;
  --color-surface: ;
  --color-text: ;
  --color-text-muted: ;
  --font-family-heading: ;
  --font-family-body: ;
  --spacing-xs: ;
  --spacing-sm: ;
  --spacing-md: ;
  --spacing-lg: ;
  --spacing-xl: ;
  --radius-sm: ;
  --radius-md: ;
  --radius-lg: ;
  --shadow-sm: ;
  --shadow-md: ;
  --shadow-lg: ;
}
```

---

## 2. Responsive & Layout — Non-Negotiable

### Mobile-First, Always
- **Every page must be fully responsive** — mobile, tablet, desktop. No exceptions.
- Build **mobile-first** — start with the small screen, scale up
- Test at 320px, 375px, 768px, 1024px, 1440px minimum
- **Touch targets** at least 44x44px on mobile

### No Layout Breakage — EVER
- **No container overruns** — content must never overflow its container or the viewport
- **No horizontal scrollbars** on any page at any breakpoint
- **No overlapping elements** — text never sits on top of other text or buttons
- **No content clipping** — nothing gets cut off or hidden unintentionally
- Use `overflow-hidden`, `max-width`, and proper flex/grid to prevent breakage
- **Test every page at every breakpoint** before considering it done

### Structural Rules
- Use **CSS Grid or Flexbox** for all layouts — no floats, no absolute positioning hacks
- Containers have a **max-width** (1200-1400px) and auto margins for centering
- Sidebar layouts **collapse to drawer/bottom nav** on mobile
- Tables become **stacked cards** on mobile — never a tiny scrolling table
- Modals are **full-screen on mobile**, centered dialog on desktop
- Forms are **single-column on mobile**, can be multi-column on desktop

---

## 3. Design & UI — How Apps Look and Feel

### Light Mode is Default
- Every project defaults to **light mode**
- Dark mode is optional — a theme switcher is fine, but light mode is always primary
- Never ship dark mode as the only option

### Visual Style
- **Premium, warm, inviting** — not corporate, not cold, not tech-bro
- **Light and elegant** — font-medium max, not font-bold. Clean whitespace.
- **No black/slate/dark buttons** — use warm, brand-aligned colors
- **No full-width stretched cards** — compact grid layouts with breathing room
- **CTA buttons below text**, never pushed to the far right or spanning full width
- **No demo banners** — never show "you are viewing example data"
- **No aggressive language** — no "war room," "command center," "deploy," "mission"
- **Banned decorative icons**: Stars, Sparkles, Fleurs — functional icons only

### Typography
- Modern, premium typefaces: Inter, Outfit, DM Sans — or project-specific
- Clear heading hierarchy — consistent across the app
- Body text 16px+ base — comfortable to read

### Color
- Every project must have a **defined color palette** in CSS variables
- Never use raw hex values scattered across components
- Warm, sophisticated palettes — not generic bootstrap colors

---

## 4. App Structure — Every Project Has These

### Separation: Marketing Site vs. Web App
- **Marketing pages** (landing, pricing, about, contact) are PUBLIC — no auth required
- **The web app** (dashboard, profiles, settings) is PRIVATE — auth required
- These are **separate layouts** — different nav, different footer, different feel
- Marketing pages have a **marketing header** with CTA (Sign Up / Log In)
- The web app has a **sidebar or app header** with user menu
- Never mix them — a logged-in user doesn't see the marketing nav inside the app

### Required Pages

#### Marketing / Public
- **Landing page** — what the product does, who it's for, CTA to sign up
- **Pricing page** — clear tiers, what's included, CTA to subscribe
- **About page** — who we are (optional but recommended)
- **Contact page** — form or email, not just a mailto link

#### Policy Pages (REQUIRED — in the footer of every page)
- **Privacy Policy** — what data we collect, how we use it, third parties
- **Terms of Service** — usage terms, liability, account termination
- **Cookie Policy** — if applicable
- These must be **real content**, not placeholder lorem ipsum

#### Footer — Every Page
- **Copyright line** — `© {CURRENT_YEAR} {Brand Name}. All rights reserved.`
- The year must be **dynamic** (`new Date().getFullYear()`), never hardcoded
- Links to: Privacy Policy, Terms of Service, Contact
- Optional: social links, support email

#### Web App (behind auth)
- **Dashboard** — overview of user data, quick actions, AI guidance
- **Profile / Account Settings** — user can edit their info, change preferences
- **Admin Dashboard** — separate from user dashboard, only visible to admins

### Auth & Roles
- **User registration** with Passkeys (WebAuthn) — no passwords
- **Two roles minimum:** User and Admin
- Admin dashboard is a **completely separate section**, not just a toggle
- Role check happens **server-side** (Convex), not just a frontend flag
- Never hardcode `isAdmin = true` — always check against the database

---

## 5. AI Integration — Every Project Gets This

**Every project MUST have an AI concierge or assistant. This is not optional.**

### What the AI Does
- **Speaks to the user** — conversational, human, not robotic
- **Reads their documents** — uploaded files get scanned and understood
- **Gives guidance** — proactive insights, next steps, recommendations
- Context is **assembled dynamically** from real user data — never hardcoded prompts
- AI should be **proactive** — surface things without being asked

### Standard AI Pattern
1. Backend action (Convex) handles the AI call — server-side, secure
2. Context assembler pulls relevant user data into the prompt
3. AI API generates the response (Google Gemini — Flash for speed, Pro for depth)
4. Frontend displays it conversationally
5. Document scanning extracts actionable data from uploads

---

## 6. Tech Stack — What We Use

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15+ | App Router, NOT Vite for web apps |
| Backend | Convex | Real-time serverless, all projects |
| Auth | Passkeys (WebAuthn) | No passwords, no TOTP, no email codes |
| Email | Emailit | NOT Resend, NOT Nodemailer, NOT SendGrid |
| Deployment | Cloudflare Workers | @opennextjs/cloudflare, NOT Vercel/Netlify |
| Styling | Tailwind CSS 4 | With CSS custom properties for tokens |
| AI | Google Gemini | Flash for speed, Pro for depth |
| Payments | Stripe | When applicable |
| Voice | Vapi | When applicable |
| Testing | Vitest + Playwright | Unit + E2E |

### BANNED — Do Not Use
- **Vercel** — deploy to Cloudflare
- **Resend / Nodemailer / SendGrid** — use Emailit
- **TOTP / Email verification codes** — use Passkeys
- **Vite** for web apps — use Next.js
- **Clerk** for auth — use Passkeys via Convex
- **Netlify, Railway, Render** — use Cloudflare

---

## 7. Deployment — Cloudflare Only

```bash
npm run build:cf    # Build with @opennextjs/cloudflare → .open-next/
npm run deploy      # Deploy with wrangler → Cloudflare Workers
```

- **Never** use `wrangler pages deploy` — use Workers, not Pages
- **Never** upload `.next` to Cloudflare — use `.open-next/`
- API keys go in **Convex env** (`npx convex env set KEY "value"`), not `.env` files
- Deploy Convex with `npx convex deploy --yes`
- **NEVER display key values in chat** — see Section 0

---

## 8. Data & Documentation Rules

### Never Delete — Archive Only
- Files get archived, never deleted
- Documentation entries get marked `[SUPERSEDED]`, never removed
- Git history is sacred — never force push or rewrite

### Documentation Maintenance
- At the end of each session, update the relevant docs with what changed
- Log sessions in `docs/projectreflog.md`

---

## 9. Copy & Tone

### Language We Use
- Guide, guidance, path, direction, signals, readiness, clarity
- Explore, strengthen, improve, access, align, unlock potential

### Language We Don't Use
- War room, command center, hard data, deploy, mission
- Blocked, denied, locked, restricted
- Any military or aggressive metaphors

### Brand Voice
- Professional but warm
- Confident but not arrogant
- Supportive — we guide, we don't lecture
- Premium — this is a $97-$500/month product, not a free tool

---

## 10. Required Documentation — Auto-Generate on First Session

**If a `docs/` folder does not exist in this project, create it and generate the following files.** Scan the codebase (package.json, README, src/, convex/, git log) and fill in real data — never leave placeholders.

### docs/01-vision.md
```
# Vision & Philosophy
## Mission — What does this product do in one sentence?
## Core Pillars — The 3 major value propositions
## Core Principles — Source of Truth, Direct Control, Fluid Process, Respectful Tone
## Target Outcomes — What success looks like for the user
## Revenue Model — How the product makes money
## Honest Assessment — Gap between vision and current reality
```

### docs/02-problem.md
```
# Problem Statement
## The Problem — What pain are we solving?
## Pain Points — Specific frustrations (numbered)
## Who's Most Affected — Which customer segment
## Existing Solutions & Why They Fail
## Market Gap — The opportunity
```

### docs/03-customer.md
```
# Customer Profiles
## Primary Segments — Who, pain points, goals, willingness to pay (per segment)
## User Persona — Fictional representative user with scenario
## Customer Journey — Awareness → Consideration → Conversion → Retention → Advocacy
## Unit Economics — CAC, LTV, monthly revenue, churn target
```

### docs/04-solution.md
```
# Solution Architecture
## How We Solve It — High-level approach
## Core Features — Feature table with priorities
## System Architecture — Diagram of frontend, backend, external services
## Data Flow — User input → Processing → Output
## Differentiators — What makes this different
```

### docs/05-features.md
```
# Feature Inventory — Honest Status
Status key: FUNCTIONAL | PARTIAL | UI ONLY | IMPLEMENTED | PLANNED
## Core Pages — Table with component, status, notes
## Authentication & Security — Registration, login, admin, roles
## AI / Intelligence — Concierge, document analysis, proactive guidance
## Payments — Stripe integration, subscriptions, checkout
## Backend — Schema, API functions, file storage
## Unused Components — List what exists but isn't used
```

### docs/06-pricing.md
```
# Pricing Strategy
## Pricing Model — Tier table with prices and features
## One-Time Fees — If applicable
## Revenue Per Customer — Monthly, annual, year 1
## Stripe Product Structure — Product names, types, price IDs
## Pricing Decisions — Log all decisions, never delete
```

### docs/07-ux.md
```
# UX Patterns & Design Standards
## Design System — Fonts, colors, mode
## Layout Patterns — Marketing vs app, mobile behavior
## Component Patterns — Cards, buttons, forms, tables, modals
## Interaction Patterns — Hover, transitions, loading, notifications
## Accessibility — Touch targets, contrast, keyboard nav, ARIA
```

### docs/08-tech.md
```
# Technology Stack
## Stack Overview — Table with layer, tech, version, status
## App Structure — Folder tree
## Key Dependencies — From actual package.json
## Environment Variables — Where stored, purpose
## Deployment — Platform, commands, config file
## Technical Debt — Known issues and shortcuts
```

### docs/09-security.md
```
# Security Architecture
## Authentication — Passkeys, session management
## Authorization — Roles, server-side checks
## Data Protection — Key storage, encryption
## Security Headers — CSP, HSTS, X-Frame-Options
## Known Vulnerabilities — Issues to address
```

### docs/10-legal.md
```
# Legal & Compliance
## Required Policy Pages — Privacy Policy, Terms of Service, Cookie Policy
## Compliance Checklist — Privacy, data retention, deletion, CCPA/GDPR
## Industry-Specific Compliance — Fintech, health, etc.
```

### docs/11-metrics.md
```
# Success Metrics & KPIs
## Business Metrics — MRR, active users, churn, CAC, LTV
## Product Metrics — Onboarding rate, DAU, feature adoption, AI usage
## Technical Metrics — Load time, uptime, error rate, build time
```

### docs/12-launch.md
```
# Launch Checklist
## Pre-Launch — Product, pages, technical, legal checklists
## Post-Launch — Monitoring, error tracking, analytics, support
```

### docs/16-decisions.md
```
# Decision Log
Never delete entries. Only add or mark as [SUPERSEDED].
Table: #, Date, Decision, Context, Status
```

### docs/projectreflog.md
```
# Project Reference Log
Never delete session entries. Add new ones at the top.
Template: Date, Focus, Work Completed, Decisions Made, Open Questions
```
