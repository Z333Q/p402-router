# mpp.dev Registry Submission — @p402/mpp-method v0.1.0

Prepared for submission to the mppx payment method registry.

## Package metadata

```yaml
name: "@p402/mpp-method"
version: "0.1.0"
npm: "https://www.npmjs.com/package/@p402/mpp-method"
repository: "https://github.com/Z333Q/p402-protocol/tree/main/packages/mpp-method"
homepage: "https://p402.io"
author: "P402 Protocol <dev@p402.io>"
license: MIT
```

## Methods exported

### `p402` (p402Charge)

```yaml
method_name: p402
intent: charge
rails:
  - tempo   # Tempo mainnet (TIP-20 stablecoins, chain 4217)
  - base    # Base mainnet (EIP-3009 USDC, chain 8453) — Phase 3.2
  - auto    # Router-selected based on health + cost
currencies:
  - USDC.e  # Tempo mainnet
  - USDC    # Base mainnet (Phase 3.2)
  - EURC    # Base mainnet (Phase 3.2)
credential_scheme: "P402 session token + ECDSA signature"
settlement: "P402 multi-rail router (on-chain Phase 3.2)"
status: "v0.1 — schema + stub verify; settlement Phase 3"
```

### `base` (baseCharge)

```yaml
method_name: base
intent: charge
rails:
  - base         # Base mainnet (chain 8453)
  - base-sepolia # Base Sepolia (chain 84532)
currencies:
  - USDC  # 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (mainnet)
  - EURC  # 0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42 (mainnet)
credential_scheme: "EIP-3009 TransferWithAuthorization + EIP-712 signature"
settlement: "transferWithAuthorization gasless (Phase 3.2)"
status: "v0.1 — offline sig verification; on-chain execution Phase 3"
```

## Description (for registry listing)

> P402 payment methods for mppx — multi-rail AI micropayments with Tempo mainnet
> TIP-20 stablecoins and Base mainnet EIP-3009 USDC/EURC. Ships with hardened input
> validation (format guards before all BigInt/crypto operations), offline EIP-712
> signature verification, and a Redis-backed AtomicStore integration.
>
> Part of the P402 AI Payment Router — an autonomous agentic orchestration platform
> for production AI micropayments. Fully typed TypeScript, ESM, Node ≥ 20.

## Integration snippet (for registry page)

```ts
import { Mppx } from 'mppx/server';
import { p402Charge } from '@p402/mpp-method';

const mppx = Mppx.create({
  methods: [p402Charge],
  secretKey: process.env.MPP_SECRET_KEY!,
});

// Gate any handler:
export const POST = mppx.charge({ amount: '0.001', recipient: '0x...' })(
  async (req) => new Response('Paid access granted')
);
```

## Peer dependencies

```json
{
  "mppx": ">=0.6.14",
  "viem": ">=2.48.0"
}
```

## Tags

`p402`, `mppx`, `payments`, `ai`, `micropayments`, `x402`, `base`, `tempo`,
`usdc`, `agents`, `eip-3009`, `eip-712`, `gasless`

## Submission checklist

- [x] Package published to npm: `@p402/mpp-method@0.1.0`
- [x] TypeScript declarations included (`dist/*.d.ts`)
- [x] ESM-only (`"type": "module"`)
- [x] Peer deps declared (mppx, viem)
- [x] README.md with schema tables and quick-start code
- [x] Security-hardened input validation (Phase 2.4.0)
- [x] Load test + atomicity decision documented (Phase 2.4.5)
- [ ] Submit PR / form at mpp.dev registry
