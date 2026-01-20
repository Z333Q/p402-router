# P402.io - The Payment-Aware AI Orchestration Layer

**Route, Verify, and Settle Intelligent Agent Interactions.**

P402 (Payment 402) is the infrastructure layer for the Agentic Web. It combines enterprise-grade AI orchestration with crypto-native settlement, enabling autonomous agents to discover services, negotiate tasks, and pay for resources in real-time using the **x402** and **A2A** protocols.

> **📘 Architectural Guide:** See [P402 V2 System Integration & Handoff PRD](./P402_V2_HANDOFF_PRD.md) for a comprehensive deep dive.

---

## 🚀 Key Features

### 🤖 Agent-to-Agent (A2A) Protocol
Full implementation of Google's A2A Protocol for autonomous agent discovery and communication.
- **Agent Discovery**: `/.well-known/agent.json` broadcasts capabilities and skills.
- **JSON-RPC Messaging**: Standardized message exchange with context management.
- **Streaming Responses**: Real-time SSE support for low-latency agent interactions.
- **Task Lifecycle**: Traceable task states from `pending` to `completed`.
- **Orchestration**: Autonomous delegation of sub-tasks to other agents based on capability matching.
- **Bazaar Marketplace**: Global discovery of paid agent services and listings.

### 💳 AP2 Payment Mandates
Secure, policy-driven authorization for agent spending.
- **Intent Mandates**: Users pre-authorize agents with specific constraints (e.g., "max $5.00 for AI inference").
- **Policy Engine**: Enforces budgets, categories, and expiration times on-chain or off-chain.
- **Cryptographic Verification**: EIP-712 signature support for tamper-proof mandates.

### 🧠 AI Orchestration Router
Intelligent routing engine for LLM requests.
- **Smart Routing**: Dynamically routes requests to the best provider based on `mode` (cost, speed, quality, or balanced).
- **Cost Intelligence**: Real-time cost calculation and "cheapest model" recommendations.
- **Failover & Retries**: Automatic fallback to alternative providers if the primary fails.
- **Semantic Cache**: Embedding-based caching to reduce costs and latency for repetitive queries.

### 🌐 A2A x402 Extension (Google Spec)
Official support for the A2A x402 Extension for cryptographic payment negotiation.
- **Pay-Per-Task**: Direct settlement for individual agent requests.
- **Three-Message Flow**: Implements the official `payment-required`, `payment-submitted`, and `payment-completed` lifecycle.
- **Payment Schemes**: 
  - `exact`: EIP-3009 (Permitted Transfer) for gasless USDC/USDT settlement.
  - `onchain`: Direct transaction verification on Base/Ethereum.
  - `receipt`: Reuse of prior payments for bundled or prepaid services.
- **Extension URI**: `tag:x402.org,2025:x402-payment`

---

## 🤝 Trusted By Industry Leaders

P402 implements the **Agent-to-Agent (A2A) Protocol**, a standard supported by industry giants including:
- **Google Cloud**
- **Salesforce**
- **Atlassian**
- **Cognizant**
- and many others defining the Agentic Web.

---

## 🛠️ Integration Guide

### 1. Agent Discovery
Point your agent to any P402-enabled node to discover its capabilities:

```bash
curl https://p402.io/.well-known/agent.json
```

### 2. A2A Messaging
Send a standardized JSON-RPC message to the router:

```bash
curl -X POST https://p402.io/api/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "message/send",
    "params": {
      "message": { "role": "user", "parts": [{ "type": "text", "text": "Hello Agent" }] },
      "configuration": { "mode": "cost" }
    },
    "id": 1
  }'
```

### 3. Payment Mandates
Create a mandate to authorize agent spending:

```bash
curl -X POST https://p402.io/api/a2a/mandates -d '{
  "mandate": {
    "user_did": "did:key:user123",
    "agent_did": "did:key:agent456",
    "constraints": { "max_amount_usd": 10.00 }
  }
}'
```

---

## 📚 Supported Providers

| Provider | Models | Capabilities |
|----------|--------|--------------|
| **OpenAI** | GPT-5.2, o3-high, GPT-5.2 Turbo | Reasoning+, Vision, Agents |
| **Anthropic** | Claude 4.5 Opus, Sonnet 4.5 | Long Context, Coding, Reasoning |
| **Google** | Gemini 3.0 Ultra/Pro/Flash | Multimodal, 10M+ Context |
| **Groq** | Llama 4, Mixtral 8x22B | Ultra-low latency (LPU) |
| **DeepSeek** | DeepSeek R1/V3 | Cost-effective reasoning |
| **Perplexity** | Sonar Online | Real-time web search |
| **Mistral** | Large 3, Codestral | Open-weight mastery |

And over **300+ frontier models** via the **OpenRouter Meta-Provider**, ensuring instant access to the latest state-of-the-art AI without individual API key overhead.

---

## 🛡️ Security & Privacy

- **Non-Custodial**: You control your keys and settlement.
- **Privacy-First**: No data training on your requests.
- **Verifiable**: All decisions and payments are traceable.

---

## 🔗 Resources

- [P402 Documentation](https://p402.io/docs)
- [SDK Reference](https://p402.io/docs/sdk)
- [A2A Protocol Spec](https://github.com/google/a2a-protocol)
- [AP2 Mandates Guide](https://p402.io/docs/mandates)

---

**Built by the P402 Team** | [GitHub](https://github.com/Z333Q/p402-router) | [Twitter](https://twitter.com/p402_io)
