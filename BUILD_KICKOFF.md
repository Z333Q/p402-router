# P402.io Build Kickoff Packet (V2 — Hardened)

> **Precision-first execution board.** Integrated with A2A protocol mapping, Next.js App Router edge-cases, and Neon Postgres connection limits.

## 1) Team Model and Ownership Map

### Core Specialist Roles

* **FS, Full Stack Lead:** Owns route wiring, API contracts, server/client integration, dashboard pages, A2A JSON-RPC bridging, webhook security, error flow, E2E integration.
* **DB, Database Lead:** Owns schema design, migrations, indexes, rollups, connection pool protection (20-conn max), batch execution logic.
* **PAY, Payment & Smart Contract Specialist:** Owns x402 fee ledgering, hybrid subscription abstraction, on-chain Pro wallet billing (EIP-2612/allowance logic), reconciliation, dunning states.
* **UX, UX and UI Lead:** Owns pricing page, plan UI, upgrade prompts, admin operator IA, safety queue UX, billing settings.
* **GRO, Onboarding and Growth Lead:** Owns activation funnel, event instrumentation, upgrade triggers, lifecycle messaging.

### Delivery Ownership Rule

Each task below has a Primary Owner, Supporting Roles, Output, and Acceptance Check. The Primary owner signs first, then specialist review gates run.

---

## 2) Sprint Cadence and Phase Structure

Two-week sprints, gated kickoff, gated production release sequence.

* **Sprint 0:** Design freeze and contracts
* **Sprint 1:** Pricing spine, fee ledger, and core quota guards
* **Sprint 2:** Hybrid subscriptions, webhook security, off-chain billing, and on-chain contract specs
* **Sprint 3:** Pro wallet subscription path, on-chain renewals, connection-safe reconciliation
* **Sprint 4:** Safety Pack ops and trust controls
* **Sprint 5:** Admin KPI console, safe DB rollups, and growth instrumentation
* **Sprint 6:** UX polish, funnel optimization, release hardening

---

## 3) Build Kickoff Standards

* **Integration Branch:** `release/sprint-<n>`
* **Feature Branches:** Per task ID
* **Definition of Done:** Code merged, tests pass, metrics emitted, error codes documented (REST + JSON-RPC), UI states cover loading/empty/error/blocked, specialist review signed.
* **Required Root Docs:** `BUILD_KICKOFF.md`, `SPRINT_BOARD.md`, `API_CONTRACTS_PRICING_BILLING.md`, `KPI_DEFINITIONS.md`, `RISK_REGISTER_PRICING_BILLING.md`.

---

## 4) Sprint Board with Task IDs

### Sprint 0: Design Freeze and Contracts

* **S0-001: Freeze pricing and entitlement matrix**
* *Owner:* FS | *Support:* PAY, UX, GRO
* *Output:* `docs/product/pricing-entitlements-v1.md`, plan matrix, upgrade trigger list.


* **S0-002: Billing provider abstraction spec (Option C)**
* *Owner:* PAY | *Support:* FS, DB
* *Output:* `docs/specs/billing-provider-abstraction-v1.md`, state machine mapping.


* **S0-003: DB schema and migration plan freeze**
* *Owner:* DB | *Support:* FS, PAY
* *Output:* `docs/specs/db-pricing-billing-kpi-v1.md`.


* **S0-004: API contract freeze**
* *Owner:* FS | *Support:* PAY, DB, UX
* *Output:* `API_CONTRACTS_PRICING_BILLING.md`. Includes REST and A2A JSON-RPC schemas.


* **S0-005: UX IA and screen flow freeze**
* *Owner:* UX | *Support:* FS, GRO
* *Output:* `docs/ux/pricing-admin-onboarding-ia-v1.md`.


* **S0-006: Funnel event taxonomy freeze**
* *Owner:* GRO | *Support:* FS, UX
* *Output:* `docs/growth/event-taxonomy-v1.md`.



**Sprint 0 Sign-off Gate:** All specialists sign. No schema or route code starts before this gate.

---

### Sprint 1: Pricing Spine and Fee Ledger

* **S1-001: Add pricing and billing core migrations**
* *Owner:* DB | *Support:* FS, PAY
* *Files:* `scripts/migrations/v2_002_pricing_layer.sql`, `scripts/migrations/v2_003_billing_core.sql`


* **S1-002: Build billing plan constants and entitlements modules**
* *Owner:* FS | *Support:* PAY
* *Files:* `lib/billing/plans.ts`, `lib/billing/entitlements.ts`


* **S1-003: Build plan guard, usage recorder, and Cache Policy** *(Updated)*
* *Owner:* FS | *Support:* DB, PAY
* *Files:* `lib/billing/plan-guard.ts`, `lib/billing/usage.ts`
* *Scope:* `getTenantPlan`, `computePlatformFee`, `assertWithinCap`, `recordUsage`. Explicitly define product logic for **Semantic Cache hits** (e.g., bypass usage tracking if cached, or record at 0-cost).


* **S1-004: Extend error codes for REST and JSON-RPC A2A** *(Updated)*
* *Owner:* FS | *Support:* UX
* *Files:* `lib/errors.ts`, `lib/a2a-errors.ts`
* *Scope:* Standardize response payloads for blocked actions. Map billing failures (`PLAN_CAP_EXCEEDED`) cleanly into the A2A JSON-RPC 2.0 error payloads so agents don't crash the orchestrator stream.


* **S1-005: Wire plan checks into router settle**
* *Owner:* FS | *Support:* PAY, DB
* *Files:* `app/api/v1/router/settle/route.ts`, `lib/services/router-service.ts`


* **S1-006: Wire plan checks into facilitator verify and settle**
* *Owner:* FS | *Support:* PAY, DB
* *Files:* `app/api/v1/facilitator/verify/route.ts`, `app/api/v1/facilitator/settle/route.ts`


* **S1-007: Dashboard plan and usage card (V1)**
* *Owner:* UX | *Support:* FS, GRO
* *Files:* `app/dashboard/_components/PlanUsageCard.tsx`, `hooks/usePlanUsage.ts`



**Sprint 1 Sign-off Gate:** Pricing spine works on staging. Fee ledger rows appear. Dashboard shows plan usage. Cache hit billing logic verified.

---

### Sprint 2: Hybrid Subscriptions, Webhooks, and Smart Contract Specs

* **S2-001: Billing customer and subscription schema expansion**
* *Owner:* DB | *Support:* PAY
* *Files:* `scripts/migrations/v2_004_billing_subscriptions.sql`


* **S2-002: Billing provider interface and adapter skeletons**
* *Owner:* PAY | *Support:* FS
* *Files:* `lib/billing/provider.ts`, `lib/billing/providers/stripe.ts`


* **S2-003: Subscription sync service**
* *Owner:* PAY | *Support:* FS, DB
* *Files:* `lib/billing/subscription-service.ts`, `app/api/internal/cron/billing/sync/route.ts`


* **S2-003b: Webhook Signature Guard & Raw Body Parsing** *(New)*
* *Owner:* FS | *Support:* PAY
* *Files:* `app/api/v1/billing/webhook/route.ts`
* *Scope:* Implement `export const dynamic = 'force-dynamic'`. Ensure raw `request.text()` is read *before* Next.js attempts JSON parsing to prevent Stripe/Provider signature validation failures.


* **S2-004: Billing settings API and dashboard UI**
* *Owner:* FS | *Support:* UX, PAY
* *Files:* `app/dashboard/billing/page.tsx`


* **S2-005: Upgrade modal and feature-lock prompt system**
* *Owner:* UX | *Support:* FS, GRO


* **S2-006: Pricing page and upgrade math calculator**
* *Owner:* UX | *Support:* FS, GRO, PAY


* **S2-007: Subscription Smart Contract Specification** *(New)*
* *Owner:* PAY | *Support:* FS
* *Files:* `contracts/SubscriptionFacilitator.sol`, `docs/specs/pro-wallet-subscription-v1.md`
* *Scope:* EIP-3009 cannot handle recurring autonomous billing. Specify EIP-2612 `permit` or standard `approve`/`transferFrom` allowance mechanism for the monthly auto-renewal cron to execute without user gas/signatures per month.



**Sprint 2 Sign-off Gate:** Webhook signatures pass. Off-chain subscription path drives `tenant_plan`. Smart contract spec for recurring payments approved.

---

### Sprint 3: Pro Wallet Subscriptions and Connection-Safe Reconciliation

* **S3-001: On-chain Pro subscription deployment**
* *Owner:* PAY | *Support:* FS, DB
* *Files:* `lib/billing/providers/onchain.ts`


* **S3-002: On-chain subscription ledger and proof mapping**
* *Owner:* DB | *Support:* PAY
* *Files:* `scripts/migrations/v2_005_onchain_subscription_ledger.sql`


* **S3-003: Wallet billing setup UI for Pro**
* *Owner:* UX | *Support:* FS, PAY
* *Files:* `app/dashboard/billing/wallet/page.tsx`


* **S3-004: On-chain renewal job and reconciliation cron** *(Updated)*
* *Owner:* PAY | *Support:* FS, DB
* *Files:* `app/api/internal/cron/billing/reconcile/route.ts`
* *Scope:* Renewal scan and drift detection. **Crucial:** Must process rows sequentially (`for...of`) or use explicitly chunked batches (`LIMIT 500`). `Promise.all()` is strictly forbidden here to prevent exhausting the Neon DB 20-connection pool.


* **S3-005: Past due feature downgrade enforcement**
* *Owner:* FS | *Support:* PAY, UX
* *Files:* `lib/billing/plan-guard.ts`



**Sprint 3 Sign-off Gate:** Pro wallet subscription path works on staging. Reconciliation job updates status without spiking DB connection pools above 50% capacity.

---

### Sprint 4: Safety Pack and Trust Operations

* **S4-001: Safety Pack schema and incident model**
* *Owner:* DB
* *Files:* `scripts/migrations/v2_006_safety_pack_ops.sql`


* **S4-002: Safety Pack entitlement and route gating**
* *Owner:* FS


* **S4-003: Publish pipeline scanner and identity gate**
* *Owner:* FS | *Support:* PAY, DB
* *Files:* `lib/bazaar/safety-scanner.ts`


* **S4-004: Reputation actions and runtime block checks**
* *Owner:* FS | *Support:* PAY, DB


* **S4-005: Admin Safety queue and incident UI**
* *Owner:* UX



**Sprint 4 Sign-off Gate:** Safety pack publish and runtime controls active on staging. Admin queue operational.

---

### Sprint 5: Admin KPI Console and Growth Instrumentation

* **S5-001: KPI definitions and source mapping doc**
* *Owner:* DB | *Support:* FS, GRO


* **S5-002: KPI rollup jobs and materialized views** *(Updated)*
* *Owner:* DB | *Support:* FS
* *Files:* `scripts/migrations/v2_007_kpi_rollups.sql`, `app/api/internal/cron/kpi-rollup/route.ts`
* *Scope:* Build revenue/adoption rollups. Implement cursor-based chunking. No raw full-table scans during peak routing hours to protect real-time A2A routing DB availability.


* **S5-003: Admin KPI API endpoints**
* *Owner:* FS | *Support:* DB


* **S5-004: Admin console UI pages**
* *Owner:* UX


* **S5-005: Funnel instrumentation in app and dashboard**
* *Owner:* GRO | *Support:* FS, UX


* **S5-006: Onboarding sequence and in-app messaging hooks**
* *Owner:* GRO



**Sprint 5 Sign-off Gate:** Rollups run under 10 seconds without dropping connection pool limits. Analytics events flow cleanly.

---

### Sprint 6: Release Hardening

* **S6-001: Pricing and upgrade copy optimization pass** (GRO)
* **S6-002: Reliability and failure mode hardening** (FS)
* *Scope:* Include testing Stripe webhook signature tampering, Redis failure fallbacks, and DB exhaustion retries.


* **S6-003: End-to-end test suite completion** (FS)
* **S6-004: Launch readiness review** (FS)
