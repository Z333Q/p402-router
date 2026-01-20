# P402 V2: The Operating System for the Agentic Economy
**Definitive System Architecture & Product Requirements Document**

> **Version:** 2.1.0 (Production Release)
> **Date:** January 2026
> **Status:** Live / Production Ready

---

## 1. Executive Summary

P402 V2 is not just an API router; it is a **Payment-Aware Orchestration Layer** designed to solve the critical "economic alignment" problem in the emerging Agentic Economy.

As AI agents transition from experimental chat bots to autonomous economic actors, they face three blockers:
1.  **Fragmentation:** 50+ incompatible provider APIs.
2.  **Financial Risk:** Runaway costs and lack of secure spending limits.
3.  **Settlement Friction:** No standardized way for Agent A to pay Agent B for services.

P402 V2 solves these by unifying **Orchestration** (Smart Routing), **Policy** (Billing Guard), and **Settlement** (x402 Protocol) into a single, high-performance infrastructure layer. It is built to be the "Visa Network" for AI Agents—handling the routing, authorization, and settlement of intelligence tasks.

---

## 2. System Architecture (Holistic View)

The system follows a **4-Layer Hub-and-Spoke Architecture**, designed for high availability, security, and scalability.

```mermaid
graph TD
    %% Clients
    User[Human User] -->|UI Interaction| ClientLayer
    Agent[Autonomous Agent] -->|A2A Protocol| ClientLayer
    MCP[Cursor/MCP Client] -->|MCP Protocol| ClientLayer

    subgraph ClientLayer [Layer 1: Interfaces]
        NextApp[Next.js PWA]
        SDK[TypeScript SDK]
        A2AClient[Google A2A Client]
    end

    ClientLayer -->|HTTPS / JSON-RPC| Gateway

    subgraph OrchestrationLayer [Layer 2: Orchestration (The Brain)]
        Gateway[API Gateway]
        Router[Smart Router Engine]
        Policy[Policy Engine]
        Billing[Billing Guard]
        Cache[Semantic Cache]
        
        Gateway --> Router
        Router -->|Check Intent| Cache
        Router -->|Check Limits| Billing
        Billing -->|Authorize| Policy
    end

    subgraph SettlementLayer [Layer 3: Settlement (The Wallet)]
        x402[x402 Protocol Handler]
        Ledger[Transaction Ledger]
        Bazaar[Service Bazaar]
        Mandates[AP2 Mandate Engine]
        
        Router -->|Pay| x402
        x402 -->|Verify| Ledger
        x402 -->|Discover| Bazaar
    end

    subgraph InfrastructureLayer [Layer 4: Infrastructure]
        DB[(PostgreSQL + pgvector)]
        Redis[(Redis Cache)]
        BaseChain[Base L2 Blockchain]
        OpenRouter[OpenRouter Aggregator]
        
        OrchestrationLayer --> DB
        OrchestrationLayer --> Redis
        OrchestrationLayer --> OpenRouter
        SettlementLayer --> BaseChain
    end
```

### 2.1 Key Design Decisions
- **Router-First Latency:** The critical path (Gateway -> Router -> Provider) is optimized for <50ms overhead. Heavy logic (logging, analytics) is offloaded asynchronously.
- **Fail-Closed Security:** The Policy Engine defaults to `deny`. An agent cannot spend 1 cent unless an active, valid Mandate exists.
- **Protocol Agnostic:** Supports standard OpenAI Chat API, Google's A2A Protocol, and x402 Payment Headers interchangeably.

---

## 3. Detailed Feature Specifications

### 3.1 Smart Routing & OpenRouter Alignment
**Objective:** Decouple application logic from model providers while maximizing Token-Per-Dollar (TPD) efficiency.

- **Primary Aggregator:** Uses **OpenRouter** as the upstream backbone. This provides instant access to 50+ models (Claude 3.5, GPT-4o, Gemini 1.5, Llama 3) via a single normalized API.
- **Routing Modes (`lib/ai-providers/registry.ts`):**
    - `cost`: Selects the cheapest model capable of handling the context window (e.g., Haiku vs Opus).
    - `speed`: Prioritizes Time-To-First-Byte (TTFB). Typically routes to Groq or specialized low-latency endpoints.
    - `quality`: Only routes to SOTA models (e.g., GPT-4o, Claude 3.5 Sonnet).
    - `balanced`: A weighted score of Cost (0.4), Speed (0.3), and Quality (0.3).
- **Fallback Logic:** If OpenRouter returns a 5xx or 429, the router can proactively switch to a direct provider key (if configured) or a different model tier to ensure reliability.

### 3.2 Billing Guard & Safety Audit
**Objective:** Prevent "bill shock" and malicious resource exhaustion. This is the **Safety Layer** protecting the user's wallet.

- **6-Layer Defense (`lib/providers/openrouter/billing-guard.ts`):**
    1.  **Global Kill Switch:** Hard cap on total tenant spending (e.g., $500/month).
    2.  **Rate Limiting:** Sliding window counter (e.g., 1000 requests/hour) backed by Redis.
    3.  **Concurrency Limit:** Prevents parallel attack vectors (max 50 concurrent streams).
    4.  **Anomaly Detection:** Calculates per-request Z-Score. If a request cost is >3 standard deviations from the mean (e.g., a sudden $10 request when average is $0.05), it is flagged or blocked.
    5.  **Budget Alerts:** Async notifications at 50%, 80%, and 100% of budget usage.
    6.  **AP2 Mandates:** Cryptographically signed spending permissions (see Section 3.4).

### 3.3 Semantic Cache
**Objective:** Reduce costs and latency by serving cached responses for identical user intents.

- **Architecture:**
    - **Embeddings:** Uses `openai/text-embedding-3-small` (routed via OpenRouter) to vectorize incoming prompts.
    - **Storage:** Stores vectors and response payloads in PostgreSQL (`semantic_cache` table).
    - **Matching:** Calculates Cosine Similarity. If similarity > 0.92, the cached response is served instantly.
    - **Privacy:** Caching is scoped by `tenant_id` to prevent data leakage between users.

### 3.4 Google A2A & A2P Alignment
**Objective:** Full compliance with Google's **Agent-to-Agent (A2A)** and **Agent-to-Platform (A2P)** communication standards.

- **A2A Protocol (`lib/a2a-client.ts`, `lib/a2a-types.ts`):**
    - Implements the standard `message/send` JSON-RPC method.
    - Supports the **Task/Artifact Model**: Agents exchange "Tasks" (units of work) containing "Artifacts" (data, code, text).
    - **Context Management:** All exchanges are grouped into `a2a_contexts` (conversations), persisting state across multi-turn agent negotiations.
- **AP2 Mandates (`ap2_mandates` table):**
    - The core authorization primitive.
    - A "Mandate" is a signed object granting an Agent (DID) permission to spend up to $X on behalf of User (DID) for specific categories (e.g., "Travel", "Compute").
    - **Alignment:** P402 acts as the **Mandate Enforcer**, verifying signatures and tracking real-time `amount_spent_usd` against the `max_amount_usd` constraint.

### 3.5 The Settlement Layer (x402 & Bazaar)
**Objective:** Enable machine-to-machine payments.

- **x402 Protocol (`lib/x402/verify.ts`):**
    - Implements the **3-Step Payment Flow**:
        1.  **Payment Required (402):** Service responds with invoice details (Amount, Token, Network).
        2.  **Payment Submitted:** Client sends `X-402-Payment` header with Transaction Hash (on-chain) or Signed Receipt (off-chain).
        3.  **Payment Completed:** Service validates tx/sig and releases the resource.
    - **Receipt Reuse:** Supports "x402 Receipts" (off-chain signatures) for high-frequency low-value micropayments, settling on-chain only periodically to save gas.
- **The Bazaar (Service Discovery):**
    - A marketplace where Agents publish capabilities (e.g., "Web Search", "Image Gen") and their price.
    - **Registry:** `bazaar_resources` table stores endpoint, price, and health status.
    - **Facilitators:** Trusted nodes (like P402) that verify service quality and process payments.

---

## 4. Technical Stack

| Component | Technology | Version | Choice Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | 15.1 (App Router) | Industry standard for React server components and streaming. |
| **Language** | TypeScript | 5.3+ | Type safety is non-negotiable for financial software. |
| **Database** | PostgreSQL | 16 (on Neon) | Reliability, robust JSONB support, and pgvector extension. |
| **ORM** | Raw SQL / pg | `pg` driver | Direct control over queries for max performance vs Prisma overhead. |
| **Cache** | Redis | 7.x (hosted) | Low-latency state for rate limiting and nonce tracking. |
| **Blockchain** | Base L2 | Mainnet | USDC native, low fees (<$0.01), Coinbase alignment. |
| **AI Upstream** | OpenRouter | V1 API | Single integration point for all models; compliant embeddings. |
| **Auth** | NextAuth.js | V4 | Flexible adaptors for OAuth (Google/GitHub) and SIWE (Wallet). |

---

## 5. Third-Party Reliances & Risks

1.  **OpenRouter:** Critical dependency.
    - *Risk:* Downtime or API key revocation.
    - *Mitigation:* The Router Engine is designed to accept fallback keys (e.g., direct OpenAI key) in env vars if OpenRouter fails.
2.  **Neon (Database):** Critical dependency.
    - *Risk:* Connection pool exhaustion.
    - *Mitigation:* Use `@neondatabase/serverless` driver for edge compatibility and connection pooling.
3.  **Base L2 (RPC):** High dependency for x402 verification.
    - *Risk:* RPC congestion/latency.
    - *Mitigation:* `verify.ts` logic allows "optimistic" verification for trusted peers or fallbacks to multiple RPC endpoints.

---

## 6. Developer Deployment Guide

### 6.1 Prerequisites
- Node.js 20+
- PostgreSQL Database (Neon recommended)
- Redis Instance (Upstash/Railway recommended)
- OpenRouter API Key
- Base Mainnet RPC URL (Alchemy/Infura)

### 6.2 Environment Setup
Create a `.env.local` file with the following:
```bash
# Core
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret

# AI
OPENROUTER_API_KEY=sk-or-v1-...

# Infrastructure
DATABASE_URL=postgres://user:pass@host/dbname
REDIS_URL=redis://:pass@host:port
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
```

### 6.3 Database Initialization
Run the migration scripts in order to set up the Orchestration, Billing, and A2A schemas:
```bash
npm install
npx tsx scripts/seed.ts # Runs all migrations in scripts/migrations/ folder
```

### 6.4 Verification
Run the comprehensive test suite to validate all 4 layers (Router, Billing, A2A, x402):
```bash
npm test
# Expected: 120 tests passed
```

---

## 7. Future Roadmap (Post-Handoff)

1.  **Layer 2 Settlement Optimization:** Implement "Payment Channels" for x402 to allow zero-gas streaming payments between high-volume agents.
2.  **Decentralized Bazaar:** Move the `bazaar_resources` registry from Postgres to an on-chain Registry Contract on Base.
3.  **ZK Mandates:** Use Zero-Knowledge proofs for AP2 Mandates, allowing agents to prove they have budget without revealing the total wallet balance.

---

**End of PRD**
