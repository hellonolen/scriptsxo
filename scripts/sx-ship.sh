#!/usr/bin/env bash
# =============================================================================
# ScriptsXO Ship Script
# =============================================================================
# Usage: bash scripts/sx-ship.sh [--e2e] [--deploy]
#
# Options:
#   --e2e       Run E2E tests (requires running server on :3001)
#   --deploy    Deploy to Cloudflare Pages after all checks pass
#   --base-url  E2E base URL (default: http://localhost:3001)
#
# Runs the full verification scorecard:
#   1. Release Gate (code quality + security + TypeScript + unit tests)
#   2. E2E tests (optional: --e2e flag)
#   3. Cloudflare deploy (optional: --deploy flag)
# =============================================================================

set -uo pipefail
cd "$(dirname "$0")/.."

# ─── Parse flags ──────────────────────────────────────────────────────────────
RUN_E2E=false
RUN_DEPLOY=false
E2E_BASE="http://localhost:3001"

for arg in "$@"; do
  case "$arg" in
    --e2e)     RUN_E2E=true     ;;
    --deploy)  RUN_DEPLOY=true  ;;
    --base-url=*) E2E_BASE="${arg#*=}" ;;
  esac
done

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

SCORECARD=()
OVERALL_PASS=true

score() {
  local phase="$1"
  local status="$2"  # PASS | FAIL | SKIP
  local detail="${3:-}"
  SCORECARD+=("$phase|$status|$detail")
}

banner() {
  printf "\n${BOLD}${BLUE}╔══════════════════════════════════════╗${NC}\n"
  printf "${BOLD}${BLUE}║   ScriptsXO — Full Verification Run  ║${NC}\n"
  printf "${BOLD}${BLUE}╚══════════════════════════════════════╝${NC}\n"
  printf "  Started: %s\n\n" "$(date '+%Y-%m-%d %H:%M:%S')"
}

print_scorecard() {
  printf "\n${BOLD}╔══════════════════════════════════════╗${NC}\n"
  printf "${BOLD}║         Verification Scorecard       ║${NC}\n"
  printf "${BOLD}╠══════════════════════════════════════╣${NC}\n"

  for entry in "${SCORECARD[@]}"; do
    IFS='|' read -r phase status detail <<< "$entry"
    case "$status" in
      PASS) COLOR="$GREEN" ;;
      FAIL) COLOR="$RED"   ;;
      SKIP) COLOR="$YELLOW" ;;
      *)    COLOR="$NC"    ;;
    esac
    printf "${BOLD}║${NC}  %-28s %s%-4s${NC} ${BOLD}║${NC}\n" "$phase" "$COLOR" "$status"
    if [[ -n "$detail" ]]; then
      printf "${BOLD}║${NC}    %-34s ${BOLD}║${NC}\n" "↳ $detail"
    fi
  done

  printf "${BOLD}╚══════════════════════════════════════╝${NC}\n"
}

# =============================================================================
# STEP 1: Release Gate
# =============================================================================

banner

printf "${BOLD}[Phase 1/3] Release Gate${NC}\n"
printf "Running: bash scripts/sx-release-gate.sh\n\n"

if bash scripts/sx-release-gate.sh; then
  score "Release Gate" "PASS"
else
  score "Release Gate" "FAIL" "Fix gate failures before shipping"
  OVERALL_PASS=false
fi

# =============================================================================
# STEP 2: E2E Tests (optional)
# =============================================================================

if $RUN_E2E; then
  printf "\n${BOLD}[Phase 2/3] E2E Tests${NC}\n"
  printf "Base URL: %s\n" "$E2E_BASE"
  printf "Running: npx playwright test tests/e2e/\n\n"

  E2E_CMD="PLAYWRIGHT_TEST_BASE_URL=$E2E_BASE npx playwright test tests/e2e/"

  if eval "$E2E_CMD" 2>&1; then
    score "E2E Tests" "PASS"
  else
    score "E2E Tests" "FAIL" "Review Playwright output above"
    OVERALL_PASS=false
  fi

  # Also run authz-specific E2E
  printf "\nRunning: authz-roles.spec.ts\n"
  if PLAYWRIGHT_TEST_BASE_URL="$E2E_BASE" npx playwright test tests/e2e/authz-roles.spec.ts 2>&1; then
    score "AuthZ E2E" "PASS"
  else
    score "AuthZ E2E" "FAIL" "Role-based access violations detected"
    OVERALL_PASS=false
  fi
else
  score "E2E Tests" "SKIP" "Run with --e2e to include"
fi

# =============================================================================
# STEP 3: Deploy (optional)
# =============================================================================

if $RUN_DEPLOY; then
  if $OVERALL_PASS; then
    printf "\n${BOLD}[Phase 3/3] Cloudflare Deploy${NC}\n"
    printf "Running: npm run deploy\n\n"

    if npm run deploy 2>&1; then
      score "Cloudflare Deploy" "PASS"
      printf "\n${GREEN}Deployed successfully.${NC}\n"
    else
      score "Cloudflare Deploy" "FAIL" "Deploy command failed"
      OVERALL_PASS=false
    fi
  else
    score "Cloudflare Deploy" "SKIP" "Skipped — gate failures must be resolved first"
    printf "\n${YELLOW}Deploy skipped: gate or E2E failures must be resolved.${NC}\n"
  fi
else
  score "Cloudflare Deploy" "SKIP" "Run with --deploy to auto-deploy"
fi

# =============================================================================
# FINAL SCORECARD
# =============================================================================

print_scorecard

if $OVERALL_PASS; then
  printf "\n${GREEN}${BOLD}RESULT: ALL CHECKS PASSED${NC}\n"
  printf "ScriptsXO is verified and ready to ship.\n\n"
  exit 0
else
  printf "\n${RED}${BOLD}RESULT: VERIFICATION FAILED${NC}\n"
  printf "Resolve all failures above before shipping to production.\n\n"
  exit 1
fi
