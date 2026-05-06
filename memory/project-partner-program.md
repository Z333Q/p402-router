---
name: Partner Program — Phase 1 Foundation
description: What was built in Phase 1 of the partner affiliate program and what comes next
type: project
---

Partner program Phase 1 foundation is complete. Built as a dedicated partner subsystem inside P402.

**Why:** User wants a segmented partner program (affiliates, agencies, enterprise referrers) with a first-class dashboard, gated docs, and commission attribution. PRD is detailed and build-ready.

**What was built:**

### DB Migrations
- `scripts/migrations/v2_016_partner_core.sql` — partners, partner_memberships, partner_groups, partner_group_assignments, partner_applications, partner_terms_acceptance, partner_tax_profiles, partner_payout_methods
- `scripts/migrations/v2_017_partner_attribution.sql` — partner_campaigns, partner_links, partner_link_clicks, partner_attributions

### Auth layer
- `lib/types/next-auth.d.ts` — JWT + Session types extended with `partnerId`, `partnerRole`, `partnerGroupIds`
- `lib/auth.ts` — JWT callback extended to resolve partner membership at login (DB query, cached in signed JWT)
- `lib/partner/permissions.ts` — permission bundles (role → PartnerPermission[]), type-safe, single source of truth
- `lib/partner/auth.ts` — `requirePartnerAccess`, `requirePartnerPermission`, `requirePartnerAdminAccess` API guards
- `lib/partner/queries.ts` — typed DB helpers for partner data

### UI
- `components/layout/PartnerSidebar.tsx` — permission-aware nav (hides items user lacks permission for)
- `app/partner/layout.tsx` — partner shell: auth gate, "no membership" prompt with apply CTA, context switcher to /dashboard
- `app/partner/page.tsx` — overview page: KPI cards, referral link copy, quick actions, getting-started checklist
- `app/partners/page.tsx` — **public** landing page explaining 3 tracks, commission rates, how it works
- `app/partners/apply/page.tsx` — application form with 409 idempotency, success state

### API
- `app/api/partner/apply/route.ts` — POST, public, idempotent (409 on duplicate email)
- `app/api/partner/me/route.ts` — GET/PATCH, auth-gated, returns profile + stats

**Key decisions:**
- `partners.primary_tenant_id` references existing `tenants(id)` — no duplicate users
- Context switch: Customer (/dashboard) ↔ Partner (/partner) via header link
- JWT carries partner context — no extra DB call per API request
- Permission bundles in `lib/partner/permissions.ts` — never check role strings in pages

**Phase 2 complete:**
- `lib/partner/attribution.ts` — cookie design (p402_ref HttpOnly 90d, p402_sid non-HttpOnly), bot detection, dedup, recordClick, attachAttribution, self-referral block
- `app/r/[code]/route.ts` — click handler: resolves link, bot check, dedup, records click, sets cookies, injects UTMs on redirect
- `app/api/partner/attribution/attach/route.ts` — POST, called client-side after login, reads HttpOnly cookie, idempotent
- `app/api/partner/links/route.ts` + `[id]/route.ts` — CRUD with ownership checks
- `app/api/partner/analytics/conversions/route.ts` — attribution log (privacy-safe, no tenant IDs exposed to partner)
- `app/partner/links/page.tsx` — full: create modal with UTM builder + live URL preview, table with click counts, copy/pause/activate
- `app/partner/conversions/page.tsx` — attribution log with filter
- `app/partner/commissions/page.tsx` — ledger shell + commission lifecycle explainer
- `app/partner/payouts/page.tsx` — balance cards, compliance checklist, payout method selector (USDC live, others Phase 3)
- `app/partner/docs/page.tsx` — gated docs hub with categories
- `app/partner/assets/page.tsx` — asset library with download/copy actions
- `app/partner/settings/page.tsx` — profile editor + compliance checklist
- `components/partner/AttributionAttach.tsx` — invisible component, fires attach on first authenticated session (sessionStorage dedup)
- Attribution attach wired into `app/dashboard/layout.tsx`

**Neon SQL (combined Phase 1):**
`scripts/migrations/neon-partner-phase1.sql` — paste into Neon SQL Editor, single BEGIN/COMMIT

**Phase 3 complete:**
- `scripts/migrations/v2_018_partner_commissions.sql` — 7 tables: partner_offers (seeded 4 offers), partner_commission_rules (seeded), partner_commission_entries (idempotent: UNIQUE source_event_id + commission_rule_id), partner_commission_reviews, partner_payout_batches, partner_payout_entries, partner_reversals
- `lib/partner/commissions.ts` — `generateCommission()`, `approveCommission()`, `declineCommission()`, `reverseCommission()`, `getPartnerCommissionSummary()`
- `lib/billing/subscription-service.ts` — wired `invoice.payment_succeeded` handler + commission generation (non-blocking) in `handleCheckoutSessionCompleted` and new `handleInvoicePaymentSucceeded`
- `app/api/partner/commissions/route.ts` — GET with summary + entries, partner-scoped
- `app/partner/commissions/page.tsx` — live data: summary cards + ledger table with status tabs
- `app/partner-admin/layout.tsx` + `page.tsx` — internal-role-gated admin shell with sidebar
- `app/partner-admin/applications/page.tsx` — full review queue: expand/collapse, approve (creates partner + membership + group + default link) / reject with notes
- `app/partner-admin/partners/page.tsx` — partners list with search/filter, suspend/reinstate actions
- `app/partner-admin/review/page.tsx` — commission review: approve/decline/reverse with hold-elapsed alerting
- `app/partner-admin/payouts/page.tsx` — payout batch assembly UI with one-click batch creation
- `app/api/partner-admin/applications/route.ts` + `[id]/route.ts` — list + approve/reject
- `app/api/partner-admin/partners/route.ts` + `[id]/route.ts` — list + status update
- `app/api/partner-admin/commissions/route.ts` + `[id]/route.ts` — list + approve/decline/reverse
- `app/api/partner-admin/payouts/route.ts` — list batches + assemble new batch
- `app/partner/leads/page.tsx` — lead registration form (Phase 4 DB), stage flow explainer
- `app/partner/deals/page.tsx` — enterprise deal registration (Phase 4 DB), 7% rate cards, rules

**Seeded offers:**
- Track A: 20% recurring 12 months (developer-affiliates, offer `00000000-0000-0001-0000-000000000001`)
- Track B recurring: 25% unlimited (integration-partners, offer `00000000-0000-0001-0000-000000000002`)
- Track B bounty: $500 fixed per enterprise launch (offer `00000000-0000-0001-0000-000000000003`)
- Track C: 7% year-one (enterprise-referrers, 45-day hold, offer `00000000-0000-0001-0000-000000000004`)

**How to apply migrations:**
```bash
psql $DATABASE_URL -f scripts/migrations/v2_016_partner_core.sql
psql $DATABASE_URL -f scripts/migrations/v2_017_partner_attribution.sql
psql $DATABASE_URL -f scripts/migrations/v2_018_partner_commissions.sql
```

Or paste `v2_018_partner_commissions.sql` into Neon SQL Editor directly (it is self-contained BEGIN/COMMIT).

**Phase 4 to build next:**
- Leads DB: `partner_leads` table + `app/api/partner/leads/route.ts`
- Deals DB: `partner_deals` table + `app/api/partner/deals/route.ts`
- P402 Sales CRM view at `/partner-admin/leads` and `/partner-admin/deals`
- Payout execution: Stripe Connect transfer + USDC on Base gasless payout
- Batch approval flow with finance sign-off (PATCH `/api/partner-admin/payouts/[id]`)
- Email notifications: application approved, commission earned, payout released
- CSV export for commissions ledger
