# P402 Router V2 - Production Deployment Guide

This guide covers the steps to deploy the P402 Router V2 to production (Vercel + Neon Postgres).

## 1. Database Migration (Neon)

Before deploying the code, run all pending migrations against your Neon database in order:

```bash
# Enable extensions first (run once in Neon SQL Editor if not already enabled)
# CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
# CREATE EXTENSION IF NOT EXISTS vector;

# Then apply migrations in order:
psql $DATABASE_URL -f scripts/migrations/schema.sql
psql $DATABASE_URL -f scripts/migrations/v2_001_initial_schema.sql
psql $DATABASE_URL -f scripts/migrations/002_openrouter_integration.sql
psql $DATABASE_URL -f scripts/migrations/003_replay_protection.sql
psql $DATABASE_URL -f scripts/migrations/003_semantic_cache_setup.sql
psql $DATABASE_URL -f scripts/migrations/004_traffic_events.sql
psql $DATABASE_URL -f scripts/migrations/005_erc8004_trustless_agents.sql
psql $DATABASE_URL -f scripts/migrations/006_safety_quarantine.sql
psql $DATABASE_URL -f scripts/migrations/v2_002_pricing_layer.sql
psql $DATABASE_URL -f scripts/migrations/v2_003_billing_core.sql
psql $DATABASE_URL -f scripts/migrations/v2_004_billing_subscriptions.sql
psql $DATABASE_URL -f scripts/migrations/v2_005_onchain_subscription_ledger.sql
psql $DATABASE_URL -f scripts/migrations/v2_006_safety_pack_ops.sql
psql $DATABASE_URL -f scripts/migrations/v2_007_kpi_rollups.sql
psql $DATABASE_URL -f scripts/migrations/v2_008_audit_funnel.sql
psql $DATABASE_URL -f scripts/migrations/v2_009_trust_packaging.sql
psql $DATABASE_URL -f scripts/migrations/v2_010_developer_settings.sql
psql $DATABASE_URL -f scripts/migrations/v2_011_stripe_integration.sql
psql $DATABASE_URL -f scripts/migrations/v2_012_webhook_idempotency.sql
psql $DATABASE_URL -f scripts/migrations/v2_013_drop_tenant_plan.sql
psql $DATABASE_URL -f scripts/migrations/v2_014_access_requests.sql
psql $DATABASE_URL -f scripts/migrations/v2_015_cdp_wallets.sql
```

All migrations use `IF NOT EXISTS` / `IF NOT EXISTS` guards — safe to re-run on an existing database.

> **A2A tables** (if using A2A protocol features):
> ```bash
> psql $DATABASE_URL -f scripts/migrations/a2a_001_task_model.sql
> psql $DATABASE_URL -f scripts/migrations/a2a_003_x402_payments.sql
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
