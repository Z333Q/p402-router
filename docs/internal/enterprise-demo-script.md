# Enterprise Demo Script

Internal use only. Walks a buyer through the eight shipped product
surfaces in a coherent order. Every claim is bounded by the same scope
rules the codebase enforces: no live enforcement, no savings claim, no
policy auto-apply, no completed optimization, no production execution
narrative.

## Audience

A buyer responsible for AI spend governance — typically finance,
platform, or a CTO/CIO sponsor. They want to know:

1. Can you see what AI cost us?
2. Can you prove what was paid?
3. Can you tell us where caps should be without breaking traffic?
4. Can we govern this without a year-long rollout?

## Order

`Meter → Monitor → Settle → Control → Prove → Optimize Readiness →
Publish → Outcomes`

Each surface gets two minutes max. The shadow-decision evidence on
Control is the new headline.

## Surface walkthrough

### 1. Meter — `/dashboard/meter`

> "Every AI request lands here as a metered economic event. Provider,
> model, cost, tenant, department, employee. No prompt or response
> content. This is the source of truth for everything downstream."

Show the recent-requests list and the cost-per-request distribution.
Pin: metadata only.

### 2. Monitor — `/dashboard/monitor`

> "This is the operations view. Provider health, routing decisions,
> outbox state, cache hit rate. If something stops working, it shows
> up here first."

Pin: read-only.

### 3. Settle — `/dashboard/settle`

> "Every USDC settlement processed through the P402 facilitator. The
> ledger is `processed_tx_hashes`. The treasury address is a Basescan
> link — they can verify it themselves. The export bundle gives them
> audit-ready evidence."

Pin: read-only of a financial-integrity table; we never overwrite.

### 4. Control — `/dashboard/control`

**This is the headline.**

> "Governance readiness. Budget burn across four levels, allowlist
> status, denied spend, human review queue. The flip-readiness panel
> shows when the runtime is ready to enforce. The simulator lets you
> answer 'what would happen if we set this cap?' without writing any
> policy."

> "And down here — the shadow decisions panel — is the new piece.
> It records what tenant caps would have denied if they were
> enforcing. The request still completed; the provider was still
> called; we just logged the would-have-denial as evidence. The
> table is live in production and the panel reads from Postgres;
> only metadata is stored — no prompt or response content. The
> writer itself is default-off and gated on a tenant-scoped flag,
> so persistence is opt-in per tenant. Runtime enforcement stays
> blocked until that decision is taken in a separate, approved
> slice."

Pin: shadow is observational evidence. Persistence is evidence
capture, not enforcement. Enforcement is a separate, gated
decision.

### 5. Prove — `/dashboard/prove`

> "Prove is the audit-ready surface. Cost per accepted outcome, not
> cost per request. Thin data shows up as thin data; we do not paper
> over it."

Pin: cost per accepted output. Readiness analysis, not a claim.

### 6. Optimize Readiness — `/dashboard/optimize`

> "Optimize is not yet active. This page exists to explain what
> readiness gates have to close before recommendations can ship. It
> does not generate recommendations. It does not claim savings. When
> recommendations ship, they will show up with projected cost and
> quality, gated behind these same readiness checks."

Pin: readiness boundary, not recommendation surface. No savings
claim ever.

### 7. Publish — `/dashboard/publish`

> "Publish is the seller-side. The network discovery shape, your
> resources on the Bazaar, and the path to participate."

Pin: network-side surface. Read-only today.

### 8. Outcomes — `/dashboard/prove/outcomes`

> "Outcomes is the bridge between economics and quality. When an
> outcome event lands (accepted, rejected, human-reviewed), it
> attaches to the prior economic event so cost-per-accepted can be
> computed honestly."

Pin: outcome events are tenant-supplied. We do not synthesize them.

## Standing scope statements (use verbatim)

- "Runtime enforcement is not enabled. It remains blocked unless and
  until a separately approved slice introduces and tests it."
- "Shadow decisions are observational evidence. They never block a
  request."
- "Persistence is evidence capture, not enforcement. The writer is
  default-off and gated by a tenant-scoped flag; the dashboard
  renders a migration-pending state cleanly when the underlying
  table is absent."
- "Optimize is readiness analysis, not recommendations. There is no
  savings claim today."
- "Settle reads from `processed_tx_hashes`; the dashboard never
  writes to a financial-integrity table."

## Anti-patterns

Do not say:

- "We optimize your AI spend."
- "We will save you N percent."
- "Policies are applied automatically."
- "Live enforcement is on."
- "Recommendations are active."
- "We execute settlements from this dashboard."

Each of these is either untrue today or commits to a scope the
product has not approved.

## Closing

> "The honest version of this product is: metering you can audit,
> settlements you can verify on-chain, governance evidence you can
> watch in shadow before you act on it, and a readiness boundary
> that tells you exactly what has to happen before optimization can
> ship. The next decisions — persistent shadow evidence at scale,
> then enforcement — are operator-gated, not automatic."
