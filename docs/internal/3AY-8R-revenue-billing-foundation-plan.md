# 3AY-8R: Revenue Billing Foundation Plan

**Status:** plan only. No code. No SQL execution. No Neon mutation. No Redis. No migration. No deploy. No Stripe live call. No production mutation.
**Predecessors:** 3AX rate card v1, 3AY pricing surface plan, 3AY-1 pricing page, 3AY-4 get-access intent handling.
**Successor:** to be approved per phase. Implementation is **explicitly blocked** by the pricing-decision gate in §1.

## 0. Hard boundaries (true throughout 3AY-8R)

- No code in this slice.
- No SQL execution. No Neon mutation. No Redis. No migration.
- No deploy. No Stripe live call. No production mutation.
- No tenant-visible Optimize recommendations.
- No verified savings claim.
- No policy auto-apply.
- No runtime enforcement.
- No customer logo or unsupported compliance claim.

This document is a **plan**. Every section below describes work that requires separate, explicit approval before any keystroke of implementation code is written.

---

## 1. Pricing Decision Gate (must clear before implementation)

Billing implementation **must not begin** until one of these is true:

- **3AY-Pricing-Realign ships and is approved**, locking the final launch rate card; or
- **The operator explicitly confirms in writing that the current 3AX governance-priced ladder remains the billing source of truth** (Sandbox / Developer $249 / Business $2,500 / Scale $5,000 / Enterprise from $60k ARR + Proof Sprint $15k + Paid Pilot $35k).

### 1.1 Context

A V5 alignment review found that the current commercial ladder may be misaligned with the V5 source of truth. Two candidate ladders are in play:

| Tier | 3AX (currently shipped) | V5 candidate |
|---|---|---|
| Free entry | Sandbox $0, 25k events | Free Sandbox $0, 10k events |
| Paid entry | **Developer $249/mo** | **Build $49/mo** |
| Mid-developer | — | Growth $199/mo |
| High-developer | Scale $5,000/mo annual | Scale $799/mo |
| Enterprise floor | $60,000 ARR | $15,000/mo ($180k ARR) |
| One-time first purchase | Proof Sprint $15,000 | **AI Spend Audit $1,500** |
| Recurring first enterprise purchase | — | **Department Dashboard $1,500/mo** |
| Pilot | Paid Pilot $35,000 | (not in V5 ladder) |

These are not the same products. They produce different funnels, different webhook volumes, different Stripe product IDs, and different self-serve checkout SKUs.

### 1.2 What this gate forbids

Until the gate clears, the following are **forbidden**:

1. Creating any Stripe product or price in test or live mode.
2. Picking a single `STRIPE_*_PRICE_ID` env var as the only checkout target.
3. Writing migration files that reference one ladder by name.
4. Routing `/pricing` Developer CTA to a checkout URL.
5. Disabling the `/get-access?intent=developer` sales-assisted fallback.
6. Any frontend copy that names a paid-checkout SKU as live.
7. Any documentation that asserts billing v1 ships with Developer-$249 or Build-$49 specifically.

### 1.3 What this gate permits

Until the gate clears, this is permitted:

1. **Designing** the price-ladder-agnostic billing architecture (this document).
2. **Planning** schema, routes, webhook handling, and entitlements that work for either ladder.
3. **Drafting** test fixtures that exercise multiple SKUs without committing to a launch SKU.
4. **Reviewing** Stripe documentation, webhook contracts, customer portal contracts.

### 1.4 Required pre-implementation deliverables

Before 3AY-8R-Impl begins:

- Pricing realignment slice (3AY-Pricing-Realign) merged, OR a one-line memo from the operator confirming the 3AX ladder.
- The **final launch SKU table** captured in `lib/pricing/rate-card.ts` and `docs/internal/3AX-*` (or a successor versioned doc).
- A written decision on whether the first checkout SKU is one of: Build $49/mo, Developer $249/mo, AI Spend Audit $1,500 one-time, Department Dashboard $1,500/mo, or a combination.
- A written decision on whether monthly + annual prices ship together or monthly only in v1.
- A written decision on whether Proof Sprint / Paid Pilot enter Stripe as manual one-time invoices in v1 or remain entirely off-Stripe.

### 1.5 Acceptance check for this gate

Operator answers each of these before the gate is treated as cleared:

- [ ] Final rate card version locked.
- [ ] First self-serve checkout SKU named.
- [ ] Monthly-only vs monthly+annual decision recorded.
- [ ] Pilot/sprint Stripe-invoice posture chosen.
- [ ] Confirmation that this plan supports the chosen ladder without rewriting webhook logic.

If any answer is "not yet," 3AY-8R-Impl does not start.

---

## 2. Price-Ladder-Agnostic Billing Design (required)

The architecture below is mandatory whether the launch ladder is 3AX, V5, or a future v2.

### 2.1 Design rules

1. **Billing tables store `plan_id` and `stripe_price_id` separately.** `plan_id` is the app's stable identifier (e.g. `'developer'`, `'build'`, `'growth'`, `'business'`). `stripe_price_id` is whatever Stripe assigned. The two are joined via a config-driven map; the schema does not assume a particular name.
2. **Entitlements derive from `lib/pricing/rate-card.ts` or a normalized pricing registry.** The rate-card module is the single source of truth for the app's view of included events, retention, support level, etc. Stripe is the source of truth only for billed amount and subscription state.
3. **Stripe price IDs map to plan IDs through configuration.** A `lib/pricing/stripe-price-map.ts` (planned, not implemented) takes `stripe_price_id` → `plan_id`. The map is env-driven so different price IDs can be loaded for test mode vs live mode.
4. **Adding Build, Growth, AI Spend Audit, or Department Dashboard later must not require rewriting webhook logic.** The webhook handler reads the price-ID-to-plan-ID map. New SKUs are added by extending the map + the rate card; webhook code is untouched.
5. **Checkout route accepts a controlled allowlist of self-serve SKUs.** The list lives in `lib/pricing/checkout-allowlist.ts` (planned). Today it is empty until the gate clears. Tomorrow it may contain `'developer'`, `'build'`, `'ai_spend_audit'`, etc. The route refuses any plan id not on the allowlist.
6. **Business, Enterprise, Proof Sprint, and Paid Pilot remain sales-assisted unless explicitly moved to checkout.** Even when their SKUs exist in the rate card, their checkout-allowlist entries are off by default.

### 2.2 Why this matters

If 3AY-8R-Impl hardcodes "Developer $249 = the Stripe checkout SKU," realigning to the V5 ladder later requires editing the webhook handler, the migration that pinned the column, the env-var name, the frontend route target, and the entitlement lookup. That's a multi-day rework with regression risk.

If 3AY-8R-Impl is config-driven from day one, switching ladders is a config + rate-card edit. Same webhook code, same routes, same schema. That's a one-hour change.

---

## 3. Current billing posture

### 3.1 What exists

- **Pricing source of truth:** `lib/pricing/rate-card.ts` (v1, locked from 3AX §4).
- **Intent capture on `/get-access`:** `lib/pricing/intent.ts` + `app/get-access/page.tsx` (shipped in 3AY-4). The frontend submits `intent`, `plan_id`, and `offer_id` to `/api/v1/access-request`.
- **Access-request API:** `app/api/v1/access-request/route.ts`. Zod schema is permissive (non-strict object); unknown keys including `intent`, `plan_id`, `offer_id` are silently dropped.
- **Tenant / user / account model:** existing `tenants`, `users`, `admin_users`, `api_keys` tables.
- **Auth model:** NextAuth (Google OAuth + session); admin auth via `lib/admin/auth.ts`; tenant API access via `requireTenantAccess`.
- **No Stripe wiring for self-serve checkout.** No Stripe product, no Stripe price ID, no checkout route, no customer portal route, no webhook receiver in this product flow.
- **Legacy Stripe references:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a webhook handler exist for the existing billing/subscription path (per CLAUDE.md §critical gotchas, the webhook must use `await req.text()` for signature verification). The 3AY-8R foundation must integrate cleanly with this path, not replace it.

### 3.2 Current gaps (resolved by this plan)

1. Access-request `intent`, `plan_id`, `offer_id` are dropped, not persisted. No lead attribution.
2. No Stripe Checkout for any SKU on `/pricing` or `/get-access`.
3. No tenant subscription-state column or table that downstream code can query for entitlements.
4. No webhook idempotency table specific to the new billing path.
5. No Stripe-price-ID → plan-ID mapping module.
6. No checkout-allowlist module.

---

## 4. Billing v1 product decisions (subject to gate)

Locked when the gate clears. Until then, the decisions below are **defaults**, not approvals.

| Decision | Default position |
|---|---|
| Sandbox | Remains no-card. No change. |
| First self-serve checkout SKU | **To be determined by pricing gate.** Plan supports Developer $249 (3AX) or Build $49 (V5) or other. |
| Business and above | Remain sales-assisted via `/get-access?intent=business` (or scale/enterprise). |
| Proof Sprint, Paid Pilot, Regulated Pilot | Remain manual invoice / SOW. Optionally enter Stripe as one-time invoice records (no checkout flow). |
| Automated overage billing | Not in v1. Deferred. |
| Hard paid enforcement beyond plan state | Not in v1. Sandbox event cap remains; paid plan enforcement is plan-state lookup only. |
| Monthly vs annual SKU | To be determined by pricing gate. Plan supports both. |
| Multi-currency | USD only in v1. |

---

## 5. Stripe product model (subject to gate)

### 5.1 Products and prices to create

**The list below is conditional.** No Stripe product or price is created until the pricing gate clears and the operator confirms which SKUs ship as Stripe products in v1.

Possible v1 SKUs (the implementation slice picks a subset):

| Stripe product | Stripe price | Cadence | Plan ID | Notes |
|---|---|---|---|---|
| P402 Build | Build Monthly | recurring | `build` | If V5 ladder |
| P402 Growth | Growth Monthly | recurring | `growth` | If V5 ladder |
| P402 Developer | Developer Monthly | recurring | `developer` | If 3AX ladder |
| P402 AI Spend Audit | one-time | one-time | `ai_spend_audit` | If V5 + one-time checkout approved |
| P402 Department Dashboard | Department Monthly | recurring | `department_dashboard` | If V5 + monthly Dashboard approved |
| P402 Business / Scale / Enterprise | invoice only | n/a | n/a | Not Stripe Checkout; manual invoice or no Stripe entry |
| P402 Proof Sprint / Paid Pilot / Regulated Pilot | invoice only | n/a | n/a | Not Stripe Checkout |

### 5.2 Mapping config (the module that absorbs ladder change)

Planned module: `lib/pricing/stripe-price-map.ts`.

```
StripePriceMap shape (planned, not implemented):

{
  [stripePriceId: string]: {
    plan_id: PlanIdOrOfferId;
    billing_cycle: 'one_time' | 'monthly' | 'annual';
    rate_card_ref: 'plan' | 'bridge_offer';
  }
}
```

The map is populated **from environment variables**, not from hardcoded constants. The Stripe price IDs themselves never appear in source.

### 5.3 Rate-card alignment

Every Stripe product and price must trace back to `lib/pricing/rate-card.ts`:

- `Build` (if shipped) reads its included events / retention from `PLANS.build` (added to rate card by 3AY-Pricing-Realign, not by 3AY-8R).
- `Developer` (if shipped) reads from `PLANS.developer` (already present in rate card).
- `AI Spend Audit` (if shipped) reads price from a new `BRIDGE_OFFERS.ai_spend_audit` entry.
- Adding a new SKU to the rate card and the Stripe map is the only edit required to expand v1.

---

## 6. Required environment variables (names only, no values)

Conditional on which ladder the operator approves. The implementation slice loads only the env vars matching the chosen ladder.

**Always required:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (the webhook secret for the new billing-v1 endpoint; may share or differ from existing webhook)
- `NEXT_PUBLIC_APP_URL` (already exists; used to build checkout return URLs)

**Conditional on chosen launch SKUs (load only those approved):**
- `STRIPE_PRICE_ID_BUILD_MONTHLY` — if V5 ladder approved
- `STRIPE_PRICE_ID_GROWTH_MONTHLY` — if V5 ladder approved
- `STRIPE_PRICE_ID_DEVELOPER_MONTHLY` — if 3AX ladder remains approved
- `STRIPE_PRICE_ID_DEVELOPER_ANNUAL` — if 3AX ladder + annual approved
- `STRIPE_PRICE_ID_AI_SPEND_AUDIT` — if V5 + one-time checkout approved
- `STRIPE_PRICE_ID_DEPARTMENT_DASHBOARD_MONTHLY` — if V5 + Dashboard checkout approved

**Optional:**
- `STRIPE_CUSTOMER_PORTAL_RETURN_URL` — defaults to `${NEXT_PUBLIC_APP_URL}/dashboard/billing` if absent.
- `BILLING_V1_ENABLED` — feature flag for staged rollout. When `false`, checkout route returns 404 and Developer CTA continues to route through `/get-access?intent=developer`.

No secret values are printed in this document. The implementation slice fetches them from the deployment environment only.

---

## 7. Database schema plan

All changes are additive. No drops, no destructive renames.

### 7.1 Access-request intent persistence (REQUIRED before any paid launch)

**Decision: Option A (extend `access_requests`).**

Rationale: the existing table is the lead-capture sink today; adding three nullable columns is additive and avoids a join for every CRM read. A separate `lead_intents` table buys little (the columns are 1:1 with access requests) and adds an unnecessary join. The cost of Option A is three columns; the cost of Option B is one new table + one new foreign key + an additional query in every CRM lookup.

```sql
-- v2_05N_access_requests_intent.sql (planned, not implemented)
ALTER TABLE access_requests
    ADD COLUMN IF NOT EXISTS intent TEXT,
    ADD COLUMN IF NOT EXISTS plan_id TEXT,
    ADD COLUMN IF NOT EXISTS offer_id TEXT;
```

Constraints deliberately omitted (no CHECK enum) so the migration is reusable across ladder changes. Application validation continues to gate the values written.

### 7.2 Billing subscription state

```sql
-- v2_05N_billing_subscriptions_v1.sql (planned, not implemented)
CREATE TABLE IF NOT EXISTS billing_subscriptions_v1 (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id               UUID,                    -- optional; the user who initiated checkout
    stripe_customer_id    TEXT NOT NULL,
    stripe_subscription_id TEXT,                   -- null for one-time SKUs
    stripe_price_id       TEXT NOT NULL,
    plan_id               TEXT NOT NULL,           -- resolved at webhook time from the map
    billing_cycle         TEXT NOT NULL,           -- 'one_time' | 'monthly' | 'annual'
    subscription_status   TEXT NOT NULL,           -- mirrors Stripe statuses
    current_period_start  TIMESTAMPTZ,
    current_period_end    TIMESTAMPTZ,
    cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
    last_event_id         TEXT,                    -- last Stripe event id observed; idempotency cursor
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (stripe_customer_id, stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_v1_tenant
    ON billing_subscriptions_v1 (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_v1_status
    ON billing_subscriptions_v1 (tenant_id, subscription_status);
```

Notes:
- `plan_id` is stored alongside `stripe_price_id` so a tenant's effective plan is queryable without consulting the Stripe map at every read.
- `subscription_status` strings mirror Stripe (`incomplete`, `incomplete_expired`, `trialing`, `active`, `past_due`, `canceled`, `unpaid`, `paused`). No app-specific enum; we trust Stripe's vocabulary.
- For one-time SKUs (AI Spend Audit), `subscription_status` is set to `active` at `invoice.paid` and remains until manually marked.

### 7.3 Webhook event idempotency

```sql
-- v2_05N_billing_webhook_events.sql (planned, not implemented)
CREATE TABLE IF NOT EXISTS billing_webhook_events_v1 (
    stripe_event_id      TEXT PRIMARY KEY,
    event_type           TEXT NOT NULL,
    received_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at         TIMESTAMPTZ,
    processing_status    TEXT NOT NULL DEFAULT 'received',  -- 'received' | 'processed' | 'failed'
    error_message        TEXT,
    raw_event_summary    JSONB NOT NULL DEFAULT '{}'::jsonb   -- bounded summary; no secrets
);
```

Notes:
- Stripe sends every event with a unique `id`; the PK enforces idempotency. A duplicate event hits the PK and is short-circuited as "already received."
- `raw_event_summary` stores **bounded** non-secret fields (event type, customer id prefix, subscription id, price id, status). It does **not** store the full event payload or any token.
- `error_message` is bounded to ≤ 256 chars and is sanitized (no Stripe API keys, no PII).

### 7.4 What is NOT in the schema plan

- No customer invoice line storage. Stripe owns this; the app does not duplicate.
- No payment method storage. Stripe owns this; the app does not duplicate.
- No price history beyond `stripe_price_id` on the subscription row. Historical pricing lives in Stripe.
- No tenant `is_premium` boolean. Plan state is derived from `subscription_status` + `plan_id`.

---

## 8. Routes plan

No route is implemented in this slice. Each row below describes the contract a future implementation slice would satisfy.

### 8.1 `POST /api/billing/checkout/[sku]`

**Path parameter:** `sku` ∈ checkout allowlist. Implementations refuse any other value.

| Field | Detail |
|---|---|
| Auth | Authenticated tenant (NextAuth session). Refuses anonymous. |
| Input | `{ return_url?: string }` (optional override of default success URL) |
| Output | `{ url: string }` — the Stripe Checkout Session URL the frontend redirects to |
| Side effects | Creates a Stripe Customer if the tenant has no `stripe_customer_id`; creates a Checkout Session in Stripe; **does NOT** create a `billing_subscriptions_v1` row (that happens on `checkout.session.completed`); does **not** mark the tenant as paid |
| Forbidden side effects | No DB row marking the tenant as paid before Stripe confirms; no credit / refund / discount logic in v1; no plan downgrade or upgrade logic outside the webhook |
| Test coverage | Returns 404 when `BILLING_V1_ENABLED=false`; returns 400 when `sku` is not on the allowlist; returns 401 when unauthenticated; happy path uses a fake Stripe client and returns a non-empty `url`; never trusts a client-supplied `plan_id` |

### 8.2 `POST /api/billing/portal`

| Field | Detail |
|---|---|
| Auth | Authenticated tenant with an existing `stripe_customer_id` |
| Input | `{ return_url?: string }` |
| Output | `{ url: string }` — Stripe Customer Portal Session URL |
| Side effects | Creates a Stripe portal session via `customer_portal.sessions.create({ customer, return_url })` |
| Forbidden side effects | No DB write; the portal route is read-through to Stripe |
| Test coverage | 401 when unauthenticated; 404 when the tenant has no Stripe customer; happy path returns a non-empty URL |

### 8.3 `POST /api/billing/webhook`

| Field | Detail |
|---|---|
| Auth | Stripe webhook signature (header `Stripe-Signature`) verified against `STRIPE_WEBHOOK_SECRET` using the raw request body |
| Input | Stripe event payload (raw bytes; **must use `await req.text()`** per CLAUDE.md to avoid Next.js JSON auto-parse breaking the signature) |
| Output | `{ received: true }` with 200 on success; 400 on signature failure; 200 + `{ received: true, already_processed: true }` on duplicate event |
| Side effects | Per event type, updates `billing_subscriptions_v1` and `billing_webhook_events_v1` |
| Forbidden side effects | Never grants paid plan without a Stripe event; never trusts client-side `plan_id`; never logs the raw event body |
| Test coverage | Signature verification with valid + invalid signatures; idempotency on duplicate events; every event type handled in §9; tenant resolution from `stripe_customer_id`; failure path logged without secrets |

### 8.4 Server helper for entitlements (not a route)

`lib/billing/entitlements.ts` (planned).

| Function | Signature | Notes |
|---|---|---|
| `getEntitlementsForTenant(tenantId)` | returns `{ plan_id, included_events_per_month, retention_days, support_level, checkout_enabled, billing_source }` | Reads from `billing_subscriptions_v1` + rate card. Returns Sandbox defaults if no row. |
| `hasActivePlan(tenantId)` | returns boolean | Wraps the above; true if `subscription_status` in `('active', 'trialing')`. |
| `requirePlan(tenantId, planId)` | throws if plan does not match | For server-side feature gating. |

---

## 9. Webhook plan

Events to handle in v1:

| Event | Action |
|---|---|
| `checkout.session.completed` | Look up tenant via `client_reference_id` (set at checkout); upsert `billing_subscriptions_v1` row using `stripe_customer_id` + `stripe_subscription_id`; resolve `plan_id` from price-ID map; set `subscription_status` from session's subscription object |
| `customer.subscription.created` | Same as above; idempotent upsert |
| `customer.subscription.updated` | Update `subscription_status`, `cancel_at_period_end`, `current_period_start/end`, `stripe_price_id`, `plan_id` (if price changed); preserve `tenant_id` |
| `customer.subscription.deleted` | Set `subscription_status='canceled'`; do NOT delete the row; downgrade entitlements to Sandbox on next read |
| `invoice.paid` | For one-time SKUs (AI Spend Audit): upsert a `billing_subscriptions_v1` row with `subscription_status='active'`, `billing_cycle='one_time'`. For recurring SKUs: record `last_event_id` and keep status |
| `invoice.payment_failed` | Set `subscription_status='past_due'`; downstream feature gates downgrade until status flips back to `active` |

### 9.1 Webhook handler rules

1. **Verify signature** before any DB write. Failed signature → 400, no DB write, no log of body content.
2. **Look up `stripe_event_id` in `billing_webhook_events_v1`**; if present with `processing_status='processed'`, return 200 immediately (idempotency).
3. **Insert the event row** with `processing_status='received'` before any other DB write. This guards against concurrent duplicate delivery.
4. **Resolve the tenant** from `stripe_customer_id` (set by `/api/billing/checkout` when the customer was created). Never trust a `tenant_id` field in the event payload.
5. **Resolve `plan_id`** from the Stripe price ID via the static map. Never trust a `plan_id` field in the event payload.
6. **Upsert the subscription row** in a single transaction with the event row's `processing_status` flip to `processed`.
7. **On any error**: set `processing_status='failed'` with a bounded, sanitized `error_message`; do not throw past the route handler; return 500 so Stripe retries.
8. **Never log secrets**: error logs reference `stripe_event_id`, `event_type`, `stripe_customer_id` prefix only.

### 9.2 Idempotency invariants (asserted by tests)

- Replaying any event 2× produces identical DB state.
- Replaying the same event with stale data does not overwrite newer data (compare `last_event_id`).
- A `customer.subscription.deleted` followed by re-receiving an older `customer.subscription.updated` does not revive the subscription as `active`.

---

## 10. Entitlements plan

### 10.1 Plan lookup

For tenant `T` at request time:

```
SELECT plan_id, subscription_status, stripe_price_id
  FROM billing_subscriptions_v1
 WHERE tenant_id = T
 ORDER BY updated_at DESC
 LIMIT 1
```

- No row → tenant is on **Sandbox** with rate-card Sandbox defaults.
- Row with `subscription_status='active'` or `'trialing'` → tenant is on the row's `plan_id`.
- Row with `subscription_status='past_due'` → downgrade to Sandbox for feature-gate reads (the row is preserved for billing-side visibility).
- Row with `subscription_status='canceled'` or `'unpaid'` → Sandbox.

### 10.2 Entitlement fields returned

For every plan, the entitlements helper returns:

| Field | Source |
|---|---|
| `plan_id` | `billing_subscriptions_v1` or Sandbox default |
| `included_events_per_month` | `lib/pricing/rate-card.ts` PLANS[plan_id].includedEventsPerMonth |
| `retention_days` | rate card |
| `support_level` | rate card / derived from `salesMotion` |
| `checkout_enabled` | true if `plan_id` is on the checkout allowlist; false otherwise |
| `billing_source` | `'stripe'` if a `billing_subscriptions_v1` row exists; `'sandbox'` otherwise; `'manual'` for admin-assigned (future) |

### 10.3 Rules

- **Reads from app DB, not from Stripe on every request.** Stripe is consulted only by the webhook.
- **Plan ID never round-trips through the client.** Even if a client sends `plan_id` in a header, the server ignores it.
- **Business/Scale/Enterprise are not assignable via Stripe in v1.** A tenant is on those plans only via a manual admin path (planned but not implemented in v1; admin tooling deferred to a successor slice).

---

## 11. Usage and limits plan

### 11.1 What v1 includes

- **Monthly event-count lookup per tenant.** Reuses existing `ai_economic_events` queries (or whatever the current canonical metering query is). Returns `{ tenant_id, period_start, period_end, events_consumed }`.
- **Sandbox limit state.** When `events_consumed >= 25,000` (or whatever the rate card says), Sandbox tenants see a "Sandbox is paused" state. **No DB enforcement** in v1 beyond UI surface; the actual ingest path may still record events. Hard caps are a separate slice.
- **Developer/Build/Growth allowance display.** The dashboard meter widget (a separate slice, 3AY-9R) reads `included_events_per_month` from entitlements and shows utilization.
- **No automated overage billing.** When a tenant exceeds their plan, no automatic Stripe invoice is generated in v1.
- **No projected invoice amount.** No UI surface that says "you'll owe $X next month" until overage billing exists.

### 11.2 Required minimal counter (must exist before paid launch)

A queryable monthly event count for `(tenant_id, current_month)`. This must exist before billing v1 ships because:

- The dashboard meter widget needs it.
- Sandbox cap enforcement needs it (UI only in v1).
- Customer support needs it to answer "am I close to my limit."

If the current schema does not support a fast `count(*)` over `ai_economic_events WHERE tenant_id = $1 AND event_time >= $2`, the implementation slice **must** ship an aggregate table or materialized view before opening checkout. The current path of "SELECT count(*) FROM ai_economic_events" may not scale to multi-million-event tenants; this is a known concern flagged for the implementation slice.

### 11.3 What v1 does NOT include

- Automated overage billing.
- Real-time meter aggregation to Stripe.
- Prepaid credits.
- Enterprise commit drawdown.
- Multi-currency billing.
- Discount or coupon application (Stripe-side coupons can still be applied manually; the app does not surface them).

---

## 12. Frontend plan

### 12.1 Pricing page changes

- **No change** to `/pricing` until 3AY-8R-Impl ships and the operator approves the Developer (or Build) CTA flip.
- When approved, the Developer (or Build) CTA on `/pricing` flips from `/get-access?intent=developer` to a checkout entry route. The flip is **gated by `BILLING_V1_ENABLED=true`**. While the flag is `false`, the CTA continues to route through `/get-access`.

### 12.2 Get-access page

- The intent-aware copy from 3AY-4 remains in place.
- The Developer (or Build) banner copy ("Paid self-serve checkout for Developer is in progress and will ship with our Revenue Billing Foundation (3AY-8R)") is updated to point at the live checkout flow **only after** `BILLING_V1_ENABLED=true`.
- All other intents continue to use `/get-access` as a sales-assisted form.

### 12.3 New routes

- `/dashboard/billing` — dashboard subroute showing current plan, billing portal link, invoice history (read from Stripe via the portal). No new product surface; this is an extension of existing dashboard.
- `/billing/success` — Stripe Checkout success return URL. Renders a confirmation, links to `/dashboard`.
- `/billing/cancel` — Stripe Checkout cancel return URL. Renders the same `/pricing` content with a "checkout cancelled" banner.

### 12.4 What is forbidden in frontend

- No paid claim that the system cannot honor.
- No Business/Scale/Enterprise checkout button.
- No hidden `plan_id` form fields that the server is expected to trust.
- No customer name/logo display until written permission.

---

## 13. Admin / manual operations plan

### 13.1 First Business / Scale / Enterprise customers

- Sales/founder takes the deal manually via the existing CRM path (lead enters via `/get-access?intent=…`).
- Once an annual contract is signed, an admin tool (planned, not in v1) marks the tenant with `plan_id`, `billing_source='manual'`, `subscription_status='active'`, and a manual `current_period_end`.
- In v1 (until admin tooling ships), this can be done by a direct SQL UPDATE on `billing_subscriptions_v1` with operator approval; the implementation slice ships a `scripts/billing/` one-off for the operator to execute against staging, then production, with audit logging.

### 13.2 Proof Sprint and Paid Pilot payment recording

- Engagement fees collected via Stripe Invoicing (manual Stripe Dashboard action; no app code).
- Optional: a `billing_subscriptions_v1` row with `billing_cycle='one_time'` and `plan_id='proof_sprint'` or `'paid_pilot'` can be inserted by the same admin one-off so the dashboard reflects the engagement.

### 13.3 Lead intent visibility for founder

- Once the access-request intent column migration ships (§7.1), the admin tooling (already exists at `/admin/users` etc.) reads the new columns. A small UI patch (separate slice) surfaces `intent`, `plan_id`, `offer_id` in the admin lead view.

### 13.4 Refunds and credits in v1

- All refunds executed manually via the Stripe Dashboard.
- The webhook handler observes `charge.refunded` (optional v1 addition) and updates `subscription_status='canceled'` if the refund cancels the period. No automatic credit notes in app.

---

## 14. Security plan

1. **No secret values in code or docs.** All `STRIPE_*` env vars are read from process env at runtime only. Source-shape tests in the implementation slice forbid any `sk_live_` / `whsec_` literal anywhere in the tree.
2. **Webhook signature verification.** `await req.text()` + Stripe SDK's `webhooks.constructEvent` (or equivalent manual signature check). Failed signature → 400 with no DB write.
3. **No Stripe secret in client bundle.** The Stripe SDK is used only on the server. The frontend never imports the Stripe Node SDK. Source-shape test asserts `'use client'` files do not import `stripe`.
4. **No trust in client `plan_id`.** Every checkout and webhook resolves `plan_id` from the server-side Stripe price map.
5. **Server-side tenant resolution.** The webhook uses `stripe_customer_id` → `tenant_id` lookup. The checkout route uses the authenticated session's `tenant_id`.
6. **Idempotent webhook processing.** Per §9.1.
7. **Access log redaction.** Webhook error logs contain `stripe_event_id`, `event_type`, `stripe_customer_id` (prefix only), and a bounded `error_message`. No event payload, no card details, no PII.
8. **Test-mode / live-mode separation.** The price ID map keys on env values; loading test-mode price IDs against live mode never resolves any plan. The implementation slice asserts at boot that env var prefixes match expected mode.

---

## 15. Testing plan

### 15.1 Unit / integration tests

- **Plan mapping.** `stripe-price-map.ts` resolves every approved price ID to the right plan id. Unknown price ID returns `null`. Map is loaded from env in test fixtures.
- **Checkout route.** Returns 404 when `BILLING_V1_ENABLED=false`. Returns 400 when SKU not on the allowlist. Returns 401 when unauthenticated. Happy path uses a fake Stripe client and asserts the request payload (customer id, success/cancel URLs, line items) is correct.
- **Portal route.** Returns 404 when tenant has no `stripe_customer_id`. Returns 401 when unauthenticated. Happy path asserts the Stripe SDK was called with the right customer id.
- **Webhook route.** Every event type in §9 has a test fixture. Signature verification tested with valid + invalid signatures. Duplicate event returns 200 with `already_processed`. Tenant resolution failure (unknown `stripe_customer_id`) logs and returns 500.
- **Idempotency.** Replay each event 2× and assert identical DB state.
- **Client-side plan spoof.** Submitting `{ plan_id: 'enterprise' }` to the checkout route does not produce an Enterprise checkout session. The route ignores body `plan_id` and uses the path parameter only.
- **No Stripe live calls in tests.** A fake Stripe client is injected via a `Queryable`-style dependency. The real Stripe SDK is never invoked from CI.
- **No hardcoded price literals.** Source-shape test scans `lib/billing/`, `app/api/billing/`, and `app/dashboard/billing/` for hardcoded dollar amounts. All amounts must flow from `lib/pricing/rate-card.ts`. No `$249`, `$49`, `$1,500`, etc. in route source.

### 15.2 Forbidden-phrase / safety scans

- No `verified savings`, `guaranteed savings`, `auto-apply`, `SOC 2 compliant`, `HIPAA compliant`, `ISO certified` anywhere in billing source.
- No `sk_live_` / `whsec_` / `pk_live_` / `acct_` literal.
- No `Stripe Checkout` substring on the get-access fallback page once billing is live (the page should route to the new checkout, not advertise it inline).

### 15.3 Operator-driven smoke tests (manual, in test mode)

Before live mode is enabled:
- Test-mode Stripe Customer creation via checkout route → asserts `billing_subscriptions_v1` row appears post-webhook.
- Test-mode subscription cancellation → row's `subscription_status` flips to `canceled`.
- Test-mode payment failure → row's `subscription_status` flips to `past_due`.
- Test-mode portal session creation → returns a usable URL.

---

## 16. Deployment plan

1. **Stripe test mode first.** All implementation work happens against Stripe test mode. Live mode is gated by `STRIPE_SECRET_KEY` value (test vs live).
2. **Local webhook testing.** Use `stripe listen` or the Stripe CLI to forward webhooks to localhost during development.
3. **Staging verification.** If a staging environment exists, deploy with test-mode keys and run the operator-driven smoke tests in §15.3.
4. **Production env variable checklist.** Operator confirms each `STRIPE_PRICE_ID_*` variable is set before the production deploy.
5. **Production webhook endpoint registration.** Operator creates the webhook endpoint in the Stripe Dashboard pointing at `https://p402.io/api/billing/webhook`. Operator confirms `STRIPE_WEBHOOK_SECRET` matches.
6. **Test purchase in Stripe test mode only.** No real card purchase until §16.7.
7. **Live mode only after operator approval.** Explicit written approval required. `BILLING_V1_ENABLED=true` flipped to `true` in production env. First real purchase by operator personally.

---

## 17. Rollback plan

1. **Disable checkout route by env flag.** Setting `BILLING_V1_ENABLED=false` returns 404 on `/api/billing/checkout/*`. Pricing page Developer CTA reverts to `/get-access?intent=developer` automatically (the flag is checked in the page render path).
2. **Sandbox alive.** Sandbox signup path is never gated by billing; it continues to work.
3. **Manual sales path alive.** `/get-access?intent=*` continues to route every non-Developer intent through the existing CRM.
4. **Do not delete Stripe records.** Customer rows in Stripe remain so historical data is preserved.
5. **Do not drop billing tables without separate approval.** `billing_subscriptions_v1` and `billing_webhook_events_v1` persist even if billing v1 is rolled back. They are referenced by historical webhook events.
6. **Downgrade tenants.** If a rollback requires removing access for paid tenants, the operator uses the existing admin path to flip `subscription_status='canceled'`. The data is preserved; only the entitlement read returns Sandbox.

---

## 18. Acceptance criteria

This plan is complete only when it answers each question below.

| Question | Section |
|---|---|
| How does a Sandbox user upgrade to Developer (or Build)? | §8.1, §12.1 |
| What does Stripe create? | §5, §8.1 |
| What app tables store billing state? | §7.2, §7.3 |
| What webhook events update plan state? | §9 |
| How is access-request intent persisted? | §7.1 |
| How does the app know a tenant is Developer (or Build)? | §10 |
| What happens if payment fails? | §9 (invoice.payment_failed → past_due) |
| What happens if subscription cancels? | §9 (subscription.deleted → canceled; entitlements downgrade to Sandbox) |
| What is manual versus automated? | §4, §13 |
| What is explicitly deferred? | §11.3 |
| What is forbidden to claim? | §0, §14 |
| **Does this billing plan work if the first paid SKU is Build $49 instead of Developer $249?** | §2, §5, §6 |
| **Does this billing plan support AI Spend Audit $1,500 one-time?** | §5.1, §7.2 (`billing_cycle='one_time'`) |
| **Does this billing plan support Department Dashboard $1,500/mo later?** | §5.1, §6 |
| **Is billing implementation explicitly blocked until pricing realignment is resolved?** | §1 |

---

## 19. Reaffirmed boundaries

- No code shipped by this slice.
- No SQL execution. No Neon mutation. No Redis touched. No migration applied. No deploy.
- No Stripe live call. No production mutation.
- No claim of verified savings.
- No claim of policy auto-apply.
- No claim of runtime enforcement being live.
- No unsupported compliance claim.
- No customer logo or name used without written permission.

---

## 20. Final report self-check (for the operator)

When this document is reviewed, the following claims must be true:

1. **Pricing-decision gate was added** — §1.
2. **Developer $249 is not hardcoded as the only checkout SKU** — §2, §5.1, §6 list every conditional SKU; no env var or schema column names a specific dollar amount or plan as "the" SKU.
3. **Plan supports V5 ladder if approved** — Build / Growth / AI Spend Audit / Department Dashboard all appear in §5.1 and §6 with conditional env vars.
4. **Billing implementation remains blocked until pricing realignment or explicit operator approval** — §1.2 lists what's forbidden; §1.4 lists the pre-implementation deliverables.

If any of the above is not visibly true in this document, the plan does not pass.
