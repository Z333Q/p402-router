# 3AZ-2: Onboarding & OAuth Funnel Refresh — Plan

**Status:** plan only. No code edits. No migration authoring. No SQL execution. No Neon mutation. No Redis mutation. No deploy. No Stripe live calls. No NextAuth config changes. No CDP changes. No production mutation.
**Predecessor:** 3AY-8R-3 (access-request intent persistence shipped at `9a02d7f`); onboarding audit completed in the same session.
**Successor:** 3AZ-2-Impl, phased per §11. No implementation begins from this plan without explicit operator approval per phase.

## 0. Hard boundaries (true throughout this plan)

- No code edits in this slice. No file creation outside this doc.
- No migration files authored. No SQL run. No Neon mutation. No Redis mutation.
- No deploy. No Vercel CLI invocation. No production mutation.
- No NextAuth provider changes. No CDP env changes. No Stripe SDK invocation.
- No tenant data rewrite. No `tenants.plan` change. No billing-plan migration.
- No verified savings, guaranteed savings, save N%, auto-apply, runtime enforcement, SOC 2 / HIPAA / ISO compliant, fake customer logo claims.
- No paid self-serve checkout claim that isn't yet live.

---

## 1. Context and problem statement

### 1.1 What this slice is responding to

A user attempting to sign in via Google on `https://p402.io/login` lands at `/onboarding`, hits a hard error in the Step 0 "wallet activation" pre-step (`CDPEmailAuth`), and cannot complete login. The page is also using stale crypto-first copy ("gasless USDC payments", "USDC on Base") that contradicts the V5 product positioning shipped at commit `e1b20c2` (AI accountability / spend governance, not crypto-first).

The operator's direction: do not patch around the symptom. Redesign the onboarding/OAuth funnel for best-in-class UX and conversion, V5-aligned, well thought out.

### 1.2 Audit findings (compressed)

Concrete, file-anchored evidence from the audit in this same session.

| # | Finding | Evidence |
|---|---|---|
| F1 | Step 0 forces wallet activation via `CDPEmailAuth` on the critical path for every Google user with `authState === 'identity_only'`. No error boundary. CDP network failures dead-end the user. | `app/onboarding/page.tsx:139, 226-264`; `components/auth/CDPEmailAuth.tsx:71-159` |
| F2 | Onboarding copy is crypto-first: "gasless USDC payments", "USDC on Base", "self-custody wallet — secured by Coinbase". | `app/onboarding/page.tsx:237-238, 420`; `app/login/page.tsx:99` |
| F3 | No onboarding-complete flag. Returning users re-enter the same flow, generate fresh API keys on every visit, and can dead-end on Step 0 indefinitely. | `lib/actions/onboarding.ts:20-23` (only updates `tenants.updated_at`); `app/onboarding/page.tsx:126` (always starts at step 1 unless conditions force step 0) |
| F4 | `/dashboard` has no onboarding-complete gate. Users can deep-link past onboarding entirely. | `app/dashboard/layout.tsx:107-150` (session-only check) |
| F5 | Role taxonomy is misaligned with V5 vocabulary. "Build & Route / Publish Agents / Govern Trust" maps to the old x402/Bazaar framing, not the V5 buyer (Sandbox builder / Growth product owner / Scale platform / Enterprise spend-governance lead). | `app/onboarding/page.tsx:30-55` |
| F6 | Zero funnel instrumentation. No PostHog, Segment, GrowthBook, or first-party events on `/login`, OAuth callback, or `/onboarding` stages. Drop-off is unmeasured. | Repo-wide grep yielded no funnel-event emit calls in these paths. |
| F7 | NextAuth `signIn` callback auto-provisions tenant + seeds default policy on first sign-in. This part is correct and worth keeping. | `lib/auth.ts:80-113` |
| F8 | API key issuance returns the raw key exactly once and stores SHA-256 only. Correct. Keep. | `lib/actions/settings.ts:9-38` |
| F9 | `useAuthState` derives state from `/api/v2/auth/state`, which checks `tenants.owner_wallet`. Step 0 sets `localStorage['wallet_activation_deferred']` on skip but does not mark anything server-side. | `lib/hooks/useAuthState.ts:1-35`; `app/api/v2/auth/state/route.ts:1-43`; `app/onboarding/page.tsx:142-150, 247-263` |
| F10 | Three sign-in methods on `/login` (CDP Email primary, Google secondary, Wallet tertiary). CDP-primary contradicts V5 positioning of "metadata-first AI accountability." | `app/login/page.tsx:96-130` |

### 1.3 Conversion blockers ranked by likely impact

1. **Step 0 CDP failure is a hard block** for Google users on a CDP outage, env misconfiguration, or rate limit. No graceful degradation.
2. **Crypto-first copy** loses non-crypto buyers (the V5 ICP) before they see product value.
3. **Wallet pre-step asks for activation before the user has felt anything**. Classic conversion antipattern.
4. **No analytics** means every later optimization is guessing.
5. **Role labels** speak the wrong language to the V5 buyer.
6. **Returning-user re-entry loop** quietly burns API key inventory and confuses repeat visitors.
7. **No deep-link guard** to `/dashboard` means some users skip onboarding silently and never see the orientation.

---

## 2. Design principles

These principles govern every decision below. They are not negotiable within this slice.

1. **Value first, payment last — but payment is real.** Nothing asks the user to do anything crypto-related (wallet, USDC, signature, permit) before they have reached the dashboard and seen real value. Wallet activation is *deferred* by default and *invited* in context (first request that triggers settlement, upgrade to a paid plan, Settings). See §4.5 for the explicit map of the four moments wallet activation re-enters the flow. P402 settles LLM-provider payments and its own commission on-chain in USDC on Base via x402 / EIP-3009; the wallet is not optional for users who route real requests — it is *deferred*, not removed.
2. **V5 vocabulary throughout.** "AI events", "spend accountability", "metadata-first", "Sandbox / Build / Growth / Scale / Enterprise". No "x402", "gasless", "Base", "USDC", "Coinbase", "self-custody", "permit", or "permit allowance" in the onboarding happy path. These words still belong in payments-specific surfaces, not in the onboarding orientation.
3. **One critical path, with optional branches.** Critical path: sign in → orient → dashboard. Wallet activation, advanced trust, and bazaar are *optional branches*, not pre-requirements.
4. **Failure must degrade gracefully.** Any external dependency on the critical path (CDP, Google, Neon, NextAuth callback) must have a fallback that still lands the user in the dashboard.
5. **Measure or don't ship.** Every step of the redesigned funnel emits a typed event. The first impl phase ships event emission; the redesign phases ship behavior on top.
6. **Idempotent re-entry.** A returning user never sees onboarding again unless they explicitly clear state. No re-issued API keys on a refresh. No re-prompts on a deferred wallet.
7. **No claims the product can't back.** Copy must not promise verified savings, runtime enforcement, auto-apply, or compliance postures we haven't earned. Source-shape tests will enforce this on the new pages.
8. **The dashboard is the win condition.** Conversion is measured at *first meaningful dashboard interaction*, not at "Enter Dashboard" click.

---

## 3. Target conversion metrics

Conversion is a stack of step-conversion rates. We instrument every step (§8) so we can baseline before/after and run A/B tests (§9).

### 3.1 The funnel we will measure

| Stage | Event | Definition |
|---|---|---|
| S0 | `funnel.login_view` | `/login` rendered |
| S1 | `funnel.signin_started` | `signIn()` call dispatched (Google, CDP, or wallet) |
| S2 | `funnel.signin_success` | NextAuth session established |
| S3 | `funnel.onboarding_view` | `/onboarding` rendered for a session |
| S4 | `funnel.role_selected` | Role chosen and submitted |
| S5 | `funnel.api_key_issued` | First API key generated |
| S6 | `funnel.onboarding_completed` | `completeOnboardingAction` succeeded |
| S7 | `funnel.dashboard_view` | First `/dashboard` view post-onboarding |
| S8 | `funnel.dashboard_meaningful` | First non-bounce dashboard interaction (route, view, settings open, doc click, scoping CTA) within 30s of S7 |

### 3.2 Step-conversion targets

These targets are operator-approved before 3AZ-2-Impl ships. Numbers below are *initial proposals* — they exist to make the conversation concrete, not to lock in a goal without operator sign-off.

| Step | Current baseline | Initial target |
|---|---|---|
| S0 → S1 (login view → signin started) | unknown — needs S0/S1 emit | 65% |
| S1 → S2 (signin started → success) | unknown — best-in-class is 95%+ | 95% |
| S2 → S3 (signin success → onboarding view) | should be ~100%; if not, something is broken on the redirect | 99% |
| S3 → S4 (onboarding view → role selected) | unknown — known blocker on Step 0 today | 80% |
| S4 → S5 (role → API key issued) | server-action error rate; should be ~99% | 99% |
| S5 → S6 (key → onboarding completed) | unknown | 85% |
| S6 → S7 (completed → dashboard view) | should be ~100% | 99% |
| S7 → S8 (view → meaningful interaction) | the real conversion number | 60% |

### 3.3 What this gives us

A single dashboard query produces a 7-row table that says exactly where users are leaving. Every fix is testable against the next week's numbers. No more guessing.

---

## 4. Redesigned funnel architecture

### 4.1 Entry: `/login`

**Current:** three sign-in methods, CDP Email primary, with the "self-custody wallet" disclaimer at the top.

**Redesigned:**

- **Google primary** (top, large button). One-click for the V5 buyer.
- **Email magic-link secondary** (medium). Uses the existing CDP email flow under the hood, but the user-facing label is "Continue with email." No "self-custody", no "Coinbase".
- **Wallet connect tertiary** (small, below a "More options" disclosure). Available for crypto-native users who want it, but not the front door.
- **Copy above the buttons** speaks to V5: "Make your AI spend accountable. Free Sandbox. No credit card."
- **Microcopy under buttons:** "By continuing you agree to our Terms and Privacy Policy."
- **Below the fold:** the social-proof / value-prop strip from `/pricing` (the V5 trust line: "Metadata-first. Tenant-scoped. Usage-based. Procurement-ready path.").
- **No mention of payments, crypto, USDC, Base, or wallet at this stage.**

### 4.2 OAuth callback handling

**Current:** `signIn('google', { callbackUrl: '/onboarding' })` — unconditional redirect.

**Redesigned:**

- Server-side decision after NextAuth `signIn` callback completes:
  - If `tenants.onboarded_at IS NULL` → `/onboarding/welcome` (new flow, §4.3).
  - If `tenants.onboarded_at IS NOT NULL` → `/dashboard`.
- Decision lives in a small route helper (`lib/auth/postSigninDestination.ts`) reused by Google, CDP email, and wallet paths.
- `signIn` callback in `lib/auth.ts` retains its current tenant-provisioning behavior (F7) unchanged.

### 4.3 `/onboarding` stages

The redesigned onboarding is **three stages, no wallet pre-step on the critical path**, value-first ordering.

#### Stage A — Orient (1 minute)

- **Single screen.** "You're in. Here's what P402 does for you."
- Three short value tiles tied to V5 outcomes (not roles):
  - "See where your AI spend goes" (Sandbox immediately useful)
  - "Catch margin leaks before customers feel them" (Growth)
  - "Procurement-ready evidence for AI governance" (Enterprise)
- One CTA: **"Take me to my dashboard."**
- One tertiary link: "I'd rather book a scoping call" → existing `/get-access?intent=scoping-call`.
- **No role selection on this screen.** Role is *inferred* from later behavior; the user is never asked to self-identify before they have a reason to.

#### Stage B — Get your first key (1 minute)

- Shown only when the user clicks "Take me to my dashboard" on Stage A.
- Single screen, two outcomes:
  - **Default path:** API key auto-generated by Server Action, displayed once with copy-button. Same generation contract as today (`lib/actions/settings.ts`, F8). No re-issuance on refresh — Stage B is keyed to a single one-shot transition via `tenants.onboarded_at`.
  - **Skip path:** "I don't need a key yet — just show me the dashboard." Sets the flag, lands on dashboard, key can be generated later from Settings.
- Below the key card: one drop-in code snippet, language-toggleable (TS, Python, curl). Defaults to TS.
- One CTA: **"Got it — enter dashboard."**

#### Stage C — First meaningful interaction (post-arrival)

- Stage C is not a page. It is the dashboard's *first-visit* enhancement (see `app/dashboard/_components/`):
  - A dismissible "Try the Playground" tile pinned to the top of the dashboard until the user dismisses or hits a meaningful interaction.
  - The existing usage card stays visible from minute zero.
  - The `AuthState` amber banner is **gone** from the dashboard happy path for `identity_only`. Replaced by a quieter "Enable payments when you're ready → Settings" link in the settings nav, not in-page.

#### Wallet activation is NOT on this flow

Wallet activation moves to:
- **Settings → Payments** (existing page).
- **In-context at first paid action** (e.g., user tries to make a request that would settle on-chain, gets prompted then).
- Step 0's "One more step" gate is *deleted*. The `CDPEmailAuth` component remains the auth method for the email-magic-link sign-in on `/login`, but it does not appear on `/onboarding`.

### 4.4 Wallet activation strategy (one-line summary)

`tenants.onboarded_at` does NOT depend on wallet linkage. A user can be fully onboarded without a wallet. The wallet is re-introduced contextually at four explicit moments — fully mapped in §4.5.

### 4.5 Wallet reintroduction map

P402's product is on-chain payment routing. LLM-provider calls (OpenRouter, direct providers) settle in USDC on Base via x402 / EIP-3009, and P402's per-request commission is taken on-chain at the same time. Users who route real requests *will* need a funded wallet. The redesign defers that requirement; it does not remove it.

The wallet re-enters the flow at exactly four moments. No other surface introduces wallet activation.

#### M1 — Optional on `/login` (front door)

- **Who it serves:** crypto-native users who want wallet-first sign-in. They click "More options" and connect directly. Common for solo builders and crypto-AI tinkerers.
- **What happens:** the existing wallet-connect provider (RainbowKit, `lib/auth.ts` `cdp-wallet` credentials) runs. Tenant auto-provisioned with `@wallet.p402.io` email per `lib/auth.ts:60`. User skips Stages A and B's wallet-less framing and lands on the dashboard already wallet-linked.
- **Copy:** "Continue with wallet" — no "self-custody", no "Coinbase". Just the label.
- **Critical-path impact:** zero. This is the tertiary disclosure on `/login`.

#### M2 — Just-in-time at first request that triggers settlement (the main moment)

This is where most users will actually activate. It is the conversion moment that matters.

- **Trigger:** the user makes the first request that would require on-chain settlement — either from the Playground inside the dashboard, or via the SDK / API key. Detected server-side at the router boundary (the existing `assertWithinCap` path in `lib/billing/plan-guard.ts` and the settlement path in `lib/services/router-service.ts`).
- **Sandbox safety net:** Sandbox-tier requests within the 25,000-event monthly allowance do **not** trigger M2. Sandbox routes use mock/simulated provider responses or P402-absorbed real-provider cost (operator decision, see Q9 in §13). Sandbox lets a user feel the product without any wallet, ever.
- **What the user sees:** if they hit M2 from the **Playground**, an inline activation card replaces the "Run" result with: "To route this for real, add USDC on Base. Setup takes 30 seconds and stays funded across requests." A single CTA: "Activate payments." Cancel returns them to the Playground with no penalty.
- **What the user sees from the SDK / API:** the route returns the existing P402 protocol response (`402 Payment Required`) with a structured `X-PAYMENT-REQUIRED` header pointing at the wallet activation page. The dashboard banner *appears now* (and only now) for the same tenant: "You have requests waiting on payment. Activate to release." This is the one acceptable use of the amber banner; it is *contextual to an action the user took*, not a generic state warning.
- **Activation flow:** existing `CDPEmailAuth` + `setupAndCharge()` path from `lib/actions/billing-finalize.ts`. The wrapping copy is V5-clean per §6.
- **Resilience:** activation failure here is contained to this surface. The user can dismiss and return to the dashboard. We do not regress them out of onboarding.

#### M3 — At paid-plan upgrade (Build, Growth, Scale)

Two settlement options are surfaced at upgrade, the user picks:

- **Option A — Stripe (card).** Build $49/mo billed via Stripe per the 3AY-8R foundation. No wallet required for the subscription itself. *But* if the user wants their **routed requests** to settle in USDC (which most paid customers will, because P402's commission and provider payments flow on-chain), they still hit M2 on their first real request. The Build subscription unlocks the SaaS features (event allowance, retention, support); USDC settlement is a parallel concern.
- **Option B — USDC subscription via wallet.** The user pays the $49/mo subscription on-chain via EIP-2612 permit (`lib/billing/providers/onchain.ts` `executeFirstSubscriptionCharge`). M3 then *is* M2 — both subscription and routing settle from the same wallet. This is the natural choice for users who already activated at M2.
- **Copy at upgrade:** "Pay monthly with card, or use USDC on Base." Equal weight. No hierarchy.
- **Where M3 lives in the UI:** the `/pricing` page Build CTA → checkout chooser (post-3AY-8R-Impl when Build checkout is live) → the chooser screen is the only surface where USDC-as-subscription-payment is offered alongside Stripe.

#### M4 — Voluntary from Settings → Payments (anytime, opt-in)

- **Who it serves:** users who never hit M2 (long-time Sandbox users, lurkers) but want to be ready before they need it.
- **What it is:** the existing `/dashboard/settings?activate=payments` page, with V5-cleaned copy. Same `CDPEmailAuth` + `setupAndCharge()` underneath.
- **Critical-path impact:** zero. Settings is opt-in.

### 4.5.1 Wallet activation cannot be entered from anywhere else

The redesign forbids wallet activation prompts on the following surfaces:

- `/login` (except as M1 tertiary disclosure)
- `/onboarding/welcome` (Stage A)
- `/onboarding/key` (Stage B)
- The Stage C first-visit dashboard tile
- The standard dashboard usage card
- Generic dashboard layout banners

This is enforced by source-shape tests asserting the §6.1 forbidden tokens are absent from these files.

### 4.6 Returning-user behavior

- `tenants.onboarded_at` (new column, §7.1) is the single source of truth.
- Set once by `completeOnboardingAction` on first success.
- Never re-set on subsequent visits.
- `/onboarding/*` routes that are visited by an onboarded user redirect to `/dashboard`.
- Manual re-entry path: `/onboarding?force=1` query param re-enters the flow but does not re-issue API keys (keys are generated only when no active key exists for the tenant; otherwise the flow shows "You already have keys — go to Settings to manage them").

### 4.7 Dashboard handoff

- `/dashboard/layout.tsx` adds an onboarding gate alongside the existing session gate:
  - If `tenants.onboarded_at IS NULL`, redirect to `/onboarding/welcome`.
  - If `tenants.onboarded_at IS NOT NULL`, proceed.
- No additional changes to existing dashboard content in this slice.
- The amber "Activate Payments" banner that today fires for every `identity_only` user (`app/dashboard/layout.tsx:29-58`) is **removed from the standard dashboard render**. The banner is replaced with a contextual M2 banner that only fires when the tenant has at least one settlement-pending request (see §4.5 M2). Quiet-state Sandbox users see no banner.

---

## 5. V5-aligned role taxonomy

### 5.1 Decision: defer roles, infer from behavior

The audit shows the role-selection screen is on the critical path and uses old vocabulary. The redesigned flow **removes explicit role selection from the critical path**. Reasoning:

- Asking the user to label themselves before they have a reason to is friction.
- The current taxonomy ("Build & Route / Publish Agents / Govern Trust") is wrong for V5.
- A V5-aligned taxonomy ("Sandbox builder / Growth product owner / Enterprise spend-governance lead") is still asking the user to opt into a sales tier before they have evaluated the product, which is the same antipattern in newer clothes.

**Instead:** the dashboard surfaces three optional "tracks" as dismissible tiles (Stage C). The user picks whichever one is relevant. If they pick none and just use the API, that itself is the strongest possible signal: they are a Sandbox builder.

### 5.2 What we keep from the old taxonomy

The three role-specific code snippets in the old Step 2 (`CODE_SNIPPETS` in `app/onboarding/page.tsx:57-95`) were genuinely useful. They become a *language-toggleable* code snippet in Stage B (defaults to the OpenAI-compatible TS snippet, since that is the V5 ICP's natural starting point). The Bazaar publisher snippet and governance policy snippet move to dedicated pages reachable from the dashboard nav.

### 5.3 Database

- `tenants.role` and `tenants.goal` columns are **not added.** Role/goal are not stored.
- Behavioral signal is captured through funnel events (§8), not through a self-declared label.

---

## 6. Copy and language refresh

### 6.1 Forbidden tokens in the onboarding happy path

The following tokens must not appear in `/login` (except the M1 wallet disclosure line), `/onboarding/welcome`, `/onboarding/key`, the post-OAuth redirect helper, the dashboard layout's standard render, or the dashboard first-visit Stage C tiles. They are explicitly *allowed* on the M2 just-in-time activation card (`app/dashboard/playground/*`, M2 banner component), the M3 upgrade chooser (post-3AY-8R), the M4 Settings → Payments page, and any internal docs page. Source-shape tests scope the assertion to the happy-path files only.

- `USDC`
- `gasless`
- `Coinbase`
- `Base` (in the L2 sense — "on Base", "Base mainnet")
- `permit`, `permit allowance`
- `self-custody`
- `x402`
- `EIP-3009`, `EIP-2612`
- `wallet` and `Wallet` (except inside the Settings → Payments page and just-in-time prompts)
- "One more step" (only one step — the dashboard)
- "Activate Payments" as a pre-condition phrasing
- Any "verified savings", "guaranteed savings", "save N%", "auto-apply", "runtime enforcement live", "SOC 2 compliant", "HIPAA compliant", "ISO certified", "Stripe Checkout" claim (existing source-shape coverage extends here).

### 6.2 Replacements

| Old | New |
|---|---|
| "One more step. Activate Payments to use the AI Router." | (deleted; not on critical path) |
| "To make gasless USDC payments…" | (deleted) |
| "You'll be prompted to fund your wallet (USDC on Base)…" | (deleted from onboarding; moved to Settings → Payments with neutral phrasing: "Add funds to enable on-chain settlement.") |
| "A self-custody wallet is created for you automatically — secured by Coinbase." | "Continue with email — we'll handle the account setup." |
| "Welcome to the network." | "You're in. Let's get you to your dashboard." |
| "What brings you here?" + role grid | "Here's what P402 does for your AI spend." (value tiles, no role question) |
| "Your API key. Save this now — it won't be shown again." | Keep — it's clear, accurate, and short. |
| "Your wallet has no USDC yet…" (dashboard banner) | (banner removed from happy path; replaced with a quiet link in Settings nav) |

### 6.3 Microcopy contract

- Headlines: ≤ 7 words.
- Subheads: ≤ 14 words.
- CTAs: verb-first, ≤ 4 words.
- No em dashes (per CLAUDE.md house style).

---

## 7. Schema and state changes

All schema changes are **additive, nullable, idempotent**, follow the v2_NNN naming convention, and are authored as a single new migration plus its `_down` companion. Migrations are authored in §11.1 but not applied in this plan.

### 7.1 `tenants.onboarded_at`

```sql
-- v2_NNN_tenants_onboarded_at.sql
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
```

- Nullable. NULL = never onboarded.
- Set exactly once by `completeOnboardingAction`.
- No backfill in this slice. Existing tenants stay NULL; `/dashboard` gate (§4.6) treats NULL as "send to onboarding once." A separate slice may backfill existing tenants based on activity heuristics (out of scope here).

### 7.2 `funnel_events` (analytics, §8)

```sql
-- v2_NNN_funnel_events.sql
CREATE TABLE IF NOT EXISTS funnel_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id       UUID NULL REFERENCES tenants(id),
    anonymous_id    TEXT NULL,
    session_id      TEXT NULL,
    event_name      TEXT NOT NULL,
    properties      JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_agent_hash TEXT NULL,
    ip_class        TEXT NULL  -- 'ipv4' | 'ipv6' | NULL; never raw IP
);
CREATE INDEX IF NOT EXISTS idx_funnel_events_tenant_event
    ON funnel_events (tenant_id, event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_time
    ON funnel_events (event_name, occurred_at DESC);
```

- **No raw IP, no raw user-agent**, no PII beyond the optional anonymous browser id. `user_agent_hash` is a salted SHA-256 of the UA for fingerprint-resistance.
- `properties` is JSONB but forbidden-key scan (in app code) blocks any payload key that matches: `prompt`, `response`, `messages`, `raw_trace`, `stored_content`, `request_body`, `response_body`, `email`, `password`, `token`, `api_key`.
- `tenant_id` is nullable so we can record events before a session exists (e.g., login view).

### 7.3 What is NOT changed

- No new column on `api_keys`.
- No new column on `policies`.
- No change to `billing_subscriptions`, `processed_webhook_events`, or any Stripe-touching table.
- No change to `access_requests` (already extended in 3AY-8R-3).
- No change to `tenants.plan`. Plan stays whatever it is — the V5 billing vocabulary work in 3AY-8R-2 already covers the read-side compatibility.

---

## 8. Analytics instrumentation

### 8.1 Server-side event emit

- Small server helper `lib/analytics/funnel.ts` exposes `recordFunnelEvent({ tenantId, anonymousId, sessionId, eventName, properties })`.
- Writes to `funnel_events` (§7.2) via `INSERT ... ON CONFLICT DO NOTHING` keyed on `(session_id, event_name, …)` for idempotency where appropriate.
- Forbidden-key scan: any property key in the deny-list is dropped before write, with a warn-level log. Property values are not inspected (no content scanning) — only key names. This is metadata-only by contract.
- Never throws to the caller. Fire-and-forget pattern; analytics must never block a route.

### 8.2 Client-side helper

- Small client hook `useFunnelEvent(eventName, properties)` posts to `POST /api/v1/funnel/event` (new route).
- Route validates origin, attaches `anonymous_id` cookie (1-year, HttpOnly false so the client can read it for de-dup, SameSite=Lax), and forwards to the server helper.
- The cookie is the only PII-adjacent thing introduced. No third-party scripts.

### 8.3 What we emit, by stage

| Event | Where | Who emits | Properties (only metadata) |
|---|---|---|---|
| `funnel.login_view` | `/login` mount | client | `{ provider_options: ['google','email','wallet'] }` |
| `funnel.signin_started` | `/login` button click | client | `{ provider: 'google'\|'email'\|'wallet' }` |
| `funnel.signin_success` | NextAuth `signIn` callback | server | `{ provider, is_new_tenant: boolean }` |
| `funnel.onboarding_view` | `/onboarding/welcome` mount | server (in layout) | `{ stage: 'A' }` |
| `funnel.dashboard_view` | `/dashboard` layout | server | `{ first_visit: boolean }` |
| `funnel.api_key_issued` | `generateApiKeyAction` success | server | `{}` (no key, no fragment, no length) |
| `funnel.onboarding_completed` | `completeOnboardingAction` success | server | `{}` |
| `funnel.dashboard_meaningful` | dashboard interaction listener | client | `{ kind: 'playground' \| 'route' \| 'settings' \| 'docs' \| 'scoping' }` |
| `funnel.error` | any route boundary | server | `{ stage, reason_code }` (reason_code is a stable string, never a stack trace) |

### 8.4 Privacy posture

- No prompts, responses, request bodies, response bodies, file contents, transcripts.
- No raw IP. `ip_class` records only `'ipv4' | 'ipv6' | NULL`.
- `user_agent_hash` is salted SHA-256, not raw UA.
- No email, name, role, or company stored on `funnel_events`. Identity is via `tenant_id` reference only.
- Forbidden-key scan documented in §8.1 is enforced by a vitest source-shape test.

### 8.5 Why first-party instead of PostHog/Segment

- The product is positioned as metadata-first AI accountability. Shipping a third-party analytics blob on the login page would be a brand contradiction.
- First-party events live in Neon next to the operational data; the same operator query path that today queries `access_requests.resolved_intent` extends to `funnel_events.event_name`.
- An export path to PostHog / data warehouse can be added later if we want, without changing the emit surface.

---

## 9. A/B testing framework

### 9.1 Decision: ship instrumentation now, framework later

3AZ-2 ships the redesigned funnel and the event emit. A/B testing infrastructure is a separate slice (call it 3AZ-3). Reasoning:

- We cannot A/B test something we haven't measured.
- The redesigned funnel is a substantial enough win that shipping it as a single "B" against the current "A" via the dated baseline (the week before launch) gives us a defensible read.
- A proper variant-assignment + sticky-bucketing + statistical-significance pipeline (likely GrowthBook self-hosted) is its own design.

### 9.2 What the schema supports today

`funnel_events.properties` JSONB has space for a future `variant_id` key. The forbidden-key scan deliberately does *not* block `variant_id`. When 3AZ-3 ships, no schema change is needed.

### 9.3 What we will A/B test in 3AZ-3 (preview only)

- Google primary vs Google + email tied (which converts S1 → S2 better).
- Stage A value tiles ordering (Spend / Margin / Procurement vs Procurement / Spend / Margin).
- Stage B default code language (TS vs curl).
- "Take me to my dashboard" vs "Get my API key" CTA framing.

These are listed for direction, not committed to in this slice.

---

## 10. Error handling and resilience

The Step 0 failure that prompted this plan is the canonical example of what we must never repeat.

### 10.1 Rules

1. **No single external dependency on the critical path can block login.** If NextAuth's Google provider fails, the user sees an error with a "retry / try email instead" affordance, not a dead end. If CDP fails on the email path, same. If Neon is degraded, the route degrades to "saved your sign-in; try the dashboard in a minute" rather than crashing.
2. **Every critical-path component is wrapped in a route-level Error Boundary** that emits `funnel.error` with a stable `reason_code` and a user-facing recovery action.
3. **Stage A and Stage B render without any third-party network call.** The only network calls are to our own Server Actions. CDP is not on the critical path.
4. **Forbidden:** auto-redirecting a user back to `/login` on any soft error. The error UI always offers either "try again" or "skip to dashboard". Sending a user back to `/login` after a partial success is the worst conversion failure mode.

### 10.2 CDP-specific resilience

Even though CDP is moved off the critical path, the existing `CDPEmailAuth` component remains in use on `/login` for the email magic-link path. Its existing error UI (red error box, retry button) is good but unbounded. The redesign adds:

- A `<CdpAuthBoundary>` wrapper that catches uncaught throws (currently none, but in case React-level errors arise) and falls back to a "Sign in with Google instead" link.
- A `funnel.error` emit with `reason_code = 'cdp_otp_failed' | 'cdp_signature_failed' | 'cdp_network'`.

### 10.3 Returning-user resilience

- If `tenants.onboarded_at` query fails, the gate **fails open to `/dashboard`**. We would rather have a user briefly see the dashboard before the onboarding gate is enforced than re-loop them through onboarding.

---

## 11. Implementation sequencing

3AZ-2 implementation is **five sub-slices**, each independently approvable, ordered for minimum blast radius.

### 11.1 3AZ-2-A: Schema + telemetry foundation

- Authors migrations:
  - `scripts/migrations/v2_NNN_tenants_onboarded_at.sql` + `_down.sql`
  - `scripts/migrations/v2_NNN_funnel_events.sql` + `_down.sql`
- Authors `lib/analytics/funnel.ts` (server emit helper, forbidden-key scan).
- Authors `app/api/v1/funnel/event/route.ts` (client emit endpoint).
- Authors `lib/analytics/__tests__/funnel.test.ts` (forbidden-key scan, idempotency, fire-and-forget).
- Authors `__tests__/migrations/v2_NNN-shape.test.ts` (Layer 1 shape tests).
- No frontend changes. No copy changes. No NextAuth changes.
- **Gate:** operator approval of migration SQL + apply to dev → verify → apply to production → only then merge code.

### 11.2 3AZ-2-B: Post-signin destination + onboarding gate

- Authors `lib/auth/postSigninDestination.ts` (server helper).
- Modifies `lib/auth.ts` `signIn` callback to emit `funnel.signin_success`.
- Modifies `app/dashboard/layout.tsx` to add the `tenants.onboarded_at` check with fail-open semantics (§10.3).
- Modifies `lib/actions/onboarding.ts` to set `tenants.onboarded_at = NOW()` on success (idempotent: only if NULL).
- No copy rewrite yet. The existing onboarding page still renders; it just no longer dead-ends returning users.
- Tests: unit tests for `postSigninDestination`; route tests for the dashboard gate; idempotency test for `onboarded_at`.
- **Gate:** all tests green; manual smoke on a staging or preview deploy; operator approval before deploy.

### 11.3 3AZ-2-C: New `/onboarding/welcome` (Stage A + Stage B)

- Authors `app/onboarding/welcome/page.tsx` (Stage A: value tiles + single CTA).
- Authors `app/onboarding/key/page.tsx` (Stage B: API key + code snippet).
- Both use the V5 copy from §6.
- Emits `funnel.onboarding_view`, `funnel.api_key_issued`, `funnel.onboarding_completed`.
- Source-shape tests assert the forbidden-token list in §6.1.
- Old `app/onboarding/page.tsx` is kept for now (redirect target removed).
- **Gate:** preview deploy + operator visual review + tests green.

### 11.4 3AZ-2-D: Cutover

- Redirects `/onboarding` → `/onboarding/welcome` at the route level (or replaces the page implementation; either way old behavior is gone).
- Removes the dashboard amber "Activate Payments" banner from the happy path; replaces with a quieter Settings-nav link.
- Updates `/login` copy per §6, removes the "self-custody" disclaimer, makes Google primary.
- Deletes the unused `Role` / `Goal` types and `ROLES`/`CODE_SNIPPETS`/`NEXT_STEPS` constants from the onboarding tree, with a careful grep first to confirm no other consumers (audit found none, but verify).
- Old `app/onboarding/page.tsx` deleted.
- **Gate:** preview deploy + full smoke (Google new user, Google returning user, email new user, email returning user, deep-link to dashboard pre-onboarding); operator approval.

### 11.5 3AZ-2-E: Stage C dashboard first-visit tile

- Adds the dismissible "Try the Playground" tile to the dashboard, gated on `funnel.dashboard_meaningful` not yet emitted for this tenant.
- Adds the dashboard meaningful-interaction listener.
- **Gate:** preview deploy + operator approval.

### 11.6 Why this ordering

- **A first** so we can measure before/after for the same flow. Without A, we have no baseline.
- **B second** so returning users stop being looped through onboarding even while the old onboarding page is still live.
- **C third** so the new copy ships behind a route the old flow doesn't reach, allowing operator review without breaking production.
- **D fourth** is the actual cutover.
- **E last** because the dashboard tile depends on `funnel.dashboard_meaningful`, which is emitted from a listener that itself is a new component.

---

## 12. Acceptance criteria

The plan is complete only because it answers every question below.

| Question | Answer |
|---|---|
| Why is login broken today? | F1 in §1.2 — Step 0 CDP call on critical path, no error boundary, no fallback. |
| What is the smallest critical-path change that fixes login? | Move CDP off the critical path (§4.3). |
| Why isn't this just a CDP retry/fallback patch? | Operator direction: redesign for best-in-class, not patch. |
| How does the user reach the dashboard for the first time? | Sign in → Stage A (value) → Stage B (key) → Dashboard. |
| Where does wallet activation happen now? | Settings → Payments, or just-in-time on first paid request. Not on the critical path. |
| How does a returning user behave? | `tenants.onboarded_at` gates `/onboarding/*` → `/dashboard` redirect. Never re-prompted. |
| What if Stripe / CDP / Neon is down? | Stage A and Stage B do not call any of these. Fail-open dashboard gate. CDP wrapped in error boundary on `/login`. |
| What roles does the redesign use? | None on the critical path. Inferred from behavior; surfaced as dismissible dashboard tiles. |
| What stale copy gets removed? | All tokens in §6.1, in `/login`, `/onboarding/*`, dashboard happy path. Source-shape tests enforce. |
| How do we measure conversion? | 8 typed funnel events (§8), single Neon query produces the funnel table. |
| Where does the data live? | First-party `funnel_events` table in Neon. No third-party analytics on the login page. |
| What about A/B testing? | Schema reserves space for `variant_id`. Framework lands in a later slice (3AZ-3). |
| What is forbidden? | All §0 hard boundaries, all §6.1 copy tokens, raw IP / UA / PII in `funnel_events`. |
| What is deferred? | A/B framework, Department Dashboard SKU, behavioral role inference (we collect events; ML on those events is a separate slice). |
| How is rollback handled? | Each sub-slice (§11) is independently revertable. Schema migrations have idempotent `_down` files. The old `app/onboarding/page.tsx` remains in git history until 3AZ-2-D; rollback to it is one revert. |

---

## 13. Open questions for operator

1. **Confirm the §3.2 step-conversion targets.** Are 80% S3→S4 and 60% S7→S8 the right north stars?
2. **Confirm the §5 decision to remove explicit role selection.** Alternative: keep V5-renamed roles (Builder / Product owner / Spend governance lead) but make them optional on Stage B. Default plan removes the screen.
3. **Confirm §8.5 first-party-only analytics.** Alternative: ship PostHog with strict consent. Default plan stays first-party.
4. **Confirm Stage C placement.** Should the "Try the Playground" tile pin to the top of the dashboard for the first visit, or live as a banner at the bottom? Default: top of dashboard, dismissible.
5. **Email magic-link branding.** Current `/login` calls the email path "CDP Email Auth" in the source. User-facing, what label do we use? Default: "Continue with email." Alternative: "Email me a sign-in link."
6. **Wallet on `/login`.** Keep as tertiary "More options" disclosure, or remove from `/login` entirely and surface only from Settings → Payments? Default: tertiary disclosure.
7. **What happens to `app/login/page.tsx:118` copy** "Add a wallet in onboarding to enable payments"? Default: replace with "Free Sandbox. No credit card. Upgrade later."
8. **Existing tenants `onboarded_at` backfill.** Backfill `onboarded_at = created_at` for all existing tenants (treat them as already onboarded), or leave NULL and let them flow through the new onboarding once? Default: backfill on apply, so existing users don't get bounced to the new flow on their next visit.
9. **Sandbox-tier provider cost model.** Inside the 25,000-event Sandbox allowance, do Playground requests hit real providers (P402 absorbs the OpenRouter cost as customer-acquisition spend), or do they return simulated responses (the metering is real, the responses are mock)? This determines whether M2 (just-in-time wallet activation) fires for *any* Playground request, or only for paid-tier / over-allowance requests. Default: simulated responses inside Sandbox allowance, real provider + M2 trigger on first request that exits Sandbox limits or selects a non-Sandbox-eligible model. This protects margin while still letting users feel the routing UI.
10. **M2 trigger granularity.** Should M2 fire on the *very first* settlement-eligible request the tenant ever makes, or only on the *first request after they have exhausted Sandbox*? Default: fire on the first settlement-eligible request, but Sandbox simulated responses (Q9) mean this rarely hits a brand-new user until they've genuinely explored the product.
11. **M3 chooser default.** On the Build $49/mo upgrade screen, is the default-selected option Stripe (card) or USDC (wallet)? Default: Stripe selected by default for the V5 buyer ICP; USDC is a labeled alternative with equal visual weight, no hierarchy.
12. **M2 banner copy when banner *is* allowed.** The contextual M2 banner ("You have requests waiting on payment") is the one place an amber dashboard banner is acceptable. Confirm the exact copy and that it links to the M2 activation card, not to Settings.

---

## 14. Out of scope / deferred

- A/B testing framework (3AZ-3).
- Behavioral role inference / ML on `funnel_events` (3AZ-4 or later).
- Dashboard nav rework beyond removing the amber banner.
- Settings → Payments rewrite (V5 copy is a separate slice).
- Anything Stripe-touching (3AY-8R-Impl owns billing).
- Mobile-specific onboarding (the redesign is responsive but the V5 ICP is desktop-first).
- Localization (en-US only in v1).
- Accessibility audit beyond meeting WCAG AA on the new pages (assumed baseline, not a feature).
- Cookie banner / consent (no third-party tracking, but a quiet "we use a cookie to remember you" disclosure is sensible — deferred to a privacy-copy slice).
- Removing the existing `/dashboard/billing` amber banner permanently (3AY-8R-Impl will revisit billing UI; cleanup happens there).
