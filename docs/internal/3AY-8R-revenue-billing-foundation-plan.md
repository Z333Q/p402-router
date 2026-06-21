# 3AY-8R: Revenue Billing Foundation — Inventory and Plan

**Status:** plan and inventory only. No code edits. No SQL execution. No Neon mutation. No Redis mutation. No migration authoring. No deploy. No Stripe live calls. No production mutation.
**Predecessors:** 3AX rate card, 3AY pricing surface, 3AY-1 pricing page, 3AY-4 get-access intent handling, **3AY-Pricing-Realign-Impl (shipped at e1b20c2, V5-led hybrid ladder live)**.
**Successor:** 3AY-8R-Impl, approved phase by phase. No implementation begins from this plan without explicit operator approval.

## 0. Hard boundaries (true throughout this plan)

- No code edits in this slice.
- No SQL execution. No Neon mutation. No Redis mutation. No migration authoring.
- No deploy. No Stripe live call. No production mutation.
- No tenant-visible Optimize recommendations.
- No verified savings, guaranteed savings, save N%, auto-apply, runtime enforcement live, SOC 2 / HIPAA / ISO compliant claims.
- No customer logo or unsupported compliance claim.
- No paid self-serve checkout claim until §6 routes are live and the kill switch is enabled.

---

## 1. Existing billing inventory

The repo is **not greenfield**. There is substantial live Stripe scaffolding and on-chain settlement code already shipped. The first job of 3AY-8R is to reconcile and extend, not rebuild.

### 1.1 Critical finding: three-way plan vocabulary drift

| Source of truth | Plan vocabulary | Status |
|---|---|---|
| `lib/pricing/rate-card.ts` (V5, RATE_CARD_VERSION `v2`) | sandbox / build / growth / scale / enterprise | **Public ladder — just shipped 3AY-Pricing-Realign-Impl** |
| `lib/billing/plans.ts` | free / pro / enterprise | **Drifted — used by live billing routes and entitlements** |
| Stripe env vars (`.env.example`) | `STRIPE_PRICE_ID_PRO`, `_ENTERPRISE`, `_AUDIT`, `_DEPT_DASHBOARD` | **Drifted — names map to old `pro` vocabulary** |
| Retired 3AX | developer / business | Removed from public surfaces; only present in `LEGACY_INTENT_MAP` |

**Implication:** Before any new Build checkout SKU can be wired, `lib/billing/plans.ts`, `lib/billing/entitlements.ts`, and the Stripe env-var names must be reconciled to the V5 ladder. Tenants currently flagged `plan = 'pro'` must be migrated to a defined V5 tier (most likely `growth`).

### 1.2 File-by-file inventory

| Path | Responsibility | Domain | Disposition |
|---|---|---|---|
| `lib/billing/provider.ts` | `BillingProvider` interface (subscription create/cancel/verify webhook) | abstraction | **Reuse**. Stable interface. |
| `lib/billing/providers/stripe.ts` | Stripe SDK wrapper. Calls `checkout.sessions.create`, `subscriptions.cancel/update`, `webhooks.constructEvent` | Stripe subscription | **Reuse, extend** for Build SKU. Add invoice.paid / invoice.payment_failed handling. |
| `lib/billing/providers/onchain.ts` | EIP-2612 USDC permit + recurring charge via `SubscriptionFacilitator` | on-chain x402/USDC settlement | **Leave untouched**. Separate billing surface. |
| `lib/billing/providers/onchain-client.ts` | (file not present in inventory output; treat as absent) | — | **N/A** |
| `lib/billing/subscription-service.ts` | Webhook → DB sync orchestrator. Cascades plan updates and triggers partner commissions. Idempotent via `processed_webhook_events`. | Stripe + partner | **Reuse, extend** plan-id mapping to V5 vocabulary. |
| `lib/billing/entitlements.ts` | Feature gates (semantic cache, safety pack, advanced analytics), platform fee compute | tenant entitlements | **Reuse, rewrite** plan keys to V5 (sandbox/build/growth/scale/enterprise). |
| `lib/billing/plans.ts` | Plan matrix: free / pro / enterprise with pricing, concurrency, features | tenant entitlements | **Replace** with V5 plan matrix sourced from `lib/pricing/rate-card.ts`. Do **not** duplicate prices. |
| `lib/billing/plan-guard.ts` | Hard cap enforcement against `billing_usage_events` | usage metering | **Reuse**. Update plan key references after §1.1 reconcile. |
| `lib/billing/enforcement.ts` | Legacy usage limit check from `router_decisions` + `a2a_tasks` | usage metering | **Leave untouched** in v1; mark as deprecated path. Removal is out of scope for 3AY-8R. |
| `lib/billing/usage.ts` | Records to `billing_usage_events` ledger; free cache hits | usage metering | **Reuse**. No changes required for v1. |
| `lib/actions/billing.ts` | Server action: initialize EIP-2612 permit flow | on-chain settlement | **Leave untouched**. |
| `lib/actions/billing-finalize.ts` | Server action: finalize on-chain subscription via `setupAndCharge()` | on-chain settlement | **Leave untouched**. |
| `app/api/v2/billing/checkout/route.ts` | POST creates Stripe checkout session; product key allowlist (pro / audit / dept_dashboard); writes `stripe_customer_id` | Stripe subscription | **Reuse, extend**. Add `build` product key. Replace `pro` once §1.1 reconcile completes. |
| `app/api/v2/billing/portal/route.ts` | POST creates Stripe billing portal session | Stripe subscription | **Reuse as-is**. |
| `app/api/v2/billing/webhook/route.ts` | POST verifies signature (raw body, `dynamic = 'force-dynamic'`), dispatches to `SubscriptionService.syncFromWebhook` | Stripe subscription | **Reuse, extend** event coverage (invoice.paid, invoice.payment_failed). |
| `app/api/v2/billing/usage/route.ts` | GET current monthly spend % | usage metering | **Reuse**. |
| `app/api/v1/billing/webhook/route.ts` | Alternate webhook via `stripeProvider.verifyWebhookSignature` | Stripe subscription | **Leave untouched** in v1; v2 route is primary. Document as alternate. |
| `app/api/v1/billing/onchain/subscribe/route.ts` | POST executes first on-chain charge | on-chain settlement | **Leave untouched**. |
| `app/api/v1/billing/upgrade-math/route.ts` | GET ROI math for upgrade pitch | tenant entitlements analysis | **Leave untouched**. May need refresh after §1.1 but out of scope. |
| `app/api/internal/cron/billing/reconcile/route.ts` | Vercel cron: sweep due on-chain subscriptions | on-chain settlement | **Leave untouched**. |
| `app/api/internal/cron/billing/sync/route.ts` | Vercel cron: bulk-sync Stripe subscriptions | Stripe subscription | **Reuse**. |
| `app/api/partner-admin/commissions/route.ts` | Partner commission admin | partner commissions | **Leave untouched**. Must remain functional through `SubscriptionService` extension. |
| `app/api/partner-admin/payouts/route.ts` | Payout batch admin | partner commissions | **Leave untouched**. |
| `app/api/partner/commissions/route.ts` | Partner self-serve view | partner commissions | **Leave untouched**. |
| `lib/providers/openrouter/billing-guard.ts` (`BillingGuard`) | Fail-close LLM-routing guard (rate limit, daily circuit breaker, anomaly, reservation) | request-path guard | **Leave untouched**. Separate from subscription billing. |

### 1.3 Existing tables relevant to billing

| Table | Source migration | Columns of interest | Reuse? |
|---|---|---|---|
| `tenants` | base + `v2_011_stripe_integration.sql` | `stripe_customer_id`, `stripe_subscription_id`, `plan` | **Reuse**. Migrate `plan` values from `pro` → `growth` (or chosen mapping) in §5. |
| `billing_subscriptions` | `v2_002_pricing_layer.sql`, extended in `v2_004_billing_subscriptions.sql` | tenant_id, provider, wallet_address, plan_id, status, period bounds, provider_subscription_id, provider_customer_id, cancel_at_period_end | **Reuse**. Already provider-agnostic. |
| `processed_webhook_events` | `v2_012_webhook_idempotency.sql` | provider, event_id, processed_at | **Reuse** for idempotency. No need for separate `stripe_events`. |
| `billing_usage_events` | (existing) | tenant_id, event metadata | **Reuse**. |
| `access_requests` | `v2_014_access_requests.sql` | email, company, role, rpd, status | **Extend**. Missing `intent`, `resolved_intent`, `plan_id`, `offer_id` — see §10. |

### 1.4 Existing env vars

From `.env.example` lines 68–78:

- `STRIPE_SECRET_KEY` (required)
- `STRIPE_WEBHOOK_SECRET` (required)
- `STRIPE_PRICE_ID_PRO` (required)
- `STRIPE_PRICE_ID_ENTERPRISE` (required)
- `STRIPE_PRICE_ID_AUDIT` (optional, falls back to `CONTACT_SALES`)
- `STRIPE_PRICE_ID_DEPT_DASHBOARD` (optional, falls back to `CONTACT_SALES`)

### 1.5 Existing dashboard wiring

- `app/dashboard/billing/page.tsx` calls `/api/v2/billing/checkout` for free→pro upgrade and `/api/v2/billing/portal` when `planId === 'pro'`.
- Free→Pro is the only currently live self-serve flow.

---

## 2. Billing v1 product decision

### 2.1 In scope

- Free **Sandbox** (default, no checkout).
- **Build $49/month** as the first self-serve checkout SKU.
- Stripe Checkout for Build.
- Stripe customer creation (already partially wired in `app/api/v2/billing/checkout/route.ts`).
- Stripe subscription creation (already partially wired).
- Stripe customer portal (already live).
- Webhook-confirmed subscription state (already partially wired via `SubscriptionService`).
- Tenant plan state (`tenants.plan` reconciled to V5 vocabulary).
- Plan entitlement lookup keyed on V5 plan ids.
- Manual sales-assisted path for **Growth, Scale, Enterprise, AI Spend Audit, Paid Pilot, Regulated Pilot** (existing `/get-access?intent=…` funnel).
- Access-request intent persistence (`intent`, `resolved_intent`, `plan_id`, `offer_id`) — see §10.

### 2.2 Out of scope (deferred)

- Metronome.
- Automated overage invoicing (the V5 overage rates of $0.25 / $0.15 / $0.08 per 1k events remain documented but unbilled).
- Enterprise commit drawdown.
- Automated partner commission **payout changes** (existing commission-trigger compatibility must be preserved; no new automation).
- Automated AI Spend Audit / Paid Pilot credit application.
- Invoice usage appendix.
- Cryptographic invoice appendix.
- Enterprise procurement automation (SOC2 evidence pipelines, MSA automation, etc.).
- Multi-year contract automation.
- Growth, Scale, Enterprise self-serve checkout (sales-assisted only in v1).
- Public AI Spend Audit / Paid Pilot self-serve checkout.

---

## 3. Pricing source of truth

**Single source of truth:** `lib/pricing/rate-card.ts`, `RATE_CARD_VERSION = 'v2'`.

Rules:

- No hardcoded public prices outside `lib/pricing/rate-card.ts` or the Stripe env-var → plan_id mapping.
- No `developer` $249, no `business` $2,500, no `pro` $499 references in any public copy or route response.
- No public checkout for Proof Sprint (internal-only via `visibility: 'internal'`).
- `plan_id` (V5 vocabulary) and `stripe_price_id` (Stripe object id) must remain separate. The mapping lives in env vars, not in code constants.
- First checkout SKU is **Build $49/month**. Confirmed by directive.

---

## 4. Stripe model

### 4.1 Stripe objects

- **Stripe Product:** `P402 Build` (one product).
- **Stripe Price:** Build monthly, $49 USD, recurring monthly. One Price object.
- Optional future: a second Price for Build annual (deferred; v1 is monthly-only).
- Optional future: Growth Price ($199/mo). Created but **not** wired to public checkout in v1.
- **No public checkout** for Scale, Enterprise, AI Spend Audit, Paid Pilot, Regulated Pilot in v1. Manual invoice path only.

### 4.2 Env vars (names only — no values in this doc, no values in any commit)

- `STRIPE_SECRET_KEY` *(existing — reuse)*
- `STRIPE_WEBHOOK_SECRET` *(existing — reuse)*
- `STRIPE_PRICE_ID_BUILD_MONTHLY` *(new — required for v1)*
- `STRIPE_PRICE_ID_GROWTH_MONTHLY` *(new — optional, reserved for future self-serve)*
- `STRIPE_CUSTOMER_PORTAL_RETURN_URL` *(optional — derives from `NEXT_PUBLIC_APP_URL` if absent)*
- `NEXT_PUBLIC_APP_URL` *(existing — reuse for success / cancel redirects)*
- `BILLING_CHECKOUT_ENABLED` *(new — recommended kill switch, default `false`)*

**Deprecation note:** `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ENTERPRISE`, `STRIPE_PRICE_ID_AUDIT`, `STRIPE_PRICE_ID_DEPT_DASHBOARD` remain in `.env.example` until the live `pro`-tier tenants are migrated. Removal is a follow-up slice, not part of 3AY-8R v1.

---

## 5. Schema plan

**Strategy: additive + one targeted reconciliation.** Choose **option C with a one-row reconciliation migration**, justified below.

### 5.1 Choice and justification

- **Option A (extend existing tables only):** insufficient. `access_requests` lacks intent persistence; without that, /get-access leads are unsearchable by plan.
- **Option B (add `billing_subscriptions` and `stripe_events`):** redundant. Both already exist as `billing_subscriptions` and `processed_webhook_events`.
- **Option C (use existing billing tables if present and compatible):** **chosen**. `billing_subscriptions` is already provider-agnostic and stores everything required. `processed_webhook_events` provides idempotency. The one gap is plan-vocabulary drift (§1.1).

### 5.2 Required schema work for v1 (all additive or value-mapping; no destructive change)

| Migration | Purpose | Risk |
|---|---|---|
| `v2_NNN_access_requests_intent_columns.sql` | `ALTER TABLE access_requests ADD COLUMN intent TEXT, resolved_intent TEXT, plan_id TEXT NULL, offer_id TEXT NULL`. All nullable. | Low. Additive only. |
| `v2_NNN_tenant_plan_v5_vocabulary.sql` | Data-migration only: `UPDATE tenants SET plan = 'growth' WHERE plan = 'pro'; UPDATE tenants SET plan = 'sandbox' WHERE plan = 'free';`. No column changes. Idempotent guard via `WHERE plan IN (...)`. | Medium — touches live tenant rows. Must run on staging first and be backed by `SELECT` verification + rollback `UPDATE`. |
| `v2_NNN_billing_subscriptions_plan_v5_vocabulary.sql` | Data-migration only on `billing_subscriptions.plan_id` to V5 ids. Same idempotent shape. | Medium — same constraints. |

**No new tables required for v1.** All three migrations are deferred until 3AY-8R-Impl is approved.

### 5.3 Capabilities covered by reused tables

| Capability | Table.column |
|---|---|
| Tenant ↔ Stripe customer | `tenants.stripe_customer_id` |
| Tenant ↔ Stripe subscription | `tenants.stripe_subscription_id`, `billing_subscriptions.provider_subscription_id` |
| Plan id (V5) | `tenants.plan`, `billing_subscriptions.plan_id` |
| Stripe price id | `billing_subscriptions.plan_id` is **not** the Stripe price id. The Stripe price id is resolved from env at request time. |
| Subscription status | `billing_subscriptions.status` |
| Current period start/end | `billing_subscriptions.current_period_start`, `_end` |
| `cancel_at_period_end` | `billing_subscriptions.cancel_at_period_end` |
| Idempotency / processed event | `processed_webhook_events (provider, event_id)` unique |
| Access-request intent persistence | `access_requests.intent`, `resolved_intent`, `plan_id`, `offer_id` *(new in §5.2)* |

---

## 6. API route plan

### 6.1 `POST /api/billing/checkout/build`

> Implementation note: the existing `POST /api/v2/billing/checkout` route already creates Stripe sessions keyed on a product key. v1 extends it by adding `'build'` to the allowlist. A dedicated `/build` route is **not** required; the existing route with an added key is preferred to keep the surface narrow.

- **Auth:** dashboard session (cookie auth via `app/dashboard/layout.tsx`). Tenant resolved server-side from session, never from request body.
- **Input:** `{ productKey: 'build' }` only. No plan id, no price id, no amount from the client.
- **Output:** `{ url: string }` (Stripe-hosted checkout URL) or `{ code: 'CONTACT_SALES' }` for unmapped keys.
- **Side effects:** creates Stripe Customer for tenant if absent; writes `tenants.stripe_customer_id`; **does not** grant plan entitlement (webhook does).
- **Forbidden side effects:** no plan grant, no direct row write to `billing_subscriptions`, no `tenants.plan` update.
- **Gated by:** `BILLING_CHECKOUT_ENABLED === 'true'`. When disabled or env missing → respond `{ code: 'CHECKOUT_DISABLED' }`. UI falls back to `/get-access?intent=build`.
- **Tests:** kill-switch off → disabled; price env missing → disabled; unauthenticated → 401; spoofed `plan_id` in body → rejected; valid call → Stripe Customer created idempotently.

### 6.2 `POST /api/billing/portal`

> Existing route `app/api/v2/billing/portal/route.ts` covers this. No structural change required.

- **Auth:** dashboard session.
- **Input:** none.
- **Output:** `{ url: string }` portal URL.
- **Side effects:** creates Stripe billing portal session.
- **Forbidden side effects:** no plan grant.
- **Gated by:** tenant has `stripe_customer_id`.
- **Tests:** no customer id → 404; valid → portal URL.

### 6.3 `POST /api/billing/webhook`

> Existing route `app/api/v2/billing/webhook/route.ts` covers this. v1 extends event coverage in `SubscriptionService.syncFromWebhook`.

- **Auth:** Stripe signature verification (raw body via `req.text()`, `export const dynamic = 'force-dynamic'` — required by Next.js 15, per CLAUDE.md gotcha #3).
- **Input:** Stripe event payload (raw body) + `stripe-signature` header.
- **Output:** `{ received: true }` on success; `400` on invalid signature.
- **Side effects:** updates `billing_subscriptions`, `tenants.plan`, `tenants.stripe_subscription_id` based on event type. Inserts into `processed_webhook_events` for idempotency.
- **Forbidden side effects:** trusting any plan id from client; writing entitlements before signature verified.
- **Tests:** signature invalid → 400; replayed `event.id` → no-op (idempotent); each event type → correct state transition.

### 6.4 `GET /api/billing/state` (helper)

- **Auth:** dashboard session.
- **Input:** none.
- **Output:** `{ plan_id, billing_source, subscription_status, current_period_end, cancel_at_period_end, checkout_enabled, portal_available }`.
- **Side effects:** read-only.
- **Use:** dashboard renders correct CTA without inferring from `/usage` plus client state.

---

## 7. Webhook plan

Stripe events handled in v1:

| Event | Action |
|---|---|
| `checkout.session.completed` | Resolve tenant from `client_reference_id` or `customer`. Mark intent: subscription pending activation. Do **not** grant plan yet; wait for `customer.subscription.created`. |
| `customer.subscription.created` | Upsert `billing_subscriptions`; set `tenants.plan = 'build'` if Price matches `STRIPE_PRICE_ID_BUILD_MONTHLY`; set `tenants.stripe_subscription_id`. |
| `customer.subscription.updated` | Update period bounds, status, `cancel_at_period_end`. Update `tenants.plan` if Price changed. |
| `customer.subscription.deleted` | Set `billing_subscriptions.status = 'canceled'`; set `tenants.plan = 'sandbox'`. Do **not** delete tenant or data. |
| `invoice.paid` | Optional in v1: log a billing event row for audit. No plan change. |
| `invoice.payment_failed` | Mark `billing_subscriptions.status = 'past_due'`. Do **not** delete tenant. Email path optional in v1. |

### 7.1 Rules

- **Raw body** via `req.text()`; `export const dynamic = 'force-dynamic'` (CLAUDE.md gotcha #3).
- Verify Stripe signature with `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`.
- Idempotency: `INSERT ... ON CONFLICT (provider, event_id) DO NOTHING INTO processed_webhook_events`; if conflict, return `{ received: true }` without re-processing (matches CLAUDE.md gotcha #6).
- Never trust client-side plan state. Plan id is derived only from Stripe Price → env-var mapping.
- Grant Build entitlement only after `customer.subscription.created` with confirmed Price match.
- On `invoice.payment_failed`, **never** delete tenant rows. Status flips to `past_due`; data preserved.
- On `customer.subscription.deleted`, **never** drop tenant rows. Plan resets to `sandbox`; data preserved.
- Log failures via existing logging path. **No secrets in logs**; redact Stripe ids when logging at warn level.

---

## 8. Entitlements plan

### 8.1 V5 plan matrix (sourced from `lib/pricing/rate-card.ts`, not duplicated)

| plan_id | billing_source | subscription_status default | included_events_per_month | retention_days | support_level | checkout_enabled |
|---|---|---|---|---|---|---|
| `sandbox` | none | `active` | 25,000 (hard cap) | 14 | community | n/a |
| `build` | stripe | derived from webhook | 250,000 | 30 | email | yes (v1) |
| `growth` | stripe-manual | sales-assisted | 2,000,000 | 90 | priority email | no (v1 — deferred) |
| `scale` | stripe-manual / invoice | sales-led | 20,000,000 | 365 | named CSM | no |
| `enterprise` | invoice | sales-led | custom | custom | named CSM + SLO | no |

### 8.2 Lookup rules

- Entitlement lookup reads `tenants.plan` (V5 vocabulary) from app DB. **Never** query Stripe per request.
- Feature gates (semantic cache, safety pack, advanced analytics) re-mapped from `lib/billing/entitlements.ts` `free/pro/enterprise` keys to `sandbox/build/growth/scale/enterprise`. This is a code change deferred to 3AY-8R-Impl §5.
- `BillingGuard` (request-path fail-close guard) remains untouched. Subscription billing and request-path guards are separate concerns.

---

## 9. Frontend plan

Applied only after the routes in §6 are live and `BILLING_CHECKOUT_ENABLED === 'true'`.

- `/pricing` Build CTA:
  - When `BILLING_CHECKOUT_ENABLED` and tenant authenticated → POST `/api/v2/billing/checkout` with `productKey: 'build'`, redirect to returned URL.
  - When disabled, unauthenticated, or env missing → fall back to `/get-access?intent=build` (current behavior).
- Customer portal link in `app/dashboard/billing/page.tsx` appears only when `tenants.stripe_customer_id` is non-null.
- New `/billing/success` page: read-only confirmation; no entitlement grant from this page.
- New `/billing/cancel` page: read-only cancellation acknowledgment.
- No copy claiming "paid self-serve checkout" until the route is verifiably live in production. Locked by source-shape test (already enforced for `/pricing` and `/get-access`).

---

## 10. Access-request intent persistence

### 10.1 Problem

- `/get-access` form (3AY-4) emits `intent`, `plan_id`, `offer_id` in the submission.
- POST handler at `app/api/v1/access-request/route.ts` writes only `email`, `company`, `role`, `rpd`. The intent fields are dropped.
- Founder cannot query leads by plan or offer before billing goes live.

### 10.2 Resolution: extend `access_requests`

- Migration `v2_NNN_access_requests_intent_columns.sql` (§5.2) adds nullable columns: `intent TEXT`, `resolved_intent TEXT`, `plan_id TEXT`, `offer_id TEXT`.
- Route extension: persist all four. `resolved_intent` is the canonical id after `resolveIntent` (e.g., `proof-sprint` → `ai-spend-audit`).
- Backfill: not required; null is the documented "unknown" state for pre-existing rows.

### 10.3 What it preserves

- `intent` = the raw value the user landed on (may be legacy).
- `resolved_intent` = the canonical V5 intent id after `LEGACY_INTENT_MAP` resolution.
- `plan_id` (nullable) = V5 plan if intent maps to a plan tier.
- `offer_id` (nullable) = bridge offer id if intent maps to an offer.

### 10.4 Operator query path before billing ships

- Read-only SQL: `SELECT email, company, intent, resolved_intent, plan_id, offer_id, created_at FROM access_requests WHERE resolved_intent = $1 ORDER BY created_at DESC;`.
- Optional admin route deferred to a later slice; not part of 3AY-8R v1.

### 10.5 Alternative considered

- Add a separate `lead_intents` table. **Rejected** — splits a single logical lead into two rows, adds join cost, and yields no new capability v1 needs.

---

## 11. Manual revenue operations

Until self-serve checkout exists for Growth, Scale, Enterprise, AI Spend Audit, Paid Pilot, Regulated Pilot:

- **AI Spend Audit** ($1,500): operator receives `/get-access?intent=ai-spend-audit` lead → manual scoping call → manual Stripe Invoice (one-time) or wire instructions → on payment, operator manually flips `tenants.plan` if a follow-on plan is part of the engagement.
- **Paid Pilot** ($35,000): operator receives `/get-access?intent=paid-pilot` → contract → Stripe Invoice or wire → manual entry. Credit policy (50%) tracked in operator notes, **not** automated.
- **Regulated Pilot** (from $50,000): same as Paid Pilot. BAA path documented post-engagement; not automated.
- **Growth** ($199/mo): operator receives `/get-access?intent=growth` → manual Stripe Customer + Subscription via dashboard or invoice → tenant flagged `plan = 'growth'`.
- **Scale** ($799/mo annual): manual quote → Stripe Invoice or MSA → manual entry as `plan = 'scale'`.
- **Enterprise** (from $60k ARR): MSA → wire → manual entry as `plan = 'enterprise'`.
- **Operator manual plan flip:** a single internal write via DB (no UI in v1). Documented in operator runbook (to be drafted in 3AY-8R-Impl).
- **Refunds and credits:** tracked in operator notes outside the app database in v1. No automated credit ledger.

---

## 12. Security plan

- No secrets in client bundle. All Stripe SDK calls server-side only.
- No secret values in this doc, in any commit, or in any test fixture.
- Webhook signature verification on every event (`stripe.webhooks.constructEvent`).
- Tenant resolved server-side from session, never from request body.
- Plan id never trusted from client. Plan derived from Stripe Price → env-var mapping.
- Live and test Stripe must use disjoint keys. `STRIPE_SECRET_KEY` env value differs per environment.
- `BILLING_CHECKOUT_ENABLED` kill switch defaults to `false`. Production flip requires explicit operator approval.
- Idempotency: `processed_webhook_events (provider, event_id)` unique. Replays return `{ received: true }` no-op.
- Replay protection: Stripe's own signature + `event.id` uniqueness. No additional nonce required.
- Audit logging: each plan-state change writes a row to an existing audit-capable log table (deferred decision: reuse `billing_usage_events` with a typed event, or add `billing_audit_events`. Resolved in 3AY-8R-Impl §6.).
- Redacted errors: route responses to clients never include Stripe error messages verbatim. Server logs may contain Stripe ids at debug level; warn level redacts.

---

## 13. Testing plan

- **Unit:** Stripe Price → plan_id mapping (`STRIPE_PRICE_ID_BUILD_MONTHLY` → `'build'`). Rejection of unknown Price.
- **Route — checkout:** kill switch off → disabled; env missing → disabled; unauth → 401; valid → URL returned; spoofed `plan_id` in body ignored.
- **Route — portal:** no `stripe_customer_id` → 404; valid → URL.
- **Route — webhook:** invalid signature → 400; each event type → correct state transition; replay → idempotent no-op; failed-payment → status `past_due`, no row deletion.
- **Idempotency:** insert duplicate `event_id` → no-op, no extra row.
- **Env-missing:** missing `STRIPE_PRICE_ID_BUILD_MONTHLY` → checkout disabled, UI fallback verified.
- **Client plan spoof:** body `{ productKey: 'build', plan_id: 'enterprise' }` → server ignores `plan_id`.
- **No Stripe live calls in tests:** Stripe SDK mocked via Vitest. CI fails on real Stripe TCP attempt.
- **No hardcoded prices:** vitest source-shape test scans `app/api/v2/billing/**` for `\$49(?![0-9])`, `\$199(?![0-9])`, etc. and forbids them outside the env-var mapping.
- **Forbidden public claims:** existing `app/pricing` and `app/get-access` source-shape tests already cover this; webhook + checkout route source files added to the scan list.

---

## 14. Deployment plan

1. **Test mode first.** Stripe test keys only. Local Stripe CLI webhook tunnel (`stripe listen`) for end-to-end verification.
2. **Local webhook test.** Run all event types via Stripe CLI `stripe trigger ...`. Verify idempotency by triggering the same event twice.
3. **Staging / preview verification** if a staging environment exists. Otherwise, Vercel preview deploys with test keys.
4. **Production env checklist** (gated on explicit operator approval per item):
   - `STRIPE_SECRET_KEY` set to live key.
   - `STRIPE_WEBHOOK_SECRET` set to production webhook secret (after creating the live webhook endpoint).
   - `STRIPE_PRICE_ID_BUILD_MONTHLY` set to live Build Price id.
   - `BILLING_CHECKOUT_ENABLED` set to `false` initially; flip to `true` only after the next step.
5. **Production webhook endpoint setup:** create the Stripe webhook in dashboard, point at `/api/v2/billing/webhook`, subscribe to the six events in §7, store secret in env.
6. **One end-to-end checkout in Stripe test mode** against production code path (kill switch off) using a test-mode key swap, or in a staging Stripe account. Verify webhook delivery + DB state.
7. **Operator approval** required before flipping `BILLING_CHECKOUT_ENABLED` to `true` in production.

---

## 15. Rollback plan

- **Soft disable:** set `BILLING_CHECKOUT_ENABLED = 'false'`. UI immediately falls back to `/get-access?intent=build`. No data deleted, no Stripe records touched.
- **Route Build CTA back to /get-access?intent=build:** automatic when kill switch off.
- **Sandbox stays alive** independently of billing state.
- **Manual sales path stays alive** independently — all bridge offers and Growth+ tiers continue to flow through `/get-access`.
- **Do not delete Stripe records.** Cancel subscriptions in Stripe dashboard if required; do not delete Customer or Subscription objects.
- **Do not drop billing tables** without a separate approval slice. Schema-level rollback is out of scope here.
- **Tenant data preservation:** failed payments and cancellations never delete tenant rows. Plan reverts to `sandbox`; data and audit history preserved.

---

## 16. Acceptance criteria

The plan is considered complete only because it answers every question below.

| Question | Answer |
|---|---|
| What existing billing code exists? | See §1.2. Substantial Stripe scaffolding (checkout, portal, webhook, subscription-service), on-chain settlement, partner commissions, entitlements, plan-guard, BillingGuard. |
| What is reused? | `provider.ts`, `providers/stripe.ts`, `subscription-service.ts`, `plan-guard.ts`, `usage.ts`, `entitlements.ts`, all three `/api/v2/billing/*` routes, `processed_webhook_events`, `billing_subscriptions`, `tenants.stripe_*`. |
| What is left untouched? | On-chain settlement (`providers/onchain.ts`, `actions/billing*`, on-chain cron, on-chain subscribe route), partner commission routes, `BillingGuard`, `enforcement.ts`. |
| What is the first checkout SKU? | **Build $49/month**. |
| What does Stripe create? | One Product (`P402 Build`), one Price (Build monthly $49), one Customer per paying tenant, one Subscription per paying tenant. |
| What app state stores billing truth? | `tenants.plan`, `tenants.stripe_customer_id`, `tenants.stripe_subscription_id`, `billing_subscriptions` row per active subscription, `processed_webhook_events` per processed Stripe event. |
| What webhook events update plan state? | `customer.subscription.created` (grant), `customer.subscription.updated` (period / price change), `customer.subscription.deleted` (revert to sandbox), `invoice.payment_failed` (status → past_due). `checkout.session.completed` and `invoice.paid` are audit-only. |
| How does a tenant become Build? | Authenticated tenant clicks Build CTA → `/api/v2/billing/checkout` with `productKey: 'build'` → Stripe-hosted checkout → user pays → Stripe sends `customer.subscription.created` → webhook verifies + maps Price → flips `tenants.plan = 'build'`. |
| What happens on payment failure? | `invoice.payment_failed` → `billing_subscriptions.status = 'past_due'`. Tenant row preserved. Plan revert decision is per-Stripe-retry-policy; v1 leaves plan as `build` until `customer.subscription.deleted`. |
| What happens on cancellation? | `customer.subscription.deleted` → `billing_subscriptions.status = 'canceled'`, `tenants.plan = 'sandbox'`. Tenant + data preserved. |
| How is access intent persisted? | `access_requests` gets `intent`, `resolved_intent`, `plan_id`, `offer_id` columns (additive migration). POST handler writes them. |
| What remains manual? | Growth, Scale, Enterprise self-serve checkout. AI Spend Audit / Paid Pilot / Regulated Pilot self-serve. Refund and credit ledgers. Operator manual plan flips for sales-assisted tiers. |
| What remains deferred? | Metronome, automated overage invoicing, enterprise commit drawdown, partner-commission payout automation changes, cryptographic invoice appendix, multi-year contract automation, Department Dashboard SKU, automated credit application. |
| What is forbidden? | Trusting client plan id; granting entitlements before webhook signature verified; hardcoded prices outside rate card or env mapping; live Stripe calls in tests; deleting tenant rows on payment failure or cancellation; verified savings / auto-apply / runtime enforcement / unsupported compliance claims; secrets in docs, fixtures, or logs. |

---

## Appendix A — open questions for 3AY-8R-Impl

1. **`tenants.plan = 'pro'` migration target.** Confirm `pro → growth` is the correct mapping. (Pro is currently priced at $499/mo per `lib/billing/plans.ts`; Growth is $199/mo. Operator must explicitly approve the price-difference handling — credit, grandfather, or migrate-at-renewal.)
2. **`STRIPE_PRICE_ID_PRO` deprecation timing.** Keep until all `pro`-tier tenants are migrated; remove in a follow-up slice.
3. **Webhook event for audit logging.** Reuse `billing_usage_events` (typed event) vs. add `billing_audit_events`. Default: reuse, decide at impl.
4. **Build CTA on `/get-access` after checkout ships.** Current flow keeps `/get-access?intent=build` as the form-based path. After self-serve ships, does the Build CTA on `/get-access` change, or does `/get-access` remain the sales-assisted fallback only? Default: keep `/get-access` as form fallback, no change.
5. **`enforcement.ts` removal.** Out of scope for 3AY-8R, but flagged for a later cleanup slice.
