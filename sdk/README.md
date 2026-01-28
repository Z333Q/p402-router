# @p402/sdk

The official TypeScript SDK for the P402 Payment Router - x402 compliant AI commerce infrastructure.

[![npm version](https://badge.fury.io/js/%40p402%2Fsdk.svg)](https://www.npmjs.com/package/@p402/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @p402/sdk viem
```

## Quick Start

### Initialize Client

```typescript
import { P402Client } from '@p402/sdk';

const client = new P402Client({
  routerUrl: 'https://p402.io',
  apiKey: 'your-api-key',  // Optional for authenticated requests
  debug: true
});
```

## V1 API - Payments

### Checkout Flow (Plan → Pay → Settle)

```typescript
import { useSendTransaction } from 'wagmi';

const { sendTransactionAsync } = useSendTransaction();

const result = await client.checkout(
  {
    amount: "10.00",
    network: "eip155:8453" // Base Mainnet
  },
  async (to, data, value) => {
    const hash = await sendTransactionAsync({
      to: to as `0x${string}`,
      data: data as `0x${string}`,
      value: value
    });
    return hash;
  }
);

if (result.success) {
  console.log("Payment Confirmed!", result.receipt);
}
```

### Manual Flow

```typescript
// 1. Plan
const plan = await client.plan({
  payment: { amount: "10.00", asset: "USDC", network: "eip155:8453" }
});

// 2. Execute payment externally...
const txHash = "0x...";

// 3. Settle
const settlement = await client.settle({
  txHash,
  amount: "10.00",
  asset: "USDC"
});
```

## V2 API - Chat Completions

```typescript
const response = await client.chat({
  messages: [
    { role: "user", content: "Explain P402 protocol" }
  ],
  p402: {
    mode: "cost",      // 'cost' | 'quality' | 'speed' | 'balanced'
    cache: true,       // Enable semantic caching
    maxCost: 0.10      // Max cost in USD
  }
});

console.log(response.choices[0].message.content);
console.log(`Cost: $${response.p402_metadata.cost_usd}`);
```

## V2 API - Sessions

```typescript
// Create session with pre-funded budget
const session = await client.createSession({
  agent_id: "agent-123",
  budget_usd: 50.00,
  expires_in_hours: 24
});

// Fund existing session
await client.fundSession(session.id, 25.00, "0xTxHash...");

// Get session details
const details = await client.getSession(session.id);
console.log(`Remaining: $${details.budget.remaining_usd}`);
```

## V2 API - Governance

### Policies

```typescript
// Create a spending policy
const policy = await client.createPolicy({
  name: "Enterprise Limit",
  rules: {
    max_daily_usd: 1000,
    allowed_providers: ["openai", "anthropic"],
    require_semantic_cache: true
  }
});

// List policies
const { data: policies } = await client.listPolicies();
```

### AP2 Mandates (EIP-712)

```typescript
// Create a mandate granting an agent permission to spend
const mandate = await client.createMandate({
  user_did: "did:ethr:0xUser...",
  agent_did: "did:p402:agent-123",
  constraints: {
    max_amount_usd: 100,
    allowed_actions: ["ai.completion", "ai.embedding"],
    expires_at: "2026-02-01T00:00:00Z"
  },
  signature: "0x..."  // EIP-712 signature from user
});

// List active mandates
const { data: mandates } = await client.listMandates("active");
```

## EIP-712 Mandate Signing

To create a signed mandate, the user must sign an EIP-712 typed data message:

```typescript
import { signTypedData } from 'wagmi/actions';

const domain = {
  name: 'P402 Protocol',
  version: '1',
  chainId: 8453,
  verifyingContract: '0x...' // P402 Treasury
};

const types = {
  Mandate: [
    { name: 'grantor', type: 'string' },
    { name: 'grantee', type: 'string' },
    { name: 'maxAmountUSD', type: 'string' },
    { name: 'allowedActions', type: 'string[]' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
};

const message = {
  grantor: userAddress,
  grantee: "did:p402:agent-123",
  maxAmountUSD: "100.00",
  allowedActions: ["ai.completion"],
  validAfter: Math.floor(Date.now() / 1000),
  validBefore: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
  nonce: "0x" + crypto.randomUUID().replace(/-/g, "").padEnd(64, "0")
};

const signature = await signTypedData({ domain, types, primaryType: 'Mandate', message });
```

## Type Exports

All types are fully exported:

```typescript
import type {
  Network,
  PaymentScheme,
  EIP3009Authorization,
  EIP712Mandate,
  SignedMandate,
  PlanRequest,
  PlanResponse,
  SettleRequest,
  SettleResponse,
  ChatCompletionRequest,
  ChatCompletionResponse,
  Session,
  Policy,
  Mandate,
  P402Config,
  P402ErrorCode
} from '@p402/sdk';
```

## Error Handling

```typescript
import { P402Error } from '@p402/sdk';

try {
  await client.checkout(...);
} catch (e) {
  if (e instanceof P402Error) {
    switch (e.code) {
      case 'POLICY_DENIED':
        console.log("Transaction blocked by policy");
        break;
      case 'BUDGET_EXCEEDED':
        console.log("Session budget exhausted");
        break;
      case 'SETTLEMENT_FAILED':
        console.log("On-chain verification failed");
        break;
    }
  }
}
```

## Fee Transparency

P402 enforces a **1% flat fee** on all transactions. Display this to users before confirmation:

| Item | Amount |
|------|--------|
| Service Price | $10.00 USDC |
| P402 Fee (1%) | $0.10 USDC |
| **Total** | **$10.10 USDC** |

## License

MIT © [P402 Protocol](https://p402.io)
