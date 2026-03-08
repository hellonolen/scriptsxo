# ScriptsXO: Convex to Cloudflare D1 Migration

## Overview

Move ScriptsXO from Convex to Cloudflare D1 + R2 + Workers. 4 phases over 8 weeks.

## Architecture

| Component | Convex (before) | Cloudflare (after) |
|-----------|----------------|-------------------|
| Document store | Convex tables | D1 (SQLite) |
| File storage | Convex file storage | R2 |
| Functions | Convex queries/mutations/actions | Cloudflare Workers |
| Ephemeral state | Convex tables (rate_limits) | Cloudflare KV |
| Scheduled jobs | Convex crons | Cloudflare Cron Triggers |

## Real-Time Gap

Convex had live subscriptions (`useQuery` auto-updates). D1 does not push. Mitigation strategy:

| Scenario | Solution |
|----------|----------|
| Dashboard stats | Poll every 5-10s |
| Active consultation status | Server-Sent Events (SSE) |
| Patient-provider chat | Durable Objects + WebSockets (Phase 5, if needed) |

Implement polling first. Only build SSE/DO if polling latency is unacceptable.

---

## Phase 1: Auth + Sessions (Weeks 1-2)

### Tables

- `sessions`
- `passkeys`
- `auth_challenges`
- `magic_links`
- `rate_limits`

### Workers to Build

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/challenge | Create WebAuthn ceremony challenge |
| POST | /api/v1/auth/register | Store new passkey credential |
| POST | /api/v1/auth/verify | Verify ECDSA signature, create session |
| DELETE | /api/v1/auth/session | Logout — invalidate session token |

### Frontend Changes

Swap Convex hooks to `fetch()`:

```
useQuery(api.passkeys.getByEmail) → GET /api/v1/auth/passkeys?email=...
useMutation(api.sessions.create)  → POST /api/v1/auth/verify
```

### Migration Strategy

Dual-write new sessions to D1 and Convex during cutover. Read D1 first; fall through to Convex if not found. After 2 weeks, remove fallback.

### Feature Flag

`USE_D1_AUTH` in Cloudflare KV. Set to `false` to instant-rollback to Convex.

---

## Phase 2: Core Domain (Weeks 3-4)

### Tables

- `members`
- `organizations`
- `patients`
- `providers`
- `credential_verifications`
- `pharmacies`
- `pending_platform_owner_grants`

### Workers to Build

Full CRUD REST endpoints for each entity. See `README.md` for route inventory.

### Data Migration

```bash
# 1. Export from Convex via internalQuery (paginated, 1000 rows/batch)
npx convex run internal:export:members

# 2. Transform (camelCase → snake_case, Convex IDs → nanoid)

# 3. Batch INSERT into D1
wrangler d1 execute scriptsxo --file=./migrations/members.sql
```

### Frontend Changes

Swap all dashboard data loading from Convex `useQuery` hooks to `fetch()` calls against the Worker API.

### Feature Flag

`USE_D1_CORE` in Cloudflare KV.

---

## Phase 3: Clinical + Files (Weeks 5-6)

### Tables

- `consultations`
- `prescriptions`
- `intakes`
- `triage_assessments`
- `video_reviews`
- `follow_ups`
- `refill_requests`
- `billing_records`
- `file_storage`
- `agent_tickets`
- `agent_budgets`
- `notifications`
- `messages`

### File Migration

Stream Convex storage objects to R2:

```bash
# Per file: download from Convex getUrl, upload to R2
wrangler r2 object put scriptsxo-files/<key> --file=<local>
```

Update `file_storage` rows to point to R2 keys instead of Convex storage IDs.

### Agent Ticketing

Port the Paperclip agent ticket system from Convex scheduled functions to Cloudflare Cron Triggers. Each cron handler queries `agent_tickets` for `status = 'queued'` and processes the next batch.

### Feature Flag

`USE_D1_CLINICAL` in Cloudflare KV.

---

## Phase 4: Cleanup (Weeks 7-8)

### Tables

- `compliance_records`
- `state_licensing`
- `marketing_content`
- `settings`
- `ai_conversations`
- `security_events`
- `audit_log`
- `agent_logs`
- `agent_roles`
- `company_goals`
- `fax_logs`

### Cutover Steps

1. Verify all data migrated and checksums match.
2. Enable all `USE_D1_*` flags.
3. Run production traffic on D1 for 48 hours.
4. Remove Convex dual-write code.
5. Delete `convex/` directory.
6. Remove Convex packages from `package.json`.
7. Update deploy scripts to remove `npx convex deploy`.

### Feature Flag

`USE_D1_AUDIT` in Cloudflare KV.

---

## Rollback Strategy

Each phase has an independent feature flag stored in Cloudflare KV:

| Flag | Scope |
|------|-------|
| `USE_D1_AUTH` | Sessions, passkeys, challenges |
| `USE_D1_CORE` | Members, orgs, patients, providers |
| `USE_D1_CLINICAL` | Consultations, prescriptions, files |
| `USE_D1_AUDIT` | Compliance, audit, security events |

Setting any flag to `"false"` in KV instantly routes that slice of traffic back to Convex. No deploy required.

---

## PHI Security

| Concern | Mitigation |
|---------|-----------|
| Data at rest | D1 encrypted at rest by Cloudflare infrastructure |
| Sensitive columns (DOB, address, SSN) | AES-256-GCM encryption at application layer before INSERT |
| R2 PHI objects (ID scans, insurance cards) | Per-object encryption before upload; key stored in KV |
| Audit trail | `audit_log` and `security_events` are append-only — no UPDATE or DELETE in Worker code |
| Session tokens | HttpOnly, Secure, SameSite=Strict cookies only — never in URL or response body |
| API keys | Stored in Cloudflare Worker secrets (`wrangler secret put`) — never in `wrangler.toml` |
| CORS | Worker enforces allowlist — no wildcard origins on PHI endpoints |

---

## ID Strategy

Convex uses its own document IDs (e.g., `jd7x3k2m4n...`). D1 rows use nanoid (21-char URL-safe random).

During migration, store the original Convex ID in a `convex_id TEXT` shadow column on each table. Remove shadow columns after Phase 4 is stable.

---

## Testing Checklist per Phase

- [ ] Auth flows: register passkey, verify challenge, create session, logout
- [ ] Session resolution: Bearer token and cookie both resolve to same member
- [ ] RBAC: platform owner, org admin, provider, patient roles enforced
- [ ] Data integrity: foreign key constraints satisfied
- [ ] File upload/download round-trip via R2
- [ ] Cron triggers firing on schedule
- [ ] Rollback: flip feature flag off, confirm traffic returns to Convex
