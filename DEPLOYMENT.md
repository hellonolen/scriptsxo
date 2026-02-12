# ScriptsXO Deployment Guide

## Architecture

| Layer | Platform | URL |
|-------|----------|-----|
| Frontend | Cloudflare Pages | https://scriptsxo.pages.dev |
| Backend | Convex | https://striped-caribou-797.convex.cloud |
| Storage | Cloudflare R2 | `scriptsxo-assets` bucket |
| Repo | GitHub | https://github.com/hellonolen/scriptsxo |

## Why Cloudflare Pages (not Workers)

- **No size limit issues** -- static assets go to CDN, only server functions hit the 10MB worker limit
- **Better for Next.js** -- `@cloudflare/next-on-pages` is Cloudflare's official adapter
- **R2 bindings** work the same as Workers
- Heavy server work (PDF generation, fax, AI) runs on **Convex**, not Cloudflare

## Quick Deploy

```bash
# Full deploy (Convex + Cloudflare Pages)
npm run deploy

# Convex backend only (schema, functions, actions)
npm run deploy:convex

# Cloudflare Pages frontend only
npm run deploy:frontend
```

## First-Time Setup

### 1. Cloudflare Authentication

```bash
npx wrangler login
```

### 2. Create R2 Bucket

```bash
npx wrangler r2 bucket create scriptsxo-assets
```

### 3. Create Pages Project

The first `npm run deploy:frontend` will auto-create the Pages project, or create manually:

```bash
npx wrangler pages project create scriptsxo
```

### 4. Set Environment Variables

Convex env vars (server-side secrets):
```bash
npx convex env set PHAXIO_API_KEY "your-key-here"
npx convex env set ANTHROPIC_API_KEY "your-key-here"
npx convex env set EMAILIT_API_KEY "your-key-here"
```

Cloudflare Pages env vars (set in dashboard or CLI):
```bash
npx wrangler pages secret put NEXT_PUBLIC_CONVEX_URL
# Enter: https://striped-caribou-797.convex.cloud
```

### 5. Custom Domain (when ready)

In Cloudflare Dashboard:
1. Go to Pages > scriptsxo > Custom domains
2. Add your domain (e.g., `app.scriptsxo.com`)
3. DNS records are auto-configured if domain is on Cloudflare

## Build Commands

| Command | What it does |
|---------|-------------|
| `npm run build` | Standard Next.js build (for local testing) |
| `npm run build:cf` | Build for Cloudflare Pages via `@cloudflare/next-on-pages` |
| `npm run deploy` | Full deploy script (Convex + Pages) |
| `npm run deploy:pages` | Direct wrangler pages deploy |
| `npm run convex:deploy` | Deploy Convex functions only |

## What Runs Where

| Code | Runs On | Notes |
|------|---------|-------|
| `src/` (Next.js pages) | Cloudflare Pages | Static + edge functions |
| `convex/*.ts` (queries/mutations) | Convex Cloud | Real-time, reactive |
| `convex/actions/*.ts` | Convex Cloud | Node.js runtime, external APIs |
| `convex/http.ts` (webhooks) | Convex Cloud | Stripe, Phaxio callbacks |

## R2 Storage

Bucket `scriptsxo-assets` is bound as `R2_ASSETS` in wrangler.jsonc.

Use cases:
- Prescription PDFs (currently in Convex file storage, can migrate to R2)
- Government ID uploads
- Consultation recordings
- Static assets that need CDN delivery

Access R2 in Pages Functions via the binding:
```typescript
// In a Pages Function (e.g., API route)
export async function onRequest(context) {
  const bucket = context.env.R2_ASSETS;
  const object = await bucket.get("prescriptions/rx-12345.pdf");
  return new Response(object.body);
}
```

## Rollback

```bash
# List recent deployments
npx wrangler pages deployment list --project-name scriptsxo

# Rollback to a specific deployment
npx wrangler pages deployment rollback --project-name scriptsxo <deployment-id>
```

## Troubleshooting

**Build fails with size error:** This shouldn't happen on Pages (static assets don't count), but if it does, check that `@cloudflare/next-on-pages` is up to date.

**R2 bucket not found:** Create it: `npx wrangler r2 bucket create scriptsxo-assets`

**Convex deploy fails:** Check `.env.local` has `CONVEX_DEPLOYMENT=prod:striped-caribou-797`

**Pages deploy unauthorized:** Run `npx wrangler login` to re-authenticate.
