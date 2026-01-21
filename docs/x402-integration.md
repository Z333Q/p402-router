# x402 Facilitator Integration Guide

## Overview

P402 implements the x402 compliant facilitator protocol for on-chain settlement. It supports two modes:
1. **Verification Mode (Legacy)**: Client executes tx, P402 verifies.
2. **Execution Mode (EIP-3009)**: Client signs authorization, P402 executes tx and pays gas.

## Execution Mode (Recommended)

This mode allows for a "gasless" experience for the payer, as the facilitator pays the gas fees for the settlement transaction.

### Prerequisites

- **Token**: USDC on Base (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **Network**: Base Mainnet (Chain ID: 8453)

### 1. Create Authorization

The client must sign an EIP-712 typed data message conforming to EIP-3009 `TransferWithAuthorization`.

#### Data Structure
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
  to: facilitatorTreasuryAddress, // Obtained from 402 Payment Required header
  value: amountInWei,
  validAfter: 0,
  validBefore: Math.floor(Date.now() / 1000) + 3600, // 1 hour validity
  nonce: randomBytes(32)
};
```

### 2. Submit to P402

Send the signed authorization to the settlement endpoint.

**Endpoint**: `POST https://p402.io/api/v1/facilitator/settle`

**Request Body**:
```json
{
  "tenantId": "...",
  "decisionId": "...",
  "asset": "USDC",
  "authorization": {
    "from": "0x...",
    "to": "0x...",
    "value": "1000000",
    "validAfter": 0,
    "validBefore": 1735689600,
    "nonce": "0x...",
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  }
}
```

### 3. Response

P402 will execute the transaction and return the transaction hash.

**Response Body**:
```json
{
  "settled": true,
  "facilitatorId": "p402-eip3009",
  "receipt": {
    "txHash": "0x...",
    "verifiedAmount": "1.0",
    "asset": "USDC",
    "timestamp": "2026-01-21T12:00:00Z"
  }
}
```

## Security Limits

- **Gas Limit**: P402 will reject settlements if gas prices on Base exceed configured limits (default 50 gwei).
- **Expiry**: Authorizations must be valid at the time of submission.
- **Micro-payments**: Minimum settlement amount is $0.01 USDC.
