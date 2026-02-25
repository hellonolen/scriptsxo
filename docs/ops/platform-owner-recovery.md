# Platform Owner Recovery (Break-Glass)

This document describes how to recover platform owner access if all platform owner accounts are lost or inaccessible.

**This procedure is out-of-band and requires direct Convex infrastructure access. It bypasses all application-level auth. Treat it with the same gravity as a production database restore.**

---

## When to use this

- You have lost access to all platform owner accounts (passkey device lost, account deleted, etc.)
- `platformAdmin:listOwners` returns no results or you cannot authenticate to call it
- Normal `platformAdmin:seed` is rejected because a (now-inaccessible) owner already exists

---

## What you will NOT do

- Never add an email allowlist back to capabilities.ts
- Never add a "dev bypass" to any mutation
- Never create a second path that skips the audit log

---

## Recovery procedure

### Step 1 — Confirm you have lost access

Verify there are no accessible platform owner accounts:

```bash
npx convex run platformAdmin:listOwners --prod
# Expected: FORBIDDEN (because you can't authenticate as owner)
# OR: returns a list of owners whose accounts you can still reach
```

If you can reach any owner account, use the normal grant flow instead.

### Step 2 — Locate your target member ID

You need the Convex member `_id` of the account you want to restore as platform owner.

From the Convex Dashboard:

1. Go to `https://dashboard.convex.dev`
2. Open the `prod:striped-caribou-797` deployment
3. Navigate to **Data** → **members** table
4. Find your member by email
5. Copy the `_id` value (format: `<table_id><hash>`)

### Step 3 — Run the recovery script

Create a one-time recovery script. **Delete it immediately after use.**

```typescript
// scripts/recover-platform-owner.ts  (DELETE AFTER USE)
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

// Set isPlatformOwner directly via a privileged internal mutation
// Run this via: npx ts-node scripts/recover-platform-owner.ts
async function main() {
  const TARGET_MEMBER_ID = "PASTE_MEMBER_ID_HERE";

  // You must run this via Convex's deployment key (CONVEX_DEPLOY_KEY)
  // which bypasses application-layer auth but is protected by Convex's own access controls.
  await client.mutation("platformAdmin:seed", { email: "your@email.com" });
  console.log("Recovery complete. Delete this file.");
}

main().catch(console.error);
```

**Important**: `seed()` only works if zero platform owners currently exist. If a stale/inaccessible owner is blocking it, you must patch the record directly from the Convex dashboard:

1. Open **Data** → **members**
2. Find the old (inaccessible) platform owner row
3. Click the row → Edit → Set `isPlatformOwner` to `false` → Save
4. Run `seed()` to establish the new owner

### Step 4 — Audit the recovery

After recovery, run immediately:

```bash
npx convex run platformAdmin:listSecurityEvents \
  --prod \
  '{"callerId":"<your_new_member_id>","limit":20}'
```

The recovery action will appear in `securityEvents` under `PLATFORM_OWNER_SEED`.

If the event does not appear, the recovery script did not complete — do not proceed until it does.

### Step 5 — Rotate and verify

After restoring access:

1. Verify you can call `listOwners` successfully
2. If the previous owner's account was compromised (not just lost), revoke it:
   ```bash
   npx convex run platformAdmin:revokePlatformOwner --prod \
     '{"callerId":"<your_id>","targetMemberId":"<old_id>","confirmationPhrase":"REVOKE_PLATFORM_OWNER"}'
   ```
3. Review recent `securityEvents` for any unauthorized actions during the lockout window
4. Rotate any API keys that platform owners have access to

---

## Prevention

To avoid needing this procedure:

1. **Keep your passkey device backed up** (Apple Keychain sync, hardware key with backup)
2. **Never grant platform owner to more than two people** — one primary, one break-glass designee
3. **Test recovery quarterly** by attempting `listOwners` and confirming you can authenticate
4. **Document the Convex Dashboard access separately** — store `CONVEX_DEPLOY_KEY` in a secure vault (1Password, Bitwarden) distinct from application credentials

---

## Convex deployment reference

| Item | Value |
|------|-------|
| Deployment | `prod:striped-caribou-797` |
| Dashboard | `https://dashboard.convex.dev` |
| securityEvents table | Append-only, never delete rows |
| Deploy key location | Convex Dashboard → Settings → Deploy Keys |

---

*Last updated: 2026-02-25*
