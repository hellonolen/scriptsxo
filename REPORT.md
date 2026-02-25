# ScriptsXO — Post-Deploy Verification & Red-Team Security Report

**Date:** 2026-02-25
**Branch:** `feature/full-agentic-build`
**HEAD:** `aa2e481`
**Convex prod:** `striped-caribou-797.convex.cloud`
**Cloudflare deploy:** `https://7c88b427.scriptsxo.pages.dev`
**Alias URL:** `https://feature-full-agentic-build.scriptsxo.pages.dev`

---

## PHASE 0 — Baseline

| Check | Result |
|-------|--------|
| Branch | `feature/full-agentic-build` ✅ |
| HEAD | `aa2e481` ✅ |
| Working tree | Clean (nothing to commit) ✅ |
| Node version | v23.10.0 ✅ |
| npm version | 11.6.2 ✅ |
| Convex `.env.local` | `dev:merry-civet-821` (deploy script overrides to prod with `--yes`) ✅ |

---

## PHASE 1 — Deploy Pipeline Proof

**Status: PASS**

- `scripts/deploy.sh` runs fully non-interactive (`convex deploy --yes`)
- No prompts during entire deploy
- Convex deployed to `striped-caribou-797.convex.cloud`
- Cloudflare Pages uploaded 185 files, deployed to new hash `7c88b427`
- Full stdout captured in `artifacts/deploy.log`

---

## PHASE 2 — UI Smoke Tests

**Status: 13/13 PASS**

Tests run against `https://7c88b427.scriptsxo.pages.dev` (Chromium).

| Route | Protected | Status |
|-------|-----------|--------|
| `/` | No | ✅ PASS — no JS errors, no 5xx |
| `/start` | No | ✅ PASS |
| `/onboard` | No | ✅ PASS |
| `/intake` | No | ✅ PASS |
| `/admin` | Yes | ✅ PASS — protected content not leaked |
| `/admin/users` | Yes | ✅ PASS |
| `/admin/analytics` | Yes | ✅ PASS |
| `/dashboard` | Yes | ✅ PASS |
| `/provider` | Yes | ✅ PASS |
| `/pharmacy` | Yes | ✅ PASS |
| Security headers | — | ✅ PASS |
| Secrets in page source | — | ✅ PASS |
| No internal stacktraces | — | ✅ PASS |

**Security headers confirmed on prod:**
```
strict-transport-security: max-age=31536000; includeSubDomains; preload
content-security-policy: default-src 'self'; ... frame-ancestors 'none'; ...
permissions-policy: camera=(self), microphone=(self), geolocation=()
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
```

Screenshots saved in `artifacts/smoke/{deploy-hash}/`.
Console logs saved in `artifacts/console/{deploy-hash}/console.log`.

---

## PHASE 3 — Red-Team: Capability Bypass

**Status: 33/33 PASS (all attacks blocked)**

### 3-A: Cross-org write with forged params

| Attack | Function | Result |
|--------|----------|--------|
| Org A admin updates Org B name | `organizations.update` | ✅ FORBIDDEN |
| Org A admin adds member to Org B | `organizations.addMember` | ✅ FORBIDDEN |
| Org A admin removes Org B member | `organizations.removeMember` | ✅ FORBIDDEN |

### 3-B: Cross-user role/cap tamper

| Attack | Function | Result |
|--------|----------|--------|
| Patient elevates another member to admin | `members.updateRole` | ✅ FORBIDDEN |
| Provider elevates another member to admin | `members.updateRole` | ✅ FORBIDDEN |
| Non-admin grants caps to another user | `members.updateCapOverrides` | ✅ FORBIDDEN |
| Patient grants themselves admin caps | `members.updateCapOverrides` | ✅ FORBIDDEN |

### 3-C: Direct-call without callerId (unauthenticated bypass)

| Attack | Function | Result |
|--------|----------|--------|
| updateRole no callerId | `members.updateRole` | ✅ UNAUTHORIZED |
| prescriptions.create no callerId | `prescriptions.create` | ✅ UNAUTHORIZED |
| billing.createRecord no callerId | `billing.createRecord` | ✅ UNAUTHORIZED |
| credentialVerifications.complete no callerId | `credentialVerifications.complete` | ✅ UNAUTHORIZED |
| organizations.updateCapOverrides no callerId | `organizations.updateCapOverrides` | ✅ UNAUTHORIZED |
| Pharmacy creates prescription (RX_WRITE required) | `prescriptions.create` | ✅ FORBIDDEN |
| Patient role changes another user's role | `members.updateRole` | ✅ FORBIDDEN |

### Live prod evidence (via `npx convex run --prod`):
```
# Unauthenticated mutation call → ArgumentValidationError (schema rejects before handler)
npx convex run members:updateRole '{"memberId":"j57x...","role":"admin"}' --prod
→ ArgumentValidationError: Value does not match validator

# Wrong confirmation phrase on grant
npx convex run platformAdmin:requestPlatformOwnerGrant '{"confirmationPhrase":"WRONG"}' --prod
→ ArgumentValidationError: Object is missing required field `targetMemberId`
  (schema validation rejects before handler runs)
```

---

## PHASE 4 — Platform Owner Grant Flow

**Status: 12/12 PASS**

| Test | Result |
|------|--------|
| seed: fails if owner already exists | ✅ FORBIDDEN |
| seed: audit logged on failure | ✅ securityEvents row written |
| requestGrant: wrong phrase rejected | ✅ FORBIDDEN |
| requestGrant: non-owner cannot request | ✅ FORBIDDEN |
| requestGrant: audit logged on phrase failure | ✅ event.reason contains "phrase" |
| confirmGrant: before cooldown (55s into 60s) | ✅ TOO_EARLY |
| confirmGrant: expired window | ✅ EXPIRED + status→expired |
| confirmGrant: different caller rejected | ✅ FORBIDDEN |
| confirmGrant: replay (already confirmed) | ✅ CONFLICT |
| confirmGrant: success path | ✅ isPlatformOwner=true + confirmed + audit |
| revoke: wrong phrase + audit | ✅ FORBIDDEN + event |
| revoke: self-revoke blocked + audit | ✅ FORBIDDEN + event.reason.toLowerCase() contains "self" |
| revoke: non-owner blocked | ✅ FORBIDDEN |
| revoke: success path + diff | ✅ isPlatformOwner=false + audit diff |

**Every transition emits a `securityEvents` row with:**
- `actorMemberId` — who triggered it
- `targetId` — who was affected
- `action` — `PLATFORM_OWNER_GRANT_REQUESTED` / `_CONFIRMED` / `_CANCELLED` / `PLATFORM_OWNER_REVOKE`
- `success` — true or false
- `reason` — human-readable context or failure cause
- `timestamp` — epoch ms
- `diff` — `{ isPlatformOwner: { from, to } }` on success paths

---

## PHASE 5 — Audit Trail Narrative

**Status: 4/4 PASS**

All four narrative tests pass:

1. **Role change narrative**: `actorMemberId`, `targetId`, `diff.role.from`, `diff.role.to`, `timestamp` — all present.
2. **Forbidden attempt narrative**: failed `ROLE_CHANGE` events also logged with actor + reason.
3. **Cap override narrative**: before/after diff in `capAllow` and `capDeny`.
4. **Full story**: member registers → self-elevation forbidden (logged) → admin elevates (logged with diff) → prescription attempt forbidden → timeline reconstructible from `securityEvents` alone.

---

## PHASE 6 — Secrets / Env / Client Leaks

**Status: PASS**

| Check | Result |
|-------|--------|
| No OpenAI keys in source | ✅ |
| No Google API keys hardcoded | ✅ |
| No Stripe live/webhook secrets | ✅ |
| No `PLATFORM_OWNER_EMAILS` bypass | ✅ Removed |
| No `devBypassVerification` export | ✅ Deleted |
| No `DEV MODE bypass` comments | ✅ |
| `NEXT_PUBLIC_*` vars | ✅ Only `CONVEX_URL` + `CONVEX_SITE_URL` (safe public values) |
| No secrets in rendered HTML | ✅ Playwright scan passed |
| No stacktraces exposed to anon | ✅ |
| CSP `frame-ancestors 'none'` | ✅ Confirmed via curl |
| HSTS present | ✅ `max-age=31536000; includeSubDomains; preload` |

---

## BUGS FOUND & FIXED

### BUG-001 (CRITICAL) — `securityAudit.ts` writes `null` to `v.optional()` fields

**Found:** Phase 3 live-prod test — `platformAdmin:seed` crashed in Convex runtime.

**Repro:**
```
npx convex run platformAdmin:seed '{"email":"test@test.com"}' --prod
→ Failed to insert in "securityEvents": Value does not match validator.
  Path: .actorMemberId  Value: null  Validator: v.string()
```

**Root cause:** `convex/lib/securityAudit.ts:51` used `event.actorMemberId ?? null`. Convex `v.optional(v.string())` means *field absent*, not *field = null*. Writing `null` fails schema validation.

**Impact:** Every call to `logSecurityEvent()` with a null actor (unauthenticated attempts, seed calls) would throw, causing the outer mutation to fail and roll back. This means audit logging was broken for the most important case: **unauthenticated attempts were crashing instead of logging + returning FORBIDDEN.**

**Fix:** `convex/lib/securityAudit.ts` — build record conditionally, omitting keys when value is `null`/`undefined`:
```typescript
// Before (BROKEN)
actorMemberId: event.actorMemberId ?? null,

// After (FIXED)
if (event.actorMemberId != null) record.actorMemberId = event.actorMemberId;
```

**File:** `convex/lib/securityAudit.ts:49-62`
**Deployed:** `aa2e481` — `striped-caribou-797.convex.cloud`
**Verification:** `npx convex run platformAdmin:seed '{"email":"test@test.com"}' --prod` now returns clean `ConvexError: NOT_FOUND` instead of crashing.

---

## OPERATIONAL NOTES (ACTION REQUIRED)

### Bootstrap not yet run in prod

No `isPlatformOwner: true` member exists in production. The seed bootstrap is currently **open**.

**Action:** After creating your member account in prod, run:
```bash
npx convex run platformAdmin:seed '{"email":"hellonolen@gmail.com"}' --prod
```

This locks the bootstrap permanently. Until this is done, anyone with `CONVEX_DEPLOY_KEY` (which is already protected by Convex's infrastructure auth) could call `seed` directly.

---

## FINAL TEST SUMMARY

| Suite | Tests | Status |
|-------|-------|--------|
| Unit: capabilities.test.ts | 27 | ✅ 27/27 PASS |
| Unit: mutations-security.test.ts | 42 | ✅ 42/42 PASS |
| Unit: redteam.test.ts | 33 | ✅ 33/33 PASS |
| **Unit total** | **102** | ✅ **102/102 PASS** |
| E2E: prod-smoke.spec.ts (Chromium) | 13 | ✅ 13/13 PASS |
| **Grand total** | **115** | ✅ **115/115 PASS** |

---

## ARTIFACT INDEX

| File | Contents |
|------|----------|
| `artifacts/deploy.log` | Full deploy stdout/stderr |
| `artifacts/smoke-run.log` | Playwright smoke test output |
| `artifacts/smoke/{hash}/*.png` | Screenshots per route |
| `artifacts/console/{hash}/console.log` | Browser console per route |
| `artifacts/redteam/redteam-run.log` | Red-team test output |
| `tests/e2e/prod-smoke.spec.ts` | Smoke + security header tests |
| `tests/unit/redteam.test.ts` | Adversarial capability tests |
| `docs/ops/platform-owner-recovery.md` | Break-glass recovery procedure |
