# Deck Insert: "The Unified Agent Stack"

Insert this slide **after Slide 7 (The Platform)** and **before Slide 8 (Live Demo)**.

## Slide title
**The Unified Agent Stack**

## Visual layout

### Left: Tether stack (local agent wallet)
Label: **The Agent's Wallet (Local)**
- **WDK** (embedded self-custodial wallet runtime)
- **USDT0** (cross-chain stable liquidity representation)

### Center: P402 bridge
Label: **P402.io**
- Arrow from WDK -> P402: **WDK Native Plugin**
- Arrow from P402 -> Market: **x402 Payment Settlement**
- Footer under P402: **USDT0 Cross-Chain Routing**

### Right: market cloud
Label: **The Agent's Economy (Cloud)**
- OpenRouter
- OpenClaw
- External APIs

## Key bullets (on-slide)

- **WDK Native:** P402 provides a merchant-gateway path for WDK-enabled agents.
- **Liquidity Unlocked:** P402 routes USDT0 across Base, Arbitrum, and Mainnet for API bill settlement.
- **Zero-Friction Onramp:** Agents holding USDT0 can pay x402 invoices without forced USDC-first UX.

## Speaker notes (30-45 seconds)

"Tether is solving the agent wallet and liquidity side with WDK + USDT0. The missing piece is merchant-grade settlement into real API economies. P402 is that bridge: we accept signed payment intents from WDK wallets, route liquidity across chains, and settle into x402-compatible invoices for cloud services. This creates a unified stack where agents can hold stable value once and spend anywhere."

## Build notes for design

- Keep this slide visually consistent with Slide 7 color system.
- Animate arrows left->center->right to emphasize flow.
- Use chain badges (Base/Arbitrum/Mainnet) under USDT0 routing footer.
