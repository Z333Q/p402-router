# CLAUDE.md — P402 Router

> Precision-first context file. Every section here exists to eliminate re-discovery work. Read this before touching any file.

---

## What This Project Is

**P402** is a production AI payment router and agentic orchestration platform. It sits between AI agents and AI providers, handling:
- Intelligent multi-provider routing (cost / quality / speed / balanced)
- On-chain micropayment settlement via the x402 protocol (EIP-3009 gasless USDC on Base)
- Agent-to-Agent (A2A) and Agent-to-Payment (A2P) protocol over JSON-RPC 2.0
- Autonomous AI governance via Gemini 3 intelligence layer
- ERC-8004 trustless agent identity and reputation

---

## Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 15 | `output: "standalone"`, App Router |
| Language | TypeScript | 5.9.3 | `strict`, `noUncheckedIndexedAccess`, `strictNullChecks` |
| Runtime | Node.js | ≥20 | ESM (`"type": "module"`) |
| UI | React | 19.2.3 | No Pages Router |
| Styling | TailwindCSS | 3.4.3 | CSS vars design system, Neo-Brutalist |
| Web3 (frontend) | Viem | 2.42.0 | Requires explicit `account` + `chain` in `writeContract` |
| Web3 (frontend) | Wagmi | 2.5.7 | |
| Web3 (backend) | Ethers | **v6** | NOT v5 — use `ethers.Provider`, `ethers.keccak256`, `ethers.AbiCoder.defaultAbiCoder()` |
| Wallet UI | RainbowKit | 2.0.0 | |
| Database | PostgreSQL | 8.x (pg) | Neon serverless; pooled via `lib/db.ts` |
| Cache | Redis / ioredis | 5.8.2 | Semantic cache + rate limiting |
| Auth | NextAuth | 4.24.11 | |
| AI — Intelligence | @google/generative-ai | 0.24.1 | Gemini 3 Pro (economist) + Flash (sentinel) |
| AI — Routing | 13 providers | — | See `lib/ai-providers/registry.ts` |
| State | TanStack React Query | 5.25.0 | |
| Testing (unit) | Vitest | 4.0.16 | |
| Testing (e2e) | Playwright | 1.58.2 | |
| Linting | ESLint | 9.0.0 | `extends: "next"` — disabled during builds, run in dev |
| SDK (local) | @p402/sdk | file:sdk | Protocol types, mandate helpers |
| Smart contracts | Hardhat | 2.22.0 | `contracts/` excluded from tsconfig |

---

## Commands

```bash
npm run dev             # Next.js dev server
npm run build           # Production build (standalone)
npm start               # Production server
npm run lint            # ESLint
npm run seed            # Seed DB with initial data
npm test                # Vitest (watch)
npm run test:run        # Vitest (once)
npm run test:coverage   # Coverage report
npm run test:a2a        # A2A protocol integration tests
npm run test:routes     # Route integrity and API exports tests
npm run test:build      # Build smoke test
npm run test:all        # Runs all Vitest tests + build smoke test
npm run test:e2e        # Playwright E2E (all)
npm run test:e2e:smoke  # Playwright E2E smoke tests
npm run test:e2e:resilience # Playwright error resilience tests
npm run test:e2e:ui     # Playwright UI mode
```

---

## File Tree

```
p402-router/
│
├── app/                            # Next.js App Router
│   ├── _components/
│   │   └── TokenSelector.tsx
│   ├── admin/page.tsx              # Admin UI
│   ├── api/
│   │   ├── a2a/                    # ★ A2A JSON-RPC endpoint cluster
│   │   │   ├── route.ts            # Core A2A endpoint (POST — JSON-RPC dispatch)
│   │   │   ├── agents/             # Agent discovery: GET /api/a2a/agents
│   │   │   │   ├── route.ts
│   │   │   │   └── [agentId]/route.ts
│   │   │   ├── bazaar/             # Agent marketplace API
│   │   │   │   ├── route.ts
│   │   │   │   └── [listingId]/route.ts
│   │   │   ├── mandates/           # AP2 mandate issuance + use
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/use/route.ts
│   │   │   ├── orchestrate/route.ts  # Multi-agent orchestration
│   │   │   ├── stream/route.ts     # SSE streaming for A2A tasks
│   │   │   └── tasks/              # Task lifecycle CRUD
│   │   │       ├── route.ts
│   │   │       ├── [id]/route.ts
│   │   │       └── [id]/route.test.ts
│   │   ├── admin/
│   │   │   ├── health/route.ts     # Admin health check
│   │   │   ├── refresh/route.ts
│   │   │   └── stats/route.ts
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth
│   │   ├── health/route.ts         # Public health endpoint
│   │   ├── internal/
│   │   │   ├── cron/               # Background cron jobs
│   │   │   │   ├── bazaar/sync/route.ts
│   │   │   │   ├── cleanup-replay/route.ts
│   │   │   │   ├── erc8004/feedback/route.ts
│   │   │   │   ├── erc8004/reputation/route.ts
│   │   │   │   └── facilitators/health/route.ts
│   │   │   └── poll/               # Polling endpoints
│   │   ├── openapi.json/route.ts   # OpenAPI spec
│   │   ├── v1/                     # REST API v1
│   │   │   ├── access-request/     # Facilitator access requests
│   │   │   ├── admin/              # security, quarantine
│   │   │   ├── analytics/          # spend, alerts, decisions, conversion
│   │   │   ├── bazaar/             # Agent marketplace, sync, import-route
│   │   │   ├── billing/            # webhook/route.ts (Stripe), upgrade-math/route.ts
│   │   │   ├── cron/               # poll-facilitators
│   │   │   ├── discovery/          # resources
│   │   │   ├── erc8004/            # feedback, reputation, validate
│   │   │   ├── events/             # SSE event stream
│   │   │   ├── facilitator/        # ★ x402: verify, settle, supported, health, bazaar
│   │   │   ├── facilitators/       # CRUD, sync, import
│   │   │   ├── intelligence/       # anomaly, audit, code-audit, config, status
│   │   │   ├── internal/           # bazaar/sync
│   │   │   ├── policies/           # [policyId], route.ts
│   │   │   ├── receipts/           # [id], route.ts
│   │   │   ├── router/             # ★ Core routing: plan, settle, verify
│   │   │   ├── routes/             # [routeId], route.ts
│   │   │   └── user/               # link-wallet
│   │   └── v2/                     # REST API v2
│   │       ├── analytics/          # recommendations, spend
│   │       ├── cache/              # clear, stats
│   │       ├── chat/completions/   # ★ OpenAI-compatible endpoint
│   │       ├── governance/         # mandates, policies, policies/[id]
│   │       ├── models/             # model listing
│   │       ├── providers/          # list, compare
│   │       └── sessions/           # CRUD, [id], stats, fund
│   ├── bazaar/page.tsx             # Marketplace UI
│   ├── components/
│   │   ├── AccessForm.tsx
│   │   └── GoogleAnalytics.tsx
│   ├── dashboard/                  # Main dashboard (wallet-gated)
│   │   ├── _components/            # ★ Shared dashboard components
│   │   │   ├── ui.tsx              # Input, Select, Card, Stat, Button, Alert, EmptyState, ErrorState, MetricBox, ProgressBar, StatusDot, Badge, CodeBlock, TabGroup, Skeleton, LoadingBar
│   │   │   ├── SpendOverview.tsx
│   │   │   ├── CacheAnalytics.tsx
│   │   │   ├── CostIntelligence.tsx
│   │   │   ├── TrustOverview.tsx
│   │   │   ├── FeedbackIndicator.tsx
│   │   │   ├── trace.tsx           # SSE decision trace viewer
│   │   │   └── [15 more components]
│   │   ├── audit/page.tsx
│   │   ├── bazaar/page.tsx
│   │   ├── facilitators/page.tsx
│   │   ├── intelligence/page.tsx
│   │   ├── mandates/page.tsx
│   │   ├── playground/page.tsx
│   │   ├── policies/page.tsx
│   │   ├── routes/[routeId] + new/
│   │   ├── settings/page.tsx
│   │   ├── traffic/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── trust/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── docs/                       # Documentation pages
│   │   ├── a2a/, api/, bazaar/, erc8004/, facilitator/
│   │   ├── mandates/, mcp/, router/, sdk/, wdk/
│   │   └── v2-spec/P402-V2-SPEC.md
│   ├── intelligence/               # Intelligence research & strategy pages
│   │   ├── design.ts               # Design system tokens (programmatic)
│   │   └── research/               # Research articles (ap2, x402, etc.)
│   ├── globals.css                 # ★ Design system CSS variables
│   ├── onboarding/page.tsx         # Guided PLG Onboarding
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx
│   ├── pricing/page.tsx        # ★ Public Pricing (Phase 6)
│   ├── providers.tsx               # RainbowKit + QueryClient providers
│   ├── robots.ts
│   └── sitemap.ts
│
├── lib/                            # ★ Core business logic
│   ├── a2a-client.ts               # A2A protocol client (outbound)
│   ├── a2a-errors.ts               # A2A-specific error types
│   ├── a2a-middleware.ts           # Auth + rate limiting middleware for A2A
│   ├── a2a-orchestration.ts        # Multi-agent orchestration engine
│   ├── a2a-types.ts                # ★ All A2A + AP2 + x402-extension types
│   ├── actions/                    # Server Actions
│   │   ├── billing.ts, billing-finalize.ts
│   │   ├── settings.ts, mandates.ts, onboarding.ts
│   ├── ai-providers/               # AI provider adapters (13 providers)
│   │   ├── registry.ts             # Provider registry + selection logic
│   │   ├── types.ts                # Shared provider types
│   │   ├── anthropic.ts, openai.ts, google.ts, groq.ts
│   │   ├── openrouter.ts, mistral.ts, cohere.ts, deepseek.ts
│   │   └── ai21.ts, fireworks.ts, perplexity.ts, together.ts
│   ├── analytics.ts
│   ├── ap2-policy-engine.ts        # AP2 mandate verification + enforcement
│   ├── auth.ts                     # NextAuth config
│   ├── bazaar/
│   │   ├── ingest.ts               # Agent marketplace ingestion
│   │   ├── safety-scanner.ts       # Bazaar agent safety scanner
│   │   └── types.ts
│   ├── blockchain/
│   │   ├── client.ts               # Viem public client (Base mainnet)
│   │   └── eip3009.ts              # EIP-3009 on-chain verification
│   ├── blockchain.ts               # Legacy blockchain utilities
│   ├── cache/
│   │   ├── semantic-cache.ts       # Semantic similarity cache (text-embedding-004)
│   │   └── index.ts
│   ├── cache-engine.ts             # High-level cache interface
│   ├── cdp-client.ts               # ★ CDP SDK accessor — MUST use getCdpClientAsync() (dynamic import)
│   ├── cdp-server-wallet.ts        # CDP Server Wallet signing (TEE mode)
│   ├── constants.ts                # ★ All addresses, chain IDs, limits
│   ├── db/
│   │   ├── queries.ts              # Typed query helpers
│   │   └── schema-v2.sql           # Current schema reference
│   ├── db.ts                       # ★ PostgreSQL pool — default export { query, getPool, end }
│   ├── deny-codes.ts               # Deny reason codes
│   ├── env.ts                      # Runtime env validation
│   ├── erc8004/                    # ★ ERC-8004 Trustless Agents module
│   │   ├── abis.ts                 # Registry ABIs
│   │   ├── identity-client.ts      # Identity Registry client
│   │   ├── reputation-client.ts    # Reputation Registry client
│   │   ├── reputation-cache.ts     # Redis-backed reputation cache
│   │   ├── feedback-service.ts     # Feedback submission
│   │   ├── validation-client.ts    # On-chain validation
│   │   ├── validation-guard.ts     # Request guard middleware
│   │   └── types.ts
│   ├── errors.ts                   # ★ ApiError + ApiErrorCode union type
│   ├── facilitator-adapters/       # Facilitator integration adapters
│   │   ├── index.ts                # FacilitatorAdapter interface
│   │   ├── cdp.ts                  # Coinbase CDP
│   │   ├── ccip.ts                 # Chainlink CCIP bridge
│   │   ├── smart-contract.ts       # Smart contract adapter
│   │   └── generic.ts              # Generic HTTP facilitator
│   ├── hooks/                      # React hooks (lib-level)
│   │   ├── use-p402.ts
│   │   ├── usePayment.ts
│   │   └── useSecurityMonitoring.ts
│   ├── intelligence/               # Gemini 3 intelligence layer
│   │   ├── gemini-optimizer.ts     # Protocol Economist (Gemini 3 Pro)
│   │   ├── anomaly-detection.ts    # Real-time Sentinel (Gemini 3 Flash)
│   │   ├── optimization.ts         # Optimization strategies
│   │   └── api-helpers.ts
│   ├── notifications.ts
│   ├── policy-engine.ts            # Spending policy evaluation
│   ├── providers/openrouter/
│   │   └── billing-guard.ts        # OpenRouter billing protection
│   ├── push-service.ts             # Push notification service
│   ├── redis.ts                    # Redis client (ioredis)
│   ├── replay-protection.ts        # EIP-3009 nonce replay prevention
│   ├── router-engine.ts            # ★ Core routing engine
│   ├── schemas/
│   │   ├── p402.ts                 # Zod schemas for p402 types
│   │   └── capability-manifest.v1_0_0.ts
│   ├── security/
│   │   ├── environment-validator.ts
│   │   ├── multisig.ts
│   │   └── rate-limiter.ts
│   ├── service-proofs.ts           # Service proof generation/verification
│   ├── services/
│   │   ├── router-service.ts       # Routing service layer
│   │   └── settlement-service.ts   # Settlement service layer
│   ├── tokens.ts                   # Token config (USDC, etc.)
│   ├── trace/decision-trace.ts     # SSE decision trace streaming
│   ├── types/
│   │   ├── api.ts                  # Shared API types
│   │   └── next-auth.d.ts          # NextAuth type augmentation
│   ├── utils.ts
│   ├── viem.ts                     # Viem client setup
│   ├── wagmi.ts                    # Wagmi config
│   └── x402/                       # ★ x402 Payment Protocol implementation
│       ├── verify.ts               # Parse + verify x402 payments
│       ├── eip3009.ts              # EIP-712 domain + type hashes
│       ├── facilitator-wallet.ts   # Facilitator signing wallet
│       └── security-checks.ts     # Gas limits, expiry, amount checks
│
├── hooks/                          # Root React hooks (dashboard-facing)
│   ├── useAnalytics.ts
│   ├── useBazaar.ts
│   ├── useDashboardStats.ts
│   ├── useFacilitators.ts
│   ├── usePolicies.ts
│   ├── useSettlement.ts
│   ├── useTraffic.ts
│   ├── useUpgradeMath.ts
│   ├── useWallet.ts
│   └── useWalletSync.ts
│
├── components/                     # Shared legacy components
│   ├── auth/
│   │   └── CDPEmailAuth.tsx        # ★ Email OTP login via CDP Embedded Wallet
│   ├── TopNav.tsx
│   ├── NavConnectButton.tsx
│   ├── WalletSync.tsx
│   ├── common/, intelligence/, landing/, layout/
│
├── sdk/                            # @p402/sdk — local package
│   ├── src/
│   │   ├── index.ts                # Public API
│   │   ├── types.ts                # Core protocol types
│   │   └── mandate.ts              # Mandate helpers
│   └── package.json
│
├── scripts/                        # Utility scripts (excluded from tsconfig)
│   ├── seed.ts
│   ├── apply-schema.ts
│   ├── register-erc8004.ts         # ERC-8004 registration (run: npx tsx)
│   ├── deploy-settlement.ts        # Legacy: P402Settlement only
│   ├── deploy-contracts.ts         # ★ Deploy both contracts (Viem, Base mainnet)
│   └── migrations/                 # SQL migration files (run in order)
│       ├── 002_openrouter_integration.sql
│       ├── 003_replay_protection.sql
│       ├── 003_semantic_cache_setup.sql
│       ├── 004_traffic_events.sql
│       ├── 005_erc8004_trustless_agents.sql
│       ├── 006_safety_quarantine.sql
│       ├── a2a_001_task_model.sql
│       ├── a2a_003_x402_payments.sql
│       ├── v2_001_initial_schema.sql
│       ├── v2_009_trust_packaging.sql
│       ├── v2_010_developer_settings.sql
│       ├── v2_011_stripe_integration.sql
│       ├── v2_012_webhook_idempotency.sql
│       ├── v2_013_drop_tenant_plan.sql
│       ├── v2_014_access_requests.sql  # ★ access_requests table (beta signup)
│       └── v2_015_cdp_wallets.sql      # ★ CDP wallet registry + agent_sessions columns
│
├── artifacts/                      # Compiled contract artifacts
├── cloudflare-facilitator/         # ★ SEPARATE PROJECT — excluded from tsconfig
│   ├── src/config.ts, eip3009.ts, verification.ts
│   └── wrangler.toml
│
├── contracts/                      # Solidity (excluded from tsconfig)
│   ├── P402Settlement.sol          # Marketplace settlement with 1% fee
│   └── SubscriptionFacilitator.sol # EIP-2612 recurring billing (deployed: 0xc647...)
├── tests/e2e/                      # Playwright specs
│   ├── helpers/web3-mock.ts        # EIP-2612 mock
│   ├── smoke.spec.ts
│   ├── functional.spec.ts
│   ├── error-resilience.spec.ts
│   ├── audit-plg-funnel.spec.ts    # SSE Mocking
│   └── wallet-billing.spec.ts      # Wallet Flow
├── public/
│   ├── openapi.yaml
│   ├── llms.txt
│   └── whitepaper.pdf
│
├── CLAUDE.md                       # This file
├── DEVELOPER_GUIDE.md
├── DEPLOYMENT.md
├── WHITEPAPER_V3.md
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

---

## TypeScript Conventions

### Strict Mode — Non-negotiable
- `strict: true`, `noUncheckedIndexedAccess: true`, `strictNullChecks: true`
- Array/object index access always returns `T | undefined` — always guard before use
- No `any` unless explicitly typed as `unknown` first

### Import Patterns
```typescript
// DB — DEFAULT export
import db from '@/lib/db';
await db.query('SELECT ...', []);

// Errors — named export
import { ApiError, ApiErrorCode } from '@/lib/errors';

// A2A types — named exports
import type { A2ATask, AP2Mandate, X402Message } from '@/lib/a2a-types';
```

### Error Handling
```typescript
// ApiErrorCode is a strict union — add new codes to lib/errors.ts first
throw new ApiError({
  code: 'INVALID_INPUT',     // Must be in ApiErrorCode union
  status: 400,
  message: 'Human-readable message',
  requestId: crypto.randomUUID(),
});
```

### Ethers v6 (backend blockchain)
```typescript
import { ethers } from 'ethers';
// v6 API (NOT v5):
ethers.keccak256(data)                        // was utils.keccak256
ethers.AbiCoder.defaultAbiCoder()             // was defaultAbiCoder
ethers.Provider                               // was providers.Provider
new ethers.JsonRpcProvider(url)               // was providers.JsonRpcProvider
ethers.getBytes(hex)                          // was utils.arrayify
ethers.hexlify(bytes)                         // unchanged
ethers.recoverAddress(digest, sig)            // was utils.recoverAddress
```

### Viem (frontend blockchain)
```typescript
import { writeContract } from 'wagmi/actions';
// v2.42+ requires explicit account + chain:
await writeContract(config, {
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'transfer',
  args: [...],
  account: address,   // REQUIRED
  chain: base,        // REQUIRED
});
```

### Dashboard Custom Components
`app/dashboard/_components/ui.tsx` exports custom `Input` and `Select`:
```typescript
// onChange takes a string VALUE, not a React event:
<Input onChange={(value: string) => setField(value)} />
<Select onChange={(value: string) => setField(value)} />
```

---

## Design System

**Neo-Brutalist** — all rules live in `app/globals.css`.

| Token | Value |
|---|---|
| `--primary` | `#B6FF2E` (acid green) |
| `--primary-hover` | `#A0E626` |
| `--neutral-900` | `#000000` |
| `--neutral-800` | `#141414` |
| `--neutral-700` | `#2B2B2B` |
| `--neutral-400` | `#A8A8A8` |
| `--neutral-300` | `#CFCFCF` |
| `--neutral-50` | `#FFFFFF` |
| `--success` | `#22C55E` |
| `--warning` | `#F59E0B` |
| `--error` | `#EF4444` |
| `--info` | `#22D3EE` |
| `--border-width` | `2px` |
| `--radius` | `0px` (zero border radius — enforced globally via `*::before/after`) |

**Fonts:** `--font-ui` (IBM Plex Sans via CSS var), `--font-mono` (JetBrains Mono).

**Class utilities:**
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-dark` — buttons
- `.card` — 2px black border, no shadow, no radius
- `.badge`, `.badge-primary` — uppercase labels
- `.section-header` — bold, 2px bottom border
- `.page-title` — 36px uppercase
- `.pane` — responsive 1-col (mobile) → 2-col (≥1024px) grid
- `.code-block` — dark background mono code block

**Rule:** Never use `rounded-*` classes. Never use `shadow-*` classes. Zero border-radius is a hard constraint.

---

## x402 Protocol

x402 is a machine-native payment protocol. HTTP 402 "Payment Required" becomes a first-class response with a signed authorization that can be verified and settled on-chain without gas from the user.

### Concepts
- **Scheme `exact`**: Client signs an EIP-3009 `TransferWithAuthorization`. Facilitator executes the transfer and pays gas.
- **Scheme `onchain`**: Client submits tx themselves; facilitator verifies.
- **Scheme `receipt`**: Reuse a prior payment receipt for repeat access.
- **Facilitator**: A trusted service that verifies signatures and executes on-chain settlement.
- **PaymentPayload**: The signed authorization submitted by the client.
- **PaymentRequirements**: What the resource server demands (amount, asset, recipient).

### Wire Format
```typescript
// x402 standard wire format — used by verify + settle endpoints
interface X402Request {
  paymentPayload: {
    x402Version: 2;
    scheme: "exact";
    network: "eip155:8453";          // CAIP-2 Base Mainnet
    payload: {
      signature: string;             // EIP-712 signature (65 bytes hex)
      authorization: {
        from: string;                // Payer address
        to: string;                  // Treasury (payee)
        value: string;               // Amount in atomic units (USDC = 6 decimals)
        validAfter: string;          // Unix timestamp
        validBefore: string;         // Unix timestamp
        nonce: string;               // bytes32 — used once, replay-protected
      };
    };
  };
  paymentRequirements: {
    scheme: "exact";
    network: "eip155:8453";
    maxAmountRequired: string;
    resource: string;                // URL of the paid resource
    description: string;
    payTo: string;                   // Treasury address
    asset: string;                   // USDC contract address
  };
}
```

### Key Addresses (Production — Base Mainnet)
```
Network:                 Base (Chain ID: 8453, CAIP-2: eip155:8453)
USDC:                    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Treasury:                0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6
P402Settlement:          0xd03c7ab9a84d86dbc171367168317d6ebe408601
SubscriptionFacilitator: 0xc64747651e977464af5bce98895ca6018a3e26d7
```

### EIP-712 Domain (USDC on Base)
```typescript
const domain = {
  name: 'USD Coin',
  version: '2',
  chainId: 8453,
  verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
};
const types = {
  TransferWithAuthorization: [
    { name: 'from',        type: 'address' },
    { name: 'to',          type: 'address' },
    { name: 'value',       type: 'uint256' },
    { name: 'validAfter',  type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce',       type: 'bytes32' }
  ]
};
```

### Settlement Flow
```
Client → signs EIP-3009 authorization
      → POST /api/v1/facilitator/verify (check amount, sig, nonce)
      → POST /api/v1/facilitator/settle (execute on-chain transfer)
Facilitator → executes transferWithAuthorization on USDC contract
            → pays gas (EIP-3009 is gasless for the user)
            → returns { success, transaction: txHash, network, payer }
```

### Security Rules
- **Gas limit**: Rejects settlements if Base gas > configured limit (default 50 gwei)
- **Expiry**: `validBefore` must be in the future at settlement time
- **Minimum**: $0.01 USDC
- **Replay protection**: Each `nonce` is recorded; reuse returns `REPLAY_DETECTED`
- **Amount match**: `value` in authorization must match `maxAmountRequired`

### Implementation Files
- `lib/x402/verify.ts` — parse + verify payloads
- `lib/x402/eip3009.ts` — EIP-712 domain + type hashes
- `lib/x402/facilitator-wallet.ts` — signing wallet for gas execution
- `lib/x402/security-checks.ts` — gas, expiry, amount validation
- `lib/replay-protection.ts` — nonce tracking (DB + Redis)
- `app/api/v1/facilitator/verify/route.ts`
- `app/api/v1/facilitator/settle/route.ts`

### USDC Subscription Billing (EIP-2612)

Separate from x402 micropayments. Uses the deployed `SubscriptionFacilitator` contract.

| Step | Function | Called by |
|---|---|---|
| Month 1 | `executeFirstSubscriptionCharge()` | `lib/actions/billing-finalize.ts` Server Action |
| Month 2+ | `executeRecurringCharge()` | `app/api/internal/cron/billing/reconcile/route.ts` |

- Both functions live in `lib/billing/providers/onchain.ts`
- Month 1 sets the EIP-2612 permit allowance; months 2+ draw from it (no new user signature)
- `getFunction('methodName')` pattern required for ethers v6 `noUncheckedIndexedAccess`

---

## A2A / A2P Protocol

### A2A — Agent-to-Agent (Google A2A spec, JSON-RPC 2.0)

P402 implements the A2A protocol for agent communication. Agents communicate via structured tasks over JSON-RPC 2.0.

#### Concepts
- **AgentCard**: Metadata manifest served at `/.well-known/agent.json` — describes capabilities, skills, endpoints, extensions
- **Task**: Unit of work with state machine: `pending → processing → completed | failed | cancelled`
- **Artifact**: Output produced by a task (structured data parts)
- **Part**: Content unit — `{ type: 'text', text: '...' }` or `{ type: 'data', data: any }`
- **Streaming**: SSE-based real-time task updates via `/api/a2a/stream`
- **Skills**: Declared agent capabilities (`{ id, name, description, tags[] }`)
- **Extensions**: Protocol extensions URIs (e.g., x402 payment extension)

#### Task Lifecycle
```typescript
type A2ATaskState = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface A2ATask {
  id: string;
  contextId?: string;                    // Conversation context grouping
  status: {
    state: A2ATaskState;
    message?: A2AMessage;
    timestamp: string;                   // ISO 8601
  };
  artifacts?: A2ATaskArtifact[];         // Outputs
  metadata?: {
    cost_usd?: number;
    latency_ms?: number;
    [key: string]: any;
  };
}
```

#### JSON-RPC Methods
| Method | Description |
|---|---|
| `tasks/send` | Submit a new task |
| `tasks/get` | Retrieve task by ID |
| `tasks/cancel` | Cancel an in-progress task |
| `tasks/sendSubscribe` | Submit + subscribe to SSE updates |

#### AgentCard Structure
```typescript
interface AgentCard {
  protocolVersion: string;
  name: string;
  description: string;
  url: string;
  capabilities?: { streaming?: boolean; pushNotifications?: boolean };
  skills?: Skill[];
  extensions?: Extension[];             // e.g., x402 payment extension
  endpoints?: {
    a2a?: { jsonrpc?: string; stream?: string };
  };
}
```

#### x402 Extension in A2A
When an agent requires payment, it uses the x402 extension URI:
```typescript
const X402_EXTENSION_URI = 'tag:x402.org,2025:x402-payment';

// Payment flow via A2A messages:
// 1. Agent sends: { type: 'payment-required', data: X402PaymentRequired }
// 2. Client sends: { type: 'payment-submitted', data: X402PaymentSubmitted }
// 3. Agent sends: { type: 'payment-completed', data: X402PaymentCompleted }
```

#### Key Files
- `lib/a2a-types.ts` — all type definitions
- `lib/a2a-client.ts` — outbound A2A client
- `lib/a2a-orchestration.ts` — multi-agent orchestration
- `lib/a2a-middleware.ts` — auth + rate limiting
- `lib/a2a-errors.ts` — A2A error types
- `app/api/a2a/route.ts` — JSON-RPC dispatch
- `app/api/a2a/tasks/route.ts` — task CRUD
- `app/api/a2a/stream/route.ts` — SSE streaming

### A2P — Agent-to-Payment (AP2 Mandates)

AP2 mandates are user-signed spending authorizations that let AI agents spend on behalf of users within defined constraints. This is the governance layer on top of x402.

#### Concepts
- **Mandate**: A signed authorization from a user (`user_did`) to an agent (`agent_did`) with spending constraints
- **MandateType**: `'intent'` (planned) | `'cart'` (cart payment) | `'payment'` (direct payment)
- **Constraints**: `max_amount_usd`, `allowed_categories[]`, `valid_until`
- **Budget tracking**: `amount_spent_usd` accumulates; exceeding budget → `MANDATE_BUDGET_EXCEEDED`

#### Mandate Lifecycle
```typescript
interface AP2Mandate {
  id: string;
  tenant_id: string;
  type: 'intent' | 'cart' | 'payment';
  user_did: string;
  agent_did: string;
  constraints: {
    max_amount_usd: number;
    allowed_categories?: string[];
    valid_until?: string;             // ISO 8601
  };
  signature?: string;
  public_key?: string;
  amount_spent_usd: number;          // Accumulates with each use
  status: 'active' | 'exhausted' | 'expired' | 'revoked';
}
```

#### Mandate Validation (in `lib/ap2-policy-engine.ts`)
Checks in order:
1. Mandate exists and status is `'active'`
2. Not expired (`valid_until` not past)
3. Budget not exceeded (`amount_spent_usd + requested <= max_amount_usd`)
4. Category is in `allowed_categories` (if set)
5. Signature valid (if `public_key` provided)

#### Error Codes for AP2
`MANDATE_NOT_FOUND` | `MANDATE_INACTIVE` | `MANDATE_EXPIRED` | `MANDATE_BUDGET_EXCEEDED` | `MANDATE_CATEGORY_DENIED` | `MANDATE_SIGNATURE_INVALID`

#### Key Files
- `lib/ap2-policy-engine.ts` — mandate validation engine
- `app/api/a2a/mandates/route.ts` — mandate issuance
- `app/api/a2a/mandates/[id]/use/route.ts` — mandate usage + budget tracking

---

## Routing Engine

**File:** `lib/router-engine.ts`

### Routing Modes
```typescript
type RoutingMode = 'cost' | 'quality' | 'speed' | 'balanced';
```

### Scoring Logic
Each facilitator candidate gets a score based on:
- `success_rate` — historical reliability
- `p95_settle_ms` — latency (speed mode prioritizes this)
- `reputation_score` — ERC-8004 on-chain reputation
- `health_status` — current health probe (`healthy` > `degraded` > `down`)
- Provider cost per token (cost mode)

### Semantic Cache
Before routing, `SemanticCache` checks if semantically similar request was recently served. Uses `text-embedding-004` to compute cosine similarity. Cache hit → skip LLM + settlement entirely.

### Intelligence Overlay
`GeminiOptimizer` (Protocol Economist) analyzes routing decisions asynchronously and logs recommendations to `intelligence_decisions` table.

---

## Intelligence Layer

**Models:**
- `gemini-2.0-flash` (Sentinel) — real-time anomaly detection, fast
- `gemini-2.0-pro` (Economist) — deep ledger analysis, async

**Feature flags (env):**
- `ENABLE_COST_INTELLIGENCE=true`
- `ENABLE_SEMANTIC_CACHE=true`

**Files:**
- `lib/intelligence/gemini-optimizer.ts` — Protocol Economist
- `lib/intelligence/anomaly-detection.ts` — Sentinel
- `lib/intelligence/optimization.ts` — optimization strategies
- `app/api/v1/intelligence/` — REST endpoints

---

## ERC-8004 Trustless Agents

### Addresses
| | Mainnet (Base) | Testnet |
|---|---|---|
| Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

### Feature Flags
```
ERC8004_ENABLE_REPUTATION=false   # Enable on-chain reputation scoring
ERC8004_ENABLE_VALIDATION=false   # Enable validation guard on A2A routes
ERC8004_TESTNET=false             # Use testnet registry addresses
ERC8004_AGENT_ID=                 # This agent's registered DID
ERC8004_AGENT_URI=https://p402.io/.well-known/erc8004.json
```

### DB Migration
`scripts/migrations/005_erc8004_trustless_agents.sql`

### Registration
```bash
npx tsx scripts/register-erc8004.ts
```

---

## Database

### Connection
`lib/db.ts` — **default export** (not named export):
```typescript
import db from '@/lib/db';
const result = await db.query('SELECT * FROM facilitators WHERE status = $1', ['active']);
```
Pool: max 20 connections, idle timeout 30s, connection timeout 2s.

### Key Tables
| Table | Purpose |
|---|---|
| `facilitators` | Registered payment facilitators |
| `facilitator_health` | Health check history |
| `a2a_tasks` | A2A task records |
| `x402_payments` | Payment records |
| `replay_protection` | EIP-3009 nonce tracking |
| `semantic_cache` | Vector-based response cache |
| `intelligence_decisions` | Gemini optimization log |
| `intelligence_anomalies` | Sentinel anomaly log |
| `ap2_mandates` | AP2 spending mandates |
| `traffic_events` | Request/response event log |
| `bazaar_listings` | Agent marketplace listings |
| `erc8004_agents` | Registered trustless agents |
| `api_keys` | Developer API keys (SHA-256 hashed) |
| `tenant_settings` | Webhook URLs and secrets |
| `access_requests` | Beta signup form submissions |
| `cdp_wallet_registry` | Audit log of CDP-managed wallet provisioning |

### Running Migrations
```bash
# Apply schema.sql first (base tables: tenants, policies, routes, facilitators)
psql $DATABASE_URL -f scripts/migrations/schema.sql
# Then apply numbered migrations in order through v2_015
# See DEPLOYMENT.md §1 for the full ordered list
```

---

## API Reference

### Core Routing
```
POST /api/v1/router/plan   — Dry-run: returns routing plan without settling
POST /api/v1/router/settle — Route + settle payment
GET  /api/v1/router/verify — Verify a routing decision
```

### x402 Settlement
```
POST /api/v1/facilitator/verify  — Verify x402 paymentPayload
POST /api/v1/facilitator/settle  — Execute EIP-3009 transfer
GET  /api/v1/facilitator/health  — Facilitator health
GET  /api/v1/facilitator/supported — Supported tokens/networks
GET  /api/v1/billing/upgrade-math — Personalized savings math
```

### A2A Protocol
```
POST /api/a2a                         — JSON-RPC 2.0 dispatch
GET  /api/a2a/agents                  — List registered agents
GET  /api/a2a/agents/:agentId         — Get AgentCard
GET  /.well-known/agent.json          — P402's own AgentCard
POST /api/a2a/tasks                   — Create task
GET  /api/a2a/tasks/:id               — Get task
GET  /api/a2a/stream                  — SSE task stream
POST /api/a2a/orchestrate             — Multi-agent orchestration
POST /api/a2a/mandates                — Issue AP2 mandate
POST /api/a2a/mandates/:id/use        — Use mandate budget
```

### OpenAI-Compatible
```
POST /api/v2/chat/completions   — OpenAI-compatible, routes to cheapest/best provider
GET  /api/v2/models             — List available models
```

### Intelligence
```
GET  /api/v1/intelligence/status    — Intelligence layer status
GET  /api/v1/intelligence/config    — Intelligence config
POST /api/v1/intelligence/anomaly   — Trigger anomaly analysis
POST /api/v1/intelligence/audit     — Protocol economics audit
POST /api/v1/intelligence/code-audit — Codebase security audit
```

### Admin Operations (API V1)
```
GET  /api/v1/admin/security         — Admin security status
POST /api/v1/admin/security         — Emergency actions (pause, ban)
GET  /api/v1/admin/quarantine       — Review flagged sessions
```

### AI Analytics (API V2)
```
GET  /api/v2/analytics/spend        — Detailed spend analytics
GET  /api/v2/analytics/recommendations — AI cost optimization
```

### Sessions & Funding (API V2)
```
GET  /api/v2/sessions               — List active sessions
POST /api/v2/sessions/fund          — Allocate funds to a session
GET  /api/v2/sessions/[id]/stats    — Real-time session metrics
```

---

## Environment Variables

```bash
# ── Auth (Required) ───────────────────────────────────────────────────────────
DATABASE_URL=postgresql://...           # Neon PostgreSQL
NEXTAUTH_SECRET=                        # NextAuth session signing (32+ chars)
NEXTAUTH_URL=https://p402.io           # Canonical URL
GOOGLE_CLIENT_ID=                       # Google OAuth client ID
GOOGLE_CLIENT_SECRET=                   # Google OAuth client secret
JWT_SECRET=                             # API JWT signing

# ── Stripe Billing (Required for subscription) ────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...           # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...         # Stripe webhook signing secret
STRIPE_PRICE_ID_PRO=price_...          # Pro plan price ID
STRIPE_PRICE_ID_ENTERPRISE=price_...   # Enterprise plan price ID

# ── AI Orchestration (Primary) ────────────────────────────────────────────────
OPENROUTER_API_KEY=                     # Main access for all LLMs (Required for routing)
GOOGLE_API_KEY=                         # Required for Gemini intelligence layer

# ── Direct Providers (Optional, bypass OpenRouter) ────────────────────────────
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# ── x402 Settlement ───────────────────────────────────────────────────────────
P402_SIGNER_ADDRESS=0x...              # Facilitator wallet address
P402_FACILITATOR_PRIVATE_KEY=0x...     # Facilitator wallet key
P402_TREASURY_ADDRESS=0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6  # Deployed treasury
P402_SETTLEMENT_ADDRESS=0xd03c7ab9a84d86dbc171367168317d6ebe408601
SUBSCRIPTION_FACILITATOR_ADDRESS=0xc64747651e977464af5bce98895ca6018a3e26d7

# ── Admin ─────────────────────────────────────────────────────────────────────
ADMIN_EMAILS=admin@p402.io             # Comma-separated admin emails
CRON_SECRET=                            # Shared secret for cron routes
POLL_SECRET=                            # Shared secret for poll routes

# ── Notifications ─────────────────────────────────────────────────────────────
RESEND_API_KEY=                         # Resend email API key

# ── Optional ──────────────────────────────────────────────────────────────────
REDIS_URL=                              # Defaults to no caching
BASE_RPC_URL=https://mainnet.base.org  # Base RPC endpoint
ENABLE_SEMANTIC_CACHE=true
ENABLE_COST_INTELLIGENCE=true
CORS_ORIGINS=https://p402.io,...

# ── ERC-8004 (all optional, default disabled) ─────────────────────────────────
ERC8004_AGENT_ID=
ERC8004_AGENT_URI=
ERC8004_TESTNET=false
ERC8004_ENABLE_REPUTATION=false
ERC8004_ENABLE_VALIDATION=false
```

---

## Testing

```bash
# Unit tests (lib/)
npm run test:run

# Specific test file
npx vitest run lib/__tests__/router-engine.test.ts

# Integration tests
npm run test:routes

# E2E
npm run test:e2e:smoke

# Coverage
npm run test:coverage
```

**Patterns:**
- Unit tests: `lib/__tests__/*.test.ts`
- Route tests: `app/api/**/*.route.test.ts`
- E2E: `tests/e2e/*.spec.ts`
- No mocking DB in unit tests — use test fixtures
- A2A protocol tests: `scripts/test-a2a.ts` (runs against live server)

- **Authentication Mocking**: When testing API routes that use `requireTenantAccess(req)`, use the global mock established in `__tests__/setup.ts`. This mock simulates the database query expected by legacy tests while avoiding Next.js request-scope errors (`headers()`/`cookies()`).
- **Build Smoke Tests**: `npm run test:build` executes a full Next.js production build. This test has a high timeout (5m) and is excluded from default `vitest` runs but included in `npm run test:all`.

### Playwright E2E Conventions

- **Web3 Wallet Mocking**: E2E tests run in a headless environment without browser extensions. When testing wallet-gated features (like the Dashboard or RainbowKit connections), simulate wallet sessions by directly setting the NextAuth session cookie or using a mock Web3 provider injected via Playwright's `page.addInitScript()`. (See `tests/e2e/helpers/web3-mock.ts` for overriding `eth_signTypedData_v4` for EIP-2612 Permits).
- **Server-Sent Events (SSE)**: For testing PLG funnels or live traces, mock the SSE `ReadableStream` directly using Playwright's `route.fulfill` to prevent flakiness and timeouts.
- **API Interception (AI Providers)**: To avoid flaky tests and unnecessary API costs during CI, mock external LLM calls (Gemini, OpenRouter, etc.) via `page.route()`, except when specifically validating API fallbacks (e.g., in `error-resilience.spec.ts`).
- **Test Environments**: Always run tests against an isolated environment. Ensure your testing database URL is set properly so that the live Neon DB and real on-chain assets are completely untouched.

---

## CDP ↔ AP2 ↔ ERC-8004 Wiring

Three governance layers are now wired together at two integration points:

### Session creation (`app/api/v2/sessions/route.ts`)
When `wallet_source === 'cdp'` AND `agent_id` is provided:
1. **AP2 mandate auto-issued** — inserts into `ap2_mandates` with `type: 'payment'`, `user_did: did:p402:tenant:{tenantId}`, `agent_did: did:p402:agent:{agent_id}`, `max_amount_usd = budget_usd`, `valid_until = expiresAt`. Mandate ID stored as `ap2_mandate_id` in `policies` JSONB on `agent_sessions`.
2. **ERC-8004 wallet link** — if `ERC8004_ENABLE_VALIDATION=true` and `agent_id` is numeric, fires `setAgentWalletOnChain()` as fire-and-forget dynamic import. Never blocks session creation.

### Auto-pay (`app/api/v1/router/auto-pay/route.ts`)
Session query expanded to fetch `policies` and `agent_id` (uses `session_token` column, not `id`).

Pre-settlement: if `ap2_mandate_id` in `session.policies`, calls `AP2PolicyEngine.verifyMandate()` → 403 on failure. Sessions without a mandate skip check (backwards compatible).

Post-settlement (non-blocking): `recordUsage()`, `budget_spent_usd` increment, `queueFeedback()`.

E2E tests: `tests/e2e/cdp-ap2-erc8004-wiring.spec.ts`

---

## Critical Gotchas

1. **`lib/db.ts` is a default export** — `import db from '@/lib/db'` not `import { db }`
2. **Ethers v6 only** — v5 APIs will throw at runtime
3. **`ApiErrorCode` is a union type** — new error codes must be added to `lib/errors.ts` first
4. **Dashboard `Input`/`Select`** — `onChange` receives `string` value, not a React `ChangeEvent`
5. **`cloudflare-facilitator/`** — separate project, excluded from tsconfig, do not import from it
6. **`scripts/`** — excluded from tsconfig; use `npx tsx` to run scripts
7. **`noUncheckedIndexedAccess`** — `arr[0]` is `T | undefined`, always guard
8. **Viem `writeContract`** — must pass explicit `account` and `chain` in v2.42+
9. **ESLint** — disabled during `npm run build` but lint errors still matter; run `npm run lint` before committing
10. **Tailwind colors** — use CSS variable names (`text-primary`, `bg-neutral-900`) not hardcoded hex
11. **Zero border radius** — `rounded-*` classes are overridden globally; don't fight it
12. **Redis optional/Security** — code must degrade gracefully when `REDIS_URL` is not set (check `lib/redis.ts`), **UNTIL** it hits critical security guards (like `BillingGuard`) which must fail-close/propagate errors to prevent unauthorized spending.
13. **Dashboard vs API Auth** — `/api/v2/*` routes (protected by `middleware.ts`) require an API-style session (`x-p402-session`). Dashboard UI routes (`/dashboard/*`) use standard cookie-based authentication via `app/dashboard/layout.tsx`. Do **NOT** add `/dashboard` to `PROTECTED_API_PATHS` in `middleware.ts`.
14. **Webhook Security**: Next.js 15 automatically parses JSON, breaking Stripe signatures. The webhook route MUST use `await req.text()` and `export const dynamic = 'force-dynamic'`.
15. **A2A JSON-RPC Errors**: If an agent hits a billing cap, DO NOT throw an HTTP 402. Map the error via `lib/a2a-errors.ts` to a JSON-RPC `-32000` block error so the orchestrator does not crash.
16. **API Keys API**: Raw API keys (`p402_live_...`) are generated via `crypto.randomBytes` and returned EXACTLY ONCE by the Server Action. Only the SHA-256 hash is stored.
17. **Idempotency**: All billing events and audit findings use `INSERT ... ON CONFLICT` constraints to prevent database bloat and double-charging during transient network retries.
18. **`@coinbase/cdp-sdk` — dynamic import only**: Never `import { CdpClient } from '@coinbase/cdp-sdk'` at module top-level. It loads `@solana/kit` (ESM-only, broken named exports) which crashes the Next.js build at page-data-collection time. Always use `await getCdpClientAsync()` from `lib/cdp-client.ts`.
19. **CDP Server Wallet API**: Policy creation is `cdp.policies.createPolicy(...)` — NOT `cdp.createPolicy(...)`. Required body shape: `{ policy: { scope: 'account', rules: [{ action: 'reject', operation: 'signEvmTransaction', criteria: [...] }] } }`.
20. **CDP test mocks**: Mock `@/lib/cdp-client` (not the raw `@coinbase/cdp-sdk`) so tests never trigger the dynamic import or `@solana/kit`. The mock must export `isCdpEnabled`, `getCdpClientAsync`, `getCdpClient`, `_resetCdpClient`.

---

## Style Guide Reference

The design system is defined in `app/globals.css` (CSS custom properties) and `app/intelligence/design.ts` (programmatic tokens). Always refer to CSS variables rather than hardcoded values.

**Tailwind color mapping** (from `tailwind.config.ts`):
```
primary         → var(--primary)         #B6FF2E
primary-hover   → var(--primary-hover)   #A0E626
neutral-900     → var(--neutral-900)     #000000
neutral-800     → var(--neutral-800)     #141414
neutral-700     → var(--neutral-700)     #2B2B2B
neutral-400     → var(--neutral-400)     #A8A8A8
neutral-300     → var(--neutral-300)     #CFCFCF
neutral-50      → var(--neutral-50)      #FFFFFF
success         → var(--success)         #22C55E
error           → var(--error)           #EF4444
warn            → var(--warning)         #F59E0B
info            → var(--info)            #22D3EE
cache           → var(--cache)           (semantic cache hits)
```

**Typography:**
- UI font: IBM Plex Sans (via `--font-ui`)
- Mono font: JetBrains Mono (via `--font-mono`)
- Bold headings: `font-weight: 700`, `letter-spacing: -0.02em`
- Buttons: uppercase, `font-weight: 800`

---

## React & Next.js Core Patterns

1. **Server vs. Client Components**: Default to Server Components for layout and data-heavy views. Only use `'use client'` at the leaf nodes where interactivity (browser APIs, hooks, React context) or Web3 provider access is strictly required.
2. **Data Fetching (React Query)**: 
   - Manage asynchronous server state with TanStack React Query (`@tanstack/react-query`). 
   - Encapsulate query logic inside custom hooks (e.g., `hooks/useFacilitators.ts`).
   - Use declarative cache invalidation instead of manual state synchronization.
3. **Wallet Authentication**: Identity mapping happens between RainbowKit and NextAuth. Always rely on `useWalletSync.ts` to ensure the active wallet matches the authenticated Next.js session.

---

## Analytics & Observability

- **Event Tracking**: All critical user actions, LLM expenditures, and routing decisions should invoke `lib/analytics.ts`. On the client, use `hooks/useAnalytics.ts`.
- **SSE Tracing**: When adding new agentic behaviors or routing heuristics, emit rich telemetry via Server-Sent Events (SSE). The `trace.tsx` component depends on this for visualizing AI decisions in real-time.

---

## Deployment & CI/CD Workflow

- **Vercel Builds**: `eslint` is bypassed during production builds (`ignoreDuringBuilds: true`), meaning failing locally is your only defense against regressions. **Always** run `npm run lint` and `npm run test:run` before pushing to `main`.
- **Database Migrations**: Add linear scripts to `scripts/migrations/` and apply them sequentially when altering the DB schema. Update `lib/db/schema-v2.sql` to reflect the latest state.

---

## P402 Skill

This project ships with a Claude Skill at `.claude/skills/p402/` that provides comprehensive P402 API knowledge. The skill loads automatically when you open this repo in Claude Code.

### When to Use the Skill

The skill triggers for questions about:
- Routing modes (cost, speed, quality, balanced) and custom weights
- Billing Guard limits and error codes
- Session lifecycle (create, fund, use, expire)
- Chat completions API with P402 extensions
- x402 payment settlement (EIP-3009, onchain, receipt)
- A2A protocol (JSON-RPC, AP2 mandates, Bazaar)
- Provider comparison and cost optimization
- Migration from direct OpenAI/Anthropic calls

### Maintaining the Skill

The skill source lives in `.claude/skills/p402/`. When updating:
1. Edit the files in `.claude/skills/p402/`
2. Run `./scripts/build-skill.sh` to regenerate downloads and llms-full.txt
3. Commit both the source and the built artifacts

### Key Files

- `.claude/skills/p402/SKILL.md` - Core skill (keep under 500 lines)
- `.claude/skills/p402/references/` - Deep-dive reference files
- `public/llms.txt` - AI discovery file (update when endpoints change)
- `public/llms-full.txt` - Generated, do not edit manually
- `public/downloads/p402.zip` - Generated, do not edit manually
- `skills-index.json` - Plugin marketplace manifest
