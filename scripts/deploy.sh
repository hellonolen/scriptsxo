#!/usr/bin/env bash
# ==============================================================================
# ScriptsXO Deployment Script
# ==============================================================================
#
# ARCHITECTURE:
#   Frontend: Cloudflare Pages (via @cloudflare/next-on-pages)
#   Backend:  Convex (prod:striped-caribou-797)
#   Storage:  Cloudflare R2 (scriptsxo-assets bucket)
#
# USAGE:
#   npm run deploy              # Full deploy (Convex + Pages)
#   npm run deploy:full         # Same as above
#   npm run deploy:convex       # Convex functions only
#   npm run deploy:frontend     # Cloudflare Pages only
#
# PREREQUISITES:
#   - wrangler authenticated:  npx wrangler login
#   - Convex configured:       CONVEX_DEPLOYMENT in .env.local
#   - R2 bucket created:       npx wrangler r2 bucket create scriptsxo-assets
#
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${CYAN}[DEPLOY]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

# Parse flags
CONVEX_ONLY=false
FRONTEND_ONLY=false
FULL=true

case "${1:-}" in
  --convex-only)  CONVEX_ONLY=true; FULL=false ;;
  --frontend-only) FRONTEND_ONLY=true; FULL=false ;;
  --full) FULL=true ;;
esac

# ==============================================================================
# Step 1: Pre-flight checks
# ==============================================================================
log "Running pre-flight checks..."

if [ "$FRONTEND_ONLY" = false ]; then
  command -v npx >/dev/null 2>&1 || fail "npx not found"
  if [ ! -f ".env.local" ]; then
    fail ".env.local not found. Copy .env.local.example and configure."
  fi
  ok "Convex environment ready"
fi

if [ "$CONVEX_ONLY" = false ]; then
  npx wrangler whoami >/dev/null 2>&1 || fail "Not authenticated with Cloudflare. Run: npx wrangler login"
  ok "Cloudflare authenticated"
fi

# ==============================================================================
# Step 2: Deploy Convex (backend functions + schema)
# ==============================================================================
if [ "$FRONTEND_ONLY" = false ]; then
  log "Deploying Convex functions to production..."
  npx convex deploy
  ok "Convex deployed to prod:striped-caribou-797"
fi

# ==============================================================================
# Step 3: Build and deploy to Cloudflare Pages
# ==============================================================================
if [ "$CONVEX_ONLY" = false ]; then
  log "Building Next.js for Cloudflare Pages..."
  CLOUDFLARE_PAGES=true npx @cloudflare/next-on-pages

  if [ ! -d ".vercel/output/static" ]; then
    fail "Build output not found at .vercel/output/static"
  fi
  ok "Build complete"

  log "Deploying to Cloudflare Pages..."
  npx wrangler pages deploy .vercel/output/static --project-name scriptsxo
  ok "Deployed to Cloudflare Pages"
fi

# ==============================================================================
# Done
# ==============================================================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ScriptsXO deployed successfully${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Convex:     https://striped-caribou-797.convex.cloud"
echo "  Pages:      https://scriptsxo.pages.dev"
echo "  Dashboard:  https://dashboard.convex.dev"
echo ""
