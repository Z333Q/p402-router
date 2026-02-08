# P402 Router V2 - Production Deployment Guide

This guide covers the steps to deploy the P402 Router V2 to production (Vercel + Neon Postgres).

## 1. Database Migration (Neon)

Before deploying the code, ensure your database schema is up to date.
Run the following SQL in your Neon Console (SQL Editor) to add the missing tables for V2 features.

```sql
-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Access Requests Table (Required for /get-access form)
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    role VARCHAR(50),
    rpd VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ensure Facilitator Health Table exists
CREATE TABLE IF NOT EXISTS facilitator_health (
    facilitator_id TEXT PRIMARY KEY,
    tenant_id UUID,
    status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down')),
    p95_verify_ms INTEGER,
    p95_settle_ms INTEGER,
    success_rate DOUBLE PRECISION,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    raw JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ensure Bazaar Resources Table exists
CREATE TABLE IF NOT EXISTS bazaar_resources (
    resource_id TEXT PRIMARY KEY,
    source_facilitator_id TEXT,
    canonical_route_id TEXT NOT NULL,
    provider_base_url TEXT NOT NULL,
    route_path TEXT NOT NULL,
    methods TEXT[] NOT NULL,
    title TEXT,
    description TEXT,
    tags TEXT[],
    pricing JSONB,
    accepts JSONB,
    input_schema JSONB,
    output_schema JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_crawled_at TIMESTAMPTZ,
    rank_score DOUBLE PRECISION DEFAULT 0.0,
    UNIQUE(source_facilitator_id, canonical_route_id)
);
```

> **Note:** If you have already run the full `schema.sql` previously, only step 2 (Access Requests) is likely needed, but running `CREATE TABLE IF NOT EXISTS` is safe.

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

### Optional
- `RESEND_API_KEY`: (Optional) For sending email notifications.

---

## 3. Deploy Code

Push the latest changes to your `main` branch:

```bash
git add .
git commit -m "chore: prepare for v2 production launch"
git push origin main
```
crashes

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

**Launch Status: ** 🟢 READY

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
