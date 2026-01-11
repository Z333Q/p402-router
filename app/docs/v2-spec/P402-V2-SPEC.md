# P402.io Product Specification (V2)
## The Payment-Aware Orchestration Layer for AI

**Version:** 2.0.0
**Date:** January 2026
**Status:** Specification / Planning

---

## 1. Strategic Pivot: From Payment Processor to Orchestration Layer

### 1.1 The Problem with V1

V1 positioned P402 as "Stripe for AI agents" - a payment processor. But feedback reveals a larger opportunity:

**What developers actually struggle with:**

1. **Provider lock-in** - Hardcoded to one LLM provider, painful to switch
2. **Cost blindness** - No visibility into spend until the bill arrives
3. **No failover** - When OpenAI goes down, everything breaks
4. **Rate limit hell** - Hit 429s, no automatic fallback
5. **Payment as afterthought** - Bolt on Stripe at the end, realize economics don't work
6. **Agent guardrails** - No native way to give agents budgets and constraints

**The insight:** Payment is necessary but not sufficient. Developers need an orchestration layer that makes payment a first-class citizen, not a bolt-on.

### 1.2 V2 Positioning

```
V1: "Micropayment infrastructure for AI APIs"
     ↓
V2: "Payment-aware orchestration layer for AI"
```

**P402 V2** = OpenRouter's routing + LangChain's flexibility + native payment guardrails

We're not replacing OpenRouter or LangChain. We're adding the economic layer they're missing.

---

## 2. V2 Core Value Propositions

### For Developers Using AI APIs

| Pain | P402 V2 Solution |
|------|------------------|
| "I'm overpaying but don't know where" | Cost intelligence across 50+ models, real-time |
| "When OpenAI goes down, my app breaks" | Automatic failover to equivalent models |
| "I hit rate limits constantly" | Smart load balancing, automatic provider switching |
| "Switching providers means rewriting code" | Single API, swap providers with one config change |
| "I need to add a budget cap but it's manual" | Native policy engine with spend limits |

### For Developers Building AI APIs

| Pain | P402 V2 Solution |
|------|------------------|
| "Stripe's $0.30 kills my $0.05 transactions" | 1% flat fee via x402 protocol |
| "I can't offer pay-per-call pricing" | Micropayments that actually work |
| "Agent customers can't pay autonomously" | Session keys with spending caps |
| "No way to do usage-based billing efficiently" | Native metering + settlement |

### For AI Agents

| Pain | P402 V2 Solution |
|------|------------------|
| "I need to pay for APIs without human approval" | Autonomous payments within policy bounds |
| "I don't know which provider to use for this task" | Bazaar discovery + smart routing |
| "I have a budget but no way to enforce it" | Wallet with programmatic spending limits |

---

## 3. V2 Architecture

### 3.1 The Four Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│         Your AI App / Agent / Workflow / MCP Client             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    P402 ORCHESTRATION LAYER                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │   ROUTER     │ │   POLICY     │ │   COST INTELLIGENCE      │ │
│  │   ENGINE     │ │   ENGINE     │ │   ENGINE                 │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     P402 SETTLEMENT LAYER                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │  SESSION     │ │  FACILITATOR │ │   BAZAAR                 │ │
│  │  KEYS        │ │  NETWORK     │ │   (Discovery)            │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PROVIDER LAYER                             │
│   OpenAI │ Anthropic │ Google │ Mistral │ DeepSeek │ Groq │ ... │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Layer Descriptions

**Orchestration Layer** - The brain
- Router Engine: Picks optimal provider for each request
- Policy Engine: Enforces spending limits, allowlists, kill switches
- Cost Intelligence: Real-time cost tracking, optimization suggestions

**Settlement Layer** - The wallet
- Session Keys: Time-bounded, capped spending authority
- Facilitator Network: On-chain settlement (USDC on Base)
- Bazaar: Service discovery for agents

**Provider Layer** - The models
- 50+ LLM APIs connected
- Unified interface regardless of provider
- Health monitoring, latency tracking

---

## 4. Feature Specifications

### 4.1 Router Engine

**Purpose:** Route each request to the optimal provider based on task, cost, quality, and availability.

**Routing Factors:**

| Factor | Weight | Description |
|--------|--------|-------------|
| Task Match | 30% | Model capability vs task requirements |
| Cost | 25% | Price per token for this request |
| Latency | 20% | Current p95 response time |
| Health | 15% | Uptime, error rate, rate limit headroom |
| Policy | 10% | User preferences, blocklists |

**Routing Modes:**

```typescript
// Mode 1: Cost-optimized (default)
const response = await p402.chat({
  messages: [...],
  mode: 'cost'  // Cheapest model that meets quality threshold
});

// Mode 2: Quality-optimized
const response = await p402.chat({
  messages: [...],
  mode: 'quality'  // Best model regardless of cost
});

// Mode 3: Speed-optimized
const response = await p402.chat({
  messages: [...],
  mode: 'speed'  // Fastest response time
});

// Mode 4: Balanced (custom weights)
const response = await p402.chat({
  messages: [...],
  mode: {
    cost: 0.4,
    quality: 0.4,
    speed: 0.2
  }
});

// Mode 5: Specific provider (escape hatch)
const response = await p402.chat({
  messages: [...],
  provider: 'anthropic',
  model: 'claude-sonnet-4-5'
});
```

**Automatic Failover:**

```typescript
// If primary provider fails, automatically retry with fallback
const response = await p402.chat({
  messages: [...],
  failover: {
    enabled: true,
    maxRetries: 3,
    fallbackProviders: ['anthropic', 'google', 'deepseek']
  }
});
```

**Rate Limit Handling:**

```typescript
// Automatic switching when rate limited
const response = await p402.chat({
  messages: [...],
  rateLimitStrategy: 'switch'  // 'switch' | 'queue' | 'fail'
});
```

---

### 4.2 Policy Engine

**Purpose:** Enforce spending limits, access controls, and guardrails for agents and applications.

**Policy Types:**

```typescript
// 1. Spending Limits
const policy = {
  type: 'spending',
  limits: {
    perRequest: '$1.00',      // Max cost per API call
    perHour: '$10.00',        // Hourly budget cap
    perDay: '$100.00',        // Daily budget cap
    perMonth: '$1000.00'      // Monthly budget cap
  },
  action: 'deny'  // 'deny' | 'alert' | 'throttle'
};

// 2. Provider Allowlist
const policy = {
  type: 'provider',
  allow: ['anthropic', 'openai', 'google'],
  deny: ['deepseek']  // No DeepSeek for compliance reasons
};

// 3. Model Restrictions
const policy = {
  type: 'model',
  maxTier: 'mid',  // 'budget' | 'mid' | 'premium'
  // Prevents using Opus 4.5 when Sonnet would work
};

// 4. Task-Based Routing
const policy = {
  type: 'task',
  rules: [
    { task: 'summarization', maxModel: 'haiku' },
    { task: 'code-generation', preferModel: 'sonnet' },
    { task: 'complex-reasoning', allowModel: 'opus' }
  ]
};

// 5. Kill Switch
const policy = {
  type: 'killswitch',
  conditions: {
    totalSpend: '$500',  // Emergency stop at $500
    errorRate: 0.1       // Stop if >10% errors
  }
};
```

**Agent Session Policies:**

```typescript
// Create a constrained session for an agent
const session = await p402.createAgentSession({
  agentId: 'research-agent-001',
  wallet: '0x...',
  policies: [
    { type: 'spending', limits: { perHour: '$5' } },
    { type: 'provider', allow: ['anthropic', 'google'] },
    { type: 'task', rules: [{ task: '*', maxModel: 'sonnet' }] }
  ],
  duration: '4h',  // Session expires in 4 hours
  autoRenew: false
});

// Agent uses session token for all requests
const response = await p402.chat({
  messages: [...],
  sessionToken: session.token
});
```

---

### 4.3 Cost Intelligence Engine

**Purpose:** Real-time visibility into AI spend with optimization recommendations.

**Features:**

**Real-Time Dashboard:**
```
┌─────────────────────────────────────────────────────────────┐
│                    P402 COST DASHBOARD                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TODAY'S SPEND        THIS MONTH         PROJECTED          │
│  $47.32               $1,247.89          $1,892.00          │
│  ↑ 12% vs yesterday   ↓ 8% vs last month ✓ Under budget     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  SPEND BY PROVIDER                                          │
│  ████████████████░░░░░░ Anthropic    $892.34 (71%)         │
│  ████░░░░░░░░░░░░░░░░░░ OpenAI       $234.12 (19%)         │
│  ██░░░░░░░░░░░░░░░░░░░░ Google       $89.43 (7%)           │
│  █░░░░░░░░░░░░░░░░░░░░░ DeepSeek     $32.00 (3%)           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ⚠️  OPTIMIZATION ALERTS                                    │
│                                                             │
│  • 847 requests used Opus 4.5 for summarization tasks.      │
│    Switching to Haiku would save ~$234/month.               │
│    [Apply] [Dismiss] [Learn More]                           │
│                                                             │
│  • 12% of requests are duplicates (same prompt within 1h).  │
│    Enabling caching would save ~$89/month.                  │
│    [Enable Caching] [Configure] [Dismiss]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Cost Anomaly Detection:**
```typescript
// Alert when spend deviates from normal patterns
const alerts = await p402.configureAlerts({
  anomalyDetection: {
    enabled: true,
    sensitivity: 'medium',  // 'low' | 'medium' | 'high'
    notify: ['email', 'slack', 'webhook']
  },
  budgetAlerts: [
    { threshold: 0.5, message: '50% of monthly budget used' },
    { threshold: 0.8, message: '80% of monthly budget used' },
    { threshold: 0.95, message: 'URGENT: 95% of budget used' }
  ]
});
```

**Optimization Recommendations:**

| Signal | Recommendation |
|--------|----------------|
| Using Opus for simple tasks | "Switch to Haiku, save $X/month" |
| Duplicate prompts detected | "Enable semantic caching" |
| High error rate on provider | "Route away from [provider]" |
| Rate limits hit frequently | "Distribute across providers" |
| After-hours usage pattern | "Consider batch processing" |

---

### 4.4 Semantic Caching Engine

**Purpose:** Eliminate redundant API calls by caching semantically similar requests.

**How It Works:**

```typescript
// Request comes in
const request = {
  messages: [{ role: 'user', content: 'What is the capital of France?' }]
};

// P402 generates embedding of the request
const embedding = await p402.embed(request.messages);

// Check cache for semantically similar requests
const cached = await p402.cache.findSimilar(embedding, {
  threshold: 0.95,  // 95% similarity
  maxAge: '24h'     // Only use cache entries < 24h old
});

if (cached) {
  // Cache hit - return instantly, no API call, no cost
  return cached.response;
} else {
  // Cache miss - route to provider, cache the response
  const response = await p402.route(request);
  await p402.cache.store(embedding, response);
  return response;
}
```

**Configuration:**

```typescript
const p402 = new P402({
  wallet: '0x...',
  cache: {
    enabled: true,
    similarityThreshold: 0.95,  // How similar requests must be
    maxAge: '24h',              // Cache TTL
    maxSize: '1GB',             // Per-account cache size
    scope: 'account'            // 'account' | 'global' | 'none'
  }
});
```

**Cache Scopes:**

| Scope | Description | Use Case |
|-------|-------------|----------|
| `account` | Only your requests cached | Default, private |
| `global` | Shared across all P402 users | Opt-in, lower costs |
| `none` | No caching | Sensitive data |

**Dashboard Cache Analytics:**

```
┌─────────────────────────────────────────────────────────────┐
│  SEMANTIC CACHE                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  THIS MONTH                                                 │
│  ───────────────────────────────────────────────────────    │
│  Cache Hits: 12,847 (34% of requests)                       │
│  Saved: $487.32                                             │
│  Avg Latency Reduction: 847ms → 12ms                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ████████████░░░░░░░░░░░░░░░░░░░░ 34% Cache Hit     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  TOP CACHED QUERIES                                         │
│  • "Summarize this document..." (2,341 hits)               │
│  • "What is [definition]..." (1,892 hits)                  │
│  • "Translate to Spanish..." (1,456 hits)                  │
│                                                             │
│  [Clear Cache]  [Configure]  [View All]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Cache Invalidation:**

```typescript
// Manual invalidation
await p402.cache.invalidate({ 
  pattern: 'summarize*',  // Invalidate all summarization cache
  before: '2024-01-01'    // Or by date
});

// Automatic invalidation triggers
const config = {
  cache: {
    invalidateOn: {
      modelUpdate: true,     // When provider updates model
      priceChange: true,     // When pricing changes significantly
      errorSpike: true       // When cached responses cause errors
    }
  }
};
```

**Cost Savings Calculation:**

```
Cache hit saves:
- Full API cost (input + output tokens)
- Latency (instant response)
- Rate limit headroom

Example:
- 100K requests/month
- 30% cache hit rate = 30K cached responses
- Avg request cost: $0.02
- Monthly savings: $600
```

---

### 4.5 Bazaar (Service Discovery)

**Purpose:** Let agents discover and pay for services without hardcoded integrations.

**How It Works:**

```typescript
// Agent queries the Bazaar for a capability
const services = await p402.bazaar.discover({
  capability: 'web-search',
  maxPrice: '$0.01',
  minReliability: 0.99
});

// Returns ranked list of providers
[
  {
    provider: 'tavily',
    endpoint: 'https://api.tavily.com/search',
    price: '$0.005/request',
    reliability: 0.997,
    latency: '320ms',
    x402Compatible: true
  },
  {
    provider: 'serper',
    endpoint: 'https://serper.dev/search',
    price: '$0.008/request',
    reliability: 0.994,
    latency: '280ms',
    x402Compatible: true
  }
]

// Agent picks one and pays automatically
const results = await p402.bazaar.call({
  service: services[0],
  params: { query: 'latest AI news' }
});
// Payment handled via x402, no API key needed
```

**Bazaar Listing Schema:**

```typescript
interface BazaarListing {
  // Identity
  id: string;
  provider: string;
  name: string;
  description: string;
  
  // Capabilities
  capabilities: string[];  // ['llm', 'web-search', 'code-execution', etc.]
  
  // Pricing
  pricing: {
    model: 'per-request' | 'per-token' | 'per-minute';
    amount: string;  // '$0.005'
    currency: 'USDC';
  };
  
  // x402 Configuration
  x402: {
    network: number;  // 8453 (Base)
    recipient: string;  // Payment address
    verifyEndpoint: string;
    settleEndpoint: string;
  };
  
  // Quality Metrics (auto-updated)
  metrics: {
    uptime: number;  // 0.997
    latencyP50: number;  // 180ms
    latencyP95: number;  // 450ms
    successRate: number;  // 0.994
  };
}
```

---

### 4.6 Settlement Layer (Enhanced from V1)

**Session Keys (Improved):**

```typescript
// V1: Simple session key
const session = await wallet.createSession({
  maxAmount: '10000000',  // 10 USDC
  duration: 3600
});

// V2: Policy-aware session key
const session = await p402.createSession({
  wallet: '0x...',
  
  // Spending constraints
  budget: {
    total: '10.00 USDC',
    perRequest: '0.50 USDC',
    perProvider: {
      'anthropic': '5.00 USDC',
      'openai': '5.00 USDC'
    }
  },
  
  // Time constraints
  duration: '4h',
  schedule: {
    allowedHours: [9, 17],  // 9am-5pm only
    timezone: 'America/New_York'
  },
  
  // Access constraints
  allowedProviders: ['anthropic', 'openai', 'google'],
  allowedCapabilities: ['llm', 'embeddings'],
  
  // Safety
  requireApprovalAbove: '1.00 USDC',  // Human approval for big requests
  killSwitchWebhook: 'https://...'
});
```

**Multi-Provider Settlement:**

```typescript
// Single request, multiple payments (e.g., LLM + web search + code execution)
const response = await p402.workflow({
  steps: [
    { capability: 'web-search', params: { query: '...' } },
    { capability: 'llm', params: { messages: [...] } },
    { capability: 'code-execution', params: { code: '...' } }
  ],
  budget: '0.50 USDC',  // Total budget for workflow
  session: session.token
});

// P402 handles payment to each provider, stays within budget
```

---

## 5. Integration Patterns

### 5.1 Drop-In Replacement (Simplest)

```typescript
// Before: Direct OpenAI SDK
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
});

// After: P402 (same interface, smarter routing)
import { P402 } from '@p402/sdk';
const p402 = new P402({ wallet: process.env.P402_WALLET });
const response = await p402.chat.completions.create({
  // model: 'gpt-4',  // Optional: let P402 pick optimal model
  messages: [{ role: 'user', content: 'Hello' }]
});
```

### 5.2 LangChain Integration

```typescript
import { ChatP402 } from '@p402/langchain';

const model = new ChatP402({
  wallet: process.env.P402_WALLET,
  mode: 'cost',  // Cost-optimized routing
  policies: [
    { type: 'spending', limits: { perDay: '$50' } }
  ]
});

const chain = prompt.pipe(model).pipe(outputParser);
const result = await chain.invoke({ input: 'Hello' });
```

### 5.3 MCP Server (for Claude, Cursor)

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "p402": {
      "command": "npx",
      "args": ["@p402/mcp-server"],
      "env": {
        "P402_WALLET": "0x...",
        "P402_POLICIES": "spending:$100/day,provider:anthropic+openai"
      }
    }
  }
}
```

### 5.4 Agent Framework Integration

```typescript
// CrewAI example
import { Agent, Task, Crew } from 'crewai';
import { P402Wallet } from '@p402/crewai';

const wallet = new P402Wallet({
  address: '0x...',
  budget: { perAgent: '$10', perTask: '$2' }
});

const researcher = new Agent({
  role: 'Researcher',
  tools: [wallet.webSearch(), wallet.llm()],
  wallet: wallet.createSession({ agentId: 'researcher' })
});

// Agent can now pay for tools autonomously within budget
```

---

## 6. Technical Implementation

### 6.1 Stack (V2)

| Component | Technology | Why |
|-----------|------------|-----|
| Core API | Next.js 15 (App Router) | Existing, works well |
| Database | PostgreSQL (Neon) | Existing, works well |
| Cache | Redis | Existing, add policy cache |
| Semantic Cache | Redis + pgvector | Embedding similarity search |
| Vector Embeddings | Voyage AI | Fast, cheap embeddings for cache lookup |
| Router Engine | TypeScript | New component |
| Policy Engine | TypeScript + Zod | New component |
| Provider Adapters | TypeScript | 40 adapters at launch |
| Settlement | x402 + Base L2 (USDC) | Existing, Coinbase aligned |
| SDK | TypeScript | Rewrite for V2 |

### 6.2 New Data Models

```typescript
// Router Decision Log
interface RouterDecision {
  id: string;
  requestId: string;
  timestamp: Date;
  
  // Input
  task: string;
  inputTokens: number;
  requestedMode: 'cost' | 'quality' | 'speed' | 'balanced';
  
  // Decision
  selectedProvider: string;
  selectedModel: string;
  reason: string;  // "cost_optimal" | "failover" | "rate_limit_avoid" | etc.
  
  // Alternatives considered
  alternatives: {
    provider: string;
    model: string;
    score: number;
    disqualifyReason?: string;
  }[];
  
  // Outcome
  success: boolean;
  latency: number;
  cost: number;
  errorCode?: string;
}

// Policy Definition
interface Policy {
  id: string;
  userId: string;
  name: string;
  type: 'spending' | 'provider' | 'model' | 'task' | 'killswitch';
  config: Record<string, any>;
  priority: number;  // Higher = evaluated first
  enabled: boolean;
  createdAt: Date;
}

// Agent Session
interface AgentSession {
  id: string;
  agentId: string;
  walletAddress: string;
  
  // Constraints
  budgetTotal: number;
  budgetSpent: number;
  budgetRemaining: number;
  
  policies: Policy[];
  
  // Time bounds
  createdAt: Date;
  expiresAt: Date;
  
  // Status
  status: 'active' | 'exhausted' | 'expired' | 'revoked';
}
```

### 6.3 API Endpoints (New)

```
# Orchestration
POST   /v2/chat/completions          # Main routing endpoint
POST   /v2/embeddings                # Embedding with routing
POST   /v2/workflow                  # Multi-step workflow

# Policies
GET    /v2/policies                  # List policies
POST   /v2/policies                  # Create policy
PUT    /v2/policies/:id              # Update policy
DELETE /v2/policies/:id              # Delete policy

# Sessions
POST   /v2/sessions                  # Create agent session
GET    /v2/sessions/:id              # Get session status
DELETE /v2/sessions/:id              # Revoke session

# Semantic Cache
GET    /v2/cache/stats               # Cache hit rate, savings
POST   /v2/cache/invalidate          # Invalidate cache entries
PUT    /v2/cache/config              # Update cache settings
GET    /v2/cache/entries             # Browse cached entries

# Cost Intelligence
GET    /v2/analytics/spend           # Spending analytics
GET    /v2/analytics/recommendations # Optimization suggestions
GET    /v2/analytics/forecast        # Spend forecast

# Bazaar
GET    /v2/bazaar/discover           # Find services
GET    /v2/bazaar/listings           # All listings
POST   /v2/bazaar/call               # Call a service

# Provider Health
GET    /v2/providers                 # List all 40+ providers
GET    /v2/providers/:id/health      # Provider health
GET    /v2/providers/:id/pricing     # Current pricing
GET    /v2/providers/:id/models      # Available models
```

---

## 7. Migration Path (V1 → V2)

### 7.1 Backward Compatibility

V1 endpoints remain functional:

```
# These still work
POST /settle           → Alias to /v2/settle
GET  /health           → Alias to /v2/health
POST /verify           → Alias to /v2/verify
```

### 7.2 SDK Migration

```typescript
// V1 SDK (still works)
import { P402 } from '@p402/sdk';
const p402 = new P402({ treasury: '0x...' });
app.use(p402.middleware());

// V2 SDK (new features)
import { P402 } from '@p402/sdk';
const p402 = new P402({
  wallet: '0x...',
  mode: 'cost',
  policies: [...]
});

// Use as orchestration layer
const response = await p402.chat({...});

// Or use as payment middleware (V1 behavior)
app.use(p402.paywall({ price: '0.05' }));
```

---

## 8. Pricing (V2)

### 8.1 For Developers Using AI APIs (Orchestration)

**User Choice: Pick Your Pricing Model**

Users can choose whichever model works better for their usage pattern:

**Option A: Per-Request Pricing**

| Tier | Price | Included | Overage |
|------|-------|----------|---------|
| **Free** | $0 | 10K requests/month | — |
| **Pro** | $49/mo | 100K requests/month | $0.0003/request |
| **Business** | $199/mo | 500K requests/month | $0.0002/request |
| **Enterprise** | Custom | Unlimited | Custom |

Best for: High-volume, low-cost requests (embeddings, classification, simple chat)

**Option B: Percentage of AI Spend**

| Tier | Price | P402 Fee on AI Spend |
|------|-------|----------------------|
| **Free** | $0 | 3% of first $100/mo |
| **Pro** | $29/mo | 1.5% of AI spend |
| **Business** | $99/mo | 1% of AI spend |
| **Enterprise** | Custom | 0.5% of AI spend |

Best for: Lower-volume, higher-cost requests (Opus 4.5, long-context, complex reasoning)

**Dashboard Toggle:**

```
┌─────────────────────────────────────────────────────────────┐
│  BILLING MODEL                                              │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Per-Request    │  │  % of AI Spend  │                  │
│  │    ○ Active     │  │                 │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  YOUR MONTH SO FAR:                                         │
│  ─────────────────────────────────────────────────────────  │
│  Requests: 47,832                                           │
│  AI Spend: $1,247.89                                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  COST COMPARISON                                      │  │
│  │                                                       │  │
│  │  Per-Request (Pro):     $49 + $0 overage = $49.00    │  │
│  │  % of Spend (Pro):      $29 + $18.72 (1.5%) = $47.72 │  │
│  │                                                       │  │
│  │  ✓ Current model saves you $1.28/month               │  │
│  │                                                       │  │
│  │  [Switch to % of Spend]                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Users can switch models once per billing cycle. Dashboard always shows comparison so they know if they're on the optimal plan.

### 8.2 For Developers Building AI APIs (Settlement)

| Volume | Fee |
|--------|-----|
| $0 - $1K/mo | 2% |
| $1K - $50K/mo | 1% |
| $50K - $250K/mo | 0.75% |
| $250K+/mo | 0.5% |

No minimums. No per-transaction fees. Settlement via x402 on Base (USDC).

---

## 9. Success Metrics (V2)

| Metric | Definition | Target (6 months) |
|--------|------------|-------------------|
| Monthly Routed Requests (MRR) | Requests through orchestration layer | 10M |
| Monthly Volume Settled (MVS) | $ settled through x402 | $500K |
| Active Developers | Devs with >100 requests/month | 1,000 |
| Provider Coverage | LLM APIs integrated | 60+ (40 at launch) |
| Cache Hit Rate | % of requests served from cache | 25%+ |
| Avg. Cost Savings | % saved vs direct provider (routing + cache) | 40%+ |
| Failover Success Rate | % of failed requests recovered | 95%+ |

---

## 10. Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Router Engine MVP (cost-optimized routing)
- [ ] Policy Engine MVP (spending limits)
- [ ] Semantic Caching Engine MVP
- [ ] 40 provider adapters (full list below)
- [ ] V2 SDK (TypeScript)
- [ ] Basic dashboard (spend tracking + cache analytics)

**40 Provider Adapters (Phase 1):**

| Category | Providers |
|----------|-----------|
| **Frontier Labs** | OpenAI, Anthropic, Google (Gemini), xAI (Grok), Meta (Llama API) |
| **Inference Platforms** | Together AI, Fireworks AI, Replicate, Modal, Anyscale, Baseten, Cerebrium |
| **Specialized Inference** | Groq, SambaNova, Cerebras, Lepton AI |
| **Open Model Hosts** | DeepInfra, Novita AI, Hyperbolic, RunPod, Vast.ai |
| **Aggregators** | OpenRouter, AI21 Labs, Cohere, Mistral AI, Perplexity |
| **Cloud Providers** | AWS Bedrock, Azure OpenAI, Google Vertex AI |
| **Enterprise** | IBM watsonx, Oracle AI, Salesforce Einstein |
| **Specialized** | Voyage AI (embeddings), Jina AI (embeddings), Pinecone (inference), Weaviate |
| **Chinese Labs** | DeepSeek, Zhipu AI, Baichuan, Moonshot AI |
| **European** | Aleph Alpha, Mistral (EU endpoint) |

### Phase 2: Intelligence (Weeks 5-8)
- [ ] Cost Intelligence Engine
- [ ] Automatic failover
- [ ] Rate limit detection + switching
- [ ] Optimization recommendations
- [ ] Alerting system

### Phase 3: Agents (Weeks 9-12)
- [ ] Enhanced session keys with policies
- [ ] Bazaar MVP (service discovery)
- [ ] MCP Server update
- [ ] LangChain integration
- [ ] CrewAI integration

### Phase 4: Scale (Weeks 13-16)
- [ ] 60+ provider adapters (add emerging providers)
- [ ] Advanced analytics
- [ ] Team/organization features
- [ ] Self-serve onboarding for API providers (Bazaar listings)
- [ ] Enterprise features (SSO, audit logs, dedicated support)

---

## 11. Competitive Positioning

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPETITIVE LANDSCAPE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         MORE ORCHESTRATION                      │
│                              ▲                                  │
│                              │                                  │
│                   ┌──────────┴──────────┐                      │
│                   │      P402 V2        │                      │
│                   │  (Orchestration +   │                      │
│                   │   Native Payments)  │                      │
│                   └──────────┬──────────┘                      │
│                              │                                  │
│   PAYMENTS ◄─────────────────┼─────────────────► NO PAYMENTS    │
│                              │                                  │
│   ┌──────────┐               │            ┌──────────────┐      │
│   │ Coinbase │               │            │  OpenRouter  │      │
│   │ Commerce │               │            │              │      │
│   └──────────┘               │            └──────────────┘      │
│                              │                                  │
│   ┌──────────┐               │            ┌──────────────┐      │
│   │  P402    │               │            │  LangChain   │      │
│   │   V1     │               │            │              │      │
│   └──────────┘               │            └──────────────┘      │
│                              │                                  │
│                              ▼                                  │
│                       LESS ORCHESTRATION                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**P402 V2 is the only solution combining:**
- Multi-provider routing
- Native payment settlement
- Policy enforcement
- Agent guardrails
- Cost intelligence

---

## 12. Open Questions

1. **Provider negotiation** - Do we negotiate volume discounts to pass through to users?
2. **Cache invalidation** - How long should semantic cache entries live?
3. **Multi-chain timeline** - When to expand beyond Base?
4. **White-label** - Should enterprises be able to run their own P402 instance?
5. **Marketplace fees** - When providers list on Bazaar, do we take a cut of discovery?

---

## 13. Confirmed Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pricing model | User choice (per-request OR % of spend) | Different usage patterns benefit from different models |
| Blockchain | Base only (x402/USDC) | Focus, Coinbase alignment |
| Semantic caching | Yes, built-in | Major cost saver, differentiator |
| Provider coverage | Top 40 at launch | Comprehensive coverage from day one |

---

## 14. Summary

**V1:** Payment processor for AI micropayments
**V2:** Payment-aware orchestration layer for AI

**The Five Pillars of V2:**

| Pillar | What It Does | User Benefit |
|--------|--------------|--------------|
| **Router** | Picks optimal provider per request | Never overpay, never hardcode |
| **Policies** | Enforces budgets and guardrails | Agents operate safely |
| **Cache** | Eliminates redundant API calls | 25%+ cost savings, instant responses |
| **Intelligence** | Surfaces waste, suggests fixes | "You're overpaying 40%" becomes actionable |
| **Settlement** | x402 micropayments | Profit from $0.01 transactions |

**Why V2 wins:**

```
OpenRouter: Routing, no payments, no policies, no cache
LangChain: Framework, no payments, no routing
Coinbase Commerce: Payments, no routing, no AI focus
P402 V2: Routing + Payments + Policies + Cache + Intelligence
```

Developers don't want to think about payments OR infrastructure. They want to build AI apps that work and make money. P402 V2 handles both the "work" (routing, failover, caching) and the "make money" (policies, settlement, guardrails) in one integrated layer.

---

*Document Version: 2.0.0*
*Last Updated: January 2026*
*Status: Specification / Planning*
