import React from 'react'
import type { ArticleContent } from '../[slug]/page'

export const productArticles: Record<string, ArticleContent> = {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. How x402 works (partner edition)
  // ─────────────────────────────────────────────────────────────────────────────
  'how-x402-works-partner-edition-': {
    title: 'How x402 Works (Partner Edition)',
    category: 'Product Explainers',
    categorySlug: 'product',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          This article goes deeper than the public docs. Use it to answer hard technical questions from developer prospects and to understand exactly what P402 is doing under the hood when x402 payments are made.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Problem: AI Agents Can&apos;t Pay for Things</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Every AI agent deployment eventually hits the same wall: the agent needs to pay for something — an API call, a data record, a compute job, a toll for a downstream agent — and there is no machine-native way to do it. The options today are all bad:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Prepaid balance:</strong> fund a bucket, drain it blind. No per-call governance, no receipts, no real-time spend tracking. When it empties the agent silently fails.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Human in the loop:</strong> agent pauses, sends a Slack message, a human approves. Destroys the value proposition of autonomous AI entirely.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Shared API key:</strong> everything billed to one account with no attribution. Compliance nightmare. One compromised key takes down the whole operation.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Corporate card on file:</strong> someone's personal or company card is attached. Fine for prototypes, insane for production agentic systems making thousands of micro-purchases per day.</span></li>
        </ul>

        <p className="text-sm text-neutral-700 leading-relaxed">
          x402 fixes this by making payments machine-native. Payments happen inside the HTTP request itself — no redirect, no checkout UI, no human approval required. The agent signs a cryptographic authorization, the facilitator executes the on-chain transfer, and the resource is returned. The whole round-trip is a single HTTP exchange.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The History: HTTP 402 Was Always Meant for This</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          HTTP 402 "Payment Required" was defined in 1996 alongside 401 and 403 and has been reserved ever since. For nearly 30 years it sat unused because there was no standard payment mechanism for HTTP. x402 is the first real implementation: a protocol that actually uses 402 the way it was always intended. When a resource requires payment, the server returns a 402 with payment requirements. The client pays. The server delivers. Simple.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Step-by-Step: How a Payment Flows</h2>

        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`AGENT                      P402 FACILITATOR            USDC CONTRACT (Base)
  │                               │                              │
  │  1. Agent wants to access     │                              │
  │     a paid API endpoint       │                              │
  │                               │                              │
  │  2. Agent signs EIP-3009      │                              │
  │     TransferWithAuthorization │                              │
  │     (like a pre-signed check) │                              │
  │                               │                              │
  │──── POST /api/v1/... ────────►│                              │
  │     X-Payment: <signed-auth>  │                              │
  │                               │                              │
  │                3. Facilitator │                              │
  │                   verifies:   │                              │
  │                   - sig valid │                              │
  │                   - amount OK │                              │
  │                   - not replay│                              │
  │                   - not expired                              │
  │                               │                              │
  │                4. Facilitator │──── transferWithAuth() ─────►│
  │                   executes    │     (pays gas itself)        │
  │                   on-chain    │                              │
  │                               │◄─── tx confirmed ───────────│
  │                               │     (~2s on Base)            │
  │                               │                              │
  │◄─── 200 OK ──────────────────│                              │
  │     X-Payment-Receipt: <hash> │                              │
  │     [full API response]       │                              │
  │                               │                              │`}</code></pre>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The key insight: the payment and the API call are a single HTTP round-trip. From the agent's perspective it sends one request and gets one response. The payment rails are invisible.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">EIP-3009: The Pre-Authorized Check Analogy</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          EIP-3009 defines <code>transferWithAuthorization</code> — a USDC function that lets the <em>token holder</em> sign a permission offline, and lets a <em>third party</em> submit that permission to the blockchain later. Think of it as writing a check: you sign the check now, you hand it to someone, and they cash it at the bank without needing you to be present.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The authorization includes:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>from / to:</strong> payer address and recipient (P402 treasury)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>value:</strong> exact USDC amount in atomic units (6 decimals — so $1.00 = 1,000,000)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>validAfter / validBefore:</strong> the window during which the check can be cashed. After validBefore passes, the authorization is void.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>nonce:</strong> a 32-byte random value used exactly once. Prevents the same authorization from being submitted twice (replay protection).</span></li>
        </ul>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The agent signs this data structure using EIP-712 (structured data signing — the same standard MetaMask uses for "Sign This Message" prompts). P402 verifies the signature before submitting anything on-chain, so a malformed or tampered authorization is caught at the HTTP layer, before touching the blockchain.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Why Base Mainnet?</h2>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Speed:</strong> ~2 second block finality. By the time the HTTP response is assembled, the transaction is confirmed. No waiting.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Cost:</strong> gas per transaction typically under $0.001. Economically viable for sub-cent micropayments — the use case x402 is built for.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>USDC native:</strong> Circle&apos;s native USDC is deployed on Base. This is not a bridge token or a wrapped asset — it&apos;s the real thing, redeemable 1:1 for USD at Circle.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Coinbase-backed:</strong> Institutional trust. Coinbase is a regulated US exchange and custodian. This matters for enterprise and compliance conversations.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>EVM-compatible:</strong> all existing Ethereum tooling works — Hardhat, Foundry, viem, ethers.js. No bespoke toolchain required.</span></li>
        </ul>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Gasless Model: Who Pays Gas and Why</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The agent (payer) does not pay gas. The P402 facilitator pays gas on every transaction. This is not charity — it&apos;s economically rational:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Gas on Base is cheap enough (sub-$0.001) that it can be absorbed into P402&apos;s platform fee without being material.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Requiring agents to hold ETH for gas would be a massive adoption barrier. Every agent wallet would need to be pre-funded with native token just to participate. The gasless model eliminates this entirely.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>The facilitator controls gas submission, which means it can set appropriate gas price limits and protect against gas spike attacks. P402 rejects settlement if Base gas exceeds a configured ceiling (currently 50 gwei).</span></li>
        </ul>

        <p className="text-sm text-neutral-700 leading-relaxed">
          From the agent&apos;s perspective: hold USDC, spend USDC. No ETH, no gas math, no gas estimation. The payment amount is exactly what was authorized — not authorization-minus-gas-fee.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">x402 vs. the Alternatives</h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Dimension</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">x402 (P402)</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Stripe</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Corporate Card</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Prepaid Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Machine-native</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Yes — HTTP header</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">No — requires redirect or saved PM</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">No — human attaches card</td>
              <td className="border border-neutral-200 px-3 py-2">Partial — pre-funded</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Per-call receipts</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Yes — on-chain tx hash</td>
              <td className="border border-neutral-200 px-3 py-2">Yes — Stripe event</td>
              <td className="border border-neutral-200 px-3 py-2">No — monthly statement</td>
              <td className="border border-neutral-200 px-3 py-2">No — balance delta only</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Minimum viable amount</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">$0.01 USDC</td>
              <td className="border border-neutral-200 px-3 py-2">~$0.30 (fee floor)</td>
              <td className="border border-neutral-200 px-3 py-2">Not practical sub-$1</td>
              <td className="border border-neutral-200 px-3 py-2">Depends on platform</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Spend governance</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">AP2 mandates — per-agent limits</td>
              <td className="border border-neutral-200 px-3 py-2">None built-in</td>
              <td className="border border-neutral-200 px-3 py-2">Card limit only</td>
              <td className="border border-neutral-200 px-3 py-2">Balance ceiling only</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Replay protection</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">On-chain nonce, DB-backed</td>
              <td className="border border-neutral-200 px-3 py-2">Idempotency keys</td>
              <td className="border border-neutral-200 px-3 py-2">Bank-level</td>
              <td className="border border-neutral-200 px-3 py-2">Platform-dependent</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Fiat settlement</td>
              <td className="border border-neutral-200 px-3 py-2">USDC (stable, redeemable)</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Native fiat</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Native fiat</td>
              <td className="border border-neutral-200 px-3 py-2">Depends</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Gas cost to payer</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Zero</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Zero</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Zero</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Zero</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Works agent-to-agent</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Yes — A2A protocol</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">No</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">No</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">No</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Audit trail</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Immutable — Base blockchain</td>
              <td className="border border-neutral-200 px-3 py-2">Stripe dashboard</td>
              <td className="border border-neutral-200 px-3 py-2">Bank statement</td>
              <td className="border border-neutral-200 px-3 py-2">Platform logs only</td>
            </tr>
          </tbody>
        </table>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Handling Common Objections</h2>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">"Crypto is too complex for our team"</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The agent developer never touches crypto directly. P402 provides an SDK and an OpenAI-compatible API. The only visible change is the base URL and a USDC wallet address. Everything cryptographic — key management, EIP-712 signing, on-chain submission — is handled by P402 and the CDP wallet infrastructure. If they can use the OpenAI SDK, they can use P402.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">"What if gas prices spike?"</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          P402&apos;s facilitator checks gas price before every settlement. If Base gas exceeds the configured ceiling (currently 50 gwei), the settlement is rejected with a <code>GAS_LIMIT_EXCEEDED</code> error and the payment is not submitted. The agent gets a clean error response and can retry later or fall back to a different payment scheme. No stuck transactions, no runaway gas costs.
        </p>
        <p className="text-sm text-neutral-700 leading-relaxed">
          In practice, Base has never come close to 50 gwei. The realistic gas cost per settlement is under $0.001 at current levels.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">"What about regulation? Is this legal?"</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          USDC is issued by Circle, a regulated financial institution operating under US money transmitter licenses. Base is operated by Coinbase, a publicly listed company on NASDAQ. x402 transactions are USD stablecoin transfers — economically equivalent to a wire transfer or ACH payment. They are not securities, not speculative assets, not gambling tokens. This is the most regulatory-friendly crypto payment rail available today.
        </p>
        <p className="text-sm text-neutral-700 leading-relaxed">
          For enterprise clients concerned about compliance, the full on-chain audit trail is actually an advantage: every payment is cryptographically signed, immutably recorded, and inspectable by a regulator without needing to trust a third-party database.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">"Why not just use Stripe?"</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Stripe is designed for human checkout flows. It requires a saved payment method (card or bank), a human to attach it, and cannot natively accept payments from an autonomous agent that doesn&apos;t have a Stripe customer account. You can hack around this with prepaid Stripe balances, but you lose per-call attribution, replay protection, and governance. Stripe also has a minimum charge economics problem — the fee floor makes sub-dollar micropayments unviable. x402 handles $0.01 settlements without the math breaking.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Real Use Cases to Pitch</h2>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Metered API Access for Agents</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          A data provider charges per record lookup. Rather than monthly subscriptions, they expose their API with x402 — each lookup costs $0.02 USDC, paid automatically by the calling agent. No accounts, no invoicing, no churn. The data provider gets paid instantly for every call.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Autonomous Research Agents</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          A research agent is given a budget (AP2 mandate: $50/day, category: research APIs). It autonomously browses paid databases, downloads reports, queries specialized LLMs — spending as needed, never exceeding the mandate. No human approvals. Full spend log for the compliance team.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Multi-Agent Pipelines with Automatic Cost Allocation</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          An orchestrator agent hires specialized sub-agents from the P402 Bazaar — a legal review agent, a translation agent, a data enrichment agent. Each sub-agent charges via x402. The orchestrator&apos;s spend is logged with full attribution: which sub-agent, which task, which amount, which on-chain receipt. The client gets an itemized bill with blockchain-verifiable line items.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Partner tip:</strong> The multi-agent pipeline use case is the hardest for competitors to replicate. It requires both the A2A protocol (for agent-to-agent communication) and x402 (for inter-agent payments) working together. Neither Stripe nor OpenAI&apos;s API provides this combination. Lead with this when talking to enterprise AI teams.
        </div>

      </div>
    ),
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Why AP2 Mandates Matter
  // ─────────────────────────────────────────────────────────────────────────────
  'why-ap2-mandates-matter': {
    title: 'Why AP2 Mandates Matter',
    category: 'Product Explainers',
    categorySlug: 'product',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          AP2 mandates are the governance layer that sits on top of x402 payments. This article is for conversations with business stakeholders, compliance teams, and anyone asking "how do we control what the AI is spending."
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Governance Gap in Agentic AI</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Every organization deploying AI agents eventually asks the same question: "How do we know what the AI is spending, and how do we stop it from going over budget?" Today, there is no standard answer. Teams improvise with prepaid API credits, manual review processes, or simply accepting the risk of uncontrolled spend. None of these scale.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The deeper problem is structural: traditional payment systems were built for humans, not agents. A corporate card has a limit, but that limit applies to the whole card — not to a specific agent, a specific task category, or a specific time window. There is no standard that says "agent X is authorized to spend up to $500 per week on data APIs, nothing else, and that authorization expires in 30 days." AP2 creates that standard.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Mandate Anatomy</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          An AP2 mandate is a signed spending authorization with five key fields:
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Field</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Type</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">What It Controls</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono text-xs">user_did</td>
              <td className="border border-neutral-200 px-3 py-2">DID string</td>
              <td className="border border-neutral-200 px-3 py-2">Who issued the mandate (the human authorizer)</td>
              <td className="border border-neutral-200 px-3 py-2 font-mono text-xs">did:p402:tenant:acme-corp</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono text-xs">agent_did</td>
              <td className="border border-neutral-200 px-3 py-2">DID string</td>
              <td className="border border-neutral-200 px-3 py-2">Which agent is authorized to spend</td>
              <td className="border border-neutral-200 px-3 py-2 font-mono text-xs">did:p402:agent:sales-enricher-v2</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono text-xs">max_amount_usd</td>
              <td className="border border-neutral-200 px-3 py-2">number</td>
              <td className="border border-neutral-200 px-3 py-2">Lifetime budget ceiling for this mandate</td>
              <td className="border border-neutral-200 px-3 py-2">500.00</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono text-xs">allowed_categories</td>
              <td className="border border-neutral-200 px-3 py-2">string[]</td>
              <td className="border border-neutral-200 px-3 py-2">What categories of spend are permitted</td>
              <td className="border border-neutral-200 px-3 py-2 font-mono text-xs">["data-enrichment", "web-search"]</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono text-xs">valid_until</td>
              <td className="border border-neutral-200 px-3 py-2">ISO 8601 date</td>
              <td className="border border-neutral-200 px-3 py-2">Hard expiry — mandate void after this date</td>
              <td className="border border-neutral-200 px-3 py-2 font-mono text-xs">2025-05-01T00:00:00Z</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Every time the agent makes a payment through P402, the system checks: Is this mandate still active? Has the budget been exceeded? Is this category allowed? Is it within the validity window? Only if all four conditions pass does the payment proceed. On failure, the agent gets a specific error code — <code>MANDATE_BUDGET_EXCEEDED</code>, <code>MANDATE_EXPIRED</code>, <code>MANDATE_CATEGORY_DENIED</code> — allowing it to handle each case gracefully rather than crashing.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Autonomy Spectrum</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          There are three positions on the AI spending governance spectrum, and most organizations should not be at either extreme:
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Mode</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">How it works</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Problem</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Fully Manual</td>
              <td className="border border-neutral-200 px-3 py-2">Human approves every spend request</td>
              <td className="border border-neutral-200 px-3 py-2">Eliminates agent autonomy. 100 API calls/day = 100 approval interruptions.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold text-success">Mandate-Governed ✓</td>
              <td className="border border-neutral-200 px-3 py-2">Human sets limits once. Agent operates freely within them.</td>
              <td className="border border-neutral-200 px-3 py-2">None — this is the right model.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold text-error">Fully Autonomous</td>
              <td className="border border-neutral-200 px-3 py-2">No limits. Agent can spend anything.</td>
              <td className="border border-neutral-200 px-3 py-2">Single prompt injection or bug = unlimited liability.</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Mandate governance delivers the value of autonomy (the agent doesn&apos;t need to interrupt a human for every call) while preserving human control (the human decides the parameters, and any spend outside those parameters is cryptographically blocked).
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Enterprise Angle: How to Pitch Compliance Teams</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Use this framing with CFOs and procurement teams:
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          "Think of an AP2 mandate as a corporate card with programmable limits — except instead of applying to a department, it applies to a specific AI agent. Instead of a monthly limit, it can be per-task or per-week. Instead of trusting an employee to stay within bounds, the protocol enforces it cryptographically. And every transaction comes with a blockchain-verifiable receipt."
        </div>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Key compliance benefits to emphasize:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Signed authorization:</strong> the mandate signature is cryptographic proof that a human authorized the spend. This is not a policy in a Google Doc — it&apos;s a cryptographically signed record.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Immutable audit trail:</strong> every mandate use is logged with the mandate ID, amount spent, category, and timestamp. Immutable because the underlying settlement is on-chain.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Budget tracking that doesn&apos;t require trust:</strong> <code>amount_spent_usd</code> is incremented atomically with each settlement. The system cannot be manipulated by the agent to exceed its budget.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Instant revocation:</strong> a mandate can be revoked at any time. The agent loses payment access immediately — no need to rotate API keys or wait for a billing cycle.</span></li>
        </ul>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Real Workflow Example: Sales Agent with Data Budget</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Let&apos;s walk through a concrete scenario: a sales operations team deploys an AI agent that enriches CRM leads with third-party data. The compliance team needs controls.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Step 1 — Mandate Issuance</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`POST /api/a2a/mandates
{
  "type": "payment",
  "agent_did": "did:p402:agent:sales-enricher-prod",
  "constraints": {
    "max_amount_usd": 500,
    "allowed_categories": ["data-enrichment", "company-lookup"],
    "valid_until": "2025-05-01T00:00:00Z"
  }
}

Response: { "id": "mand_8xkP2...", "status": "active" }`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Step 2 — Agent Operates</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The agent runs for days, calling data enrichment APIs. Each API call costs $0.05–$0.25 USDC. The mandate ID is embedded in the agent&apos;s session. P402 validates the mandate on every settlement: Is it active? Is this category allowed? Has the budget been exceeded?
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Step 3 — Budget Tracking</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`Day 1:  amount_spent_usd = 42.30   (846 records enriched)
Day 3:  amount_spent_usd = 148.75
Day 7:  amount_spent_usd = 387.40
Day 9:  amount_spent_usd = 498.20

Next call: agent attempts to spend $3.00
→ 498.20 + 3.00 = 501.20 > 500 limit
→ ERROR: MANDATE_BUDGET_EXCEEDED
→ Agent logs the error, pauses, notifies ops team`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Step 4 — Mandate Exhausted, Human Decision Point</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The mandate status changes to <code>exhausted</code>. The ops team receives a notification. They review the spend log (full audit trail available), decide whether to issue a new mandate for the next period, and either do so or don&apos;t. The agent cannot spend another cent until a new mandate is issued. This is exactly the control a CFO wants.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Step 5 — Renewal (if approved)</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The ops team issues a new mandate for the next month with the same constraints (or adjusted based on the spend report). The cycle repeats. The human is in control of the envelope, the agent is in control of execution within it.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Partner Distribution Angle: AP2 as a Managed Service</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          For partners who work with enterprise clients, AP2 mandate governance is a billable managed service layer, not just a feature. Specifically:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Mandate design consulting:</strong> help clients define appropriate budget envelopes, category taxonomies, and renewal cadences for each agent role in their organization.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Reporting dashboards:</strong> build on top of P402&apos;s mandate API to deliver weekly spend reports, budget utilization alerts, and mandate renewal workflows to client stakeholders.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Compliance packaging:</strong> package the mandate audit trail + on-chain receipts into a format that satisfies internal audit requirements. Sell this as an "AI spend compliance" deliverable.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Multi-agent governance architecture:</strong> design mandate hierarchies for complex pipelines — orchestrator mandate, sub-agent mandates, category splits. This is architectural work that commands consulting rates.</span></li>
        </ul>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Partner tip:</strong> When AP2 governance prevents a budget overrun, the client sees P402 (and you) as the system that protected them. That is a much stickier positioning than "we saved you 30% on LLM costs." Frame AP2 as risk management infrastructure, not a spend feature.
        </div>

      </div>
    ),
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Bazaar Distribution Model
  // ─────────────────────────────────────────────────────────────────────────────
  'bazaar-distribution-model': {
    title: 'Bazaar Distribution Model',
    category: 'Product Explainers',
    categorySlug: 'product',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          The Bazaar is an open marketplace of AI agents. This article explains what it is, how it works, and three specific ways partners can use it as a distribution channel — for clients and for their own business.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">What the Bazaar Is</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The P402 Bazaar is a registry of AI agents with standardized capability manifests. Think of it as npm for agents, or an app store where every listing is an autonomous AI service that can be discovered, hired, and paid programmatically — without human intermediation.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Each listed agent publishes an <strong>AgentCard</strong> — a structured JSON manifest following the Google A2A specification — at a well-known URL (<code>/.well-known/agent.json</code>). The AgentCard describes what the agent does, what it costs, what protocols it speaks, and what capabilities it offers. Buyers can query the Bazaar API to discover agents by capability, category, price range, and reputation score.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The key difference from a traditional API marketplace: the Bazaar is designed for <em>agents to hire other agents</em>, not just for humans to browse. An orchestrator agent can query the Bazaar at runtime, select an appropriate sub-agent based on capability tags and reputation, and hire it — all without human involvement.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">How Agents Get Listed</h2>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Step 1 — Publish an AgentCard</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The agent operator hosts an AgentCard at <code>/.well-known/agent.json</code>. This manifest declares the agent&apos;s identity, capabilities, skills, pricing, and protocol support (A2A, x402, ERC-8004 identity).
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`{
  "protocolVersion": "1.0",
  "name": "Legal Contract Analyzer",
  "description": "Extracts key terms and risk flags from contracts",
  "url": "https://legal-agent.example.com",
  "capabilities": { "streaming": true },
  "skills": [
    {
      "id": "contract-review",
      "name": "Contract Review",
      "description": "Review a contract and return structured risk report",
      "tags": ["legal", "contracts", "risk-analysis"]
    }
  ],
  "extensions": [
    { "uri": "tag:x402.org,2025:x402-payment" }
  ]
}`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Step 2 — Submit to the Bazaar</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`POST /api/a2a/agents
Authorization: Bearer <api-key>
{
  "agent_url": "https://legal-agent.example.com",
  "price_per_task_usdc": "0.50",
  "category": "legal",
  "tags": ["contracts", "risk-analysis", "compliance"]
}`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Step 3 — Safety Scanner Review</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          P402&apos;s automated safety scanner fetches the AgentCard, validates the manifest schema, checks for known malicious patterns, and verifies that the declared endpoint is reachable. This happens automatically — most agents are live within minutes. Agents flagged by the scanner are quarantined for manual review before appearing in Bazaar search results.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Step 4 — Live on Bazaar</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Once approved, the agent appears in Bazaar search results with its capability tags, price, and initial reputation score. As it completes tasks and receives feedback, its ERC-8004 reputation score updates — raising or lowering its position in discovery rankings.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Discovery and Hiring</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Buyers (human or agent) discover agents via the Bazaar API:
        </p>

        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`GET /api/a2a/bazaar?tags=legal,contracts&max_price_usdc=1.00&min_reputation=0.7

Response:
[
  {
    "agent_id": "ag_xyz...",
    "name": "Legal Contract Analyzer",
    "price_per_task_usdc": "0.50",
    "reputation_score": 0.91,
    "tasks_completed": 4821,
    "tags": ["legal", "contracts", "risk-analysis"]
  },
  ...
]`}</code></pre>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Once a buyer selects an agent, they initiate a task via the A2A protocol. The agent executes. The buyer pays via x402. The receipt is returned with the response. The entire exchange is logged, attributed, and visible in the buyer&apos;s P402 dashboard.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Full Payment Flow</h2>

        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`Buyer Agent                Bazaar / P402                  Listed Agent
    │                           │                               │
    │── GET /api/a2a/bazaar ───►│                               │
    │   [tags=legal]            │                               │
    │◄─ agent listing ──────────│                               │
    │                           │                               │
    │── POST /api/a2a/tasks ───►│                               │
    │   { agent_id, task }      │                               │
    │                           │──── forward task ────────────►│
    │                           │                               │── executes
    │                           │◄─── task result ──────────────│
    │                           │                               │
    │                    verify x402 payment                     │
    │                    settle on-chain (Base)                  │
    │                    log receipt                             │
    │                           │                               │
    │◄─ 200 OK + receipt ───────│                               │
    │   X-Payment-Receipt: ...  │                               │`}</code></pre>

        <p className="text-sm text-neutral-700 leading-relaxed">
          For small amounts (under a configurable threshold), the payment settles immediately. For larger deals, P402 escrow can hold funds until the task is verified complete — protecting both buyer and seller.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">ERC-8004 Reputation: How Trust Works</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Every listed agent has an on-chain reputation score maintained by the ERC-8004 protocol. This is not a star rating stored in P402&apos;s database — it&apos;s a smart contract on Base that records verifiable feedback from completed tasks. The score is:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Tamper-proof:</strong> stored on-chain, not editable by P402 or the agent operator</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Accumulated:</strong> each completed task with positive feedback raises the score; disputes or failures lower it</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Queryable:</strong> any orchestrator can read an agent&apos;s reputation before hiring it — no need to trust P402&apos;s ranking algorithm</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Portable:</strong> reputation follows the agent, not the platform. An agent with high ERC-8004 score carries that trust to any platform implementing the standard.</span></li>
        </ul>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Higher reputation scores directly translate to better Bazaar discovery placement. This incentivizes agent operators to maintain quality and handle disputes fairly — the score is their economic livelihood on the marketplace.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Distribution Angles for Partners</h2>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Angle 1 — List a Client&apos;s Agent, Give Them Inbound Demand</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          If a client has built a specialized AI capability — legal document analysis, financial modeling, industry-specific data processing — list it on the Bazaar. This is a distribution channel the client doesn&apos;t have to build or market themselves. Other P402 tenants (potentially hundreds of companies) can discover and hire their agent. The client gets paying customers they didn&apos;t have. You get attribution credit on the revenue.
        </p>
        <p className="text-sm text-neutral-700 leading-relaxed">
          This is especially valuable for boutique AI consultancies whose clients have built one-off agents for internal use. Listing on the Bazaar turns a cost center (the client&apos;s AI budget) into a revenue stream.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Angle 2 — Build a Vertical-Specific Agent, Monetize via x402</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Partners can build and list their own agents. A partner specializing in legal tech builds a contract review agent, prices it at $0.50/task, lists it on the Bazaar. Every task completed generates USDC revenue — automatically, 24/7, with no sales process. The agent earns while you sleep.
        </p>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The economics work at small scales. At $0.50/task and 100 tasks/day that&apos;s $50/day, $1,500/month in USDC — from a single specialized agent running on minimal infrastructure. Build a portfolio of three to five agents across verticals you understand, and this becomes a meaningful recurring revenue stream.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Angle 3 — White-Label the Bazaar for Internal Marketplaces</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Large enterprises often want an internal agent marketplace — a curated catalog of approved AI agents that employees can hire, with spend governance and attribution baked in. Partners can build this on top of the P402 Bazaar API, white-labeled for the client&apos;s branding.
        </p>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The client gets: a governed, auditable internal AI marketplace. You get: a platform integration engagement, ongoing managed service revenue for curating the catalog, and deep integration with the client&apos;s IT and compliance infrastructure.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Revenue Model for Listed Agents</h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Party</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Gets</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Timing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Agent operator</td>
              <td className="border border-neutral-200 px-3 py-2">Price per task (USDC), minus platform fee</td>
              <td className="border border-neutral-200 px-3 py-2">Settled on-chain per task (~2s)</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">P402 platform</td>
              <td className="border border-neutral-200 px-3 py-2">Small platform fee (baked into settlement)</td>
              <td className="border border-neutral-200 px-3 py-2">Per transaction</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Referring partner</td>
              <td className="border border-neutral-200 px-3 py-2">Attribution credit on buyer tenant spend</td>
              <td className="border border-neutral-200 px-3 py-2">Monthly payout cycle</td>
            </tr>
          </tbody>
        </table>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Partner tip:</strong> Referral attribution stacks. If you referred a tenant AND that tenant uses Bazaar agents you listed, you earn on both sides. Structure client onboarding to maximize this: bring clients in as P402 tenants, list their agents on the Bazaar, and refer them to agents built by other clients you manage.
        </div>

      </div>
    ),
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Router vs. Direct API
  // ─────────────────────────────────────────────────────────────────────────────
  'router-vs--direct-api': {
    title: 'Router vs. Direct API',
    category: 'Product Explainers',
    categorySlug: 'product',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Use this article to handle the "why not just use OpenAI directly?" objection. It includes honest math, a migration guide, and an honest answer to when direct API is actually fine.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Full Comparison</h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Dimension</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Direct API (OpenAI, Anthropic, etc.)</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">P402 Router</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Cost optimization</td>
              <td className="border border-neutral-200 px-3 py-2">You pay list price, always</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Router selects cheapest provider capable of handling the request. Semantic cache eliminates cost entirely on hits.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Reliability / uptime</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">Single provider = single point of failure. OpenAI outages happen.</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Automatic fallback across 13+ providers. One goes down, the next is tried transparently.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Latency</td>
              <td className="border border-neutral-200 px-3 py-2">Fixed — whatever the provider gives you</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Speed mode routes to lowest p95 latency provider. Cache hits return in milliseconds.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Spend governance</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">None — spend is only visible after the fact in billing dashboard</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">AP2 mandates: per-agent limits, category controls, hard expiry. Enforced cryptographically before spend occurs.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Semantic cache</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">Not available</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Built-in. 30–60% hit rates on production workloads. Hits cost $0.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Payment rails</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">Not available — subscription billing only</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">x402 micropayments (EIP-3009 USDC on Base). Machine-native. Agent-to-agent payments supported.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Audit trail</td>
              <td className="border border-neutral-200 px-3 py-2">Provider billing dashboard — no per-request detail</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Full per-request log: model, provider, cost, latency, cache hit/miss, routing decision, on-chain receipt.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Model flexibility</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">Locked to one provider&apos;s model catalog</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">300+ models across 13+ providers. Switch models in one config change.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Vendor lock-in</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">High — code is coupled to provider SDK and model names</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">None — OpenAI-compatible API. Provider swaps are config changes, not code changes.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Intelligence layer</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">None</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Gemini 3 Flash (anomaly detection) + Gemini 3 Pro (protocol economics). Real-time and async optimization.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Setup time</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Minutes — get an API key, start calling</td>
              <td className="border border-neutral-200 px-3 py-2">~15 minutes for basic setup. Change base URL and API key. That&apos;s it for OpenAI-compatible usage.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Anomaly detection</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">None</td>
              <td className="border border-neutral-200 px-3 py-2 text-success font-bold">Real-time Sentinel (Gemini Flash) flags unusual spend patterns, potential prompt injection, suspicious usage.</td>
            </tr>
          </tbody>
        </table>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Cost Math: A Real Example</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          A realistic scenario: a team spending $2,000/month on OpenAI GPT-4 directly. Here&apos;s what the numbers look like on P402:
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Starting Point</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`Current spend:     $2,000/month (OpenAI GPT-4 direct, list price)
Request volume:    ~40,000 requests/month
Average cost/req:  $0.05`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Impact 1 — Semantic Cache (40% hit rate)</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`Cache hit rate:    40% (conservative — production averages 30–60%)
Requests cached:   16,000/month → $0 cost
Requests to LLM:   24,000/month

Spend after cache: 24,000 × $0.05 = $1,200/month
Savings from cache: $800/month`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Impact 2 — Cost-Mode Routing</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`P402 cost-mode routes to cheapest capable provider.
Many GPT-4-class tasks can be handled by:
  - DeepSeek V3:     ~$0.014/1K tokens (vs GPT-4's ~$0.060/1K)
  - Groq Llama 3.1:  ~$0.008/1K tokens
  - Mistral Large:   ~$0.024/1K tokens

Estimated blended cost after routing: $0.022/req (vs $0.050)
Savings on non-cached requests: 56%

Spend after cache + routing: 24,000 × $0.022 = $528/month`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Total</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`Before P402:           $2,000/month
After P402:            $528/month  (+ P402 platform fee, typically 5–8%)
Estimated total:       ~$570–$600/month

Monthly savings:       $1,400–$1,430
Annual savings:        $16,800–$17,160

ROI:                   Breakeven in day 1 for most usage patterns`}</code></pre>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Important:</strong> These numbers are estimates based on representative workloads. Actual savings vary significantly based on request diversity (highly unique requests cache poorly), task complexity (high-reasoning tasks need frontier models), and routing mode. Use these as directional guidance, not guarantees. P402&apos;s dashboard shows actual cache hit rates and routing decisions so clients can see real numbers within the first week.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Vendor Lock-In Argument</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          OpenAI has raised prices multiple times since GPT-4 launched. In early 2023, GPT-4 was priced at $0.06/1K output tokens. Prices have shifted. New models have introduced new pricing tiers. Each time this happened, teams using direct API had the same experience: unexpected cost increases, no leverage, and weeks of work to evaluate and migrate to a cheaper alternative.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The deeper problem with direct API is that your code becomes coupled to the provider:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>You import <code>openai</code> SDK (or <code>anthropic</code> SDK)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>You hardcode model names like <code>gpt-4o</code> or <code>claude-3-5-sonnet-20241022</code></span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>When you want to switch, you need to rewrite the integration, test it, and deploy — for every service that calls the LLM</span></li>
        </ul>

        <p className="text-sm text-neutral-700 leading-relaxed">
          With P402, the model name is a config parameter, not a code dependency. A price spike on one provider is a one-line config change that takes effect immediately — no deployment required.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Reliability Argument</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          OpenAI had multiple significant outages in 2023 and 2024. During an outage on a single-provider setup, your application is down. Period. If you&apos;re running customer-facing features on top of an LLM, that&apos;s unacceptable.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          P402&apos;s router maintains health probes for all registered providers. When a provider&apos;s health status degrades, the routing engine automatically deprioritizes it. When it goes down entirely, requests are routed to the next healthiest alternative — transparently, without any change to the calling code. The application stays up.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Migration: It Really Is Two Lines</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          If a client already has code using the OpenAI SDK, migration to P402 is literally two lines. The P402 <code>/api/v2/chat/completions</code> endpoint is 100% OpenAI-compatible — same request format, same response format, same streaming behavior.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Before (Direct OpenAI)</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // baseURL defaults to https://api.openai.com/v1
})

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
})`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">After (P402 Router)</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.P402_API_KEY,       // ← line 1: change API key
  baseURL: 'https://p402.io/api/v2',      // ← line 2: change base URL
})

const response = await client.chat.completions.create({
  model: 'gpt-4o',                        // ← still works, or change to any model
  messages: [{ role: 'user', content: 'Hello' }],
  // optional P402 extensions:
  // @ts-ignore
  // p402_routing_mode: 'cost',           // ← add P402-specific params as needed
})`}</code></pre>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The existing <code>model</code> parameter still works exactly as before — P402 will route the request to an appropriate provider for that model. Optionally, clients can use P402-specific extensions (<code>p402_routing_mode</code>, <code>p402_session_token</code>) to unlock routing controls and payment rails — but these are additive, not required.
        </p>

        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          Note for SDK usage: The OpenAI SDK will sometimes pass <code>Content-Type: application/json</code> headers that include an OpenAI-specific version header. P402 ignores these gracefully. If a client sees unexpected errors, have them check that they are not passing <code>defaultHeaders</code> that include OpenAI-specific values.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">When Direct API is Actually Fine</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Be honest with prospects. Direct API is the right choice if:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Spend is under $50/month:</strong> the absolute savings don&apos;t justify the integration overhead or P402 platform fees at this scale. A hobbyist or early prototype should stay on direct API.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Zero governance requirements:</strong> a personal project with no compliance needs, no multi-agent setup, and no business stakeholders has no use for AP2 mandates or audit trails.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Highly specialized model dependency:</strong> if the use case genuinely requires a specific frontier model that cannot be approximated by any alternative (e.g., a task specifically fine-tuned on OpenAI infrastructure), routing adds latency without savings.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Pure prototype validation:</strong> when you&apos;re in the first two weeks of a proof of concept with a single developer, direct is simpler. Come back to P402 when the prototype is proving out and cost/governance becomes real.</span></li>
        </ul>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Not every prospect should buy P402. The clients who should are those where: AI spend is $100+/month and growing, there are multiple AI-powered features or agents, governance and audit trail matter, or they are building towards autonomous agent deployments that will need payment rails.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Closing Argument</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Direct API gives you access to a model. P402 gives you access to an intelligence + payment infrastructure layer. The two are not the same thing.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          A direct OpenAI integration will never tell you that your request was semantically identical to one answered 4 minutes ago and could have been served for free. It will never automatically fall back to Anthropic when OpenAI is slow. It will never enforce that your sales agent can only spend $500 this week, cryptographically, at the protocol level. It will never let your agent pay another agent for a subtask and produce a blockchain-verifiable receipt for the transaction.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          These capabilities exist at the infrastructure layer. They cannot be bolted on top of a direct API integration without significant custom engineering — the kind that P402 has already done and continues to maintain and improve.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Partner close:</strong> "You can build all of this yourself — routing logic, semantic cache, fallback handling, payment rails, mandate enforcement, anomaly detection. It would take your team months and you&apos;d be maintaining it forever. P402 is that infrastructure, available today, for the price of a percentage point on your LLM spend."
        </div>

      </div>
    ),
  },

}
