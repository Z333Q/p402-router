# P402 Router (v2)

**The Enterprise Payment Router for AI Agents & Autonomous Commerce.**

P402 Router is a high-performance, multi-tenant gateway that enables AI agents and applications to route, verify, and settle payments across traditional and blockchain rails. It acts as a middleware layer between your services and the financial world, enforcing policies, managing budgets, and providing a unified ledger of all transactions.

![Status](https://img.shields.io/badge/Status-Production-green) ![Stack](https://img.shields.io/badge/Stack-Next.js_16_%7C_Postgres_%7C_Cloudflare-black) ![Blockchain](https://img.shields.io/badge/Blockchain-Base_L2_Verified-blue)

## 🚀 Key Features

*   **Multi-Tenant Architecture**: Automatic provisioning of isolated workspaces for every user (via Google Auth or Wallet).
*   **Trustless Settlement**:
    *   Direct on-chain verification using **Base L2** (Coinbase).
    *   Protection against MEV, Reorgs, and Front-running.
    *   No centralized custodian; funds flow directly to Tenant Treasuries.
*   **Policy Engine**:
    *   Define granular spending rules (e.g., "Max $10/day for Image Gen").
    *   Enforce "Deny Lists" and specific header requirements.
*   **Facilitator Management**:
    *   Connect custom private adapters (e.g., your own Lightning Node or Stripe account).
    *   Use global public facilitators.
*   **EIP-8004 Ready**: Schema prepared for the "Trustless Agents" standard (Identity, Reputation, Validation registries).
*   **Enterprise Observability**: Full request tracing and event logging stored in PostgreSQL.

## 🛠️ Technology Stack

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Database**: PostgreSQL 16+ (using `pg` driver)
*   **Blockchain**: [Viem](https://viem.sh/) + [Wagmi](https://wagmi.sh/) + [RainbowKit](https://www.rainbowkit.com/)
*   **Auth**: [NextAuth.js](https://next-auth.js.org/) (Google OAuth) + SIWE (Wallet Auth ready)
*   **Styling**: Tailwind CSS + Enterprise UI Kit (Swiss Design System)
*   **Deployment**: Cloudflare Pages (Edge-compatible)

## ⚡ Getting Started (Local Development)

### 1. Prerequisites
*   Node.js 20+
*   PostgreSQL Database (Local or Remote)
*   Google Cloud Console Project (for OAuth)
*   WalletConnect Project ID

### 2. Installation
```bash
git clone https://github.com/your-org/p402-router.git
cd p402-router
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:
```bash
# Database
DATABASE_URL="postgres://user:pass@localhost:5432/p402_router"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secure-random-string"
GOOGLE_CLIENT_ID="from-google-console"
GOOGLE_CLIENT_SECRET="from-google-console"

# Blockchain
NEXT_PUBLIC_RPC_URL="https://mainnet.base.org"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="from-walletconnect"
```

### 4. Database Setup
Initialize the schema and seed default data:
```bash
# Applies schema.sql and seeds initial tenant/policies
npm run seed
```

### 5. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` to access the application.

## 📦 Deployment

This project is optimized for **Cloudflare Pages**.

### Build Command
```bash
npx @cloudflare/next-on-pages
```

### Output Directory
`.vercel/output/static`

For detailed production launch instructions including blue/green deployment strategies and secret management, please refer to the internal **`DEPLOYMENT_GUIDE_SECRET.md`** (not committed to public repos).

## 🛡️ Security

*   **SSRF Protection**: Facilitator endpoints are validated against private IP ranges.
*   **Input Validation**: Strict Zod schemas for all API inputs.
*   **Role-Based Access**: Tenant isolation enforced at the API level.

## 📜 License

Copyright © 2025 Nature of Commerce LLC. All rights reserved.
Proprietary software. Unauthorized copying of this file, via any medium is strictly prohibited.
