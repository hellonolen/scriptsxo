#!/usr/bin/env bash
# =============================================================================
# ScriptsXO Production Release Gate
# =============================================================================
# Usage: bash scripts/sx-release-gate.sh
#
# Checks all gate conditions. Exits with code 1 if any FAIL.
# Must be run from the project root.
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
WARN=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check() {
  local name="$1"
  local status="$2"  # pass | fail | warn
  local detail="${3:-}"
  case "$status" in
    pass)
      printf "  ${GREEN}PASS${NC}  %s\n" "$name"
      ((PASS++))
      ;;
    fail)
      printf "  ${RED}FAIL${NC}  %s" "$name"
      [[ -n "$detail" ]] && printf " — %s" "$detail"
      printf "\n"
      ((FAIL++))
      ;;
    warn)
      printf "  ${YELLOW}WARN${NC}  %s" "$name"
      [[ -n "$detail" ]] && printf " — %s" "$detail"
      printf "\n"
      ((WARN++))
      ;;
  esac
}

section() {
  printf "\n${BLUE}[%s]${NC} %s\n" "$1" "$2"
}

# =============================================================================
# SECTION 1: Code Quality Scan
# =============================================================================

section "1" "Code quality scan"

# 1a. console.log / debugger / console.warn / console.error in src/ and convex/
CONSOLE_HITS=$(grep -rn "console\.\(log\|warn\|error\|debug\)\|debugger" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=convex/_generated \
  src/ convex/ 2>/dev/null \
  | grep -v "// eslint-disable" \
  | grep -v "// allowed-in-production" \
  | wc -l | tr -d ' ')

if [[ "$CONSOLE_HITS" -eq 0 ]]; then
  check "No console.log/debugger in src/ or convex/" "pass"
else
  check "No console.log/debugger in src/ or convex/" "fail" "$CONSOLE_HITS occurrences (run: grep -rn 'console\\.' src/ convex/)"
fi

# 1b. TODO / FIXME / HACK / XXX markers
TODO_HITS=$(grep -rn "\bTODO\b\|\bFIXME\b\|\bHACK\b\|\bXXX\b" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=convex/_generated \
  src/ convex/ 2>/dev/null | wc -l | tr -d ' ')

if [[ "$TODO_HITS" -eq 0 ]]; then
  check "No TODO/FIXME/HACK/XXX markers" "pass"
else
  check "No TODO/FIXME/HACK/XXX markers" "warn" "$TODO_HITS markers found (resolve or document)"
fi

# 1c. @ts-ignore usage (ts-nocheck is allowed in convex/ interop files)
TS_IGNORE=$(grep -rn "@ts-ignore" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=convex/_generated \
  src/ 2>/dev/null | wc -l | tr -d ' ')

if [[ "$TS_IGNORE" -eq 0 ]]; then
  check "No @ts-ignore in src/" "pass"
else
  check "No @ts-ignore in src/" "warn" "$TS_IGNORE occurrences"
fi

# =============================================================================
# SECTION 2: Demo Data Gating
# =============================================================================

section "2" "Demo data gating"

# 2a. SEED_* used without shouldShowDemoData or showDemo guard
# Check: files that reference SEED_ vars in JSX/logic (not imports, not seed-data.ts itself)
UNGUARDED=0
while IFS= read -r -d '' file; do
  if [[ "$file" == *"seed-data.ts"* ]]; then continue; fi
  # Check if file uses SEED_ vars (non-import lines)
  SEED_USAGE=$(grep -c "SEED_" "$file" 2>/dev/null | tr -d ' ')
  if [[ "$SEED_USAGE" -gt 0 ]]; then
    # Verify it also has a demo guard
    HAS_GUARD=$(grep -c "shouldShowDemoData\|showDemo" "$file" 2>/dev/null | tr -d ' ')
    if [[ "$HAS_GUARD" -eq 0 ]]; then
      RELATIVE="${file#./}"
      printf "    Unguarded: %s\n" "$RELATIVE"
      ((UNGUARDED++))
    fi
  fi
done < <(find src/ -name "*.tsx" -o -name "*.ts" 2>/dev/null | grep -v "seed-data" | tr '\n' '\0')

if [[ "$UNGUARDED" -eq 0 ]]; then
  check "SEED_* always guarded by shouldShowDemoData" "pass"
else
  check "SEED_* always guarded by shouldShowDemoData" "fail" "$UNGUARDED unguarded files"
fi

# 2b. No legacy DEMO_ constants
LEGACY_DEMO=$(grep -rn "DEMO_UPCOMING_SESSION\|DEMO_PAST_SESSIONS" \
  --include="*.tsx" --include="*.ts" \
  src/ 2>/dev/null | wc -l | tr -d ' ')

if [[ "$LEGACY_DEMO" -eq 0 ]]; then
  check "No legacy DEMO_ hardcoded constants" "pass"
else
  check "No legacy DEMO_ hardcoded constants" "fail" "$LEGACY_DEMO occurrences"
fi

# =============================================================================
# SECTION 3: Security Invariants
# =============================================================================

section "3" "Security invariants"

# 3a. AUTH_BYPASS_ALLOWED must not be set to true in any env file
BYPASS_HIT=$(grep -rn "AUTH_BYPASS_ALLOWED=true" .env* 2>/dev/null | wc -l | tr -d ' ')
if [[ "$BYPASS_HIT" -eq 0 ]]; then
  check "AUTH_BYPASS_ALLOWED not set to true in env files" "pass"
else
  check "AUTH_BYPASS_ALLOWED not set to true in env files" "fail" "Found in env file — NEVER deploy with this set"
fi

# 3b. No hardcoded secrets patterns (basic scan)
SECRET_HITS=$(grep -rn \
  -e "sk_live_[A-Za-z0-9]\{20\}" \
  -e "rk_live_[A-Za-z0-9]\{20\}" \
  -e "AIzaSy[A-Za-z0-9_-]\{33\}" \
  -e "whsec_[A-Za-z0-9]\{40\}" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=convex/_generated \
  src/ convex/ 2>/dev/null | wc -l | tr -d ' ')

if [[ "$SECRET_HITS" -eq 0 ]]; then
  check "No hardcoded secret patterns in source" "pass"
else
  check "No hardcoded secret patterns in source" "fail" "$SECRET_HITS potential secrets found"
fi

# 3c. devBypassVerification export is gone
BYPASS_EXPORT=$(grep -rn "export.*devBypassVerification" \
  --include="*.ts" convex/ 2>/dev/null | wc -l | tr -d ' ')

if [[ "$BYPASS_EXPORT" -eq 0 ]]; then
  check "devBypassVerification not exported" "pass"
else
  check "devBypassVerification not exported" "fail" "Must not be exported in production"
fi

# =============================================================================
# SECTION 4: TypeScript
# =============================================================================

section "4" "TypeScript"

if npx tsc --noEmit 2>/dev/null; then
  check "TypeScript: no type errors" "pass"
else
  TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | tr -d ' ')
  check "TypeScript: no type errors" "fail" "$TS_ERRORS error(s) — run: npx tsc --noEmit"
fi

# =============================================================================
# SECTION 5: Unit Tests
# =============================================================================

section "5" "Unit tests"

UNIT_OUTPUT=$(npx vitest run --reporter=verbose 2>&1)
if echo "$UNIT_OUTPUT" | grep -q " passed\| pass"; then
  TOTAL_PASS=$(echo "$UNIT_OUTPUT" | grep -o '[0-9]* passed' | head -1)
  check "Unit tests: all pass ($TOTAL_PASS)" "pass"
else
  FAILED_COUNT=$(echo "$UNIT_OUTPUT" | grep -o '[0-9]* failed' | head -1)
  check "Unit tests" "fail" "${FAILED_COUNT:-some tests failed} — run: npx vitest run"
fi

# =============================================================================
# SECTION 6: Environment Variables
# =============================================================================

section "6" "Environment variables"

REQUIRED_VARS=(
  "NEXT_PUBLIC_CONVEX_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "^${var}=" .env.local 2>/dev/null; then
    check "Env var present: $var" "pass"
  else
    check "Env var present: $var" "fail" "Missing from .env.local"
  fi
done

# =============================================================================
# SECTION 7: Build Verification
# =============================================================================

section "7" "Build verification"

if command -v npx &>/dev/null; then
  printf "  Building (this may take ~60s)...\n"
  if BUILD_OUT=$(npx next build 2>&1); then
    check "next build: succeeds" "pass"
  else
    ERRORS=$(echo "$BUILD_OUT" | grep -i "error\|failed" | head -3)
    check "next build: succeeds" "fail" "Build failed"
    printf "    %s\n" "$ERRORS"
  fi
else
  check "next build" "warn" "npx not available — skipped"
fi

# =============================================================================
# SECTION 8: Security Headers (optional — requires running server)
# =============================================================================

section "8" "Security headers (localhost:3001)"

SERVER_RUNNING=false
if curl -s --max-time 2 -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null | grep -q "^[23]"; then
  SERVER_RUNNING=true
fi

if $SERVER_RUNNING; then
  HEADERS=$(curl -sI --max-time 2 http://localhost:3001/ 2>/dev/null)

  XFO=$(echo "$HEADERS"    | grep -i "^x-frame-options:"          | tr -d '\r')
  CSP=$(echo "$HEADERS"    | grep -i "^content-security-policy:"  | tr -d '\r')
  XCTO=$(echo "$HEADERS"   | grep -i "^x-content-type-options:"   | tr -d '\r')
  XDNS=$(echo "$HEADERS"   | grep -i "^x-dns-prefetch-control:"   | tr -d '\r')

  [[ -n "$XFO"  ]]                       && check "X-Frame-Options present"             "pass" || check "X-Frame-Options present"             "fail"
  [[ -n "$XCTO" ]]                        && check "X-Content-Type-Options present"      "pass" || check "X-Content-Type-Options present"      "fail"
  [[ -n "$CSP"  ]]                        && check "Content-Security-Policy present"     "pass" || check "Content-Security-Policy present"     "fail"
  [[ "$CSP" == *"frame-ancestors 'none'"* ]] && check "CSP: frame-ancestors 'none'"      "pass" || check "CSP: frame-ancestors 'none'"          "fail"
  [[ "$CSP" == *"default-src 'self'"*     ]] && check "CSP: default-src 'self'"          "pass" || check "CSP: default-src 'self'"              "fail"
  [[ -n "$XDNS" ]]                        && check "X-DNS-Prefetch-Control present"      "pass" || check "X-DNS-Prefetch-Control present"      "warn"
else
  printf "  SKIP  Security headers (server not running on :3001 — start with: npm run dev)\n"
  ((WARN++))
fi

# =============================================================================
# RESULTS SUMMARY
# =============================================================================

printf "\n"
printf "======================================\n"
printf "  Release Gate Results\n"
printf "======================================\n"
TOTAL=$((PASS + FAIL + WARN))
printf "  PASS: %d\n" "$PASS"
[[ $WARN -gt 0 ]] && printf "  WARN: %d\n" "$WARN"
[[ $FAIL -gt 0 ]] && printf "  FAIL: %d\n" "$FAIL"
printf "  ─────────────────\n"
printf "  Total checks: %d\n" "$TOTAL"

if [[ $FAIL -gt 0 ]]; then
  printf "\n${RED}  GATE: FAILED${NC} — %d issue(s) must be resolved before shipping\n\n" "$FAIL"
  exit 1
else
  printf "\n${GREEN}  GATE: PASSED${NC}"
  [[ $WARN -gt 0 ]] && printf " (with %d warning(s))" "$WARN"
  printf "\n\n"
  exit 0
fi
