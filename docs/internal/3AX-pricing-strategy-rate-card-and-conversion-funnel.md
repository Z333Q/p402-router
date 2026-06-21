# 3AX: Pricing Strategy, Rate Card, and Conversion Funnel Source of Truth

**Status:** docs only. No code, no public surface change, no billing implementation, no SQL, no Neon, no Redis, no migration, no deploy, no production mutation, no tenant-visible Optimize recommendations, no savings proof, no policy auto-apply, no runtime enforcement.
**Predecessors:** `docs/internal/PRICING-deep-research-report.md` (deep market research).
**Status of this document:** canonical. Where this conflicts with any other artifact, this document wins. Effective until superseded by 3AX-v2.

## 0. Hard boundaries (true throughout 3AX)

- No code in this slice.
- No public surface (homepage, pricing page, trust page, docs, dashboard) modified by this slice.
- No billing system change. No Stripe, Metronome, or Neon write.
- No claim of verified savings anywhere in this document.
- No claim of policy auto-apply anywhere in this document.
- No claim of runtime enforcement being live anywhere in this document.
- No customer logo, testimonial, or named pilot used until written permission exists.
- No compliance certification claim (SOC 2 type II, ISO 27001, HIPAA, etc.) unless P402 actually holds it.

If any downstream surface, contract, or deck contradicts this document, the surface is wrong, not the document.

---

## 1. Executive pricing thesis

P402 prices and sells as **AI spend accountability and governance software for the enterprise**. The product motion is "make AI spend accountable before you try to optimize it." The pricing motion mirrors that: the buyer pays for accountability — the meter, the attribution, the controls, the evidence, the audit exports — and the eventual optimization is a deferred unlock, not the lead.

### 1.1 Why above commodity AI observability

Commodity AI observability (Helicone $79, Portkey $49, Langfuse Core $29) sells request traces, latency, and basic spend. That market is crowded, race-to-zero, and indistinguishable to the buyer once you compare three of them. P402's product surface is wider: per-request economic attribution, workflow-grade accountability, shadow-mode policy evaluation, outcome ingestion, audit-grade evidence exports, and a governance frame the buyer can take to procurement. Pricing P402 at commodity-trace levels collapses the positioning. The market reads $79 as "this is a tracing tool." P402 anchors Developer at **$249** to signal governance-grade product and to filter out tire-kickers.

### 1.2 Why below mature enterprise governance platforms at entry

Mature governance platforms (CloudZero, Apptio Cloudability, Kubecost Enterprise) require $100k+ ACV and a 3-6 month procurement cycle to enter. P402's product maturity, customer count, and reference density don't support that floor yet. A $60k Enterprise floor lets buyers self-select governance-buyer behavior without requiring them to assemble a CloudZero-scale procurement committee. The pricing meets P402 where its proof actually is: real product, thin reference set.

### 1.3 Why P402 should not lead with savings

Savings is the most expensive claim P402 could make today. The product correctly refuses to compute savings until a verified methodology exists (baseline window, approved change, post-period measurement, confidence interval). Pricing on savings (revenue share, success fee) implies a savings number already exists. That gap between pitch and product is where deals die. The rate card is **flat usage**, not performance-based. The Verified Savings module remains a deferred add-on with no price until the methodology ships.

### 1.4 Why P402 should not price as protocol usage only

P402's protocol surface (x402, A2A, AP2, ERC-8004) is real but is not the buyer's purchase reason. Enterprise buyers do not write checks for "x402 protocol access." They write checks for accountability, governance, and audit. Protocol-led pricing (charging per facilitator transaction, per A2A call) puts P402 in the same bucket as commodity payment rails and miscommunicates the product. Protocol usage is **infrastructure** that supports the accountability story; it is not the pricing axis.

### 1.5 Why metered AI events are the primary pricing metric

Three reasons:
1. **Operationally legible.** The buyer already counts AI requests; their finance team already pays per-request bills to OpenAI, Anthropic, etc. Counting metered AI events maps to a unit the buyer understands.
2. **Aligned with value.** P402's value increases linearly with AI activity. More requests → more attribution work, more controls evaluated, more evidence captured. Usage = work delivered.
3. **Comparable to the market.** New Relic (ingest GB), Sentry (errors, spans), Langfuse (units), Helicone (requests), Portkey (requests), Braintrust (processed data) all bill on operational metrics. Usage-based is the buyer's default expectation.

Seats, workflows, departments, and other dimensions become **expansion levers** inside plans, not the primary meter.

### 1.6 Why outcome records stay non-billable

Outcome records are the proof asset that justifies the upgrade from "accountability" to "Optimize Readiness." Billing per outcome would create the wrong incentive: customers under-report outcomes to manage cost. P402's whole next phase depends on outcome density. Outcome records are **non-billable forever** as a strategic commitment. They are the asset the customer brings into the relationship, not the asset they pay to write.

---

## 2. Competitive pricing benchmark

The table summarizes pricing logic per competitor and what P402 should copy or avoid. Sources: `docs/internal/PRICING-deep-research-report.md` and public pricing pages as of mid-2026.

### 2.1 Sentry

- **Entry pattern.** Free → Team $26/mo → Business $80/mo → custom Enterprise.
- **Usage metric.** Errors, logs GB, metrics GB, spans, replays.
- **Enterprise gates.** SAML/SCIM, audit, custom retention, dedicated support.
- **Security gates.** SAML at Business, advanced compliance at Enterprise.
- **Retention gates.** 30/90 days at lower tiers, custom at Enterprise.
- **Support gates.** Community → email → priority → dedicated.
- **Copy:** the multi-dimensional usage matrix (separate counters per data type), the clean free-to-paid path, the Business tier price as the "real teams" anchor.
- **Avoid:** Sentry's volume makes $26 Team viable. P402 lacks the volume; matching the price would just collapse the positioning.

### 2.2 New Relic

- **Entry pattern.** Free 100 GB/mo + 1 user → Standard $0.40/GB + user charges → Pro $349/user/mo annually → custom Enterprise.
- **Usage metric.** Data ingest GB, users, CCUs (compute units).
- **Enterprise gates.** Dedicated support, custom contract.
- **Copy:** the transparent per-GB unit price, the "free tier large enough to be real" generosity, the explicit user-price ladder.
- **Avoid:** New Relic's three-dimensional billing (ingest + users + compute) is confusing for buyers under 1000 employees. P402 should keep one primary metric.

### 2.3 Datadog

- **Entry pattern.** Free trial → Pro $15/host/mo → Enterprise $23/host/mo → custom for largest accounts.
- **Usage metric.** Hosts, custom metrics, ingest, indexed logs, APM hosts, RUM sessions.
- **Enterprise gates.** Premier support, SSO, audit logs, custom retention.
- **Copy:** the per-host tier ladder readability, the clean Pro/Enterprise binary.
- **Avoid:** Datadog's usage axis sprawl (15+ products with separate meters) confuses buyers. The bill-shock reputation is a cautionary tale. P402 publishes one number per plan and one overage rate; resist the urge to add dimensions.

### 2.4 Braintrust

- **Entry pattern.** Starter $0/mo → Pro $249/mo → custom Enterprise.
- **Usage metric.** Processed data GB, scores, token-based Topics.
- **Enterprise gates.** SSO, dedicated support, custom data retention.
- **Copy:** the $249 Pro anchor is the closest direct comparable for P402 Developer at $249. The "free instrumentation, pay when scaling" pattern.
- **Avoid:** Braintrust's evaluation framing doesn't match P402; copying the language too closely positions P402 as an evals tool.

### 2.5 Langfuse

- **Entry pattern.** Hobby free → Core $29/mo → Pro $199/mo → Enterprise $2,499/mo (~$30k ARR).
- **Usage metric.** Units (encompassing traces, observations, scores).
- **Enterprise gates.** SSO/SAML, dedicated support, SLA.
- **Copy:** the transparent unit pricing; the public Enterprise rate even though Enterprise is sales-led (signals "we know what enterprise costs").
- **Avoid:** Langfuse's Enterprise at $30k ARR is too low for P402's positioning. P402 anchors Enterprise at $60k+.

### 2.6 Helicone

- **Entry pattern.** Hobby free → Pro $79/mo → Team $799/mo → custom Enterprise.
- **Usage metric.** Requests, storage, retention, orgs.
- **Enterprise gates.** SSO, custom retention, dedicated support.
- **Copy:** the calculator-led pricing page; the clear overage rate per 1k requests; the Team tier as the "real teams" anchor.
- **Avoid:** Pro at $79 is the commodity AI gateway price. P402 must not be confused with this tier.

### 2.7 Portkey

- **Entry pattern.** Developer free → Production $49/mo → custom Enterprise.
- **Usage metric.** Recorded logs/requests.
- **Enterprise gates.** SSO, custom retention, dedicated support.
- **Copy:** the explicit "Production" naming on the paid tier (not "Pro" or "Team"); readable for buyers who are clearly past evaluation.
- **Avoid:** $49 Production is commodity gateway pricing and below the floor where governance can credibly live.

### 2.8 LaunchDarkly

- **Entry pattern.** Developer $0 → Foundation usage-based ($10/service connection, $8.33 per 1k client-side MAU, $5 per 1k AI runs past 5k) → custom Enterprise.
- **Usage metric.** Service connections, MAU, AI runs.
- **Enterprise gates.** SSO, SCIM, SAML, dedicated support, audit logs.
- **Copy:** the multi-axis usage pricing handled cleanly; the public per-unit rates as a trust signal; the "Foundation" tier name.
- **Avoid:** the three-axis meter is confusing without a calculator. P402 keeps one meter axis.

### 2.9 PostHog

- **Entry pattern.** Free → usage-based after free tiers → enterprise sales motion.
- **Usage metric.** Events, requests, exceptions, AI observability events.
- **Enterprise gates.** SSO, custom retention, SLA.
- **Copy:** the transparent free tier, the spend caps as a default toggle, the product-by-product usage billing (each module has its own meter).
- **Avoid:** PostHog's "everything is free until it's not" philosophy works because they ship many modules. P402 ships one product motion (accountability) and should price one motion.

### 2.10 CloudZero

- **Entry pattern.** No public starter → custom only.
- **Usage metric.** Scale/complexity, not publicly itemized.
- **Enterprise gates.** Single subscription with unlimited users, dimensions, dashboards, telemetry, retention.
- **Copy:** the "single subscription, no tier shame" packaging; the governance frame; the "financial control plane for AI economics" positioning.
- **Avoid:** P402 cannot run a no-public-price model yet — the discoverability gap is too wide. Public price floors are required for top-of-funnel motion.

### 2.11 Kubecost

- **Entry pattern.** Foundations free → no public mid-tier → custom Enterprise.
- **Usage metric.** Clusters, cores, retention.
- **Enterprise gates.** RBAC, multi-cluster scale, retention.
- **Copy:** the "always free base deployment" as a category-define move.
- **Avoid:** the binary (free → enterprise) skips the mid-market that P402 must capture in year one.

### 2.12 Apptio Cloudability

- **Entry pattern.** No public price → multi-year enterprise contracts.
- **Usage metric.** Cloud spend under management.
- **Enterprise gates.** SOC 2, SSO, dedicated CSM, custom integrations.
- **Copy:** the "% of governed spend" anchoring is what P402 should adopt for Enterprise framing.
- **Avoid:** Apptio's 6-12 month procurement is incompatible with year-one P402 motion.

### 2.13 Stripe usage billing

- **Entry pattern.** Free → usage of Stripe Billing meters → Enterprise (Metronome).
- **Copy:** Stripe's own guidance recommends Metronome for new usage-based implementations needing real-time metering, tiered/dimensional pricing, prepaid credits, enterprise contracts. P402 should adopt Stripe + Metronome from day one of billing implementation.
- **Avoid:** rolling custom billing logic. The metered AI event definition is complex enough; the meter implementation should not also be.

### 2.14 Vercel

- **Entry pattern.** Free Hobby → Pro $20/user/mo → Enterprise custom.
- **Usage metric.** Bandwidth, build minutes, function invocations.
- **Copy:** the per-user Pro tier; the consumption overages with clean alerting.
- **Avoid:** $20/user is commodity infra pricing; doesn't apply to governance product.

### 2.15 Databricks

- **Entry pattern.** Free trial → consumption-based (DBUs) → committed-use enterprise.
- **Usage metric.** DBUs (Databricks Units).
- **Enterprise gates.** Reserved capacity, dedicated support, SLAs.
- **Copy:** the committed-use enterprise structure; the public DBU rate cards by tier; the "buy in bulk" annual commit discount.
- **Avoid:** Databricks is too far up-market to anchor against; consumption complexity is a buyer-anxiety pattern P402 should avoid.

### 2.16 Okta

- **Entry pattern.** Per-user, per-month, per-feature.
- **Usage metric.** Users, MFA, SCIM connectors, lifecycle automations.
- **Enterprise gates.** Custom SLAs, dedicated CSM, FedRAMP for public sector.
- **Copy:** the per-feature ladder for compliance/security upsells; explicit pricing for SCIM and lifecycle automation as separate line items.
- **Avoid:** Okta's per-user model would collapse P402's value story. Users are unbounded inside plans on purpose.

### 2.17 Synthesis: what P402 should copy and avoid

**Copy from the market:**
- Free Sandbox with credible included volume (Sentry, Braintrust, Langfuse).
- Single primary usage meter (Helicone, Portkey, Langfuse).
- Transparent overage rate per 1k events (Helicone, LaunchDarkly).
- Annual default with public monthly premium (Databricks-style commit discount).
- Public Enterprise floor as trust signal (Langfuse publishes $2,499/mo; P402 publishes "from $60k ARR").
- Calculator-driven pricing page (Helicone).
- "Percent of governed spend" framing for Enterprise (CloudZero, Apptio).
- Paid Pilot as a procurement bridge (CloudZero, LaunchDarkly Enterprise).
- Stripe + Metronome for billing (Stripe's own guidance).
- Spend caps as a default-on toggle for self-serve (PostHog).

**Avoid:**
- Three+ axis usage meters without a calculator (Datadog, New Relic Pro complexity).
- Per-user pricing as the primary axis (Okta, early Vercel).
- Performance-fee pricing without verified methodology (some FinOps startups).
- "Contact sales for everything" gating (kills top-of-funnel discoverability).
- Tier names that sound like evaluation tools ("Eval", "Trace", "Observe").

---

## 3. Final pricing principles

Locked. Every surface must comply.

1. **Annual first.** Annual is the default checkout path. Annual price is presented prominently. Monthly is the friction-bearing alternative.
2. **Monthly premium 30% to 40%.** A monthly Business subscription costs 30–40% more per month than the annualized monthly equivalent. The premium is visible on the pricing page.
3. **No hidden usage billing.** Every billable counter is documented in the metric appendix. No silent metering. No surprise dimensions.
4. **No surprise overages without warnings.** Customers receive in-product alerts at 50%, 80%, 100%, and 120% of included usage. Self-serve customers can set hard caps.
5. **Outcome records non-billable.** Forever. As a strategic commitment, not a temporary perk.
6. **Event usage visible in dashboard.** Included usage, current consumption, projected month-end, and overage estimate are visible to every paying customer.
7. **Enterprise pricing anchored against governed AI spend.** Enterprise is framed as 1–3% of the customer's governed annual AI spend, with a public floor of $60k ARR.
8. **No savings fee until verified savings methodology exists.** Period.
9. **No fake customer logos.** No logo on any P402 surface without written permission from that customer. No "logos inspired by" or "representative of." No silhouettes.
10. **No unsupported compliance claims.** No "SOC 2 compliant" until the report exists. No "HIPAA compliant" until the BAA program is signed. "Compliance roadmap" language only when there is a real roadmap with dates.
11. **No protocol-first buyer pricing.** Buyers do not pay for protocol access. They pay for the accountability product.
12. **One metric.** Metered AI events. No second meter sneaks in. Add-ons are flat-priced, not metered.

---

## 4. Final rate card v1

Locked unless explicitly revised by a versioned v2. Effective date: the date this document is committed to `master`.

### 4.1 Self-serve and contract plans

| Plan | Price | Included events / mo | Retention | Key inclusions | Sales motion |
|---|---|---|---|---|---|
| **Sandbox** | $0 | 25,000 | 14 days | 1 tenant, 1 project, 2 users, community support | Self-serve, no card |
| **Developer** | $249/mo | 500,000 | 90 days | Unlimited users, unlimited projects, unlimited workflows, outcome coverage, API exports, email support, basic alerts | Self-serve, card |
| **Business** | $2,500/mo annual ($36k ARR billed annually); or $3,500/mo billed monthly (40% premium) | 5,000,000 | 1 year | Workflow attribution, outcome ingestion, shadow controls, audit exports, team roles, Slack-or-email alerts, monthly review | Sales-assisted |
| **Scale** | $5,000/mo annual ($60k ARR billed annually); monthly not offered | 15,000,000 | 2 years | Multi-department views, advanced controls, priority support, expanded retention, procurement-ready exports, quarterly business review | Sales-led |
| **Enterprise** | From **$60,000 ARR** annual only; floor priced against governed AI spend (see §7) | 25,000,000+ annual event commit; custom allocation per quarter | Custom, default 3 years | SSO/SAML, SCIM, fine-grained RBAC, custom retention, DPA, SLA, procurement pack, custom support, optional private deployment design | Sales-led; procurement bridge |

Note: the Scale tier at $60k ARR overlaps the Enterprise floor on purpose. Buyers who self-select Scale get Enterprise-floor governance without the procurement overhead. Buyers who need SSO/SCIM/DPA/SLA accept the Enterprise sales motion.

### 4.2 Commercial bridge offers

| Offer | Price | Duration | Scope | Credit policy |
|---|---|---|---|---|
| **Proof Sprint** | $15,000 | 14 days | 1 workflow, 1 tenant, 1 provider integration path, executive readout | 100% credited toward Paid Pilot if signed within 30 days of Proof Sprint readout |
| **Paid Pilot** | $35,000 | 60 to 90 days | Up to 3 workflows, target event volume, outcome coverage goal, stakeholder map, executive readout | 50% credited toward annual contract if signed within 30 days of pilot close |
| **Regulated Pilot** | $50,000 (floor; can be higher) | 90 days | Healthcare, finance, legal, insurance, public sector; privacy mode and evidence requirements included; security and procurement heavy | 50% credited toward annual contract if signed within 30 days of pilot close |

### 4.3 Permanent SKU stability rule

The five plan names (Sandbox, Developer, Business, Scale, Enterprise) and the three bridge offers (Proof Sprint, Paid Pilot, Regulated Pilot) are permanent. Renaming a tier mid-year creates legacy contract chaos and breaks comparison shopping. Future v2/v3 revisions adjust prices, inclusions, and overage rates, but not names.

---

## 5. Overage model

Locked.

### 5.1 Overage rates per plan

| Plan | Included events / mo | Overage rate per 1,000 events | Hard cap option | Soft cap option |
|---|---|---|---|---|
| Sandbox | 25,000 | n/a (hard cap; recording pauses at 25k) | always on | n/a |
| Developer | 500,000 | $0.25 | optional | default on |
| Business | 5,000,000 | $0.12 | available | default on |
| Scale | 15,000,000 | $0.08 | available | default on with account review |
| Enterprise | 25,000,000+ commit | Custom committed rate, typically $0.04–$0.06 per 1k | available; commit true-up at renewal | default on |

### 5.2 Warning thresholds (every plan)

In-product alert and email at:
- **50%** — informational, no action required.
- **80%** — informational, "you may exceed your plan this month."
- **100%** — overage now active for plans that allow it; Sandbox pauses recording.
- **120%** — escalation; for Enterprise this opens an account review.

### 5.3 Plan-specific behavior

- **Sandbox:** hard cap at 25k. Recording pauses; the customer sees a "your sandbox is paused" banner with an upgrade CTA. No data is silently dropped; the throttle is explicit.
- **Developer:** soft warning at 50/80%, then overage rate applied. Customer can set an optional hard cap.
- **Business:** overage with admin alerts. Admin role is notified at every threshold. Optional hard cap.
- **Scale:** overage with account review prompt at 120%. CSM is notified; CSM reaches out to schedule a usage review and discuss commitment adjustment.
- **Enterprise:** committed annual usage. Excess is either trued-up at renewal (most common) or invoiced in-period if the contract explicitly says so. Default is renewal true-up to avoid surprise invoices.

### 5.4 Overage anxiety mitigation

The pricing page calculator must show the buyer:
- Their included volume.
- The overage rate per 1,000 events for that plan.
- An example of overage cost at 110% utilization.

The dashboard must show the buyer:
- Current month consumption as a count and a percentage.
- Projected month-end consumption with a confidence band.
- Estimated overage cost in dollars.

No customer should ever be surprised by a bill. If a customer is surprised, the surface failed.

---

## 6. Metered AI event definition

The single source of truth for what is and is not a billable event. Every contract appendix references this section by version.

### 6.1 Definition

A **metered AI event** is one unique provider-bound, meter-only, or policy-evaluated AI request event recorded by P402 for a customer tenant during the billing period.

### 6.2 What counts as a metered AI event

The following are billable when recorded:

1. **Hosted AI request through P402.** A request that traverses the P402 router and is forwarded to a provider (OpenAI, Anthropic, Google, Cohere, OpenRouter, etc.).
2. **Meter-only event submitted by SDK or API.** A request the customer makes directly to a provider where the SDK or API posts the event metadata to P402 for ledger purposes.
3. **Policy-evaluated AI event.** A request whose policy was evaluated by P402's Control surface, including shadow-mode decisions, whether or not the request was forwarded.
4. **Settled AI work event.** A request that is settled via P402's facilitator (Base, Tempo) for an AI service the customer purchased through P402.
5. **Retry event when unique and customer-caused.** A retry triggered by the customer's application (e.g. exponential backoff on a 5xx) where the retry has a distinct event id.

### 6.3 What does not count

The following are explicitly excluded:

- **Dashboard views.** Looking at your usage does not cost.
- **Outcome-only records.** Posting outcomes never counts as an event.
- **Duplicate replay with the same event id.** Idempotent replay is free.
- **Internal heartbeat.** Health-check pings from P402 to providers are not customer-attributable.
- **Support action.** A P402 staff member querying the customer's data for support is not a billable event.
- **Billing sync.** Metronome / Stripe sync activity is not metered.
- **Admin audit action.** A customer admin reading the audit log is not a billable event.
- **Failed auth request before tenant resolution.** If we can't identify the tenant, we cannot bill the tenant.
- **Test fixture events.** Events written from a tenant flagged as `is_test_tenant = true` are excluded by query.
- **Synthetic QA events.** Events written by the P402 QA harness against an enrolled tenant are excluded by tenant id.

### 6.4 Counting rules

1. **Unique event id.** Each metered event has a stable event id; the ledger deduplicates on `(tenant_id, request_id)`.
2. **One event per unique attempt.** Retries with a distinct event id count; replays with the same id do not.
3. **No double-counting across schemes.** A request that is hosted (count #1) and policy-evaluated (count #3) counts once.
4. **No fractional events.** Events are integers.
5. **No backdated invoices.** Late-arriving events past the 72-hour settlement window are billed in the next invoice period as a debit line.

### 6.5 Disputed usage window

Customers may dispute usage within **30 days of invoice date**. Disputes are resolved against the ledger and the audit exports. Resolved disputes either credit the invoice (if the ledger shows over-counting) or stand (if the ledger shows correct counting).

### 6.6 Metric versioning

This definition is **metered AI event v1**. Future versions of this definition are committed alongside contract amendments. Customers' contracts reference the version in force at signing; the version does not change mid-term without written amendment.

---

## 7. Enterprise anchoring

Enterprise pricing is anchored as a percentage of the customer's governed annual AI spend, not as a multiple of events. The customer's procurement team frames it as a budget line on top of an existing AI bill, not as net new spend.

### 7.1 Framing

> "Enterprise customers typically allocate 1% to 3% of their annual governed AI spend to P402 for accountability, attribution, controls, and audit-grade evidence."

This framing is **defensible** because:
- 1–3% is small relative to the underlying AI invoice.
- Governance/FinOps platforms (CloudZero, Apptio) routinely consume 1–5% of governed spend.
- It removes the buyer's "is this expensive" question and replaces it with "is this worth 2% of what we already spend."

### 7.2 Pricing examples

| Annual AI spend (governed) | Likely tier | Annual P402 price range | Likely buyer | Why defensible | Procurement framing |
|---|---|---|---|---|---|
| **$500,000** | Enterprise floor | $10,000 – $15,000 ARR (custom; below the $60k public floor as a strategic logo discount) | Director of Engineering or AI Platform Lead | Buyer cannot afford $60k floor on a $500k spend; but the governance need is real. Strategic logo or design-partner pricing only. | Frame as "<3% of AI spend, accountability for the whole spend pool" |
| **$1,000,000** | Enterprise entry | $60,000 ARR (the public floor) | VP Engineering or FinOps Lead | $60k is 6% of spend at this scale, which is high; counter-anchor with multi-year commit or include Scale-tier features | Frame as "1-year accountability foundation; year two scales with spend" |
| **$2,000,000** | Enterprise mid | $60,000 – $90,000 ARR | VP Engineering + Finance | $90k is 4.5% of spend; reasonable. SSO, SCIM, DPA, audit exports all included. | Frame as "2-4% of AI invoice for full accountability and audit" |
| **$5,000,000** | Enterprise upper | $100,000 – $150,000 ARR | CIO or CFO level sponsor | $150k is 3% of spend; sits cleanly in CloudZero/Apptio territory | Frame as "1.5-3% of AI spend, full governance + custom retention + procurement-ready" |
| **$10,000,000+** | Enterprise with private deployment design | $200,000+ ARR custom | CIO + CISO + procurement | Below 2% of spend at this scale; very defensible. Add SLA, dedicated CSM, optional private deployment design. | Frame as "<2% of AI spend, the accountability layer for everything you ship" |

### 7.3 The $500k case (below-floor discount)

The first row deserves explicit policy. A $500k-AI-spend customer cannot defensibly pay the $60k public floor (12% of their AI spend). For strategic logo or design partner reasons, P402 offers a below-floor Enterprise price down to $10k–$15k ARR. This is a **founder-approved exception**, not a published discount. The contract still includes SSO, DPA, and audit exports; it does not include Scale-tier SLA unless the customer commits to multi-year. Maximum 5 below-floor deals in year one.

### 7.4 Multi-year commit

Annual: list price.
Two-year prepaid: 8% discount on year 1 + year 2 price-protected at year 1 rate.
Three-year prepaid: 12% discount + multi-year price protection.

Multi-year commits are the strongest renewal-risk mitigation P402 has in year one.

---

## 8. Package comparison matrix

For every row, the cell value is the simplest readable signal: ✓, ✕, "limit", or a custom note.

| Feature | Sandbox | Developer | Business | Scale | Enterprise | Regulated Enterprise |
|---|---|---|---|---|---|---|
| **Event volume / mo** | 25k | 500k | 5M | 15M | 25M+ commit | 25M+ commit |
| **Retention** | 14 days | 90 days | 1 year | 2 years | custom | custom |
| **Users** | 2 | unlimited | unlimited | unlimited | unlimited | unlimited |
| **Projects** | 1 | unlimited | unlimited | unlimited | unlimited | unlimited |
| **Workflows** | basic | unlimited | unlimited | unlimited | unlimited | unlimited |
| **Departments** | ✕ | ✕ | ✓ | ✓ multi | ✓ multi | ✓ multi |
| **Outcome ingestion** | basic | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Shadow controls** | ✕ | ✕ | ✓ | ✓ advanced | ✓ advanced | ✓ advanced |
| **Optimize Readiness (view)** | ✕ | basic | ✓ | ✓ | ✓ | ✓ |
| **Audit exports** | ✕ | API only | ✓ | ✓ | ✓ | ✓ |
| **Evidence exports (signed)** | ✕ | ✕ | ✓ | ✓ | ✓ | ✓ |
| **SSO / SAML** | ✕ | ✕ | ✕ | optional add-on | ✓ | ✓ |
| **SCIM** | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ |
| **RBAC (fine-grained)** | ✕ | role only | role only | role+project | ✓ | ✓ |
| **DPA** | ✕ | ✕ | available | ✓ | ✓ | ✓ |
| **BAA path** | ✕ | ✕ | ✕ | ✕ | available | ✓ |
| **SLA** | ✕ | ✕ | ✕ | best effort | ✓ standard | ✓ negotiated |
| **Slack support** | ✕ | ✕ | shared | shared | dedicated channel | dedicated channel |
| **Procurement support** | ✕ | ✕ | basic | ✓ | ✓ | ✓ with security exhibit |
| **Private deployment review** | ✕ | ✕ | ✕ | ✕ | optional add-on | optional add-on |
| **Security review support** | ✕ | ✕ | basic questionnaire | ✓ | ✓ | ✓ with named contact |
| **Billing support** | community | email | email | priority | priority | priority |
| **Partner attribution** | ✕ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Data warehouse export** | ✕ | ✕ | optional add-on | ✓ | ✓ | ✓ |
| **API rate limits** | conservative | standard | elevated | high | committed | committed |

---

## 9. Security and procurement gates

What ships in each plan. No claim above what is actually true.

| Item | Sandbox | Developer | Business | Scale | Enterprise | Regulated Enterprise |
|---|---|---|---|---|---|---|
| SSO | ✕ | ✕ | ✕ | optional add-on | ✓ | ✓ |
| SCIM | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ |
| DPA | ✕ | ✕ | available | ✓ | ✓ | ✓ |
| BAA readiness language | ✕ | ✕ | ✕ | ✕ | available | ✓ |
| SOC 2 roadmap language | ✕ | ✕ | ✕ | available | ✓ | ✓ |
| Audit logs | basic | basic | full | full | full | full |
| Custom retention | ✕ | ✕ | up to 1 yr | up to 2 yr | custom | custom |
| Security questionnaire support | ✕ | ✕ | best effort | ✓ | ✓ | ✓ named contact |
| Procurement pack | ✕ | ✕ | basic | ✓ | ✓ | ✓ |
| MSA | template | template | template | negotiable | ✓ negotiable | ✓ negotiable |
| SLA | ✕ | ✕ | ✕ | best effort | ✓ standard | ✓ negotiated |
| Private deployment design | ✕ | ✕ | ✕ | ✕ | available | available |
| Data residency review | ✕ | ✕ | ✕ | available | ✓ | ✓ |
| Dedicated Slack channel | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ |
| Dedicated support engineer | ✕ | ✕ | ✕ | ✕ | ✓ | ✓ |

### 9.1 Compliance claim hygiene

The trust page and sales deck may say:
- **"SOC 2 roadmap"** — when there is a real engagement with a CPA firm and a target type II report date.
- **"DPA available"** — when a DPA template exists and has been reviewed by counsel.
- **"BAA available for regulated pilots"** — when a BAA template exists and Regulated Enterprise customers have actually signed one.

The trust page and sales deck may **not** say:
- "SOC 2 compliant" before the type II report is issued.
- "HIPAA compliant" before a BAA is signed and the regulated workflow is operational.
- "ISO 27001 certified" without the certificate.
- "FedRAMP" without the authorization.
- "GDPR compliant" as a standalone claim; instead describe specific practices.
- Any compliance phrase that implies a third-party validation that does not exist.

Source-shape audit on the trust page (separate code slice) will eventually enforce these strings.

---

## 10. Proof Sprint structure

The Proof Sprint is the paid diagnostic. It exists to turn a curious buyer into a Paid Pilot prospect with a real spend map and an executive readout.

### 10.1 Headline

- **Price:** $15,000 fixed.
- **Duration:** 14 days.
- **Scope:** 1 workflow, 1 tenant, 1 provider path.
- **Deliverable:** executive readout document + recommendation (continue Sandbox, run Paid Pilot, or no-go).
- **Credit policy:** 100% credited toward Paid Pilot if Paid Pilot is signed within 30 days of readout.

### 10.2 Qualification (before quoting)

A buyer qualifies for a Proof Sprint if they have:
- One identifiable AI workflow with >10k calls/month or with clear high-cost profile.
- An engineering or platform lead willing to do a 30-min scoping call.
- A budget owner aware of the $15k engagement.
- No expectation of a savings number at readout (the readout is a spend map and recommendation, not a savings claim).

If any of the above is missing, the buyer is routed to **Sandbox** or to a **scoping call**, not to a paid Proof Sprint.

### 10.3 Day-by-day structure

| Day | Activity | Owner | Deliverable |
|---|---|---|---|
| **Day 0** | Qualification, data boundary agreement, NDA, SOW signature | Sales + buyer | Signed SOW |
| **Day 1** | Workflow selection call; identify the single workflow | Sales + buyer eng lead | Workflow definition memo |
| **Day 2** | Integration path decision (router, meter-only, SDK) | P402 implementation eng + buyer | Integration plan |
| **Day 3–5** | Event capture goes live; first metered events flowing | Buyer eng + P402 eng | First 10k events in P402 |
| **Day 6–8** | Outcome capture starts; outcome reporting wired | Buyer eng + P402 eng | First 100 outcomes |
| **Day 9–10** | Spend map produced; cost by workflow step, by provider, by model | P402 implementation eng | Spend map artifact (dashboard + exportable) |
| **Day 11** | Shadow control review; what would have been denied | P402 eng + buyer eng lead | Shadow decision list |
| **Day 12** | Executive report drafted | P402 implementation eng + sales | Executive readout document |
| **Day 13** | Buyer review (internal) | Buyer team | Internal review notes |
| **Day 14** | Decision call: annual now, Paid Pilot, or no-go | Sales + budget owner | Signed Paid Pilot SOW, signed annual order form, or written no-go |

### 10.4 Buyer roles

- **Executive sponsor.** Budget owner; receives the executive readout. (CIO, CFO, VP Eng, or AI Platform Lead.)
- **Technical champion.** Eng/platform lead; runs the scoping call, owns the workflow definition.
- **Implementation contact.** Engineer who wires SDK or router; available on Slack during Days 2–8.

### 10.5 P402 roles

- **Sales owner.** Owns the SOW, the credit policy, the readout call.
- **Implementation engineer.** Wires the integration, produces the spend map, drafts the executive readout.
- **Executive presenter.** Founder or AE; presents the readout on Day 14.

### 10.6 Required data

- Workflow definition (1 paragraph).
- Provider used.
- Approximate monthly volume.
- Approximate monthly cost.
- Outcome definition for the workflow (what is "accepted"?).
- Buyer's outcome attribution mechanism (callback, post-hoc tagging, etc.).

### 10.7 Outputs

The Proof Sprint readout contains:
1. **Workflow summary.** What workflow was instrumented and how.
2. **Volume baseline.** Events per day over the sprint window.
3. **Spend map.** Cost by step, provider, model, and (if reported) workflow owner.
4. **Outcome coverage.** Fraction of events with a resolved outcome; gaps explained.
5. **Shadow control findings.** What policies, if enabled, would have flagged what fraction of requests.
6. **Recommendation.** One of: continue Sandbox, launch Paid Pilot, no-go (with reason).
7. **Annual proposal attached.** For "go" recommendations, an annual contract proposal sized to observed volume.

### 10.8 No-go criteria (when to recommend not buying)

- Less than 1,000 events captured by Day 10 (the workflow is too small).
- No outcome attribution mechanism (the buyer cannot define what success looks like).
- Workflow is one-off (not production-recurring).
- Buyer's procurement cannot move within 30 days (and there is no budget for Paid Pilot to wait).

A no-go recommendation is **good for P402**. It preserves credibility for future engagements with the same buyer.

### 10.9 Credit policy

100% of the $15k Proof Sprint fee is credited toward Paid Pilot if Paid Pilot is signed within 30 days of Proof Sprint readout. The credit is one-time, not compounding. The credit does not apply to annual contract; it only bridges to Paid Pilot.

### 10.10 SOW language stub

> P402 will, over a 14-day engagement, instrument one customer-selected AI workflow, produce a spend map, capture initial outcome data, surface shadow control findings, and deliver an executive readout document with a written recommendation. The fee for this engagement is $15,000 USD, billed 100% at SOW signature. If Customer signs a Paid Pilot SOW within 30 days of readout, 100% of the Proof Sprint fee is credited against the Paid Pilot fee. P402 makes no representation of verified cost savings during the Proof Sprint.

### 10.11 Required metrics

By end of Proof Sprint, P402 reports internally:
- Sprint NPS from buyer technical champion.
- Time-from-SOW-signature to first-event.
- Time-from-SOW-signature to first-outcome.
- Sprint-to-Pilot conversion (was a Pilot SOW signed?).
- Sprint-to-no-go-rate (track separately).

---

## 11. Paid Pilot structure

The Paid Pilot is the procurement bridge to annual. It exists to produce procurement-ready evidence and a multi-stakeholder yes.

### 11.1 Headline

- **Standard Paid Pilot:** $35,000.
- **Regulated Pilot:** $50,000+ (healthcare, finance, legal, insurance, public sector).
- **Duration:** 60 to 90 days, negotiated.
- **Scope:** up to 3 workflows.
- **Deliverable:** executive readout with annual proposal attached + procurement-ready evidence pack.
- **Credit policy:** 50% credited toward annual contract if annual is signed within 30 days of pilot close.

### 11.2 When to sell a Paid Pilot vs Proof Sprint

| Buyer situation | Recommend |
|---|---|
| Single workflow, exploring | Proof Sprint |
| Multi-workflow, governance need, procurement involvement | Paid Pilot |
| Regulated industry, BAA / DPA needed | Regulated Pilot |
| Already convinced, no procurement friction | Skip pilot; sign annual |
| Insufficient data volume (<10k events/mo across all workflows) | Proof Sprint first |

### 11.3 Stakeholder map (required before SOW)

- **Executive sponsor.** Budget owner; will sign the annual contract.
- **Economic buyer.** Often FinOps or finance partner to engineering.
- **Technical champion.** Engineering lead who owns instrumentation.
- **Security / compliance reviewer.** Required for Regulated Pilot.
- **Procurement lead.** Required for buyers >$50M revenue.

A Paid Pilot SOW is **not signed** until the executive sponsor and at least one other role are named and committed.

### 11.4 Implementation milestones

| Week | Milestone |
|---|---|
| 1 | Workflow scope finalized; integration paths chosen for all three workflows |
| 2 | Workflow 1 metered; first 10k events flowing |
| 3 | Workflow 2 metered |
| 4 | Workflow 3 metered; outcome capture live for at least one workflow |
| 5–6 | Outcome coverage growing; shadow controls reviewed with technical champion |
| 7–8 | Spend map + governance findings packaged for executive review |
| 9–10 | Executive readout call; annual proposal presented |
| 11–12 | Negotiation, procurement review, signature |

### 11.5 Event volume targets

| Buyer size | Minimum events over pilot duration |
|---|---|
| <100 employees | 5,000 metered events across all workflows |
| 100–1000 employees | 25,000 metered events |
| 1000–10000 employees | 100,000 metered events |
| 10000+ employees | 500,000 metered events |

If the buyer cannot hit the minimum, this is **not a Paid Pilot** — it is a Proof Sprint with a fancy name. Reposition before signing.

### 11.6 Outcome coverage target

- Workflow-level coverage target: **20% at pilot close**, agreed in writing in the SOW.
- If the buyer's outcome attribution is genuinely difficult, the target may be set lower with explicit acknowledgment that the pilot is partly about building outcome instrumentation.

### 11.7 Dashboard review cadence

- Weekly 30-min dashboard review with technical champion.
- Bi-weekly 60-min status call with executive sponsor.
- One mid-pilot health check (end of week 5).
- Final executive readout.

### 11.8 Success criteria (agreed before kickoff)

- 3 production workflows live.
- 95%+ event ingestion success on instrumented workflows.
- Minimum event volume per §11.5.
- Outcome coverage at agreed target.
- At least 10 shadow policy findings reviewed.
- Annual proposal presented and accepted, declined, or escalated within 30 days.

### 11.9 Failure criteria (when to call it a pilot failure)

- Buyer cannot instrument any workflow by end of week 3.
- Buyer's procurement signals no annual budget for the next fiscal year.
- Buyer's technical champion is reassigned and not replaced.
- Buyer requests "verified savings" as a success criterion and won't accept the no-savings posture.

A failed pilot is **not refunded**, but the executive readout is delivered honestly, and the technical artifacts (spend map, evidence exports) are handed over.

### 11.10 Annual conversion logic

If pilot succeeds and annual is signed within 30 days: 50% credit applied to annual.
If pilot succeeds and annual is signed within 30–90 days: 25% credit.
If pilot succeeds and annual is signed >90 days: no credit; rerunning Proof Sprint is recommended to re-warm.

### 11.11 Support model during pilot

- Dedicated Slack channel.
- Implementation engineer assigned for the duration.
- Founder available for executive escalations.

### 11.12 Procurement checklist (delivered by P402 at week 6)

- DPA (executed or template).
- Security questionnaire response.
- Sub-processor list.
- Data residency statement.
- Incident response summary.
- Insurance certificate (if requested).
- MSA template.
- Order form template.
- Usage metric definition appendix.
- Mutual NDA (if not already in place).

### 11.13 SOW language stub

> P402 will, over a [60/90]-day engagement, instrument up to three customer-selected AI workflows, capture metered events and outcomes, surface shadow control findings, deliver weekly dashboard reviews, and provide an executive readout with an annual contract proposal attached. The fee for this engagement is $[35,000 / 50,000] USD, billed 50% at SOW signature and 50% at kickoff or day 30, whichever is earlier. If Customer signs an annual contract within 30 days of executive readout, 50% of the Paid Pilot fee is credited against year-one annual fees. P402 makes no representation of verified cost savings during the Paid Pilot.

---

## 12. AAARRP funnel integration

The funnel runs on six stages plus profit. Each stage has explicit metrics and owners.

### 12.1 Awareness

- **Category message.** "P402 makes AI spend accountable before optimization begins."
- **SEO pages.** Comparison pages (P402 vs Helicone, P402 vs Langfuse, P402 vs CloudZero); glossary pages (`/glossary/ai-spend-accountability`, `/glossary/x402-payment`, `/glossary/ap2-mandate`, `/glossary/governed-ai-spend`); use-case pages (`/use-cases/agentic-finance`, `/use-cases/regulated-ai`).
- **Comparison pages.** Direct comparison against Helicone (commodity), Langfuse (observability), CloudZero (FinOps). Each comparison ends with "P402's category is AI spend accountability."
- **Glossary pages.** Definitions of x402, AP2, AI spend accountability, metered AI event, outcome coverage, shadow control, optimize readiness, verified savings (and why P402 doesn't claim it yet).
- **Partner content.** Co-authored posts with infrastructure partners (Base, Coinbase, providers).
- **LinkedIn cadence.** Founder + company page, 2 posts per week minimum on accountability, governance, AI spend, FinOps, agent governance.
- **Webinar or podcast.** Founder appearances on AI/FinOps podcasts; one webinar per quarter on a specific accountability topic.
- **Logo and trust placement.** Integration logos only; no customer logos until written permission.

### 12.2 Acquisition

- **Homepage routing.** Two CTAs: outcome-anchored primary ("See your AI spend by workflow" → Sandbox), outcome-anchored secondary ("Map my AI spend in 14 days — $15k" → Proof Sprint).
- **Pricing page tabs.** "Build AI software" (Developer + Sandbox), "Govern enterprise AI spend" (Business + Scale + Enterprise), "Launch a pilot" (Proof Sprint + Paid Pilot).
- **Demo CTAs.** "Book a 20-minute scoping call" from pricing page and trust page.
- **Proof Sprint CTA.** Visible on homepage, pricing page, trust page, and from-the-second-fold of any blog post.
- **Developer quickstart CTA.** Primary in `/developers/quickstart`; secondary banner on `/docs`.
- **Enterprise landing page CTA.** From comparison pages and FinOps glossary pages.

### 12.3 Activation

A new tenant is "activated" only when:
- First API key created.
- First metered AI event recorded within 24 hours.
- First `workflow_id` tagged within 72 hours.
- First outcome record posted within 7 days.
- First dashboard view within 7 days.
- First spend map exported within 14 days.

Activation email sequence:
- T+0: account created → "send your first event" guide.
- T+1 day, no event: "stuck? here's the curl example."
- T+3 days, no event: "want a 20-min scoping call?"
- T+7 days, no outcome: "outcomes are how Optimize Readiness wakes up."
- T+14 days, no spend map: "your first spend map awaits."

### 12.4 Retention

- **Weekly spend map email.** Sent every Monday to admins of all paying tenants.
- **Outcome coverage digest.** Weekly, scoped to the workflows with outcome instrumentation.
- **Budget exposure digest.** Weekly, surfacing workflows approaching budget caps or showing material spend deltas.
- **Shadow control review.** Monthly, scoped to admins, summarizing what would have been blocked.
- **Monthly accountability report.** PDF/HTML report sent to executive sponsor with spend, attribution, outcome coverage, control posture.
- **Customer success cadence.** Sandbox: none. Developer: quarterly check-in. Business: monthly review. Scale: monthly + quarterly business review. Enterprise: dedicated CSM, weekly Slack + monthly + quarterly + annual review.

### 12.5 Revenue

- **Upgrade triggers (system-driven).**
  - Sandbox → Developer: customer hits 80% of 25k events, OR tries to add a 3rd user, OR tries to add a 2nd project.
  - Developer → Business: customer hits 80% of 500k events, OR tries to add shadow controls, OR tries to add a second department.
  - Business → Scale: customer hits 80% of 5M events, OR requests SSO, OR opens a procurement ticket.
  - Scale → Enterprise: customer hits 80% of 15M events, OR opens a security review, OR requests SCIM, DPA, BAA, or SLA.
- **Plan limits.** Documented per §4. Surfaced in dashboard with progress bars.
- **Overage warnings.** Per §5.2.
- **Pilot conversion.** Sales-driven; 30-day countdown from Proof Sprint or Paid Pilot readout.
- **Annual conversion.** Sales-driven; 30-day countdown from Paid Pilot close.
- **Procurement path.** Defined in §11.12.

### 12.6 Referral

- **Partner program.** §22.
- **Customer referral credit.** Existing customer who refers a new paying customer gets 10% off next renewal (capped at 12 months of credit).
- **Design partner referral motion.** Year-one design partners earn 20% lifetime referral commission on any customer they refer who signs annual.
- **Affiliate commission.** Public affiliate program for content creators: 20% of year-one ARR, paid quarterly, single-tier.
- **Enterprise referrer commission.** For consultancies/SIs that refer enterprise customers and assist with procurement: 15% of year-one ARR + 10% renewal commission for 2 years.

### 12.7 Profit (operational metrics)

- **Gross margin by plan.** Tracked monthly. Target ≥75% on Business, ≥80% on Scale, ≥85% on Enterprise after CSM cost.
- **Support load per plan.** Hours of P402 staff time per customer per month, by plan.
- **Infra cost per 1M events.** Tracked monthly. Includes DB, compute, observability, provider passthrough where relevant.
- **Implementation margin.** Proof Sprint and Paid Pilot are billed as fixed-fee services; track actual hours vs. billed hours.
- **Sales payback.** CAC / monthly gross profit; target <12 months for self-serve, <18 months for sales-assisted.
- **Renewal risk score.** Per Enterprise customer; updated quarterly.

---

## 13. Surface-by-surface pricing integration

For each surface, define user intent, buyer segment, pricing message, CTA, upgrade trigger, what not to say, analytics event.

### 13.1 Homepage

- **User intent:** "what is this and is it for me?"
- **Buyer segment:** mixed (builder + buyer).
- **Pricing message:** "Start free. Production plans from $249/month. Enterprise pilots from $35k."
- **CTA:** "See your AI spend by workflow" (primary, → Sandbox); "Map my AI spend in 14 days — $15k" (secondary, → Proof Sprint).
- **Upgrade trigger:** scroll past hero → "How pricing works" micro-section visible.
- **What not to say:** "save 30% on AI spend," "verified savings," "automatically optimize," any compliance claim P402 doesn't actually hold.
- **Analytics event:** `homepage_hero_cta_clicked` with `{ cta: 'sandbox' | 'proof_sprint' }`.

### 13.2 Pricing page

- **User intent:** "what does it cost and what tier am I?"
- **Buyer segment:** active evaluator.
- **Pricing message:** full grid + calculator + Proof Sprint banner + Pilot banner.
- **CTA:** per plan (per §15).
- **Upgrade trigger:** plan-card hover or click.
- **What not to say:** "lowest price guaranteed," "savings ROI," "auto-optimize."
- **Analytics event:** `pricing_page_view`, `pricing_tab_selected`, `plan_card_viewed`, `pricing_calculator_used`.

### 13.3 Trust page

- **User intent:** "is this safe to give to my legal / security / procurement team?"
- **Buyer segment:** technical buyer + procurement.
- **Pricing message:** pricing governance, billing transparency, usage dispute window, plan security gates.
- **CTA:** "Request enterprise pricing" + "Talk to security."
- **Upgrade trigger:** opens DPA / MSA template request modal.
- **What not to say:** any unverified compliance certification.
- **Analytics event:** `trust_page_view`, `dpa_template_requested`, `msa_template_requested`.

### 13.4 Developers page

- **User intent:** "how do I build with this?"
- **Buyer segment:** builder.
- **Pricing message:** "Start free. Send your first event in 5 minutes."
- **CTA:** "Start free sandbox" + (below the fold) "Need procurement? Book a scoping call."
- **Upgrade trigger:** "Need procurement support?" callout.
- **What not to say:** "free forever for everything."
- **Analytics event:** `developers_page_view`, `sandbox_signup_started`.

### 13.5 Developer quickstart

- **User intent:** "send my first event."
- **Buyer segment:** builder, technical champion.
- **Pricing message:** "Free 25k events/mo on Sandbox. Production plans from $249/mo."
- **CTA:** "Send my first event."
- **Upgrade trigger:** at 80% of Sandbox events.
- **What not to say:** "production-ready out of the box" (some hardening is required).
- **Analytics event:** `quickstart_step_completed`, `first_event_recorded`.

### 13.6 Docs

- **User intent:** "implementation reference."
- **Buyer segment:** builder + implementation engineer.
- **Pricing message:** top banner "Start free sandbox"; secondary banner "Need procurement or security review? Book a scoping call."
- **CTA:** scoping call.
- **Upgrade trigger:** docs page on a topic gated to higher tier (e.g. SSO docs).
- **What not to say:** "Enterprise required for X" without offering a scoping call.
- **Analytics event:** `docs_banner_clicked`, `docs_tier_gate_viewed`.

### 13.7 Dashboard overview

- **User intent:** "what's happening in my account."
- **Buyer segment:** existing customer.
- **Pricing message:** plan badge, usage meter, included / consumed / projected, next-tier upgrade if relevant.
- **CTA:** "View usage" + (conditional) "Upgrade plan."
- **Upgrade trigger:** 80% or 100% utilization.
- **What not to say:** any upsell language that doesn't match the customer's actual behavior.
- **Analytics event:** `dashboard_view`, `usage_meter_viewed`.

### 13.8 Dashboard meter

- **User intent:** "am I going to exceed my plan?"
- **Buyer segment:** admin.
- **Pricing message:** "X% of monthly allowance used. Projected month-end: Y. Estimated overage: $Z."
- **CTA:** "Set hard cap" + (conditional) "Upgrade to next plan."
- **Upgrade trigger:** 50% / 80% / 100% / 120%.
- **What not to say:** "you must upgrade."
- **Analytics event:** `meter_threshold_crossed`, `meter_upgrade_clicked`.

### 13.9 Dashboard outcomes

- **User intent:** "how much outcome coverage do I have?"
- **Buyer segment:** technical champion.
- **Pricing message:** "Outcome records are not billed. Coverage is the key to Optimize Readiness."
- **CTA:** "Improve outcome instrumentation."
- **Upgrade trigger:** outcome coverage <20% with material volume.
- **What not to say:** "claim your savings" (it doesn't exist).
- **Analytics event:** `outcomes_view`, `outcome_instrumentation_guide_clicked`.

### 13.10 Dashboard control

- **User intent:** "what is my policy posture?"
- **Buyer segment:** admin + security.
- **Pricing message:** Shadow Controls require Business or higher.
- **CTA:** "Review shadow findings" + (gated) "Unlock Shadow Controls — upgrade to Business."
- **Upgrade trigger:** Developer customer who clicks into Control surface.
- **What not to say:** "runtime enforcement is active" (it is blocked).
- **Analytics event:** `control_view`, `shadow_upgrade_clicked`.

### 13.11 Dashboard Optimize Readiness

- **User intent:** "are we ready to optimize?"
- **Buyer segment:** admin + technical champion.
- **Pricing message:** "Optimize Readiness measures whether your data supports optimization. Recommendations are not generated yet."
- **CTA:** "Review readiness" + "Improve outcome coverage."
- **Upgrade trigger:** Developer or Business customer with strong readiness signal.
- **What not to say:** "recommendations are live" (they are blocked), "savings unlocked" (no claim exists).
- **Analytics event:** `optimize_readiness_view`, `readiness_signal_strong`.

### 13.12 Billing page

- **User intent:** "what am I paying for and how much."
- **Buyer segment:** admin + finance.
- **Pricing message:** plan, included usage, current usage, projected overage, next invoice.
- **CTA:** "Download invoice" + "Change plan" + "Request enterprise quote."
- **Upgrade trigger:** finance-side review of usage vs. plan.
- **What not to say:** "surprise charges" — there shouldn't be any.
- **Analytics event:** `billing_view`, `invoice_downloaded`, `plan_change_requested`.

### 13.13 Onboarding

- **User intent:** "get to first value."
- **Buyer segment:** new tenant.
- **Pricing message:** "Your Sandbox is live. Send your first event."
- **CTA:** "Send first event" → curl example.
- **Upgrade trigger:** first event recorded; outcome instrumentation prompted at day 3.
- **What not to say:** "upgrade now."
- **Analytics event:** `onboarding_step_completed`, `first_event_recorded`, `first_outcome_recorded`.

### 13.14 Sign-up flow

- **User intent:** "create an account."
- **Buyer segment:** prospect.
- **Pricing message:** "Sandbox is free. No credit card required."
- **CTA:** "Create Sandbox."
- **Upgrade trigger:** none in signup.
- **What not to say:** "free forever" (Sandbox is free; not the whole product).
- **Analytics event:** `signup_started`, `signup_completed`.

### 13.15 Post-first-event screen

- **User intent:** "I just sent my first event, what now?"
- **Buyer segment:** new tenant.
- **Pricing message:** "Your first event is recorded. Add a `workflow_id` to start attribution."
- **CTA:** "Add workflow tagging" → docs.
- **Upgrade trigger:** none yet.
- **What not to say:** "you're activated" (activation is a 14-day funnel, not a one-event event).
- **Analytics event:** `first_event_screen_viewed`, `workflow_guide_clicked`.

### 13.16 Weekly email

- **User intent:** "what happened in my account."
- **Buyer segment:** admin.
- **Pricing message:** usage summary, outcome coverage, control posture.
- **CTA:** "Open dashboard."
- **Upgrade trigger:** included as a side panel if usage approaches plan limit.
- **What not to say:** "you saved $X."
- **Analytics event:** `weekly_email_opened`, `weekly_email_cta_clicked`.

### 13.17 Monthly report

- **User intent:** "what is the executive view."
- **Buyer segment:** executive sponsor.
- **Pricing message:** spend by workflow, outcome coverage delta, control posture, plan utilization.
- **CTA:** "Discuss with CSM" (Enterprise) or "Talk to sales" (Business+).
- **Upgrade trigger:** plan utilization >80% triggers a "tier review" callout.
- **What not to say:** "ROI" (without verified methodology).
- **Analytics event:** `monthly_report_sent`, `monthly_report_opened`.

### 13.18 Sales deck

- **User intent:** "buyer evaluation."
- **Buyer segment:** active buyer.
- **Pricing message:** see §20.
- **CTA:** per stage.
- **Upgrade trigger:** budget owner identified.
- **What not to say:** anything not in §3 principles.
- **Analytics event:** `deck_sent`, `deck_viewed`, `deck_section_completed`.

### 13.19 Proposal

- **User intent:** "evaluate the offer."
- **Buyer segment:** budget owner + procurement.
- **Pricing message:** see §21.
- **CTA:** "Sign order form" + "Discuss revisions."
- **Upgrade trigger:** annual signed.
- **What not to say:** "guaranteed savings."
- **Analytics event:** `proposal_sent`, `proposal_signed`, `proposal_revised`.

### 13.20 SOW

- **User intent:** "scope and accountability."
- **Buyer segment:** buyer signatory.
- **Pricing message:** scope, fee, credit policy.
- **CTA:** "Sign SOW."
- **Upgrade trigger:** SOW signed → engagement starts.
- **What not to say:** any guarantee not in the standard SOW template.
- **Analytics event:** `sow_sent`, `sow_signed`.

### 13.21 Partner page

- **User intent:** "can I refer / build with / sell for P402?"
- **Buyer segment:** affiliate, consultancy, integrator.
- **Pricing message:** affiliate 20%; integration partner co-marketing; enterprise referrer 15% + 10% renewal.
- **CTA:** "Apply to partner program."
- **Upgrade trigger:** partner registration approved.
- **What not to say:** "unlimited commission" (it's capped per §22).
- **Analytics event:** `partner_page_view`, `partner_application_submitted`.

### 13.22 Partner dashboard

- **User intent:** "track referrals."
- **Buyer segment:** active partner.
- **Pricing message:** registered deals, commission earned, commission paid, attribution window remaining.
- **CTA:** "Register new deal."
- **Upgrade trigger:** partner tier earned.
- **What not to say:** "you've earned credits" without attribution confirmation.
- **Analytics event:** `partner_deal_registered`, `partner_commission_earned`.

### 13.23 Customer success email

- **User intent:** "stay in relationship."
- **Buyer segment:** existing customer.
- **Pricing message:** usage health, outcome coverage progression, upgrade timing if relevant.
- **CTA:** "Schedule review."
- **Upgrade trigger:** usage trend.
- **What not to say:** generic upsell.
- **Analytics event:** `csm_email_sent`, `csm_review_scheduled`.

### 13.24 Cancellation flow

- **User intent:** "leave."
- **Buyer segment:** churning customer.
- **Pricing message:** "We're sorry to see you go. What can we change?"
- **CTA:** survey + "Downgrade instead?" + "Talk to founder."
- **Upgrade trigger:** save offer at 25% off renewal (founder-approved cases only).
- **What not to say:** lock-in language.
- **Analytics event:** `cancellation_initiated`, `cancellation_reason_captured`, `cancellation_completed`, `cancellation_saved`.

---

## 14. Homepage pricing integration

### 14.1 Section list (in order, top to bottom)

1. **Hero.** Headline + subhead + dual CTA + pricing teaser.
2. **Integration logo strip.** Provider logos (OpenAI, Anthropic, Google, Cohere, etc.), infrastructure logos (Base, Vercel, Neon, Stripe). No customer logos.
3. **Product flow.** Meter → Monitor → Control → Prove → Outcomes → Optimize Readiness, with one-line descriptions.
4. **Buyer path cards.** Two cards: "Build AI software" → Sandbox + Developer; "Govern enterprise AI spend" → Business + Scale + Enterprise.
5. **Proof Sprint card.** "Not ready for self-serve? Start with a 14-day Proof Sprint — $15k."
6. **Trust badges.** Metadata-only • Tenant-scoped • Usage-based • No prompt storage • Audit trail • Shadow-mode first.
7. **Pricing teaser.** Single anchor: "Start free. Production plans from $249/month. Enterprise pilots from $35k."
8. **CTA footer.** "Start free sandbox" + "Book a scoping call."

### 14.2 Hero copy (locked)

**Headline:**
> AI Spend Accountability for Enterprises

**Subhead:**
> Measure every AI request, attribute cost by workflow, prove outcomes, and review controls before policies change.

**Primary CTA:**
> **See your AI spend by workflow** → (opens Sandbox)

**Secondary CTA:**
> **Map my AI spend in 14 days — $15k** → (opens Proof Sprint scoping)

**Hero pricing support line (locked):**
> Start free. Production plans from $249/month. Enterprise pilots from $35k.

**Trust microcopy:**
> Metadata-first. Tenant-scoped. Usage-based. Procurement-ready path.

### 14.3 What not to put on the homepage

- No customer testimonials without permission.
- No "save X%" claim.
- No live numerical metric ("we've processed $X in AI spend") unless the number is real and current.
- No "Enterprise" without a public floor reference.
- No "free forever" without scoping (Sandbox is free; the product is not).

---

## 15. Pricing page architecture

### 15.1 Structure (in order)

1. **Hero.**
   - Title: "Simple pricing for accountable AI spend."
   - Support line: "Start free. Upgrade when usage and governance needs grow."
2. **Buyer path selector (tabs).**
   - Tab 1: **Build AI software** → highlights Sandbox + Developer.
   - Tab 2: **Govern enterprise AI spend** → highlights Business + Scale + Enterprise.
   - Tab 3: **Launch a pilot** → highlights Proof Sprint + Paid Pilot + Regulated Pilot.
3. **Plan grid.**
   - Five columns: Sandbox, Developer, Business, Scale, Enterprise.
   - Per column: name, price, included events, retention, key inclusions, primary CTA.
4. **Event metric explainer.**
   - "How billing works."
   - 1 paragraph + link to full metric definition (§6).
5. **Proof Sprint section.**
   - Card with $15k, 14-day scope, deliverables, credit policy.
6. **Paid Pilot section.**
   - Card with $35k, 60–90 days, scope, deliverables, credit policy.
   - Regulated Pilot callout: $50k+, healthcare/finance/legal/insurance/public sector.
7. **Enterprise procurement section.**
   - "From $60k ARR" anchor.
   - Anchored as 1–3% of governed AI spend (§7).
   - Includes SSO, SCIM, RBAC, DPA, SLA, procurement pack.
8. **Add-ons section.** §29.
9. **Trust badges.** §14.1 trust badges, restated.
10. **FAQ.** §15.3.
11. **Final CTA.** "Start free sandbox" + "Book a scoping call."

### 15.2 Plan grid CTAs (locked)

- Sandbox: **Start free**.
- Developer: **Start Developer**.
- Business: **Talk to sales** (because Business is sales-assisted on annual).
- Scale: **Request quote**.
- Enterprise: **Request enterprise pricing**.

### 15.3 FAQ topics (each requires a 1–3 paragraph answer)

1. **What is a metered AI event?** Link to §6.
2. **Are outcome records billed?** No, never.
3. **Do you store prompts or responses?** No. P402 is metadata-only.
4. **What happens when I exceed included events?** Sandbox pauses; paid plans apply the overage rate per §5; alerts fire at 50/80/100/120%.
5. **Do you support annual contracts?** Yes; Business is annual-default. Scale and Enterprise are annual-only.
6. **Do you support SSO and SCIM?** SSO ships with Enterprise. SCIM ships with Enterprise. Scale customers can add SSO as an add-on.
7. **Do you offer regulated pilots?** Yes; $50k+, 90 days, with BAA path and privacy-mode evidence.
8. **Is settlement required?** No. P402's accountability layer works whether or not you use the settlement layer.
9. **When do savings claims appear?** Not until the Verified Savings methodology ships (§29). Until then P402 explicitly does not claim cost savings.
10. **How does Proof Sprint credit work?** 100% of the $15k Proof Sprint fee is credited toward a Paid Pilot signed within 30 days of readout.

---

## 16. Trust page pricing integration

### 16.1 Sections to add (procurement-ready)

1. **Usage metric definition.** Link to §6 + downloadable PDF appendix for inclusion in contracts.
2. **Data boundary.** Metadata only. Explicit list of what is recorded and what is not. No prompt storage. No response storage.
3. **Billing transparency.** Plan list, overage rates, alert thresholds, dispute window.
4. **Dispute window.** 30 days from invoice.
5. **Plan security gates.** Pulled from §9.
6. **Retention by plan.** Pulled from §4.
7. **Audit exports by plan.** Pulled from §8.
8. **SSO and SCIM by plan.** Pulled from §9.
9. **DPA and MSA path.** Available at Business+ (DPA); Enterprise-only MSA negotiation.
10. **No prompt or response storage requirement.** Single sentence guarantee, with link to the technical documentation.
11. **Pricing governance.** §27.

### 16.2 Trust page copy stub (locked)

> P402 pricing is usage-based and contract-defined. Business and Enterprise customers receive a documented billing metric definition, retention terms, and a security response package. Enterprise plans can include SSO, SCIM, custom retention, and procurement support.

### 16.3 What not to put on the trust page

- "SOC 2 compliant" before the type II report.
- "HIPAA compliant" before BAAs are signed and operational.
- Any certification logo P402 does not actually hold.
- Any customer name, logo, or testimonial without written permission.
- "Industry-leading," "best-in-class," and similar unverifiable superlatives.

---

## 17. Developer docs integration

### 17.1 Banners

- **Top banner (every docs page):** "Start free sandbox — 25k metered AI events/month, no card required."
- **Secondary banner (homepage of docs):** "Need procurement, SSO, or a pilot? Book a 20-minute scoping call."
- **Tier-gated docs banner:** "This feature is included in Business and above. [See pricing.]"

### 17.2 First-event activation target

- New tenant should record their first metered AI event within **24 hours** of signup.
- Quickstart should be readable in <5 minutes and runnable in <10 minutes.
- Includes copy-paste curl example, SDK example (TypeScript, Python), and a "did it work?" diagnostic CTA.

### 17.3 Event volume examples (in docs)

- "1,000 calls/day → 30,000/month: well within Sandbox."
- "10,000 calls/day → 300,000/month: Developer territory."
- "100,000 calls/day → 3M/month: Business territory."
- "1M calls/day → 30M/month: Enterprise commit."

### 17.4 How usage is counted

Mirror §6 exactly. Same words. No paraphrase. Same definitions.

### 17.5 How to avoid duplicates

Document the `(tenant_id, request_id)` uniqueness rule. Explain idempotent retry semantics. Provide an SDK helper for idempotent posting.

### 17.6 How to tag `workflow_id` and `outcome_status`

Required field guide. `workflow_id` is the per-customer label for a logical workflow; `outcome_status` is one of the documented statuses. Explain why each matters for Optimize Readiness later.

### 17.7 When to upgrade

- "Your Sandbox hit 80% of its monthly allowance: time to look at Developer."
- "You've added a 3rd workflow: Business unlocks workflow-level attribution."
- "You're hitting >5M events/month: Scale is built for you."

### 17.8 How to estimate monthly events

Formula:
> events / month = (avg AI calls per user per day) × (active users) × 30

Plus a worked example.

---

## 18. Dashboard monetization

Operational, not pushy.

### 18.1 Components (always visible)

- **Plan badge.** Top right; shows current plan.
- **Usage meter.** Top bar; shows included / current / projected for the month.
- **Outcome coverage KPI.** Visible on overview; not pushy.
- **Upgrade trigger.** Conditional; appears only when relevant.

### 18.2 Conditional components

- **Soft cap warning** at 50% / 80% utilization (informational).
- **Hard cap warning** at 100% (action required for self-serve plans without hard cap toggled off).
- **Enterprise account review prompt** at 120% utilization (Enterprise customers).

### 18.3 Upgrade copy (locked, operational language)

When customer is on Sandbox and hits 50% of allowance:
> You've used 50% of your monthly Sandbox events. Plenty of room left.

When at 80%:
> You've used 80% of your monthly Sandbox events. If you expect to grow this month, Developer at $249/month adds 500k events and unlimited users.

When at 100% (Sandbox):
> Sandbox is paused for the rest of the month. Upgrade to Developer to keep recording.

When at 100% (Developer):
> You're at your monthly Developer allowance. Overage charges of $0.25 per 1,000 events apply from here.

When at 80% on Business:
> You've used 80% of your Business allowance this month. At current pace you'll exceed by month-end. Scale ($5,000/month annual) adds 10M events and quarterly business reviews.

### 18.4 Do not

- Pop modal upsells on every page load.
- Add red banners for normal usage.
- Hide the upgrade CTA behind multiple clicks if the customer is genuinely at limit.
- Use scare language ("your data is at risk").

### 18.5 Next recommended plan

The dashboard displays a "next plan" tile only when:
- Customer is at >70% utilization for 3 consecutive months, OR
- Customer has tried to use a feature gated to a higher tier.

Otherwise the tile is hidden.

---

## 19. Onboarding monetization

### 19.1 Paths

- **Developer path.** Goal: send first event.
- **Enterprise path.** Goal: map first workflow.
- **Regulated path.** Goal: choose privacy mode.
- **Agent builder path.** Goal: create session budget.

### 19.2 Per path

**Developer:**
- First value moment: first metered AI event visible in dashboard.
- Pricing trigger: at 80% of Sandbox.
- Upgrade moment: when 3rd workflow or 3rd user added.
- Email follow-up: T+1 day if no event; T+3 if no outcome.
- Dashboard prompt: "Add a workflow_id to start attribution."

**Enterprise:**
- First value moment: workflow defined; first 1k events flowing.
- Pricing trigger: scoping call scheduled with sales.
- Upgrade moment: Pilot SOW signed.
- Email follow-up: from named CSM, weekly.
- Dashboard prompt: "Workflow-level spend map available."

**Regulated:**
- First value moment: privacy mode confirmed; BAA template received.
- Pricing trigger: Regulated Pilot SOW.
- Upgrade moment: pilot kickoff.
- Email follow-up: from founder, bi-weekly.
- Dashboard prompt: "Regulated evidence pack available."

**Agent builder:**
- First value moment: AP2 mandate created with session budget.
- Pricing trigger: budget exhausted or session limit hit.
- Upgrade moment: production session in flight.
- Email follow-up: T+1 day with deeper agent governance content.
- Dashboard prompt: "AP2 mandate budget at 80%."

---

## 20. Sales deck pricing integration

### 20.1 Required slides

1. **AI spend problem** — 1 slide, market frame.
2. **Why invoices are not enough** — 1 slide, governance gap.
3. **P402 overview** — 1 slide, product chain.
4. **Meter** — 1 slide.
5. **Monitor** — 1 slide.
6. **Control** — 1 slide.
7. **Outcomes and coverage** — 1 slide.
8. **Optimize Readiness** — 1 slide.
9. **Trust and data handling** — 1 slide.
10. **Pricing model** — 1 slide.
11. **Proof Sprint / Pilot path** — 1 slide.
12. **Next steps** — 1 slide, close.

### 20.2 Pricing slide copy (locked)

> **P402 Pricing**
>
> - Sandbox: $0 (25k events/mo)
> - Developer: $249/mo (500k events/mo)
> - Business: $2,500/mo annual (5M events/mo)
> - Scale: $5,000/mo annual (15M events/mo)
> - Enterprise: from $60k ARR (25M+ commit)
>
> Enterprise is typically 1–3% of governed annual AI spend.

### 20.3 Pilot slide copy (locked)

> **Two paths to evidence**
>
> - **Proof Sprint — $15,000, 14 days, 1 workflow.** Spend map + executive readout. 100% credited toward Paid Pilot.
> - **Paid Pilot — $35,000, 60–90 days, up to 3 workflows.** Procurement-ready evidence + executive readout. 50% credited toward annual.

### 20.4 Enterprise anchor slide copy (locked)

> **Enterprise pricing, anchored to your AI spend**
>
> Enterprise customers typically allocate 1–3% of their annual governed AI spend to P402. At $1M AI spend, that's $60k ARR. At $5M, $100k+ ARR.

### 20.5 ROI guardrail slide copy (locked)

> **What we promise. What we don't.**
>
> We promise: every request metered, attributed, and auditable; outcome coverage that supports later optimization; shadow control evidence; procurement-ready artifacts.
>
> We do not promise: a specific savings percentage. P402 does not claim verified savings without a documented methodology, baseline, post-period measurement, and confidence interval.

### 20.6 Close slide copy (locked)

> **Next step (pick one)**
>
> 1. Sign annual now — $X ARR.
> 2. Start a Paid Pilot — $35,000.
> 3. No-go this quarter — we'll re-engage next quarter.

The close slide forces a decision. There is no "let me think about it for two weeks" option presented.

---

## 21. Proposal and SOW integration

### 21.1 Standard proposal sections

1. **Background.** Buyer's stated problem in their words.
2. **Scope.** What's in, what's out.
3. **Workflows.** Named workflows under instrumentation.
4. **Data boundary.** Confirms metadata-only posture.
5. **Event target.** Expected monthly event volume.
6. **Outcome target.** Expected outcome coverage by pilot close.
7. **Deliverables.** Spend map, executive readout, procurement pack, etc.
8. **Timeline.** Day-by-day or week-by-week.
9. **Stakeholders.** Named buyer-side + P402-side roles.
10. **Pricing.** Locked from rate card §4.
11. **Credit policy.** Per §10.9 / §11.10.
12. **Conversion path.** What happens after pilot close.
13. **Exclusions.** What is explicitly not part of the engagement.
14. **Procurement requirements.** DPA, MSA, NDA status.

### 21.2 SOW elements

- Effective date.
- Fee + payment schedule.
- Engagement duration.
- Deliverables (mirrored from proposal).
- Acceptance criteria.
- Credit policy.
- Confidentiality and IP.
- Termination terms.
- Governing law.
- Signature blocks.

### 21.3 Two-option close (locked, for enterprise opportunities)

- Option A: **14-day Proof Sprint — $15,000.**
- Option B: **60-day Paid Pilot — $35,000.**
- (For regulated buyers, add) Option C: **90-day Regulated Pilot — $50,000+.**

---

## 22. Partner pricing integration

### 22.1 Partner offers

- **Developer affiliate offer.** 20% of year-one ARR on referrals that sign annual; paid quarterly; single tier; capped at $50k commission per deal.
- **Integration partner offer.** Co-marketing + listing + technical support; no commission unless qualifying as enterprise referrer.
- **Enterprise referrer offer.** Consultancies and integrators that introduce + assist with procurement: 15% of year-one ARR + 10% renewal commission for 2 renewal cycles; capped at $100k per deal in year one.
- **Design partner referral credit.** Year-one design partners (named in the design partner agreement) earn 20% lifetime referral commission on any customer they refer who signs annual; capped at 5 referrals.

### 22.2 Commission eligibility

- Partner must be registered before the deal is registered.
- Deal must be net-new (no existing P402 conversation in the past 12 months with the same buyer entity).
- Deal must close within the attribution window (180 days from registration).
- Deal must be invoiced and collected before commission is paid.

### 22.3 Commission exclusions

- No commission on Sandbox-only customers.
- No commission on the Proof Sprint fee itself; only on resulting annual.
- No commission on Paid Pilot fees; only on resulting annual.
- No commission on add-ons unless they're part of the original annual contract.
- No commission on refunded or churned-within-90-days contracts.

### 22.4 Refund and reversal rules

- If a referred customer cancels or refunds within 90 days of payment, the commission is reversed.
- If a referred customer downgrades, commission is adjusted proportionally.
- Reversals applied at next quarterly payout.

### 22.5 Payout timing

- Quarterly, within 30 days of quarter close.
- Minimum payout threshold: $500 (smaller balances roll forward).

### 22.6 Attribution window

- 180 days from deal registration date.
- Renewable on partner request if the deal cycle is genuinely longer.

### 22.7 Registered deal protection

- Once a deal is registered, no other partner can claim commission on the same buyer entity for 180 days.
- Direct P402 sales do not displace partner-registered deals; the partner remains the attributed party.

---

## 23. Customer success pricing integration

### 23.1 Cadence

- Sandbox: none.
- Developer: quarterly automated email; no live CSM.
- Business: monthly review (30 min, async-acceptable); CSM owns.
- Scale: monthly review + quarterly business review (QBR); CSM owns.
- Enterprise: dedicated CSM; weekly Slack; monthly review + QBR + annual review.
- Regulated Enterprise: dedicated CSM + named implementation engineer + founder-level access.

### 23.2 Review content

- **Usage review.** Are they at, below, or above plan? Any anomalies?
- **Outcome coverage review.** Is coverage growing? What's the gap?
- **Upgrade recommendation.** Conditional on usage and feature gates.
- **Renewal trigger.** 90 days before renewal: open the conversation.
- **Expansion trigger.** New department, new workflow, new use case.
- **Downgrade risk.** Customer reduced volume, stopped using a feature, missed a review.
- **Cancellation reason capture.** Required on every cancellation.

### 23.3 What CSM may and may not say

- May: "Your Optimize Readiness signal is strong; you may be ready for tenant-visible draft recommendations once they ship."
- May: "Your outcome coverage on workflow X is below the target we discussed at kickoff."
- May not: "We've estimated you saved $X."
- May not: "You should turn on policy auto-apply." (It does not exist.)
- May not: "Runtime enforcement is available." (It is blocked.)

---

## 24. Billing implementation requirements

This document does not implement billing. It defines what billing must support when implementation begins.

### 24.1 Plan entitlements

- Plan name, tier id, included monthly events, overage rate, retention, feature flags (SSO, SCIM, DPA, BAA, SLA, audit exports, evidence exports, etc.).
- Plans are versioned. A customer's contract pins the plan version.

### 24.2 Event meter

- Real-time counter per tenant per billing period.
- Idempotent on `(tenant_id, request_id)`.
- Excludes events that fall under §6.3.
- Late events past 72-hour settlement window roll to next invoice as debit lines.

### 24.3 Usage aggregation

- Hourly, daily, weekly, monthly rollups per tenant per workflow per provider.
- Exportable via API.

### 24.4 Overage calculator

- Real-time: included − consumed = remaining; remaining < 0 → overage = (consumed − included) × rate / 1000.
- Projected month-end based on current consumption pace.
- Displayed in dashboard and email.

### 24.5 Billing preview

- Customer can preview current month invoice at any time.
- Preview includes plan fee, overage estimate, taxes (if applicable).

### 24.6 Invoice usage appendix

- Every invoice includes an appendix detailing event counts by day, by workflow, by provider.
- Appendix is signed (cryptographic signature over the ledger range).

### 24.7 Customer usage export

- Customer can download a CSV / Parquet of every billable event in any month.
- Export includes event id, timestamp, workflow_id, provider, model, cost (if hosted), outcome status (if reported).

### 24.8 Dispute window

- 30 days from invoice date.
- Disputes resolved against ledger; resolution either credits invoice or stands.

### 24.9 Admin adjustment

- Internal P402 admins can apply credits, refunds, or adjustments with audit log entries.
- Adjustments require dual-approval for amounts >$5,000.

### 24.10 Partner attribution

- Every paid plan optionally carries a partner attribution tag.
- Tag is set at signup or at first invoice; cannot be retroactively changed.

### 24.11 Credit application

- Proof Sprint credit applied at Paid Pilot SOW signature.
- Paid Pilot credit applied at annual order form signature.
- Customer referral credit applied at next renewal.
- Affiliate commission tracked but paid quarterly, not applied to customer invoice.

### 24.12 Stripe + Metronome architecture

- Stripe: payment method, invoice rendering, tax computation, card capture, receipts.
- Metronome: usage-based pricing engine, plan entitlements, real-time meter aggregation, credit balances, commit/draw-down.
- Source of truth: Metronome for usage; Stripe for payment.

### 24.13 Self-serve checkout

- Sandbox: account + email only, no card.
- Developer: card + monthly subscription.
- Business monthly: card + monthly subscription at 40% premium.
- Business annual: requires sales-assisted checkout (sales-issued payment link).

### 24.14 Enterprise order forms

- Generated from a versioned template.
- Reference the metric definition appendix and the rate card by version.
- Signed via DocuSign or PandaDoc.

---

## 25. Pricing analytics

### 25.1 Required funnel events

| Event | Properties | Surface |
|---|---|---|
| `pricing_page_view` | utm, referrer | pricing |
| `pricing_tab_selected` | tab (build / govern / pilot) | pricing |
| `plan_card_viewed` | plan | pricing |
| `proof_sprint_cta_clicked` | source | pricing, homepage |
| `paid_pilot_cta_clicked` | source | pricing, homepage |
| `sandbox_started` | tenant_id | signup |
| `first_event_recorded` | tenant_id, time_from_signup | dashboard |
| `workflow_added` | tenant_id, workflow_id | dashboard |
| `outcome_recorded` | tenant_id, workflow_id | dashboard |
| `usage_50_pct` | tenant_id, plan | meter |
| `usage_80_pct` | tenant_id, plan | meter |
| `usage_100_pct` | tenant_id, plan | meter |
| `upgrade_prompt_viewed` | tenant_id, from_plan, to_plan | dashboard |
| `upgrade_clicked` | tenant_id, from_plan, to_plan | dashboard |
| `proof_sprint_requested` | tenant_id_or_anonymous, source | various |
| `pilot_requested` | tenant_id_or_anonymous, source | various |
| `proposal_sent` | opportunity_id | CRM |
| `contract_signed` | opportunity_id, ACV, plan, term | CRM |
| `churn_reason_captured` | tenant_id, reason, free_text | cancellation |

### 25.2 Funnel ratios to track

- Visit → Sandbox signup.
- Sandbox signup → first event (within 24h).
- First event → first outcome (within 7d).
- First event → 50% usage (within 30d).
- 50% usage → upgrade clicked.
- Upgrade clicked → upgrade completed.
- Proof Sprint requested → SOW signed.
- Proof Sprint signed → Paid Pilot signed.
- Paid Pilot signed → annual signed.

### 25.3 Cohort dimensions

- Plan at signup.
- Plan at last activity.
- Source (organic, partner, paid, referral, direct).
- Buyer size (employee count band).
- Vertical (regulated, SaaS, agentic, other).

---

## 26. A/B tests and experiments

### 26.1 Approved tests (run only when traffic supports)

| Test | Variants | Primary metric | Min sample / variant | Eligible to run when |
|---|---|---|---|---|
| Developer price anchor | $199 vs $249 | Dev signup → paid | ~12,000 | >5,000 pricing page sessions/week |
| Proof Sprint price | $10k vs $15k | Sprint requested → SOW signed | ~400 | >50 Proof Sprint requests/quarter |
| Business price | $2,500 vs $3,000 | Business plan signups | ~8,000 | >100 Business plan trials/month |
| Event allowances | 250k vs 500k Developer | Upgrade rate Sandbox → Developer | ~10,000 | >1,000 Sandbox tenants |
| Annual default copy | "Save 30% on annual" vs "Annual customers get rate protection" | Annual vs monthly checkout share | ~5,000 | >500 paid signups/month |
| Enterprise anchor copy | "From $60k ARR" vs "1–3% of governed AI spend" | Enterprise CTA clicks | ~3,000 | >100 enterprise pricing requests/quarter |
| Homepage CTA labels | "Start free" vs "See your AI spend by workflow" | Homepage CTA CTR | ~16,000 | >4,000 homepage sessions/week |
| Pricing page tabs | Build / Govern / Pilot vs Self-serve / Sales / Pilot | Tab selection → plan card view | ~6,000 | >2,000 pricing page sessions/week |

### 26.2 Rules

- **No silent invoice A/B tests.** Billing logic is never the variable under test.
- **No contract pricing tests without approval.** Enterprise pricing is not A/B tested. Each Enterprise quote is a discrete decision.
- **Public page copy tests allowed only before signed quote.** Once a buyer has a quote in hand, their experience is consistent.
- **All experiments documented.** Hypothesis, variants, metric, sample size, decision in a single `experiments/` directory.

### 26.3 Do not test

- Compliance claim language (this requires legal review, not A/B).
- DPA / MSA text (legal-locked).
- Discount amounts (one canonical discount schedule, not tested).
- Hidden fees (no hidden fees exist; nothing to test).

---

## 27. Pricing governance

### 27.1 Pricing owner

- **Founder** (year one). Founder is the single approver of all rate card changes, discount exceptions, and Enterprise quote floors.
- **After 5 paying customers:** add a finance partner to the approval flow.
- **After 25 paying customers:** add a sales lead.

### 27.2 Approval process

- Rate card v2 requires: written change memo, founder approval, downstream surface update plan, customer communication plan.
- Single Enterprise quote >$200k ARR requires founder + finance approval.
- Below-floor Enterprise quote requires founder approval and written strategic-logo rationale.
- Discount exceeding the discount schedule in §28 requires founder approval.

### 27.3 Versioned rate card

- The rate card in §4 is **v1**, effective on commit of this document.
- v2 (and beyond) requires a new dated section in this document or a successor document.
- Each version has an effective date.
- Each customer's contract pins the rate card version at signing.

### 27.4 Quote expiration

- Standard quote validity: 30 days from issue.
- Enterprise quote validity: 60 days from issue.
- Expired quotes require re-issue at current rate card.

### 27.5 Discount authority

- Founder may approve any discount within §28.
- Discounts exceeding §28 schedule require founder + finance.
- No sales rep has standalone discount authority.

### 27.6 Partner commission authority

- Founder approves new partner commission structures.
- Partner deal registration is system-driven, not approval-gated.
- Commission disputes resolved by founder within 10 business days.

### 27.7 Grandfathering rules

- Existing customers keep their rate at renewal **unless** the contract says otherwise.
- A migration to a new rate card is offered at renewal as a choice (stay, migrate at new rate, migrate to a different tier).
- No customer is migrated to a higher rate without explicit signature.

### 27.8 Renewal uplift rules

- Default renewal uplift: **5% per year** unless the customer's contract specifies a different schedule.
- Multi-year contracts price-protect the renewal rate at the contracted year-1 rate.
- Uplift may be waived for design partners or strategic logos at founder discretion.

### 27.9 Monthly premium

- Monthly billing carries a 30–40% premium vs. annualized monthly equivalent.
- Premium is visible on the pricing page.
- No customer is offered monthly billing on Scale or Enterprise tiers without founder approval.

### 27.10 Annual default

- All sales-assisted plans default to annual.
- Self-serve checkout on Developer defaults to monthly with an annual toggle (annual saves ~17% / two months free).

### 27.11 Usage dispute window

- 30 days from invoice date.
- Disputes resolved within 10 business days of submission.
- Resolution either credits the next invoice or stands.

### 27.12 Public pricing change process

- 30-day public notice required for self-serve price increases.
- Notice published on the pricing page and emailed to existing self-serve customers.
- Existing customers keep their rate until renewal.

---

## 28. Discount policy

Locked discount schedule. Founder may approve below the schedule for strategic reasons; nothing else is automatic.

### 28.1 Discount schedule

| Discount | Eligibility | Maximum | Approver |
|---|---|---|---|
| **Annual prepay** | Customer pays annually | ~17% (two months free) | Auto |
| **Multi-year prepay** | 2-yr prepay | 8% on yr1 + yr2 price-locked | Founder |
| **Multi-year prepay** | 3-yr prepay | 12% on yr1 + yr2-3 price-locked | Founder |
| **Startup discount** | <$5M ARR, <50 employees | 25% off year 1 | Founder |
| **Design partner discount** | Named design partner | 50% off year 1 + lifetime referral commission | Founder |
| **Strategic logo discount** | Logo with marketing/PR value | Up to below-floor Enterprise pricing | Founder + written rationale |
| **Nonprofit / academic** | 501(c)(3) or accredited academic | 50% off | Founder |
| **Volume / multi-year combined** | 3-yr prepay + Enterprise | up to 20% combined | Founder + finance |

### 28.2 No discount cases

- **Proof Sprint:** no discount. Use credit policy instead (100% credit to Paid Pilot).
- **Paid Pilot:** no discount unless strategic logo. Use credit policy instead (50% credit to annual).
- **Regulated Pilot:** no discount.

### 28.3 Discount governance

- All discounts logged in CRM with approver name and rationale.
- Discounts exceeding schedule require written memo.
- Annual discount audit: founder reviews the discount log quarterly; outliers investigated.

### 28.4 Future executive approval

When P402 has a CFO or board, discounts exceeding 25% on any plan require board reporting on a quarterly basis. Discounts exceeding 50% require pre-approval.

---

## 29. Add-ons and future modules

Locked list. New add-ons require pricing-governance review per §27.

### 29.1 Available add-ons

| Add-on | Eligible plans | Price | Notes |
|---|---|---|---|
| **Settlement (Base, Tempo)** | Business+ | Usage-based; 0.5% of settled value, $500 min/mo | Optional; not a precondition for accountability |
| **Advanced audit retention** | Business+ | $1,000/mo per extra year of retention | 2-yr default on Scale, custom on Enterprise |
| **Data warehouse export** | Business+ | $500/mo (Snowflake, BigQuery, Redshift) | Includes pipeline maintenance |
| **Private deployment design** | Enterprise | Starting $50k engagement fee | Design only; operation separate |
| **Procurement pack** | Scale+ | Included; on request | Standardized procurement response artifacts |
| **Dedicated support** | Scale+ | Starting $2,000/mo (Scale); custom on Enterprise | Named eng + Slack SLA |
| **Regulated evidence pack** | Regulated Enterprise | Included; on request | BAA, evidence artifacts, vendor questionnaire |
| **Optimize Readiness review** | Business+ | Quarterly: $5,000/engagement | Founder-led review of readiness signals |

### 29.2 Future Verified Savings module (not for sale)

**Verified Savings** is a future module with explicit prerequisites:

- A documented baseline methodology approved by a customer-facing reviewer.
- An approved configuration change with an apply path (which does not exist today).
- A post-period measurement plan with a confidence interval.
- Customer agreement to the methodology before measurement begins.
- No auto-apply behavior anywhere in the path.

**Until the prerequisites exist:**
- No price.
- No success fee.
- No revenue share.
- No "savings unlocked" copy on any surface.
- No "X% saved" claim in any sales material.

When the module ships, pricing will be developed in a successor document; this one explicitly does **not** price it.

---

## 30. Risks and mitigations

### 30.1 Underpricing Developer tier

- **Risk.** Customers anchor P402 as a commodity AI gateway at $79–$99 level.
- **Mitigation.** Hold the $249 floor. If conversions stall, run the §26 A/B test before lowering. If conversions still stall, the problem is positioning, not price.

### 30.2 Overpricing before proof

- **Risk.** Enterprise floor of $60k ARR appears unjustified without reference customers.
- **Mitigation.** Strategic-logo discount path. Below-floor Enterprise pricing for first 5 logos. Honest acknowledgment in pitches that "we're early; here's the credit policy."

### 30.3 Event metric confusion

- **Risk.** Buyer disputes a metered event count after invoice.
- **Mitigation.** Metric definition in §6 is the contract appendix. Audit exports are signed. Dispute window is 30 days. Real-time meter is visible.

### 30.4 Overage anxiety

- **Risk.** Customer disengages because they're scared of overage charges.
- **Mitigation.** Hard cap toggle. Soft cap default on. Alerts at 50/80/100/120%. Calculator on pricing page.

### 30.5 Procurement friction

- **Risk.** Enterprise deal stalls in procurement for >90 days.
- **Mitigation.** Procurement pack delivered at week 6 of Paid Pilot. DPA template ready. MSA template ready. Sub-processor list ready.

### 30.6 Too many SKUs

- **Risk.** Buyers get confused choosing among 5 tiers + 3 pilots + N add-ons.
- **Mitigation.** Pricing page uses tabs (Build / Govern / Pilot) so only relevant SKUs surface per buyer intent. Default recommended plan per buyer size.

### 30.7 Unsupported savings claims

- **Risk.** Sales rep slips and says "this saves X%."
- **Mitigation.** §3 principle locked. §20 ROI guardrail slide is mandatory. Sales onboarding includes the no-savings rule. Source-shape audits on marketing copy.

### 30.8 Privacy objection

- **Risk.** Buyer security team rejects P402 because they assume prompt storage.
- **Mitigation.** Trust page leads with "Metadata-only. No prompt or response storage." Repeated in sales deck slide 9. Confirmed in DPA appendix.

### 30.9 Comparing against Helicone or LiteLLM

- **Risk.** Buyer compares P402's $249 Developer to Helicone's $79 Pro and balks.
- **Mitigation.** Comparison page that explicitly names the difference: P402 is accountability + governance; Helicone is observability + gateway. Different categories.

### 30.10 Comparing against CloudZero

- **Risk.** Buyer compares P402's $60k Enterprise to CloudZero's $100k+ and assumes P402 is "lite."
- **Mitigation.** Anchor "1–3% of governed AI spend" message. Both products consume similar share of spend. P402 covers AI; CloudZero covers broader cloud cost. Different scopes.

### 30.11 Founder-led sales burden

- **Risk.** Founder is on every deal, can't scale, becomes the bottleneck.
- **Mitigation.** Standard 12-slide deck, standard SOW, standard proposal template. Anyone can run a Proof Sprint scoping call from the deck. Founder only on executive readout and Enterprise close.

### 30.12 Weak traffic and low outcome volume

- **Risk.** Pricing page gets <500 sessions/week; no A/B tests are statistically valid; metrics are anecdotal.
- **Mitigation.** Don't run A/B tests prematurely. Use qualitative win/loss interviews. Focus on getting traffic (off-page SEO, partner content) before optimizing on-page conversion. **This is the highest-leverage risk in year one.**

---

## 31. Acceptance criteria

This document is complete only when it answers each question below.

### 31.1 Required answers

| Question | Section |
|---|---|
| **What does P402 charge today?** | §4 (rate card v1) |
| **What does P402 charge later?** | §27 (governance), §29 (add-ons), §29.2 (Verified Savings future) |
| **What exactly is billable?** | §6.2 |
| **What is not billable?** | §6.3 |
| **What plan should each buyer choose?** | §1, §7 (Enterprise anchoring), §10–11 (Sprint vs Pilot) |
| **What triggers upgrade?** | §12.5 (revenue stage) |
| **What does the pricing page say?** | §15 |
| **What does the homepage say?** | §14 |
| **What does sales say?** | §20 (sales deck) |
| **What does the SOW say?** | §10.10, §11.13, §21 |
| **What does billing implement later?** | §24 |
| **What does customer success use to expand?** | §23 |
| **What is forbidden to claim?** | §3, §9.1, §29.2, §30.7 |

### 31.2 Surfaces that must update before launch

A downstream slice will update each of:

- `/` (homepage).
- `/pricing` (full rebuild from §15).
- `/trust` (procurement sections from §16).
- `/developers` and `/developers/quickstart` (per §17).
- Dashboard meter (per §18).
- Sales deck (per §20).
- Proof Sprint SOW template (per §10.10).
- Paid Pilot SOW template (per §11.13).
- Enterprise order form template.
- Partner page (per §22).
- Customer success cadence and templates (per §23).
- Billing implementation plan (per §24).

None of those updates happen in this slice. This slice ships the source-of-truth document only.

### 31.3 Effective date

This rate card is **v1**, effective on the commit date of this document.

### 31.4 Next review

- 90 days from effective date: pricing-governance review per §27.
- Or earlier if any of these signals fire: (a) Proof Sprint or Paid Pilot conversion rate <25%, (b) Sandbox-to-Developer conversion <2%, (c) Enterprise quote acceptance <30%, (d) any signed customer disputes the metered event definition.

---

## 32. Reaffirmed boundaries

- No code shipped by this slice.
- No public surface modified by this slice.
- No billing system implementation.
- No SQL execution. No Neon contact. No Redis touched. No migration run. No deploy.
- No claim of verified savings.
- No claim of policy auto-apply.
- No claim of runtime enforcement being live.
- No unsupported compliance claim.
- No customer logo or name used without written permission.

This document is the source of truth. Every downstream pricing surface and contract is derived from it.
