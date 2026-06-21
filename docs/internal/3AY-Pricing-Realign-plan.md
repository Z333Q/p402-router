# 3AY-Pricing-Realign Plan

**Status:** plan only. No code change in this slice. Implementation deferred to a separately approved 3AY-Pricing-Realign-Impl slice if the operator picks the V5 ladder; if the operator confirms the 3AX ladder, no implementation is needed.
**Predecessors:** 3AX rate card v1 (`789eb58`), V5 source of truth, 3AY-4 intent handling, 3AY-8R billing foundation plan.
**Successor:** 3AY-8R-Impl is **blocked** until this slice closes one way or the other.

## 0. Hard boundaries (true throughout 3AY-Pricing-Realign)

- No Stripe, Metronome, checkout, billing webhook, or card capture.
- No SQL, Neon, Redis, migration, or runtime change.
- No verified savings claim.
- No self-serve paid checkout implication unless explicitly approved later.
- No customer logo or unsupported compliance claim.
- This slice ships a **recommendation document**. The pricing page does not move until a follow-on slice is approved.

## 1. Goal

Pick the final launch pricing ladder so 3AY-8R-Impl can proceed without hardcoding the wrong SKU set into Stripe products, schema, or webhook logic. The decision needed is one of:

- **A. Hold 3AX as the launch ladder** (no code change; 3AY-8R-Impl proceeds against 3AX).
- **B. Adopt V5 (with a small softening at the Enterprise floor) as the launch ladder** (small follow-on slice updates `lib/pricing/rate-card.ts` + intent copy; 3AY-8R-Impl then proceeds against V5).
- **C. Custom hybrid** (operator overrides individual numbers; documented as a delta below).

This plan answers the 10 directive questions, presents an honest tradeoff, and recommends Option B.

## 2. Honest comparison: 3AX vs V5

### 2.1 The ladders

| Slot | 3AX (currently shipped) | V5 candidate |
|---|---|---|
| Free entry | Sandbox $0 / 25k events / 14-day retention | Free $0 / 10k events / 7-day retention |
| Paid developer entry | **Developer $249/mo** / 500k events | **Build $49/mo** / 250k events |
| Mid developer | — | Growth $199/mo / 2M events |
| High developer / mid commercial | Business $2,500/mo annual / 5M events | Scale $799/mo / 20M events |
| Commercial | Scale $5,000/mo annual / 15M events | Business $5,000/mo / 5 departments |
| Enterprise floor | from $60,000 ARR / 25M+ event commit | $15,000/mo ($180k ARR) / unlimited departments |
| One-time enterprise on-ramp | Proof Sprint $15,000 / 14 days / 1 workflow | **AI Spend Audit $1,500** / one-time / vendor invoice review |
| Recurring enterprise on-ramp | — | **Department Dashboard $1,500/mo** / 1 department |
| Procurement bridge | Paid Pilot $35,000 / 60–90 days / 3 workflows | (not in V5 explicitly) |
| Regulated bridge | Regulated Pilot $50,000+ / 90 days | (not in V5 explicitly) |

### 2.2 Where 3AX wins

- **Higher revenue per customer.** A $249/mo customer is worth ~5× a $49/mo customer.
- **Filters tire-kickers.** Buyers who say yes at $249 are likelier to engage with sales.
- **Cleaner Enterprise floor at $60k ARR vs V5's $180k.** Lower floor is more credible at zero-customer state.
- **Already shipped.** No follow-on engineering needed if held.

### 2.3 Where V5 wins

- **Activation matters more than ARPU at zero customers.** The pricing page today (with $249 floor and $15k Proof Sprint) is designed for a buyer base that doesn't exist yet. Lower floors produce signups; signups produce events; events make the engine useful.
- **AI Spend Audit at $1,500 is the strongest single move.** A 10× cheaper enterprise on-ramp gets buyers across the line whose procurement can approve a $1,500 line item without a committee but cannot approve a $15,000 line item without one. The V5 doc treats this as the primary enterprise foothold; 3AX has no equivalent.
- **Department Dashboard at $1,500/mo bridges the gap.** 3AX jumps from $2,500/mo Business to $60k Enterprise (24× cliff). V5 ladders $1,500/mo → $5,000/mo → $15k/mo. Three doublings is the right shape.
- **$49 / $199 / $799 ladder matches buyer expectations.** Helicone Pro $79, Portkey $49, Langfuse Pro $199, Braintrust Pro $249 — V5 sits cleanly in the developer-tooling category. 3AX sits above it, which is the right destination but the wrong starting position.
- **Aligned to V5 source of truth.** The 619-line PRICING research doc + the V5 Final Source of Truth both converge on this ladder. If 3AX is held, the canonical doc has to be edited to match.

### 2.4 Where V5 is too aggressive (one specific number)

- **Enterprise floor at $180k ARR** ($15,000/mo). With zero reference customers, a $180k floor is hard to close. V5's reasoning is sound (CloudZero / Apptio operate at this tier) but the comparable doesn't hold yet. **Softening recommendation: keep the V5 ladder but cap Enterprise floor at $60,000 ARR (the 3AX floor)** until 5 paying customers exist; then re-evaluate. Below-floor strategic-logo discounts remain available per 3AX §28.

### 2.5 Net verdict

**Adopt V5 substantially, soften the Enterprise floor, keep the larger procurement bridges (Paid Pilot $35k + Regulated Pilot $50k+) from 3AX as upper-tier pilot offerings above the V5 ladder.** This is a "best of both" composition that:

- Gets the V5 activation funnel.
- Keeps 3AX's defensible Enterprise floor.
- Preserves both consultative pilot tiers for buyers who need them.

## 3. Recommendation: hybrid ladder (V5-led, 3AX-softened)

### 3.1 Visible launch pricing table

```
Sandbox            $0           25,000 events / mo     14-day retention   Self-serve
Build              $49 / mo     250,000 events / mo    30-day retention   Self-serve (Stripe Checkout when 3AY-8R-Impl ships)
Growth             $199 / mo    2,000,000 events / mo  90-day retention   Self-serve (Stripe Checkout)
Scale              $799 / mo    20,000,000 events / mo 1-year retention   Sales-assisted (annual default)
Enterprise         from $60k ARR   25M+ event commit   Custom retention   Sales-led
```

### 3.2 Visible bridge offer table

```
AI Spend Audit     $1,500       one-time                 1 vendor invoice + 1 dashboard preview + spend report
Paid Pilot         $35,000      60–90 days               Up to 3 workflows, procurement-ready evidence
Regulated Pilot    $50,000+     90 days                  Healthcare / finance / legal / insurance / public sector
```

### 3.3 Internal-only future SKU table (not yet on `/pricing`)

```
Department Dashboard  $1,500 / mo   1 department, recurring   Ships when AI Spend Audit produces signed contracts
Business              $5,000 / mo   up to 5 departments       Ships when Department Dashboard has 2+ customers
Optimize Starter      $499 / mo     manual recommendation queue   Ships with Optimize tenant-visible surface (3AQ-Impl)
Optimize Scale        $1,499 / mo   automated recommendations    Ships with Optimize tenant-visible surface (3AQ-Impl)
```

### 3.4 SKUs removed from current 3AX rate card

```
Developer $249/mo       → folded into Build $49 + Growth $199 split
Business $2,500/mo      → moved internal-only (above), replaced on /pricing by Scale $799
Scale $5,000/mo         → renumbered to Business $5,000/mo, moved internal-only
Proof Sprint $15,000    → replaced by AI Spend Audit $1,500 on /pricing (Proof Sprint preserved as internal-only larger-engagement option)
```

## 4. Answers to the 10 directive questions

1. **What is the first paid SKU?** **Build $49/mo** (V5).
2. **Should Developer be $49, $249, or sales-assisted?** Renamed to **Build at $49/mo** (V5). Self-serve Stripe Checkout when 3AY-8R-Impl ships. Until then, sales-assisted via `/get-access?intent=build`.
3. **Should AI Spend Audit be a one-time $1,500 offer?** **Yes.** This is the highest-leverage single change from 3AX.
4. **Should Department Dashboard be $1,500/mo later?** **Yes**, but internal-only at launch. Surface on `/pricing` after the first Department Dashboard customer signs (or after 2 AI Spend Audit conversions).
5. **What is the Enterprise floor?** **$60,000 ARR** (3AX floor preserved; soften V5's $180k floor until 5 paying customers exist).
6. **Which bridge offers remain?** AI Spend Audit ($1,500), Paid Pilot ($35,000), Regulated Pilot ($50,000+). Proof Sprint is **removed** — its function is absorbed by AI Spend Audit at 10% the price.
7. **Which pricing items are visible on `/pricing` now?** Sandbox, Build, Growth, Scale, Enterprise, AI Spend Audit, Paid Pilot, Regulated Pilot.
8. **Which pricing items are only internal or future?** Department Dashboard, Business, Optimize Starter, Optimize Scale.
9. **Which env vars will 3AY-8R need later?** See §8.
10. **What exact copy changes are required?** See §6 and §7.

## 5. CTA model (delta from current)

| CTA | Current (3AX) | Proposed (hybrid) | Destination |
|---|---|---|---|
| Sandbox | "Start free" | "Start free" | `/dashboard` |
| Build (was Developer) | "Start Developer" → `/get-access?intent=developer` | "Start Build" | `/get-access?intent=build` (until 3AY-8R-Impl flips to Stripe Checkout) |
| Growth (new) | n/a | "Start Growth" | `/get-access?intent=growth` (until 3AY-8R-Impl) |
| Scale | "Request quote" → `/get-access?intent=scale` | "Talk to sales" | `/get-access?intent=scale` |
| Enterprise | "Request enterprise pricing" → `/get-access?intent=enterprise` | "Request enterprise pricing" | `/get-access?intent=enterprise` |
| AI Spend Audit (new) | n/a | "Book AI Spend Audit" | `/get-access?intent=ai-spend-audit` |
| Paid Pilot | "Design pilot" → `/get-access?intent=paid-pilot` | "Design pilot" | `/get-access?intent=paid-pilot` (unchanged) |
| Regulated Pilot | "Discuss regulated pilot" → `/get-access?intent=regulated-pilot` | "Discuss regulated pilot" | `/get-access?intent=regulated-pilot` (unchanged) |

New intent ids needed (additions to 3AY-4 intent module): `build`, `growth`, `ai-spend-audit`.

## 6. Required rate-card changes (precise diff for implementation slice)

### 6.1 Changes to `lib/pricing/rate-card.ts`

```
PLAN_IDS:
  Before: ['sandbox', 'developer', 'business', 'scale', 'enterprise']
  After:  ['sandbox', 'build', 'growth', 'scale', 'enterprise']

PLANS.sandbox.includedEventsPerMonth:
  Before: 25_000
  After:  25_000   (no change; V5 says 10k but 3AX's 25k is more generous and still affordable)

PLANS.developer:
  Removed entirely. Replaced by:

PLANS.build:
  monthlyPriceAnnualUsd: 49
  monthlyPriceMonthlyUsd: 49
  annualPriceUsd: 49 * 12
  includedEventsPerMonth: 250_000
  overageUsdPer1kEvents: 0.25     (preserved from 3AX Developer)
  retentionDays: 30
  audience: 'Production-ready small teams'
  ctaLabel: 'Start Build'
  ctaHref: '/get-access?intent=build'
  inclusions: [
    'All Sandbox features',
    '30-day retention',
    'Unlimited users, projects, workflows',
    'Outcome coverage',
    'API exports',
    'Email support',
  ]
  salesMotion: 'sales-assisted'  (until 3AY-8R-Impl ships Stripe Checkout)

PLANS.growth (new):
  monthlyPriceAnnualUsd: 199
  monthlyPriceMonthlyUsd: 199
  annualPriceUsd: 199 * 12
  includedEventsPerMonth: 2_000_000
  overageUsdPer1kEvents: 0.15
  retentionDays: 90
  audience: 'Production AI products with paying customers'
  ctaLabel: 'Start Growth'
  ctaHref: '/get-access?intent=growth'
  inclusions: [
    'All Build features',
    'Customer-level cost attribution',
    'Feature-level margin reporting',
    'Retry waste detection',
    'Context waste detection',
    'Cache savings reporting',
    '90-day retention',
    'Slack alerts',
  ]
  salesMotion: 'sales-assisted'

PLANS.business:
  Removed from rate card (moved to internal-only roadmap).

PLANS.scale:
  monthlyPriceAnnualUsd: 799    (down from 5,000)
  monthlyPriceMonthlyUsd: null  (annual-only preserved)
  annualPriceUsd: 799 * 12
  includedEventsPerMonth: 20_000_000  (up from 15M to match V5)
  overageUsdPer1kEvents: 0.08
  retentionDays: 365            (down from 730; V5 says 1-year)
  audience: 'High-volume AI products and platform teams'
  ctaLabel: 'Talk to sales'
  ctaHref: '/get-access?intent=scale'
  inclusions: [
    'All Growth features',
    'Team seats',
    'Advanced routing controls',
    'Customer budgets',
    'Margin floor enforcement',
    'Policy enforcement',
    'Optimization queue',
    'Audit exports',
    'Priority support',
  ]
  salesMotion: 'sales-led'

PLANS.enterprise:
  No change to the Enterprise floor at $60,000 ARR.
  Inclusions unchanged from 3AX (SSO, SCIM, RBAC, DPA, SLA, procurement pack, private deployment design).

ENTERPRISE_FLOOR_ARR_USD:
  Before: 60_000
  After:  60_000   (no change; soften V5 here)

BRIDGE_OFFERS:
  proof_sprint:
    Removed.

  ai_spend_audit (new):
    priceUsd: 1_500
    priceIsFloor: false
    durationDays: null            (one-time engagement; not a duration)
    scope: 'One vendor invoice review, one usage import, one dashboard preview, workflow-level cost analysis, executive report'
    creditPolicy: '100% credited toward Paid Pilot if Paid Pilot is signed within 30 days'
    audience: 'Enterprise teams looking for an executive-grade first look at AI spend'
    ctaLabel: 'Book AI Spend Audit'
    ctaHref: '/get-access?intent=ai-spend-audit'

  paid_pilot:
    Unchanged ($35,000, 60–90 days, 3 workflows, 50% credit to annual).

  regulated_pilot:
    Unchanged ($50,000+, 90 days, BAA path after security and contracting review).

HOMEPAGE_PRICING_SUPPORT_LINE:
  Before: 'Start free. Production plans from $249/month. Enterprise pilots from $35k.'
  After:  'Start free. Production plans from $49/month. Enterprise audits from $1.5k.'

PRICING_PAGE_SUPPORT_LINE:
  Unchanged.

HOMEPAGE_TRUST_MICROCOPY:
  Unchanged.
```

### 6.2 Changes to `lib/pricing/intent.ts`

```
INTENT_IDS:
  Before: ['developer', 'business', 'scale', 'enterprise', 'proof-sprint', 'paid-pilot', 'regulated-pilot', 'scoping-call']
  After:  ['build', 'growth', 'scale', 'enterprise', 'ai-spend-audit', 'paid-pilot', 'regulated-pilot', 'scoping-call']

INTENT_COPY.developer:
  Replaced by INTENT_COPY.build with the same shape:
    heading: 'Start with Build — $49/month'
    subheading: 'Production-ready for small teams that already have AI workflows in motion.'
    handoffBanner: 'Paid self-serve checkout for Build is in progress and will ship with our Revenue Billing Foundation (3AY-8R). Until then, we onboard Build accounts manually so you can start without a card.'
    details: pulled from rate card (Build inclusions)
    defaultUseCase: 'Production AI workflow'

INTENT_COPY.growth (new):
    heading: 'Start with Growth — $199/month'
    subheading: 'Production AI products with paying customers, customer-level margin, retry and context waste detection.'
    handoffBanner: 'Growth is sales-assisted on annual contracts until 3AY-8R-Impl ships Stripe Checkout. We schedule a 30-minute scoping call within two business days.'
    details: pulled from rate card (Growth inclusions)
    defaultUseCase: 'Embedded AI margin control'

INTENT_COPY.business:
  Removed (no public Business tier).

INTENT_COPY['ai-spend-audit'] (new):
    heading: 'Book an AI Spend Audit — $1,500'
    subheading: 'One-time enterprise diagnostic. Vendor invoice review, usage import, workflow-level cost analysis, executive report.'
    handoffBanner: 'AI Spend Audit scoping calls are scheduled within two business days. Engagement begins after invoice + executive sponsor confirmation.'
    details: [
      '$1,500 fixed fee, one-time engagement.',
      'One vendor invoice review, one usage import, one dashboard preview.',
      '100% credited toward Paid Pilot if signed within 30 days.',
    ]
    defaultUseCase: 'Enterprise AI spend governance'

INTENT_COPY['proof-sprint']:
  Removed.

INTENT_COPY['scoping-call']:
  Update reference pricing in details:
    Before: 'Reference pricing: Sandbox free; Developer $249/month; Business $2,500/month annual; Enterprise from $60,000 ARR.'
    After:  'Reference pricing: Sandbox free; Build $49/month; Growth $199/month; AI Spend Audit $1,500 one-time; Enterprise from $60,000 ARR.'
```

## 7. Required `/pricing` page-copy changes

### 7.1 Plan grid

```
Before (5 columns): Sandbox | Developer | Business | Scale | Enterprise
After  (5 columns): Sandbox | Build     | Growth   | Scale | Enterprise
```

Highlight column: **Growth** (instead of Business). This is the "most popular" anchor for developer-tier buyers.

### 7.2 Buyer-path tabs

Tab labels unchanged. Section anchors update:

```
"Build AI software"      → highlights Sandbox + Build + Growth
"Govern enterprise AI"   → highlights Scale + Enterprise + AI Spend Audit
"Launch a pilot"         → highlights AI Spend Audit + Paid Pilot + Regulated Pilot
```

### 7.3 Bridge offers band

```
Before: Proof Sprint $15k / Paid Pilot $35k / Regulated Pilot $50k+
After:  AI Spend Audit $1.5k / Paid Pilot $35k / Regulated Pilot $50k+
```

Section header copy:
```
Before: "Not ready to self-serve? Two paid bridge engagements, each producing executive-grade evidence and a clear next step."
After:  "Need executive evidence before a multi-workflow commitment? Three paid engagements, from a $1,500 audit to a 90-day regulated pilot."
```

### 7.4 FAQ updates

- "How does Proof Sprint credit work?" → "How does AI Spend Audit credit work?" (answer updated to $1,500 + 100% credit policy).
- "Do you support annual contracts?" — update "Business annual-default with 40% monthly premium" reference; remove since Business is now internal-only. Replace with "Scale and Enterprise are annual-only. Build and Growth are monthly self-serve when checkout ships."

### 7.5 Enterprise band

Anchor copy unchanged ("Enterprise customers typically allocate 1–3% of their annual governed AI spend to P402"). The "From $60,000 ARR" headline is unchanged.

### 7.6 Add-ons

Unchanged. The 8 add-ons from 3AX §29 remain. The future cost-measurement module note remains.

### 7.7 Settlement transition band

Unchanged.

### 7.8 Final CTA footer

Unchanged.

## 8. Env var implications for 3AY-8R-Impl

If the hybrid ladder is approved, the 3AY-8R-Impl env vars become:

| Env var | When needed |
|---|---|
| `STRIPE_SECRET_KEY` | always |
| `STRIPE_WEBHOOK_SECRET` | always |
| `STRIPE_PRICE_ID_BUILD_MONTHLY` | first self-serve checkout SKU |
| `STRIPE_PRICE_ID_GROWTH_MONTHLY` | second self-serve checkout SKU |
| `STRIPE_PRICE_ID_AI_SPEND_AUDIT` | one-time SKU when AI Spend Audit ships into Stripe (likely v1.1, not v1) |
| `STRIPE_PRICE_ID_SCALE_MONTHLY` | optional (Scale stays sales-assisted in v1; this is for a future flip) |
| `BILLING_V1_ENABLED` | feature flag (default false) |
| `NEXT_PUBLIC_APP_URL` | already exists |

The implementation slice loads only the env vars matching the chosen ladder. If the 3AX ladder is held instead, `STRIPE_PRICE_ID_DEVELOPER_MONTHLY` replaces the Build/Growth vars.

## 9. Decision gate (must clear before 3AY-Pricing-Realign-Impl OR before 3AY-8R-Impl)

The operator answers one of:

- **A. Hold 3AX as the launch ladder.** No follow-on slice needed for the rate card. 3AY-8R-Impl proceeds against 3AX with `STRIPE_PRICE_ID_DEVELOPER_MONTHLY`. The hybrid ladder in §3 is shelved.
- **B. Adopt the hybrid ladder in §3.** 3AY-Pricing-Realign-Impl ships the rate-card + intent-copy + page-copy diffs in §6 and §7 as a single slice (estimated 1 day of engineering). After that ships, 3AY-8R-Impl proceeds with `STRIPE_PRICE_ID_BUILD_MONTHLY` as the first self-serve checkout SKU.
- **C. Custom overrides.** Operator specifies which V5 changes to adopt and which 3AX numbers to keep. The recommendation document is updated with the operator's overrides and 3AY-Pricing-Realign-Impl proceeds against that custom hybrid.

## 10. What 3AY-Pricing-Realign-Impl would touch (if B or C is approved)

Files modified in a single implementation slice:

- `lib/pricing/rate-card.ts` — diff per §6.1
- `lib/pricing/__tests__/rate-card.test.ts` — update expected constants
- `lib/pricing/intent.ts` — diff per §6.2
- `lib/pricing/__tests__/intent.test.ts` — update expected copy
- `app/pricing/page.tsx` — diff per §7
- `app/pricing/__tests__/page-copy.test.ts` — update plan-name and bridge-offer assertions
- `app/get-access/__tests__/intent-handling.test.tsx` — update intent rendering assertions (developer → build, ai-spend-audit added)
- `app/sitemap.ts` — no change (URLs are the same)

Estimated effort: **half a day to a full day** of focused engineering plus copy review. No DB change. No deploy until smoke verifies.

## 11. What stays untouched in either decision

- The 3AY-8R billing foundation plan (§1 gate is satisfied either way; §2 price-ladder-agnostic design accommodates both).
- The metric definition page (`/pricing/metric-definition`).
- The trust page and homepage hero (a separate slice updates the homepage support line if hybrid ladder is approved).
- The intent-handling architecture in `lib/pricing/intent.ts` (only the copy values change; the module shape stays).
- The forbidden-phrase test suite. No new claims are made by either ladder.

## 12. Rollback plan

If the chosen ladder produces evidence of poor conversion within 90 days of launch:

- The rate-card module is the single source of truth; a single edit reverts.
- Existing customers keep their rate via the rate-card version pin (§27.7 of 3AX governance).
- 3AY-8R's price-ladder-agnostic design means a re-flip costs configuration, not webhook code.

This means the decision below is **reversible**. It is not a one-way door. The cost of choosing wrong is one day of engineering plus the customers acquired at the chosen rate (who keep that rate).

## 13. Recommendation, restated

**Option B — adopt the hybrid ladder.** The single most consequential change is replacing Proof Sprint with **AI Spend Audit at $1,500**. That alone justifies the slice. The developer-tier downshift ($249 → $49 / $199 / $799) follows the V5 source of truth and matches the comparable-product market. The Enterprise floor stays at $60k ARR (3AX softening of V5) until reference customers exist.

If you want a single sentence on which way to go: **the V5 doc was written specifically to address the zero-customer problem; 3AX was written before that problem was named. V5 wins until 5 paying customers exist; revisit then.**

## 14. Acceptance criteria for this plan

This plan is complete only if it answers each directive question with operational specifics:

| Question | Section |
|---|---|
| What is the first paid SKU? | §4.1, §3.1 |
| Should Developer be $49, $249, or sales-assisted? | §4.2 |
| Should AI Spend Audit be one-time $1,500? | §4.3 |
| Should Department Dashboard be $1,500/mo later? | §4.4 (yes, internal-only at launch) |
| What is the Enterprise floor? | §4.5 ($60k ARR, softened from V5's $180k) |
| Which bridge offers remain? | §4.6 |
| Which pricing items are visible on `/pricing` now? | §4.7, §3.1, §3.2 |
| Which pricing items are only internal or future? | §4.8, §3.3 |
| Which env vars will 3AY-8R need later? | §8 |
| What exact copy changes are required? | §6, §7 |

## 15. Stop / next step

Awaiting your decision: **A (hold 3AX), B (hybrid, recommended), or C (custom overrides)**. No implementation begins until the decision is recorded in writing.

If **B**, the follow-on slice is **3AY-Pricing-Realign-Impl** (~1 day, no DB change, no deploy until smoke).
If **A**, no follow-on slice; 3AY-8R-Impl is unblocked.
If **C**, this document is amended with the operator's overrides and we proceed.
