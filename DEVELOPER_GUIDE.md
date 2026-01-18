# 📘 P402 Router Developer Guide

Welcome to the **P402 Payment Router**. This document provides everything you need to integrate the router into your application, build custom facilitators, and understand the protocol flow.

> **Current Protocol Version**: v1
> **Supported Networks**: Base Mainnet (ChainID 8453)
> **Supported Tokens**: USDC, USDT, Native ETH

---

## 🏗 System Architecture

The P402 Router sits between your **Application Frontend** and the **Blockchain**, managing the complexity of multi-token payments, compliance policies, and routing logic.

```mermaid
graph LR
    User[User Wallet] -->|1. Sign/Pay| Chain[Blockchain (Base)]
    App[Your App] -->|2. Request Plan| Router[P402 Router]
    Router -->|3. Validate Policy| PolicyEngine[Policy Engine]
    User -->|4. Submit Hash| App
    App -->|5. Verify Settle| Router
    Router -->|6. Verify Tx| Chain
```

---

## 🚀 Quick Start: React Integration

Integrating payments is a 2-step process: **Plan** (getting permission) and **Settle** (verifying payment).

### 1. Install Dependencies
```bash
npm install viem wagmi @tanstack/react-query
```

### 2. Create the Payment Hook
Copy this hook into your project to handle the plan negotiation and payment submission.

```typescript
// hooks/useP402.ts
import { useState } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

export function useP402(routerUrl: string = 'https://p402.io') {
    const { sendTransactionAsync } = useSendTransaction();
    const [status, setStatus] = useState('idle');

    const checkout = async (amount: string, token: 'USDC'|'USDT' = 'USDC') => {
        setStatus('planning');
        
        // Step 1: Get Payment Plan
        const planRes = await fetch(`${routerUrl}/api/v1/router/plan`, {
            method: 'POST',
            body: JSON.stringify({
                payment: { amount, asset: token, network: 'eip155:8453' }
            })
        });
        const plan = await planRes.json();
        
        if (!plan.allow) throw new Error("Payment Policy Denied");

        // Step 2: User Pays on Chain (Standard ERC20 or ETH logic)
        // ... (standard wagmi contract write logic here) ...
        // const txHash = await writeContractAsync(...)
        
        // Step 3: Settle (Verify)
        setStatus('verifying');
        const settleRes = await fetch(`${routerUrl}/api/v1/router/settle`, {
            method: 'POST',
            body: JSON.stringify({
                txHash: "0x...", // The hash from Step 2
                amount: amount,
                asset: token
            })
        });
        
        const result = await settleRes.json();
        if (result.settled) {
            setStatus('success');
            return result;
        } else {
            setStatus('failed');
            throw new Error(result.message);
        }
    };

    return { checkout, status };
}
```

---

## 📡 API Reference

### 1. `/api/v1/router/plan` [POST]
Evaluates protocol policies and returns a routing decision *before* money moves.

**Request:**
```json
{
  "policyId": "optional_policy_id",
  "routeId": "checkout_flow_A",
  "payment": {
    "network": "eip155:8453",
    "amount": "10.00",
    "asset": "USDC"
  }
}
```

**Response:**
```json
{
  "decisionId": "uuid-...",
  "allow": true,
  "candidates": [
    { "facilitatorId": "fac_coinbase", "score": 100 }
  ]
}
```

### 2. `/api/v1/router/settle` [POST]
The critical endpoint that verifies a blockchain transaction actually happened and matches the tenant's treasury rules. **Replay-protected**.

**Request:**
```json
{
  "txHash": "0x88df01...",
  "amount": "10.00",
  "asset": "USDC", // or "USDT", "native"
  "tenantId": "optional_if_single_tenant"
}
```

**Response (Success):**
```json
{
  "settled": true,
  "receipt": {
    "verifiedAmount": "10.00",
    "asset": "USDC",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

**Response (Failure):**
```json
{
  "code": "VERIFICATION_FAILED",
  "message": "Insufficient amount: 9.00 < 10.00"
}
```

---

## 🔌 Building Custom Facilitators

You can extend the router by building your own **Facilitator Gateway**. This is useful if you want to support new networks (e.g., Solana, Bitcoin) or use a different settlement provider (e.g., Stripe Crypto).

### Step 1: Build a Webhook
Your server simply needs to expose a health/verify endpoint.

```typescript
// Your server (e.g. Express/Next.js)
app.post('/verify', async (req, res) => {
    const { txHash, amount } = req.body;
    // ... custom logic to check Solana chain ...
    res.json({ valid: true });
});
```

### Step 2: Register in Dashboard
1. Go to `https://p402.io/dashboard/facilitators`.
2. Click **Add Custom Facilitator**.
3. **Name**: "My Custom Solana Gateway".
4. **Endpoint**: `https://api.myapp.com/payment-gateway`.
5. **Supported Networks**: `solana:mainnet`.

**Result**: The router will now automatically route `solana:mainnet` requests to your new gateway.

---

## 🌐 EIP-8004 Compliance (Future Proofing)

The router calculates **Resource Integrity** headers consistent with the emerging EIP-8004 standard.

- **`X-Resource-ID`**: A deterministic hash of the policy and content access rules.
- **`X-Payment-Token`**: The accepted token contract address.

Currently, these are internal calculations used to verify sessions, but they will be exposed as standard HTTP headers in v2 to allow browser-native wallets to auto-negotiate payments.

---

## 🛡 Security Best Practices

1.  **Trustless Verification**: Always rely on the `/settle` response, not just the frontend success state. A user can fake a frontend UI, but they cannot fake a cryptographic signature on Base.
2.  **Replay Protection**: The router automatically rejects `txHash` reused from previous requests. Do not disable this check.
3.  **Idempotency**: It is safe to retry `/settle` calls if network errors occur. If the transaction was *already settled*, the API returns 409 (Conflict/Replay), which your app should handle as "Already Paid".

---

## 📦 SDK Reference (New)

We now provide an official SDK to simplify integration.

### Installation
```bash
npm install @p402/sdk
```

### Usage
```typescript
import { P402Client } from '@p402/sdk';

const client = new P402Client({
    routerUrl: 'https://p402.io',
    debug: true
});

await client.checkout(
    { 
        amount: "10.00", 
        network: "eip155:8453" 
    }, 
    async (to, data, value) => {
        // Connect your wallet provider here (wagmi, ethers, etc)
        const hash = await wallet.sendTransaction({ to, data, value });
        return hash;
    }
);
```

See the full [SDK README](sdk/README.md) for details.

---

## 🆘 Support

- **Status Page**: https://status.p402.io
- **Developer Email**: dev@p402.io
- **Emergency**: Protocol pause is available via the Admin Dashboard.
