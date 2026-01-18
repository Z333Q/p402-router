# @p402/sdk

The official TypeScript SDK for the P402 Payment Router.

## Installation

```bash
npm install @p402/sdk viem
```

## Quick Start

### 1. Initialize Client
```typescript
import { P402Client } from '@p402/sdk';

const client = new P402Client({
  routerUrl: 'https://p402.io',
  debug: true
});
```

### 2. Perform Checkout
The SDK handles the API coordination. You just need to provide a way to sign the transaction (using wagmi, ethers, or pure viem).

```typescript
// Example using wagmi's sendTransactionAsync
import { useSendTransaction } from 'wagmi';

const { sendTransactionAsync } = useSendTransaction();

const result = await client.checkout(
  {
    amount: "10.00",
    network: "eip155:8453" // Base Mainnet
  },
  // The SDK calls this function when it's time to sign
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
} else {
  console.error("Failed:", result.error);
}
```

### 3. Fee Transparency
The P402 Protocol enforces a **1% flat fee** on all transactions via its smart contract. To ensure trust, you should display a breakdown to your user before the wallet confirmation:

- **Service Price**: $10.00 USDC
- **P402 Fee (1%)**: $0.10 USDC
- **Total**: $10.10 USDC

The `client.checkout` call will automatically calculate this total and request the corresponding amount from the user's wallet.

## Features
- **Auto-Planning**: Negotiates payment policy with the router automatically.
- **Auto-Settlement**: Automatically calls the `/settle` endpoint after transaction broadcast.
- **Type-Safe**: Full TypeScript support for Request and Response objects.
