# P402.io - The Payment-Aware AI Orchestration Layer

**Route, Verify, and Settle Intelligent Agent Interactions.**

P402 (Payment 402) is the infrastructure layer for the Agentic Web. It combines enterprise-grade AI orchestration with crypto-native settlement, enabling autonomous agents to discover services, negotiate tasks, and pay for resources in real-time using the **x402** and **A2A** protocols.

---

## 🚀 Key Features

### 🤖 Agent-to-Agent (A2A) Protocol
Full implementation of Google's A2A Protocol for autonomous agent discovery and communication.
- **Agent Discovery**: `/.well-known/agent.json` broadcasts capabilities and skills.
- **JSON-RPC Messaging**: Standardized message exchange with context management.
- **Streaming Responses**: Real-time SSE support for low-latency agent interactions.
- **Task Lifecycle**: Traceable task states from `pending` to `completed`.

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

### 🌐 x402 Compliance
Built on the HTTP 402 Payment Required standard.
- **Standardized Headers**: Uses `Authorization: Payment <token>` for seamless integration.
- **Settlement**: Supports USDC/USDT on Base (Coinbase L2) and Ethereum Mainnet.

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
| **OpenAI** | GPT-4o, o1, GPT-3.5 | Reasoning, Vision, Functions |
| **Anthropic** | Claude 3.5 Sonnet, Opus | Long Context, Coding |
| **Google** | Gemini 1.5 Pro/Flash | Multimodal, huge context |
| **Groq** | Llama 3, Mixtral | Ultra-low latency (LPU) |
| **DeepSeek** | DeepSeek R1/V3 | Cost-effective reasoning |
| **Perplexity** | Sonar Online | Real-time web search |
| **Mistral** | Large, Codestral | Open-weight mastery |

And many more including Together AI, Fireworks, Cohere, and OpenRouter.

---

## 🛡️ Security & Privacy

- **Non-Custodial**: You control your keys and settlement.
- **Privacy-First**: No data training on your requests.
- **Verifiable**: All decisions and payments are traceable.

---

## 🔗 Resources

- [P402 Documentation](https://docs.p402.io)
- [A2A Protocol Spec](https://github.com/google/a2a-protocol)
- [x402 Standard](https://x402.org)

---

**Built by the P402 Team** | [GitHub](https://github.com/Z333Q/p402-router) | [Twitter](https://twitter.com/p402_io)
