# 3AY-8R-1: Billing Vocabulary Audit

**Status:** audit only. No code edits. No migration authoring. No SQL writes. No Neon mutation. No Redis mutation. No deploy. No Stripe live calls. No production mutation.
**Predecessor:** 3AY-8R Revenue Billing Foundation Plan (commit 80548a7).
**Successor:** 3AY-8R-Impl phasing decision (see §6).

## 0. Hard boundaries (true throughout this audit)

- No code edits.
- No migration files authored.
- No SQL writes. No Neon mutation. No Redis mutation.
- No deploy. No Stripe live call. No production mutation.
- No plan migration. No checkout change.
- No verified savings, auto-apply, runtime enforcement, or unsupported compliance claims.

---

## 1. Code vocabulary audit

### 1.1 Live runtime writes to `tenants.plan`

| File:line | Write value | Trigger | Classification |
|---|---|---|---|
| `lib/billing/subscription-service.ts:66` | `$2` (from `session.metadata.planId`, defaulted to `'pro'` at line 22) | Stripe `checkout.session.completed` | **live runtime — must update in 3AY-8R-Impl** |
| `lib/billing/subscription-service.ts:165` | `'free'` | Stripe `customer.subscription.deleted` | **live runtime — must update in 3AY-8R-Impl** |
| `lib/actions/billing-finalize.ts:86` | `'pro'` | On-chain USDC subscription finalize | **live runtime — must update in 3AY-8R-Impl** |
| `app/api/v1/billing/onchain/subscribe/route.ts:54` | `'pro'` | On-chain v1 subscribe POST | **live runtime — must update in 3AY-8R-Impl** |
| `app/api/internal/cron/billing/reconcile/route.ts:108` | `'free'` | On-chain subscription past-due via cron | **live runtime — must update in 3AY-8R-Impl** |

### 1.2 Live runtime reads of `tenants.plan`

| File:line | Comparison | Classification |
|---|---|---|
| `app/dashboard/billing/page.tsx:44` | `planId === 'pro' ? portal : checkout` | **live runtime UI branch — must update in 3AY-8R-Impl** |
| `app/dashboard/billing/page.tsx:77,78,135` | `planId === 'pro'` for label, icon, badge color | **live runtime UI branch — must update in 3AY-8R-Impl** |
| `app/dashboard/billing/page.tsx:109,136` | `planId === 'free'` for upgrade math + default badge | **live runtime UI branch — must update in 3AY-8R-Impl** |

### 1.3 Stripe Price → plan mapping (live)

| File:line | Mapping | Classification |
|---|---|---|
| `lib/billing/providers/stripe.ts:10-11` | `{ 'pro': STRIPE_PRICE_ID_PRO, 'enterprise': STRIPE_PRICE_ID_ENTERPRISE }` (provider Price catalog) | **live runtime — must update in 3AY-8R-Impl** |
| `app/api/v2/billing/checkout/route.ts:42` | `productKey === 'pro'` → `STRIPE_PRICE_ID_PRO` (subscription mode) | **live runtime — must update in 3AY-8R-Impl** |
| `app/api/v2/billing/checkout/route.ts:38` | `productKey === 'audit'` → `STRIPE_PRICE_ID_AUDIT` (one-time) | **live runtime — repurpose for `ai-spend-audit`** |
| `app/api/v2/billing/checkout/route.ts:40` | `productKey === 'dept_dashboard'` → `STRIPE_PRICE_ID_DEPT_DASHBOARD` (subscription) | **live runtime — defer (Department Dashboard is V5-deferred)** |
| `app/api/v2/billing/checkout/route.ts:80` | Error message: `"Must be one of: pro, audit, dept_dashboard."` | **live runtime — must update in 3AY-8R-Impl** |

### 1.4 Frontend product-key emission

| File:line | Value sent | Classification |
|---|---|---|
| `components/pricing/EnterpriseTierCheckout.tsx:20,38` | `productKey: 'audit' \| 'dept_dashboard'` | **live runtime — `audit` keeps mapping to `ai-spend-audit`; `dept_dashboard` deferred** |
| `app/dashboard/billing/page.tsx:44` | (no explicit productKey — relies on route default) | **live runtime — must send `'build'` explicitly after impl** |

### 1.5 Env var schema (`lib/env.ts:20-26`)

| Name | Zod constraint | Classification |
|---|---|---|
| `STRIPE_PRICE_ID_PRO` | `.string().min(1)` (required) | **env — old vocabulary, currently mandatory at boot** |
| `STRIPE_PRICE_ID_ENTERPRISE` | `.string().min(1)` (required) | **env — vocabulary unchanged but currently unused for self-serve** |
| `STRIPE_PRICE_ID_AUDIT` | `.optional()` | **env — keep, repurpose label to `ai-spend-audit`** |
| `STRIPE_PRICE_ID_DEPT_DASHBOARD` | `.optional()` | **env — keep; SKU deferred** |

**Risk:** because `STRIPE_PRICE_ID_PRO` is `.min(1)` required, removing it without staging crashes `lib/env.ts` validation at boot. Deprecation must be sequenced (see §5).

### 1.6 `billing_subscriptions.plan_id` writes

| File:line | Source of value | Classification |
|---|---|---|
| `lib/billing/subscription-service.ts:48-62` | `planId` (defaulted to `'pro'` at line 22) | **live runtime — must update** |
| `app/api/v1/billing/onchain/subscribe/route.ts:38` | hardcoded plan id in on-chain subscribe path | **live runtime — must update** |

### 1.7 Partner commission integration

- `lib/billing/subscription-service.ts` imports `generateCommission` from `lib/partner/commissions.ts` and triggers on both first-month (`checkout.session.completed`) and recurring (`invoice.payment_succeeded`).
- `lib/partner/commissions.ts:30` documents `planId: 'pro' | 'enterprise' | 'free'`.
- Commission **rate** is derived from `partner_rules` (`rate_percent`, `rule_type`) and applied to `invoiceAmountUsd`, **not** from `planId`. See `lib/partner/commissions.ts:189-191`.
- `planId` is stored per commission row at `lib/partner/commissions.ts:128` for reporting and dedup grouping. Renaming `pro → growth` produces new rows tagged `'growth'`; historical rows keep `'pro'`.

**Conclusion:** changing the plan vocabulary does **not** break commission math. It does break historical reporting consistency unless an analytics view normalizes old `'pro'` to new `'growth'`. Low blast radius for v1.

### 1.8 Tests (not live)

| File | References | Classification |
|---|---|---|
| `lib/__tests__/router-engine.test.ts:40` | `{ plan: 'free' }` mock | test only |
| `__tests__/billing-enforcement.test.ts` (multiple lines) | `'free'`, `'pro'` mocks | test only |
| `__tests__/billing-usage.test.ts:23,50` | `'free'`, `'pro'` mocks | test only |
| `app/api/v2/chat/completions/__tests__/denial-events.test.ts:123` | `getTenantPlan` mock returning `{ plan: 'free' }` | test only |
| `app/api/v2/billing/checkout/route.test.ts:47-50` | `STRIPE_PRICE_ID_PRO`, `_ENTERPRISE`, `_AUDIT`, `_DEPT_DASHBOARD` test fixtures | test only |

All test references update mechanically once the runtime values change. No live behavior depends on them.

### 1.9 No legacy public-vocabulary leaks

- Zero hits for `PLAN_FREE` or `PLAN_PRO` constants.
- Zero hits for `developer` or `business` plan literals in `lib/billing/`.
- Zero hits in `public/openapi.yaml` for `free`/`pro`/`enterprise` plan literals (spot-checked; not exhaustively scanned).

---

## 2. Existing billing behavior audit

### 2.1 Where `free`/`pro`/`enterprise` are assumed

- `lib/billing/plans.ts` declares `PlanTier = 'free' | 'pro' | 'enterprise'` (entitlement matrix).
- `lib/billing/entitlements.ts` keys feature gates on the same union.
- `lib/billing/plan-guard.ts` reads plan via `getTenantPlan()` and compares against this union.
- `lib/billing/usage.ts` uses entitlement lookup for cache-hit discount.
- All five files form a coherent enclave on the same vocabulary.

### 2.2 Stripe Price ↔ plan mapping

- Provider catalog (`lib/billing/providers/stripe.ts:10-11`): `pro → STRIPE_PRICE_ID_PRO`, `enterprise → STRIPE_PRICE_ID_ENTERPRISE`.
- Checkout route (`app/api/v2/billing/checkout/route.ts:32-43`): `productKey` enum `{pro, audit, dept_dashboard}` → Price + mode.
- Webhook (`lib/billing/subscription-service.ts:22`) reads `session.metadata.planId` (set during checkout creation) and falls back to `'pro'`. This is the single point where the runtime plan id is decided.

### 2.3 Where `tenants.plan` is written

See §1.1. Five live write sites, all using `'pro'` or `'free'`.

### 2.4 Where `billing_subscriptions.plan_id` is written

See §1.6. Two live write sites.

### 2.5 Where entitlement lookup reads plan

- `lib/billing/plan-guard.ts → getTenantPlan(tenantId)` is the canonical read.
- `app/dashboard/billing/page.tsx` consumes via `usePlanUsage()` hook.

### 2.6 Where partner commissions are triggered

- `lib/billing/subscription-service.ts:80` (first-month) and `:120` (recurring) call `generateCommission`.
- Both paths pass `planId` from the same defaulted source.

### 2.7 Does changing `pro → growth` break commission generation?

**No.** Commission amount derives from `invoiceAmountUsd × rate_percent` (`lib/partner/commissions.ts:189-191`). `planId` is stored as a label and used as part of the dedup tuple `(groupId, planId, sourceEventType)` at line 128. As long as the new plan label is stable per subscription, the dedup is unaffected. Pre-existing rows keep `'pro'`; new rows store `'growth'`. Operator reporting must normalize via a view if cross-period totals are required.

---

## 3. Read-only DB audit

**Status: unavailable.**

`DATABASE_URL` and `DEV_DATABASE_URL` are not present in the Claude shell environment. Per the directive, the DB audit stops here and no secrets are requested in chat.

Recommended manual follow-up (operator runs locally; this doc does not capture results):

```sql
-- 1. Tenant plan distribution
SELECT plan, COUNT(*) FROM tenants GROUP BY plan ORDER BY plan;

-- 2. Active billing subscriptions by plan_id × status
SELECT plan_id, status, COUNT(*)
FROM billing_subscriptions
GROUP BY plan_id, status
ORDER BY plan_id, status;

-- 3. Access-request volume
SELECT COUNT(*) FROM access_requests;

-- 4. Recent access-request volume
SELECT COUNT(*) FROM access_requests
WHERE created_at >= now() - interval '30 days';
```

Operator decision in §5 depends on the row counts from queries 1 and 2.

---

## 4. Env posture audit

Source: `.env.example` lines 68–78 and `lib/env.ts:20-26`.

### 4.1 Existing Stripe env names

| Name | Required | Vocabulary |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | neutral |
| `STRIPE_WEBHOOK_SECRET` | yes | neutral |
| `STRIPE_PRICE_ID_PRO` | yes (`.min(1)`) | **old** |
| `STRIPE_PRICE_ID_ENTERPRISE` | yes (`.min(1)`) | neutral (label kept) |
| `STRIPE_PRICE_ID_AUDIT` | optional | repurpose to V5 `ai-spend-audit` |
| `STRIPE_PRICE_ID_DEPT_DASHBOARD` | optional | V5-deferred; keep slot |

### 4.2 Proposed new names

| Name | Required | Purpose |
|---|---|---|
| `STRIPE_PRICE_ID_BUILD_MONTHLY` | required for v1 self-serve | Build $49/mo |
| `STRIPE_PRICE_ID_GROWTH_MONTHLY` | optional | reserved for future self-serve |
| `BILLING_CHECKOUT_ENABLED` | optional (default `false`) | kill switch |

### 4.3 Old names that must remain temporarily

- `STRIPE_PRICE_ID_PRO` must remain in `.env.example` and `lib/env.ts` until:
  1. All live `pro` tenants are migrated (DB audit in §3 confirms zero or operator-approved migration completes), and
  2. The checkout route, provider catalog, and webhook handler are updated to no longer reference `'pro'`.
- `STRIPE_PRICE_ID_ENTERPRISE` keeps its name; vocabulary is unchanged.
- `STRIPE_PRICE_ID_AUDIT` keeps its name; the route-side label flips from "AI Spend Audit (3AX)" to V5 `ai-spend-audit`.
- `STRIPE_PRICE_ID_DEPT_DASHBOARD` keeps its slot but stays unused publicly.

### 4.4 Deprecation timing

- **Deprecate `STRIPE_PRICE_ID_PRO` last.** Removal happens only after the migration in §5 and after `lib/env.ts` is relaxed from `.min(1)` to `.optional()` in a sequenced commit (avoids boot-time validation failure).

---

## 5. Migration risk assessment

No migration is authored in this slice. Assessment only.

### 5.1 `free → sandbox`

- **Safe.** `free` is a sentinel for no subscription. Renaming to `sandbox` is a label change with no Stripe object involved.
- Required updates: five live write sites in §1.1 + §1.6, plus entitlements / plan-guard / plans.ts.
- Mechanical, low blast radius.

### 5.2 `pro → growth`

- **Risk: medium.** This is a name + price-difference question, not just relabeling.
- Current `pro` is $499/mo per `lib/billing/plans.ts`. V5 `growth` is $199/mo per `lib/pricing/rate-card.ts`.
- Three operator decisions needed before migration:
  1. **Mapping choice.** Map `pro → growth` (most likely, by event allowance heuristics) or `pro → scale` (by price proximity, $499 vs $799 vs $199).
  2. **Price-difference handling.** Grandfather existing `pro` tenants at their current price, migrate-at-renewal to `growth` price, or apply a credit. Each has Stripe Subscription consequences that v1 should not automate.
  3. **Stripe Subscription object.** Existing `pro` subscriptions point at `STRIPE_PRICE_ID_PRO`. Changing app-side `plan_id` does not change the Stripe Price. The Subscription continues billing at the `pro` rate until Stripe-side mutation, which is out of scope for v1.

**Recommended mapping (operator-approved):** `pro → growth`. Justification:

- Both are sales-assisted-to-self-serve mid-tiers.
- V5 places `growth` (2M events, 90-day retention) as the natural successor to the `pro` event/feature footprint.
- `scale` is V5's annual-only Sales-led tier; mapping `pro` there forces an annual contract on month-to-month customers.

**This recommendation is contingent on operator confirmation.** No migration runs until §3 DB audit shows the actual `pro` tenant count and operator approves the price-difference handling.

### 5.3 `enterprise → enterprise`

- **No change.** Vocabulary is identical across all three layers.
- Existing `STRIPE_PRICE_ID_ENTERPRISE` keeps its name.

### 5.4 Transitional compatibility layer

**Recommended.** A small adapter in `lib/billing/plans.ts` that accepts both old and new vocabulary for read paths during the transition window:

```ts
// pseudo-shape only — not implementation
function normalizePlanId(raw: string): 'sandbox' | 'build' | 'growth' | 'scale' | 'enterprise' {
  if (raw === 'free') return 'sandbox';
  if (raw === 'pro')  return 'growth';
  return raw as ...;
}
```

This adapter:

- Lives only in read paths (entitlement lookup, dashboard rendering).
- Is **removed** after the data migration in §5.1 / §5.2 confirms zero rows with old labels remain.
- Has no effect on Stripe object state.

### 5.5 Grandfathering live `pro` tenants

- Operator-decision. Strongly recommended that existing `pro` subscriptions keep their current Stripe Price until renewal. App-side `plan_id` reflects V5 vocabulary (`growth`); Stripe-side Price stays `STRIPE_PRICE_ID_PRO` until a separate Stripe migration slice.
- This means the V5 `plan_id` and the Stripe `price_id` will diverge briefly for grandfathered tenants. The plan in §3 already separates these two concerns (`plan_id` is V5 vocabulary; Stripe Price id is the Stripe object identifier).

---

## 6. Recommended implementation sequence

The original sequence in the directive is sound. Audit findings refine ordering and add explicit gates.

| Slice | Purpose | Gate |
|---|---|---|
| **3AY-8R-2 Billing Plan Compatibility Layer** | Replace `lib/billing/plans.ts` plan matrix with V5 vocabulary, sourced from `lib/pricing/rate-card.ts`. Add `normalizePlanId` adapter (§5.4) so old `'pro'` / `'free'` reads still resolve during transition. Update `lib/billing/entitlements.ts` keys. Update `lib/billing/plan-guard.ts` references. **Update tests (§1.8) to V5 vocabulary.** No DB writes. | Operator approval of the V5 plan matrix (allowances, retention, feature gates per tier). |
| **3AY-8R-3 Access Request Intent Persistence Migration** | Author additive migration `access_requests + intent, resolved_intent, plan_id, offer_id` (all nullable). Extend POST handler to persist. Vitest coverage. **No** plan migration. | Operator approval of migration SQL. Run on staging first. |
| **3AY-8R-4 Build Checkout Wiring** | Extend `app/api/v2/billing/checkout/route.ts` `productKey` enum to add `'build'` → `STRIPE_PRICE_ID_BUILD_MONTHLY`. Add `BILLING_CHECKOUT_ENABLED` kill switch. Update error message string. Update `app/dashboard/billing/page.tsx` to send `'build'` explicitly when relevant. Tests for kill-switch off, env missing, unauth, valid, spoofed plan_id. No webhook changes yet. | Operator confirms Stripe Build Product + Price exist in test mode. |
| **3AY-8R-5 Webhook State Reconciliation** | Update `lib/billing/subscription-service.ts` to map Stripe Price → V5 plan_id (Price → `'build'`). Replace `'pro'` and `'free'` literals with V5 values. Extend event coverage to include `invoice.payment_failed` (status → `past_due`). Tests for each event type + replay idempotency. | 3AY-8R-2 shipped. |
| **3AY-8R-6 Tenant Plan Data Migration (gated, operator-run)** | Data-migration `UPDATE tenants SET plan = 'growth' WHERE plan = 'pro'` and `UPDATE tenants SET plan = 'sandbox' WHERE plan = 'free'`. Idempotent. Backed by SELECT verification and reverse UPDATE. **Run on staging first.** | Operator approval after §3 DB audit shows actual `pro`/`free` counts. Mapping `pro → growth` operator-approved (§5.2). |
| **3AY-8R-7 Billing Smoke Test** | End-to-end Stripe test-mode checkout against production code path. Verify webhook delivery, DB state, kill switch toggle, fallback to `/get-access?intent=build`. | All prior slices shipped. |
| *(deferred)* **3AY-8R-8 `STRIPE_PRICE_ID_PRO` Deprecation** | Relax `lib/env.ts` from `.min(1)` to `.optional()`. Remove provider catalog `pro` entry. Remove from `.env.example`. | All Stripe `pro` Subscriptions migrated or canceled. |
| *(deferred)* **3AY-8R-9 `enforcement.ts` Removal** | Delete superseded path. | Confirmation it has no callers. |

### 6.1 Why this ordering

- **8R-2 first.** Code-side V5 plan matrix must exist before any write path can produce V5 values without breaking entitlement reads. The compatibility adapter prevents a flag-day cutover.
- **8R-3 second.** Access-request persistence is independent of plan vocabulary work and unblocks operator lead querying. Cheap parallel win.
- **8R-4 third.** Build checkout can ship without touching tenant migration because new Build subscribers create new rows with V5 values from day one.
- **8R-5 fourth.** Webhook update lands after compat layer exists so any in-flight webhook events for old `'pro'` subscriptions still resolve correctly.
- **8R-6 fifth, gated.** Data migration runs only after DB audit data is in operator's hands.
- **8R-7 last.** Smoke test exercises the full path under the kill switch.

---

## 7. Open questions for operator

1. **`pro → growth` confirmation.** Audit recommends this mapping (§5.2). Confirm or override before 8R-6.
2. **Price-difference handling for grandfathered `pro` tenants.** Choose: grandfather indefinitely, migrate-at-renewal, apply credit, or other. Required before 8R-6.
3. **DB audit values.** Operator runs §3 queries locally; counts inform whether 8R-6 needs batching or a maintenance window.
4. **Department Dashboard slot.** Keep `STRIPE_PRICE_ID_DEPT_DASHBOARD` env or remove? Recommendation: keep slot, no public CTA, decide at later slice.
5. **`enterprise` Stripe Price.** `STRIPE_PRICE_ID_ENTERPRISE` is currently `.min(1)` required but Enterprise is sales-led (no public checkout). Confirm operator wants to keep it required (forces every deploy to have a placeholder) or relax to optional in 8R-8.
