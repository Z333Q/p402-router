# P402 Routing Guide

Deep dive on the P402 smart routing engine: how it selects providers, scores models, handles failover, and how developers can fine-tune routing behavior.

## Table of Contents
1. [How Routing Works](#how-routing-works)
2. [Scoring Algorithm](#scoring-algorithm)
3. [Provider Landscape](#provider-landscape)
4. [Model Tiers](#model-tiers)
5. [Advanced Configuration](#advanced-configuration)
6. [Failover and Rate Limit Handling](#failover-and-rate-limit-handling)
7. [Common Routing Patterns](#common-routing-patterns)

---

## How Routing Works

When a request hits `/api/v2/chat/completions`, the routing engine executes this sequence:

1. **Parse** the request and extract routing hints from the `p402` options
2. **Filter** the model catalog by: availability (provider has valid API key or is accessible via OpenRouter), required capabilities (e.g., vision, code), minimum context window, tier restrictions, provider allowlist/blocklist
3. **Score** every remaining candidate model on three dimensions (cost, quality, speed) using the weights from the selected routing mode
4. **Select** the highest-scoring model
5. **Check** the Billing Guard (6-layer pre-check)
6. **Execute** the request against the selected provider
7. **Failover** to the next-best candidate if the selected provider returns 5xx or 429

The entire routing decision adds less than 50ms of overhead to the request. The routing decision is logged with the full scoring breakdown for observability.

## Scoring Algorithm

The router uses a weighted scoring model. Each candidate model gets three normalized scores between 0 and 1:

**Cost Score:** Calculated from the model's per-1k-token pricing relative to all candidates. The cheapest model scores 1.0, the most expensive scores 0.0, others are linearly interpolated.

```
costScore = 1 - ((modelCost - minCost) / (maxCost - minCost))
```

**Quality Score:** Derived from model tier:
- `premium` tier: 1.0 (Claude Opus, GPT-4o, Gemini Ultra)
- `mid` tier: 0.7 (Claude Sonnet, GPT-4o-mini, Gemini Pro)
- `budget` tier: 0.4 (Haiku, DeepSeek, Llama variants)

**Speed Score:** Also derived from tier (smaller models are generally faster):
- `budget` tier: 0.9
- `mid` tier: 0.6
- `premium` tier: 0.4

**Final Score:**

```
totalScore = (costWeight * costScore) + (qualityWeight * qualityScore) + (speedWeight * speedScore)
```

**Preset Weights:**

| Mode | Cost Weight | Quality Weight | Speed Weight |
|------|------------|---------------|-------------|
| `cost` | 0.80 | 0.10 | 0.10 |
| `quality` | 0.10 | 0.80 | 0.10 |
| `speed` | 0.10 | 0.10 | 0.80 |
| `balanced` | 0.33 | 0.34 | 0.33 |

You can also pass custom weights:

```typescript
p402: {
  mode: { cost: 0.5, quality: 0.3, speed: 0.2 }  // Custom blend
}
```

## Provider Landscape

P402 accesses 300+ models primarily through **OpenRouter** as the upstream aggregator. This means developers do not need individual API keys for each provider; a single P402 API key provides access to the full catalog.

The provider registry includes direct adapters for:

| Provider | Adapter | Specialty |
|----------|---------|-----------|
| OpenAI | `openai` | GPT-4o, o3, general purpose |
| Anthropic | `anthropic` | Claude family, long context, coding |
| Google | `google` | Gemini family, multimodal, massive context |
| Groq | `groq` | Ultra-low latency via LPU hardware |
| DeepSeek | `deepseek` | Cost-effective reasoning (R1/V3) |
| Mistral | `mistral` | Open-weight, efficient |
| Perplexity | `perplexity` | Real-time web search augmented |
| AI21 | `ai21` | Jamba/Jurassic models |
| Together | `together` | Open-source model hosting |
| Fireworks | `fireworks` | Fast inference for open models |
| Cohere | `cohere` | Enterprise NLP, RAG |

When a provider has a direct API key configured, P402 can route to it directly. When no direct key exists, it routes through OpenRouter transparently. This gives developers the best of both worlds: direct performance when available, broad coverage always.

## Model Tiers

P402 organizes models into three tiers that drive quality and speed scoring:

**Premium (quality_score: 1.0, speed_score: 0.4):**
Claude Opus, GPT-4o, Gemini Ultra/Pro, o3-high. These are the most capable models for complex reasoning, nuanced writing, and multi-step analysis. Use when output quality is paramount.

**Mid (quality_score: 0.7, speed_score: 0.6):**
Claude Sonnet, GPT-4o-mini, Gemini Flash, Mistral Large, DeepSeek V3. Strong general-purpose models with good cost/quality tradeoffs. The sweet spot for most production workloads.

**Budget (quality_score: 0.4, speed_score: 0.9):**
Claude Haiku, Llama variants, Mixtral, DeepSeek R1. Fast and cheap. Best for high-volume tasks where "good enough" quality is acceptable: classification, extraction, summarization, simple Q&A.

You can restrict routing to specific tiers:

```typescript
p402: {
  mode: 'cost',
  // Never use premium models, even if mode is quality
  // maxTier: 'mid'  -- not exposed via p402 options directly,
  // but achievable through policies on sessions
}
```

## Advanced Configuration

### Capability Filtering

Request models with specific capabilities:

```typescript
p402: {
  require_capabilities: ['vision', 'code']
  // Only models supporting both vision and code generation
}
```

Available capabilities: `chat`, `code`, `vision`, `reasoning`, `function_calling`.

### Provider Preferences

Steer routing toward or away from specific providers:

```typescript
p402: {
  prefer_providers: ['anthropic', 'openai'],  // Try these first
  exclude_providers: ['deepseek']              // Never route here
}
```

Provider preferences are soft hints: if preferred providers have no suitable models, the router falls back to the full catalog. Exclusions are hard constraints.

### Cost Caps

Prevent expensive requests:

```typescript
p402: {
  max_cost: 0.10  // Reject if estimated cost exceeds $0.10
}
```

This is enforced before the request is sent to the provider, using token count estimation.

## Failover and Rate Limit Handling

### Automatic Failover

When `p402.failover` is true (or when using session-based requests), the router automatically retries with the next-best scoring model if the primary provider returns:
- HTTP 5xx (server error)
- HTTP 429 (rate limited)
- Network timeout

Default: up to 3 retries with exponentially decreasing score threshold.

### Rate Limit Strategy

The `rateLimitStrategy` option controls behavior when a provider is rate-limited:

| Strategy | Behavior |
|----------|----------|
| `switch` | Immediately route to the next-best provider (default) |
| `queue` | Queue the request and retry after the rate limit window |
| `fail` | Return the 429 to the caller immediately |

For production workloads, `switch` is almost always the right choice. Use `fail` only when you need deterministic provider selection and prefer errors over alternative models.

## Common Routing Patterns

### High-Volume Batch Processing

```typescript
// Process 10,000 documents at minimal cost
p402: {
  mode: 'cost',
  cache: true,       // Many documents may be similar
  failover: true     // Don't lose work to transient errors
}
```

### Real-Time Chat Application

```typescript
// User-facing chat where latency matters
p402: {
  mode: 'speed',
  session_id: userSessionId,  // Track per-user spending
  cache: false                // Conversations are unique
}
```

### Code Generation Pipeline

```typescript
// Quality matters, budget matters too
p402: {
  mode: { cost: 0.3, quality: 0.5, speed: 0.2 },
  require_capabilities: ['code'],
  prefer_providers: ['anthropic']  // Claude excels at code
}
```

### Classification / Extraction

```typescript
// High volume, low complexity
p402: {
  mode: 'cost',
  cache: true,        // Many inputs will be similar
  max_cost: 0.01      // These should be cheap
}
```

### Multi-Tier Architecture

Use different modes for different stages of a pipeline:

```typescript
// Stage 1: Classify intent (cheap)
const intent = await p402Chat({
  messages: [{ role: 'user', content: userInput }],
  p402: { mode: 'cost' }
});

// Stage 2: Generate response (quality for complex, cost for simple)
const mode = intent.complexity === 'high' ? 'quality' : 'cost';
const response = await p402Chat({
  messages: conversationHistory,
  p402: { mode, session_id: sessionId }
});
```

This pattern reduces overall costs by 40-60% compared to routing everything through a premium model.
