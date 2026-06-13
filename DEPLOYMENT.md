# P402 Router V2 - Production Deployment Guide

This guide covers the steps to deploy the P402 Router V2 to production (Vercel + Neon Postgres).

## 1. Database Migration (Neon)

Migrations live in `scripts/migrations/`. The canonical apply path is the
gated runner shipped in slice 3T. **Never** run `npx tsx scripts/migrate.ts`
directly: that file is a deprecation stub and will exit non-zero. **Never**
run `neon-sql-editor-full-apply.sql`: it is not a migration and is excluded
from the runner's allowlist.

### Inspect

```bash
npm run migrate:list
```

Prints every `*.sql` under `scripts/migrations/`, marks `_down.sql`
rollback files distinctly, and never connects to a database. Safe to run
anywhere.

### Apply against dev or staging

```bash
npm run migrate:apply -- --file v2_055_tenant_control_settings.sql --target dev
```

The runner requires both `--file` and `--target`. It refuses files
outside `scripts/migrations/`, refuses absolute paths and path
traversal, and refuses `_down.sql` files unless you also pass
`--allow-down`. On success it logs the filename, SHA-256, target, db,
host (password redacted), status, and duration to stderr and appends the
same line to `.migration-audit.log` (local-only, gitignored).

### Apply against production

```bash
npm run migrate:apply -- \
  --file v2_055_tenant_control_settings.sql \
  --target production \
  --confirm-production v2_055_tenant_control_settings.sql
```

`--target production` adds two confirmations on top of the dev flow:

1. `--confirm-production <name>` must equal `--file` byte-for-byte. If
   they differ, the runner refuses with `PROD_CONFIRM_MISMATCH` and
   never opens a DB connection.
2. The runner then prompts on stdin for the filename a third time. If
   the typed answer does not match, the runner refuses with
   `INTERACTIVE_MISMATCH` and never opens a DB connection.

In CI (no TTY), add `--ci` to skip the interactive prompt. The other
two production gates still apply.

### Apply a rollback (`_down.sql`)

Down migrations are refused by default — they are more dangerous than
additive up migrations and must never be one typo away. Add
`--allow-down`. Production rollbacks require **all** of:

```bash
npm run migrate:apply -- \
  --file v2_055_tenant_control_settings_down.sql \
  --target production \
  --confirm-production v2_055_tenant_control_settings_down.sql \
  --allow-down
```

…plus the interactive filename confirmation, unless `--ci` is set.

### Dry-run

```bash
npm run migrate:apply -- --file v2_055_tenant_control_settings.sql --target dev --dry-run
```

Validates every gate, prints the audit log line that *would* be written
(including the SHA-256), prints the head and tail of the SQL file, and
never opens a DB connection. Safe rehearsal.

### Audit log

Every apply (and every refusal) writes a single line to
`.migration-audit.log` at the repo root. The file is gitignored. It is
local evidence only, not a durable ledger — the durable ledger is slice
3T-B.

> **A2A tables** (if using A2A protocol features), apply via the same
> runner:
> ```bash
> npm run migrate:apply -- --file a2a_001_task_model.sql  --target dev
> npm run migrate:apply -- --file a2a_003_x402_payments.sql --target dev
> ```

---

## 2. Environment Variables (Vercel)

Configure the following variables in your Vercel Project Settings:

### Core
- `DATABASE_URL`: Your authenticated Neon Postgres connection string.
- `NEXT_PUBLIC_APP_URL`: Your production URL (e.g., `https://p402.io`).
- `CRON_SECRET`: A strong random string for securing cron jobs.

### Authentication (NextAuth)
- `NEXTAUTH_SECRET`: A strong random string (generate with `openssl rand -base64 32`).
- `NEXTAUTH_URL`: Same as `NEXT_PUBLIC_APP_URL` (e.g., `https://p402.io`).
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret.
- `ADMIN_EMAILS`: Comma-separated list of emails that get Admin Dashboard access.

### CDP Embedded Wallet (Frontend — always required)
- `NEXT_PUBLIC_CDP_PROJECT_ID`: `81080910-ed18-480f-8633-70289ef0baac` — enables email OTP login and embedded wallet for end users. Get from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/projects) → Project Settings.

### CDP Server Wallet (Facilitator — recommended for production)

Two modes for the x402 facilitator signing wallet. **Mode A (CDP) is strongly recommended** because keys live in Coinbase's AWS Nitro Enclave (TEE) — they are never exposed to the Node.js process.

**Mode A — CDP Server Wallet (recommended)**
```
CDP_API_KEY_ID=<your-api-key-id>          # From CDP Portal → API Keys
CDP_API_KEY_SECRET=<your-api-key-secret>  # Secret key, store encrypted
CDP_WALLET_SECRET=<your-wallet-secret>    # Wallet signing secret, store encrypted
CDP_SERVER_WALLET_ENABLED=true
CDP_FACILITATOR_WALLET_NAME=p402-facilitator   # Optional, default: p402-facilitator
```

After first deployment in CDP mode, the router will call `cdp.evm.getOrCreateAccount({ name: 'p402-facilitator' })` and derive a deterministic address. Check `/api/v1/facilitator/health` to find that address, then set:
```
P402_SIGNER_ADDRESS=<address returned by health endpoint>
```
Fund this address with a small amount of ETH on Base for gas (facilitator pays gas; users pay in USDC via EIP-3009).

**Mode B — Legacy private key (fallback for local dev)**
```
P402_FACILITATOR_PRIVATE_KEY=0x...    # Hot wallet private key
P402_SIGNER_ADDRESS=0x...             # Corresponding address
CDP_SERVER_WALLET_ENABLED=false       # (or omit)
```

**Migration from Mode B → Mode A:** Keep `P402_FACILITATOR_PRIVATE_KEY` set until you verify CDP mode is working. Once `/api/v1/facilitator/health` returns `"mode": "cdp-server-wallet"`, you can remove the private key variable.

### x402 Settlement
- `P402_TREASURY_ADDRESS`: `0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6` (deployed treasury)
- `P402_SETTLEMENT_ADDRESS`: `0xd03c7ab9a84d86dbc171367168317d6ebe408601`
- `SUBSCRIPTION_FACILITATOR_ADDRESS`: `0xc64747651e977464af5bce98895ca6018a3e26d7`

### AI Routing
- `OPENROUTER_API_KEY`: Required for multi-provider routing (300+ models via OpenRouter).
- `GOOGLE_API_KEY`: Required for Gemini intelligence layer (Protocol Economist + Sentinel).

### Optional
- `RESEND_API_KEY`: For email notifications.
- `REDIS_URL`: Semantic cache + rate limiting. Degrades gracefully if not set.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ENTERPRISE`: Required for subscription billing.

---

## 3. Deploy Code

Push the latest changes to your `main` branch:

```bash
git add .
git commit -m "chore: prepare for v2 production launch"
git push origin main
```

Vercel will automatically detect the push and build the project.

---

## 4. Configure Background Jobs (Cron)

Since Vercel Hobby plan does not support frequent cron jobs, you **must** use an external service like `cron-job.org`.

### Configuration Details

**Job 1: Health Check (Poll Facilitators)**
*   **Purpose:** Updates the health status of all connected facilitators every 5 mins.
*   **URL:** `https://p402.io/api/v1/cron/poll-facilitators`
*   **Method:** `POST` (Must be POST)
*   **Header:** `Authorization: Bearer <YOUR_CRON_SECRET>`

**Job 2: Bazaar Sync (Discovery)**
*   **Purpose:** Crawls discovery endpoints to populate the Bazaar registry every 1 hour.
*   **URL:** `https://p402.io/api/internal/cron/bazaar/sync`
*   **Method:** `GET`
*   **Header:** `Authorization: Bearer <YOUR_CRON_SECRET>`

---

## 5. Verification

Once deployed:
1.  Visit `/status` or `/api/health` to confirm the router is up.
2.  Visit `/get-access` and submit a form to test the `access_requests` table.
3.  Visit `/bazaar` to ensure the registry is loading (it might be empty until the first Sync job runs).

### CDP ↔ AP2 ↔ ERC-8004 wiring verification
4.  Create a CDP session with `agent_id` set — confirm a row appears in `ap2_mandates` with the matching `agent_did` and `ap2_mandate_id` in the session's `policies` column.
5.  Trigger A2A auto-pay against a session whose mandate has `amount_spent_usd >= max_amount_usd` — expect 403 with `{ error: { type: "mandate_error", code: "MANDATE_BUDGET_EXCEEDED" } }`.
6.  Successful auto-pay — confirm `budget_spent_usd` is incremented on `agent_sessions` and a pending row appears in `erc8004_feedback`.
7.  Pre-existing sessions (no `ap2_mandate_id` in `policies`) — auto-pay must succeed unchanged (no mandate check performed).

**Launch Status:** 🟢 READY

---

## 6. Smart Contract Deployment (P402Settlement)

For production-grade payment processing, deploy the P402Settlement smart contract to Base mainnet.

### Prerequisites
- Deployer wallet with ETH for gas on Base
- Treasury address configured (0xb23f146251e3816a011e800bcbae704baa5619ec)

### Deployment Steps

1. **Compile Contract**
   ```bash
   npx hardhat compile
   ```

2. **Test on Base Sepolia (Recommended)**
   ```bash
   npx tsx scripts/deploy-settlement.ts --network=base-sepolia
   ```

3. **Deploy to Base Mainnet**
   ```bash
   npx tsx scripts/deploy-settlement.ts --network=base
   ```

4. **Verify on Basescan**
   ```bash
   npx hardhat verify --network base <CONTRACT_ADDRESS> "0xb23f146251e3816a011e800bcbae704baa5619ec"
   ```

5. **Update Environment Variables**
   ```env
   P402_SETTLEMENT_ADDRESS=<deployed_contract_address>
   ```

### Security Checklist
- [ ] Contract deployed with correct treasury address
- [ ] Fee set to 1% (100 basis points)
- [ ] Contract verified on Basescan
- [ ] Test small payment ($1 USDC) before going live
- [ ] Monitor contract for fee accumulation

### Emergency Controls
- Contract can be paused by owner if needed
- Treasury address can be updated if compromised
- Fees can be withdrawn by anyone (go to configured treasury)
