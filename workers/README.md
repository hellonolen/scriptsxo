# ScriptsXO API Worker

Cloudflare Worker serving the REST API for ScriptsXO. Backed by D1 (SQLite), R2 (file storage), and KV (rate limits / ephemeral state).

## Base URL

Production: `https://api.scriptsxo.com`
Development: `https://scriptsxo-api.<your-subdomain>.workers.dev`

## Auth

All protected routes require one of:

- `Authorization: Bearer <sessionToken>` header
- `scriptsxo_session` HttpOnly cookie (set by POST /api/v1/auth/verify)

Session tokens are opaque random strings resolved server-side against the `sessions` table. The client never supplies a memberId — the session IS the identity.

---

## Routes

### Auth

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | /api/v1/auth/challenge | Create WebAuthn ceremony challenge | No |
| POST | /api/v1/auth/register | Store new passkey credential | No |
| POST | /api/v1/auth/verify | Verify ECDSA assertion, create session cookie | No |
| DELETE | /api/v1/auth/session | Logout — delete session row | Yes |

#### POST /api/v1/auth/challenge

Request body:
```json
{ "email": "user@example.com", "type": "registration" }
```

Response:
```json
{ "success": true, "data": { "challenge": "<base64url>", "expiresAt": 1700000000000 } }
```

#### POST /api/v1/auth/verify

Request body:
```json
{
  "email": "user@example.com",
  "credentialId": "<base64url>",
  "clientDataJSON": "<base64url>",
  "authenticatorData": "<base64url>",
  "signature": "<base64url>"
}
```

Response sets `scriptsxo_session` HttpOnly cookie and returns:
```json
{ "success": true, "data": { "memberId": "<id>", "role": "patient" } }
```

---

### Members

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/members/me | Get current authenticated member |
| PATCH | /api/v1/members/me | Update current member profile |

---

### Organizations

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/organizations | List organizations (admin only) |
| POST | /api/v1/organizations | Create organization (platform owner only) |
| GET | /api/v1/organizations/:id | Get organization by ID |
| PATCH | /api/v1/organizations/:id | Update organization |

---

### Patients

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/patients | List patients (scoped by org/role) |
| POST | /api/v1/patients | Create patient record |
| GET | /api/v1/patients/:id | Get patient by ID |
| PATCH | /api/v1/patients/:id | Update patient record |

Scoping rules: providers see only their patients; org admins see org patients; platform owners see all.

---

### Providers

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/providers | List providers |
| POST | /api/v1/providers | Create provider (admin only) |
| GET | /api/v1/providers/:id | Get provider by ID |
| PATCH | /api/v1/providers/:id | Update provider |

---

### Pharmacies

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/pharmacies | List pharmacies |
| POST | /api/v1/pharmacies | Create pharmacy (admin only) |
| GET | /api/v1/pharmacies/:id | Get pharmacy by ID |
| PATCH | /api/v1/pharmacies/:id | Update pharmacy |

---

### Intakes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/intakes | Start intake form session |
| GET | /api/v1/intakes/:id | Get intake by ID |
| PATCH | /api/v1/intakes/:id | Update intake (step progression) |

---

### Consultations

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/consultations | List consultations (scoped) |
| POST | /api/v1/consultations | Create consultation |
| GET | /api/v1/consultations/:id | Get consultation by ID |
| PATCH | /api/v1/consultations/:id | Update status, add notes/diagnosis |

---

### Prescriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/prescriptions | List prescriptions (scoped) |
| POST | /api/v1/prescriptions | Create prescription (provider only) |
| GET | /api/v1/prescriptions/:id | Get prescription by ID |
| PATCH | /api/v1/prescriptions/:id/status | Update prescription status |

---

### Refill Requests

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/refills | List refill requests |
| POST | /api/v1/refills | Create refill request (patient) |
| PATCH | /api/v1/refills/:id | Approve or deny (provider/pharmacist) |

---

### Follow-Ups

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/follow-ups | List follow-ups (scoped) |
| POST | /api/v1/follow-ups | Create follow-up |
| PATCH | /api/v1/follow-ups/:id | Submit patient response or provider review |

---

### Messages

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/messages/:conversationId | Get messages in conversation |
| POST | /api/v1/messages | Send message |

---

### Files (R2)

| Method | Path | Description |
|--------|------|-------------|
| PUT | /api/v1/files/:key | Upload file (multipart) |
| GET | /api/v1/files/:key | Get presigned download URL (15-min TTL) |
| DELETE | /api/v1/files/:key | Delete file (owner or admin) |

PHI files (government IDs, insurance cards) are encrypted at the application layer before upload to R2.

---

### Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/billing | List billing records (scoped) |
| GET | /api/v1/billing/:id | Get billing record |

---

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/notifications | List notifications for current user |
| PATCH | /api/v1/notifications/:id/read | Mark notification as read |

---

### Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/agents/tickets | List agent tickets (admin only) |
| POST | /api/v1/agents/tickets | Create agent ticket |
| PATCH | /api/v1/agents/tickets/:id | Update ticket status |
| GET | /api/v1/agents/budgets | List agent token budgets (admin only) |

---

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/webhooks/stripe | Stripe checkout and Identity webhook events |
| POST | /api/v1/webhooks/phaxio | Fax delivery status callback |

Webhook endpoints verify request signatures before processing. Stripe: `Stripe-Signature` header. Phaxio: HMAC-SHA256 over the raw body.

---

## Middleware Chain

Every request passes through this chain in order:

```
CORS
  → Rate Limit check (KV sliding window)
    → Session resolve (D1 sessions table, Bearer or cookie)
      → RBAC (role + capability check)
        → Org scope enforcement
          → Route handler
            → Audit log (append-only INSERT into audit_log)
```

Any middleware failure returns an error response immediately. The handler is never called.

---

## Response Format

All responses use the same envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Paginated responses include:

```json
{
  "success": true,
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

---

## Environment Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 Database | Primary data store (all 36 tables) |
| `FILES` | R2 Bucket | PHI documents, recordings, ID scans |
| `CACHE` | KV Namespace | Rate limits, ephemeral session state |

Worker secrets (set via `wrangler secret put`, never in `wrangler.toml`):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PHAXIO_API_KEY`
- `PHAXIO_API_SECRET`
- `GEMINI_API_KEY`
- `SESSION_SIGNING_KEY`

---

## Local Development

```bash
# Install dependencies
npm install

# Start D1 local instance and Worker
npx wrangler dev --local

# Apply schema to local D1
npx wrangler d1 execute scriptsxo --local --file=./schema.sql

# Create D1 database in Cloudflare (first time only)
npx wrangler d1 create scriptsxo
# Copy database_id into wrangler.toml

# Create KV namespace (first time only)
npx wrangler kv:namespace create CACHE
# Copy id into wrangler.toml

# Apply schema to production D1
npx wrangler d1 execute scriptsxo --file=./schema.sql

# Deploy
npx wrangler deploy
```

---

## Cron Triggers

| Schedule | Description |
|----------|-------------|
| `*/5 * * * *` | Process queued agent tickets (low priority) |
| `*/2 * * * *` | Process queued agent tickets (high priority, emergency) |
| `0 * * * *` | Expire stale sessions, auth challenges, magic links |
| `0 9 * * *` | Send daily follow-up notifications |
| `0 0 1 * *` | Reset agent monthly token budgets |
