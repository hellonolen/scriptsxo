# ScriptsXO — Environment Setup

## Required Environment Variables

### Convex Backend (set via `npx convex env set KEY "value"`)

| Variable | Service | Status | Notes |
|---|---|---|---|
| ANTHROPIC_API_KEY | Claude API | Not set | Backend AI agents |
| GOOGLE_GEMINI_API_KEY | Google Gemini | Not set | Multimodal video/vision |
| STRIPE_SECRET_KEY | Stripe | Not set | Payment processing |
| STRIPE_WEBHOOK_SECRET | Stripe | Not set | Webhook verification |
| EMAILIT_API_KEY | Emailit | Not set | Transactional email |
| MODMED_CLIENT_ID | ModMed API | Not set | EHR integration (planned) |
| MODMED_CLIENT_SECRET | ModMed API | Not set | EHR integration (planned) |
| MODMED_API_BASE_URL | ModMed API | Not set | EHR integration (planned) |

### Frontend (.env.local)

| Variable | Status | Notes |
|---|---|---|
| NEXT_PUBLIC_CONVEX_URL | Not set | Convex deployment URL |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Not set | Stripe client key |

## Local Development

```bash
# Start dev server
npm run dev          # Default port 3000
npx next dev -p 3001 # Port 3001 (preferred)

# Start Convex dev
npm run convex:dev

# Run tests
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E
```

## Deployment

### Cloudflare Workers (Frontend)
```bash
npm run build:worker  # @opennextjs/cloudflare build
npm run deploy        # wrangler deploy
```

### Convex (Backend)
```bash
npm run convex:deploy # convex deploy -y
```

## ModMed API Setup (Planned)
1. Contact ModMed rep to add "ScriptsXO Telehealth" as a second location
2. Request API access (OAuth2 credentials) scoped to the telehealth location
3. Set MODMED_CLIENT_ID, MODMED_CLIENT_SECRET, MODMED_API_BASE_URL in Convex env
4. Build convex/integrations/modmed.ts API client

## NEVER
- Print API keys in chat or terminal output
- Commit .env.local or credentials
- Deploy to any platform other than Cloudflare Pages (BANNED: Vercel, Netlify, Railway, Render)
- Use Resend or Nodemailer (Emailit only)
