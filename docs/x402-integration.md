# x402 Facilitator Integration Guide

## Overview

P402 implements the x402 compliant facilitator protocol for on-chain settlement. It supports two modes:
1. **Verification Mode (Legacy)**: Client executes tx, P402 verifies.
2. **Execution Mode (EIP-3009)**: Client signs authorization, P402 executes tx and pays gas.

Both modes use the **x402 wire format** (`paymentPayload` + `paymentRequirements`) as the primary interface.

## Wire Format

All facilitator endpoints accept the x402 wire format:

```typescript
interface X402Request {
  paymentPayload: {
    x402Version: 2;
    scheme: "exact";         // EIP-3009 gasless
    network: "eip155:8453";  // CAIP-2 Base Mainnet
    payload: {
      signature: string;     // 65-byte hex signature
      authorization: {
        from: string;        // Payer address
        to: string;          // Treasury address
        value: string;       // Amount in atomic units (USDC = 6 decimals)
        validAfter: string;
        validBefore: string;
        nonce: string;       // bytes32
      };
    };
  };
  paymentRequirements: {
    scheme: "exact";
    network: "eip155:8453";
    maxAmountRequired: string;
    resource: string;
    description: string;
    payTo: string;
    asset: string;           // USDC contract address
  };
}
```

## Prerequisites

- **Token**: USDC on Base (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **Network**: Base Mainnet (Chain ID: 8453, CAIP-2: `eip155:8453`)
- **Treasury**: `0xb23f146251e3816a011e800bcbae704baa5619ec`

## 1. Create Authorization

The client must sign an EIP-712 typed data message conforming to EIP-3009 `TransferWithAuthorization`.

### Data Structure
```typescript
const domain = {
  name: 'USD Coin',
  version: '2',
  chainId: 8453,
  verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
};

const types = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
};

const message = {
  from: userAddress,
  to: '0xb23f146251e3816a011e800bcbae704baa5619ec',
  value: amountInWei,
  validAfter: 0,
  validBefore: Math.floor(Date.now() / 1000) + 3600,
  nonce: randomBytes(32)
};
```

## 2. Verify Authorization

**Endpoint**: `POST /verify`

```bash
curl https://facilitator.p402.io/verify \
  -H "Content-Type: application/json" \
  -d '{
    "paymentPayload": {
      "x402Version": 2,
      "scheme": "exact",
      "network": "eip155:8453",
      "payload": {
        "signature": "0x...",
        "authorization": {
          "from": "0x...",
          "to": "0xb23f146251e3816a011e800bcbae704baa5619ec",
          "value": "1000000",
          "validAfter": "0",
          "validBefore": "1735689600",
          "nonce": "0x..."
        }
      }
    },
    "paymentRequirements": {
      "scheme": "exact",
      "network": "eip155:8453",
      "maxAmountRequired": "1000000",
      "resource": "https://example.com/api",
      "description": "AI inference",
      "payTo": "0xb23f146251e3816a011e800bcbae704baa5619ec",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    }
  }'
```

**Response** (VerifyResponse):
```json
{ "isValid": true, "payer": "0x..." }
```

On failure:
```json
{ "isValid": false, "invalidReason": "Insufficient amount" }
```

## 3. Execute Settlement

**Endpoint**: `POST /settle`

Same request format as verify. The facilitator executes the on-chain transfer.

**Response** (SettleResponse):
```json
{
  "success": true,
  "transaction": "0x88df016a...",
  "network": "eip155:8453",
  "payer": "0x..."
}
```

On failure:
```json
{
  "success": false,
  "transaction": "",
  "network": "eip155:8453",
  "payer": null,
  "errorReason": "EIP-3009 payment verification failed"
}
```

## 4. Legacy Format (Backward Compatible)

The `/api/v1/facilitator/settle` endpoint also accepts the legacy format:

```json
{
  "txHash": "0x...",
  "amount": "1.0",
  "asset": "USDC",
  "authorization": {
    "from": "0x...",
    "to": "0x...",
    "value": "1000000",
    "nonce": "0x...",
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  }
}
```

Legacy responses include additional `facilitatorId` and `receipt` fields for backward compatibility.

## CORS Headers

The facilitator exposes these headers for browser clients:
- `Access-Control-Allow-Headers`: includes `PAYMENT-SIGNATURE`
- `Access-Control-Expose-Headers`: `PAYMENT-REQUIRED, PAYMENT-RESPONSE`

Note: The `PAYMENT-RESPONSE` header is set by **resource servers**, not by the facilitator.

## Security Limits

- **Gas Limit**: P402 will reject settlements if gas prices on Base exceed configured limits (default 50 gwei).
- **Expiry**: Authorizations must be valid at the time of submission.
- **Micro-payments**: Minimum settlement amount is $0.01 USDC.
- **Replay Protection**: Each authorization nonce can only be used once.
