# ScriptsXO -- Environment Setup

**Last Updated:** 2026-02-15

## Convex Production

- Deployment: `prod:striped-caribou-797`
- URL: `https://striped-caribou-797.convex.cloud`

## Required Environment Variables

### Convex Backend (set via `npx convex env set KEY "value"`)

| Variable | Service | Status | Notes |
|---|---|---|---|
| ADMIN_EMAILS | Auth | SET | Comma-separated admin email whitelist |
| GEMINI_API_KEY | Google Gemini | SET | Primary AI model (text + multimodal) |
| SITE_URL | Platform | SET | Base URL for redirects |
| WEBAUTHN_ORIGIN | Auth | SET | WebAuthn relying party origin |
| WEBAUTHN_RP_ID | Auth | SET | WebAuthn relying party ID |
| WHOP_API_KEY | Whop.com | SET | Billing API key |
| WHOP_COMPANY_ID | Whop.com | SET | Whop company identifier |
| WHOP_PLAN_ID | Whop.com | SET | Whop plan for $97/mo membership |
| WHOP_PRODUCT_ID | Whop.com | SET | Whop product identifier |
| WHOP_WEBHOOK_SECRET | Whop.com | SET | Webhook signature verification |
| ANTHROPIC_API_KEY | Claude API | Not set | Secondary AI (multi-model planned) |
| EMAILIT_API_KEY | Emailit | Not set | Transactional email |
| MODMED_CLIENT_ID | ModMed API | Not set | EHR integration (planned) |
| MODMED_CLIENT_SECRET | ModMed API | Not set | EHR integration (planned) |
| MODMED_API_BASE_URL | ModMed API | Not set | EHR integration (planned) |
| COMPOSIO_API_KEY | Composio | Not set | Unified integration layer for external services |
| STRIPE_SECRET_KEY | Stripe | Not set | Legacy -- only needed for Identity verification |
| STRIPE_WEBHOOK_SECRET | Stripe | Not set | Legacy -- webhook verification |

**Updated 2026-02-15:** 10 env vars are now SET in Convex prod. Gemini is primary AI. Whop replaces Stripe for billing. Claude API key not yet needed.

### Frontend (.env.local)

| Variable | Status | Notes |
|---|---|---|
| NEXT_PUBLIC_CONVEX_URL | SET | `https://striped-caribou-797.convex.cloud` |
| CONVEX_DEPLOYMENT | SET | `prod:striped-caribou-797` |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Not set | Legacy -- only needed if using Stripe Identity |

## Local Development

```bash
# Start Next.js dev server (default port 3001)
npm run dev

# Start Convex dev server
npm run convex:dev

# Run tests
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E
npm run test:all     # Both

# Lint and format
npm run lint
npm run format
npm run typecheck
```

## Deployment

### Cloudflare Pages (Frontend)
```bash
npm run build:cf       # @cloudflare/next-on-pages build -> .vercel/output/static
npm run deploy:pages   # wrangler pages deploy to scriptsxo project
npm run deploy         # Full deploy via scripts/deploy.sh
npm run deploy:full    # Full deploy (frontend + convex)
npm run deploy:frontend-only  # Frontend only
```

**Important:** The `.vercel/output/static` path is Cloudflare's internal convention, NOT Vercel. See ADR-012.

### Convex (Backend)
```bash
npm run convex:deploy  # convex deploy --cmd 'echo skip'
npm run deploy:convex  # Convex only via deploy script
npx convex deploy      # Direct deploy
```

### R2 Storage
- Bucket: `scriptsxo-assets`
- Binding: `R2_ASSETS`
- Used for: static assets, uploaded documents

## Webhook URLs (Convex HTTP)

All webhooks go through the Convex HTTP router at `https://striped-caribou-797.convex.cloud`:

| Endpoint | Service | Status |
|----------|---------|--------|
| /whop-webhook | Whop.com | ACTIVE -- configure in Whop dashboard |
| /stripe-webhook | Stripe | INACTIVE -- TODO: signature verification |
| /stripe-identity-webhook | Stripe Identity | PARTIAL -- handler exists |
| /phaxio-callback | Phaxio/FaxBot | INACTIVE -- faxing not yet deployed |
| /eprescribe-callback | ModMed | INACTIVE -- integration planned |
| /health | Health check | ACTIVE |

## Composio Setup (API v3)
1. Sign up at https://composio.dev and create a project
2. Generate an API key from the Composio dashboard
3. Set the API key in Convex: `npx convex env set COMPOSIO_API_KEY "your_key_here"` (DONE)
4. Configure auth configs (toolkits) in the Composio dashboard:
   - ModMed (e-prescribing, EHR)
   - Pharmacy networks
   - Google Calendar (scheduling sync)
   - Email / SMS (patient notifications)
   - Fax (non-electronic pharmacy routing)
5. Integration code lives in `convex/integrations/composio.ts` (uses REST API v3 directly)
6. The conductor dispatches to Composio via `agentName: "composio"`
7. Health check: Call `api.integrations.composio.healthCheck` from admin panel
8. Admin UI: `/admin/integrations` shows connection status and toolkit health
9. API v3 base: `https://backend.composio.dev/api/v3`
10. v3 uses `user_id` instead of `entity_id`, `connected_accounts` instead of `connectedAccounts`

## ModMed API Setup (Planned)
1. Contact ModMed rep to add "ScriptsXO Telehealth" as a second location
2. Request API access (OAuth2 credentials) scoped to the telehealth location
3. Set MODMED_CLIENT_ID, MODMED_CLIENT_SECRET, MODMED_API_BASE_URL in Convex env
4. Build convex/integrations/modmed.ts API client

## FaxBot Setup (Planned)
1. Provision Vultr VPS (Ubuntu, 1-2 vCPU, 2GB RAM)
2. Install FaxBot open-source fax server
3. Configure BulkVS SIP trunk for outbound faxing
4. Update sendFax.ts to support FaxBot backend alongside Phaxio

## NEVER
- Print API keys in chat or terminal output
- Commit .env.local or credentials
- Deploy to any platform other than Cloudflare Pages (BANNED: Vercel, Netlify, Railway, Render)
- Use Resend or Nodemailer (Emailit only)
- Use @opennextjs/cloudflare (use @cloudflare/next-on-pages)
