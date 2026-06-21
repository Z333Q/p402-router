# 3AY: Pricing Surface Implementation Plan

**Status:** plan only. No code. No public surface change. No billing implementation. No deploy.
**Predecessor:** 3AX (`789eb58`) — pricing strategy, rate card, and conversion funnel source of truth.
**Successor:** to be approved per phase. Implementation begins only after this plan is accepted in writing **and** the priority phase is separately approved.

## 0. Hard boundaries (true throughout 3AY)

- No code in this slice.
- No public surface (homepage, `/pricing`, `/trust`, `/developers`, `/docs`, dashboard, partner page) modified by this slice.
- No billing system change. No Stripe, Metronome, or webhook code.
- No SQL execution. No Neon migration. No Redis change.
- No runtime enforcement enabled.
- No tenant-visible Optimize recommendations introduced.
- No verified savings claim added anywhere.
- No customer logo, name, or testimonial used without written permission.
- No compliance certification claim above what P402 actually holds.

This document is a **plan**. Every section below describes work that would be done in a separate, individually approved slice.

## 1. Purpose

3AX is the canonical pricing source of truth. It locks the rate card, metric definition, pilot structure, funnel logic, copy rules, governance, and risk posture. It does **not** ship public surfaces. 3AY defines the smallest safe set of surface changes that turns 3AX into a live commercial machine, in priority order, with explicit gate conditions for each phase.

3AY is the bridge between "we have a pricing strategy" and "the website charges money."

## 2. Operating principles for surface work

Every surface change must respect these:

1. **3AX is authoritative.** If any surface change conflicts with 3AX, the surface is wrong, not 3AX. Resolve by editing 3AX first (with governance), then the surface.
2. **One slice = one surface.** Do not bundle homepage + pricing + dashboard into a single PR. The blast radius is too wide.
3. **Source-shape tests come with every surface.** Each pricing surface gets a vitest that asserts forbidden phrases ("verified savings," "auto-apply," "automatically optimize," unsupported certifications, customer name without permission) are absent.
4. **No A/B test before traffic.** Per 3AX §26, every A/B test has a minimum sample size. Do not wire experimentation infrastructure until traffic supports it.
5. **No dashboard upsell until paid customers exist.** A meter widget shown to zero paying customers is wasted engineering. Defer.
6. **Annual is the default checkout path.** Monthly is the friction-bearing alternative; the premium is visible.
7. **Operator decisions only.** No surface goes live without founder sign-off until 3AX §27 governance changes.

## 3. Phase list (priority order)

Each phase is a discrete, separately approvable slice. Phase 3AY-0 is this plan; nothing later is approved by this document.

| Phase | Name | What changes publicly | Estimated scope | Risk |
|---|---|---|---|---|
| **3AY-0** | This plan | Nothing | 1 doc | Zero |
| **3AY-1** | `/pricing` rebuild | Single page replaced | 1 route, ~600 lines TSX, 1 test file | Low — single page |
| **3AY-2** | Homepage hero + pricing teaser | Hero block on `/` | ~30–50 lines TSX | Low |
| **3AY-3** | `/trust` procurement sections | Trust-page sections added | ~100 lines TSX | Low |
| **3AY-4** | Developer docs banners | Docs layout banner + quickstart banner | ~50 lines TSX | Low |
| **3AY-5** | Proof Sprint + Paid Pilot landing pages | Two new routes | 2 routes, ~400 lines TSX each | Low |
| **3AY-6** | Partner page + partner program docs | New route | 1 route, ~300 lines TSX | Low |
| **3AY-7** | Sales artifact pack | Markdown + slide source | 5–10 markdown files, 1 deck | Zero (internal-only) |
| **3AY-8** | Billing implementation kickoff | Backend; Stripe + Metronome scaffolding | Multiple lib files, migration, route | **Medium** (real money) |
| **3AY-9** | Dashboard usage meter | Dashboard widget + API | 1 component, 1 API, 1 test | Medium |
| **3AY-10** | Onboarding monetization | Sign-up + post-first-event screens | 2–3 components | Low |
| **3AY-11** | Customer success automations | Weekly + monthly emails | 2–3 cron routes, email templates | Low |
| **3AY-12** | A/B test infrastructure | PostHog (or alternative) integration | 1 client lib + analytics events | Low |

**Recommended sequencing:**

```
A. 3AY-1     /pricing rebuild           (week 1)
B. 3AY-2     Homepage hero update       (week 1)
C. 3AY-3     /trust procurement add     (week 2)
D. 3AY-7     Sales artifact pack        (week 2, parallel)
E. 3AY-5     Proof Sprint + Pilot LPs   (week 3)
F. 3AY-4     Developer docs banners     (week 3)
G. 3AY-6     Partner page               (week 4)
H. — STOP —
I. 3AY-8     Billing kickoff             (only after the first paid Business customer is signed and asks for it)
J. 3AY-9     Dashboard meter             (only after 3+ paying customers)
K. 3AY-10    Onboarding monetization     (only after 3+ paying customers)
L. 3AY-11    Customer success automations (only after 5+ paying customers)
M. 3AY-12    A/B test infrastructure     (only after pricing page sees >2k sessions/week)
```

Phases I–M are **explicitly deferred** until the volume signal makes them worth building.

## 4. 3AY-1 — `/pricing` rebuild (highest priority)

The single highest-leverage surface change. The current `/pricing` (per the QA harness audit) renders, but the copy was last validated against an older plan. 3AY-1 replaces the page with the 3AX-derived plan grid, calculator scaffolding, tabs, FAQ, and the Proof Sprint / Paid Pilot bands.

### 4.1 Scope

- Replace `app/pricing/page.tsx` (and any child components) with a 3AX-aligned implementation.
- Add `app/pricing/_components/` for plan-card, tab-selector, FAQ, calculator-placeholder, sprint-card, pilot-card components.
- No backend changes. No DB. No middleware change.
- No real calculator yet — a static placeholder card that says "Calculator coming with 3AY-9 dashboard meter." Do not invent fake interactivity.

### 4.2 Content contract (from 3AX §15)

- Hero title: "Simple pricing for accountable AI spend."
- Hero support: "Start free. Upgrade when usage and governance needs grow."
- Tabs (left to right): **Build AI software** / **Govern enterprise AI spend** / **Launch a pilot**.
- Plan grid: 5 columns: Sandbox / Developer / Business / Scale / Enterprise.
- Each plan column shows: name, price, included events, retention, key inclusions, primary CTA. Exact text from 3AX §4.1.
- Event metric explainer block linking to a (new) `/pricing/metric-definition` page that mirrors 3AX §6 verbatim. This page is the contract appendix referenced from order forms.
- Proof Sprint band: $15k, 14 days, deliverables, 100% credit policy.
- Paid Pilot band: $35k, 60-90 days, deliverables, 50% credit policy.
- Regulated Pilot callout: $50k+, healthcare/finance/legal/insurance/public sector.
- Enterprise band: "From $60k ARR" + "1-3% of governed AI spend" framing.
- Add-ons section: §29.1 list with prices.
- FAQ: §15.3 — 10 questions, 1-3 paragraphs each.
- Trust badges row (above footer): "Metadata-only • Tenant-scoped • Usage-based • No prompt storage • Audit trail • Shadow-mode first."
- Footer CTA: "Start free sandbox" + "Book a scoping call."

### 4.3 CTA targets (3AX §15.2)

- Sandbox → `/dashboard` signup, no card.
- Developer → `/dashboard` signup, card required.
- Business → `/contact?intent=business` (form pre-fills "Business plan inquiry").
- Scale → `/contact?intent=scale`.
- Enterprise → `/contact?intent=enterprise`.
- Proof Sprint → `/contact?intent=proof-sprint`.
- Paid Pilot → `/contact?intent=paid-pilot`.

The `/contact` route uses the existing CRM webhook; no new contact pipeline.

### 4.4 What must not appear on `/pricing`

- "Save X%" or any savings number.
- "Automatically optimize."
- "Policy auto-apply."
- "Runtime enforcement live."
- "SOC 2 compliant," "HIPAA compliant," "ISO 27001 certified" — only `available`, `roadmap`, or `BAA available for regulated pilots`.
- Customer names, logos, or testimonials (until written permission exists).
- Specific dollar amounts of customer savings.

### 4.5 Source-shape tests required

A new test file `app/pricing/__tests__/page-copy.test.ts` asserts:

- No "verified savings" substring anywhere in `app/pricing/`.
- No "auto-apply" or "automatically optimize" substring.
- No "policy auto-apply" substring.
- No "SOC 2 compliant" / "HIPAA compliant" / "ISO 27001 certified" without the word `roadmap` or `available` nearby.
- Plan card prices match the rate card constants imported from a new `lib/pricing/rate-card.ts` module.

### 4.6 New shared module

`lib/pricing/rate-card.ts`:

- Exports a typed `RateCard` constant whose values mirror 3AX §4 exactly.
- Constants for plan prices, included events, retention days, overage rates, sprint price, pilot prices.
- A `getPlanByMonthlyEvents(events: number)` helper used by the future calculator and by upgrade prompts.
- A vitest in `lib/pricing/__tests__/rate-card.test.ts` asserts every constant matches the 3AX numbers and that the helper picks the right plan for boundary values.

The rate card module is the **single source of truth in code**. The `/pricing` page reads from it. Future surfaces read from it. Changing a price requires editing one place.

### 4.7 Phase go / no-go

**3AY-0 → 3AY-1:**
- This plan accepted in writing.
- Founder review of 3AX rate card (3AX §27 review confirmed).
- The `/pricing` slice is the only thing in flight; no other public-surface work in parallel.

**3AY-1 → 3AY-2:**
- `/pricing` shipped on production.
- Source-shape tests in CI.
- Manual QA pass (no JS console errors, all CTAs route correctly, all FAQ items render).
- Independent reviewer reads the page aloud without saying "savings."

### 4.8 Estimated effort

- 1 lib module + tests: half day.
- Page + components: 1.5 days.
- Test file: half day.
- Manual QA + copy review: half day.
- **Total: ~3 days of focused engineering.**

## 5. 3AY-2 — Homepage hero + pricing teaser

The homepage already exists and renders. 3AY-2 swaps the hero block and the pricing teaser line.

### 5.1 Scope

- Replace the hero copy in `app/page.tsx` with the locked 3AX §14.2 hero text.
- Update the two primary CTAs to the outcome-anchored versions:
  - Primary: "See your AI spend by workflow" → Sandbox.
  - Secondary: "Map my AI spend in 14 days — $15k" → Proof Sprint scoping.
- Add the locked pricing support line directly under the CTAs: "Start free. Production plans from $249/month. Enterprise pilots from $35k."
- Update the trust microcopy row: "Metadata-first. Tenant-scoped. Usage-based. Procurement-ready path."

### 5.2 What does not change in 3AY-2

- Page structure below the hero.
- Integration logo strip.
- Trust badges row.
- Product chain visualization.
- Footer.

These are revisited only if 3AY-1 surfaces a conflict.

### 5.3 Source-shape tests required

Extend `__tests__/homepage-copy.test.ts` (or create it):

- Hero contains the locked phrase "AI Spend Accountability for Enterprises."
- Pricing support line contains "from $249/month" and "from $35k."
- No "save X%" or "automatically optimize" in the hero.

### 5.4 Phase go / no-go

**3AY-1 → 3AY-2:** as above. **3AY-2 → 3AY-3:** homepage QA pass, no console errors, both CTAs working.

### 5.5 Estimated effort

- Half day.

## 6. 3AY-3 — `/trust` procurement sections

Trust page exists. 3AY-3 adds procurement-ready sections per 3AX §16.

### 6.1 Scope

- Add new sections to `app/trust/page.tsx`:
  - Usage metric definition (link to `/pricing/metric-definition`).
  - Data boundary (metadata-only).
  - Billing transparency.
  - Dispute window (30 days).
  - Plan security gates table (from 3AX §9, condensed).
  - Retention by plan.
  - SSO/SCIM by plan.
  - DPA and MSA request flow.
  - "No prompt or response storage" single-sentence guarantee.
- Add `app/trust/dpa-request/page.tsx` and `app/trust/msa-request/page.tsx` (or a single modal-style form) that posts to the contact webhook with `intent=dpa-template` / `intent=msa-template`.

### 6.2 What 3AY-3 must not say

Per 3AX §16.3:

- No "SOC 2 compliant" until type II report exists.
- No "HIPAA compliant" until BAA program is signed and operational.
- No certification logo P402 does not hold.
- No "Industry-leading," "best-in-class," etc.

### 6.3 Source-shape tests required

`app/trust/__tests__/page-copy.test.ts`:

- Asserts the forbidden compliance phrases are absent.
- Asserts every certification claim is accompanied by `roadmap`, `available`, or `target date`.
- Asserts plan security gate table values match 3AX §9.

### 6.4 Phase go / no-go

**3AY-2 → 3AY-3:** as above. **3AY-3 → 3AY-4:** trust page QA pass, legal review of compliance claims (founder approves).

### 6.5 Estimated effort

- 1 day for sections + tests.
- 0.5 day for DPA/MSA request forms.

## 7. 3AY-4 — Developer docs banners

### 7.1 Scope

- Add a top banner to `app/docs/_components/layout` (or equivalent) that reads: "Start free sandbox — 25k metered AI events/month, no card required."
- Add a docs-homepage secondary banner: "Need procurement, SSO, or a pilot? Book a 20-minute scoping call."
- For any docs page describing a feature gated to a higher tier, add a small "Available in Business and above. [See pricing.]" inline callout.
- Update `app/developers/quickstart/page.tsx` to reflect:
  - "Start free with 25k metered AI events/month."
  - First-event activation target (<24 hours).
  - Event volume examples (3AX §17.3).
  - Link to `/pricing/metric-definition`.

### 7.2 What must not change

- The technical content of any quickstart or reference page. Only the banners and a single sidebar widget.

### 7.3 Source-shape tests required

`app/docs/__tests__/banners.test.ts`:

- Asserts banner copy matches the locked text.
- Asserts no banner says "save X%."

### 7.4 Phase go / no-go

**3AY-5 → 3AY-4:** can be done in parallel with 3AY-5 if engineering capacity allows; otherwise after.

### 7.5 Estimated effort

- 1 day.

## 8. 3AY-5 — Proof Sprint + Paid Pilot landing pages

Two dedicated routes for SEO and direct CTAs.

### 8.1 Scope

- New route `app/pricing/proof-sprint/page.tsx`:
  - Hero: "Map your AI spend in 14 days — $15,000."
  - Scope: 1 workflow, 1 provider integration, executive readout.
  - Day-by-day outline (3AX §10.3 condensed).
  - "What you'll have at the end" deliverables list.
  - Credit policy (100% to Paid Pilot).
  - Qualification criteria (3AX §10.2).
  - "Book a scoping call" CTA.
- New route `app/pricing/paid-pilot/page.tsx`:
  - Hero: "Multi-workflow accountability pilot — $35,000."
  - Scope: 60–90 days, 3 workflows, executive readout, procurement-ready evidence.
  - Stakeholder map (3AX §11.3).
  - Success criteria (3AX §11.8).
  - 50% credit policy.
  - Regulated Pilot callout ($50k+).
  - "Talk to sales" CTA.

### 8.2 SEO requirements

- Both pages need:
  - Unique `<title>`, `<meta description>`, OpenGraph, Twitter card.
  - Canonical pointing at `https://p402.io/pricing/proof-sprint` and `https://p402.io/pricing/paid-pilot`.
  - Schema.org `Service` JSON-LD with `provider`, `name`, `description`, `offers` (price + duration).
- Both pages get added to `app/sitemap.ts` with `priority: 0.9`, `changeFrequency: weekly`.

### 8.3 What must not appear

- "Verified savings" or any savings percentage.
- "Guaranteed ROI."
- Customer testimonials or names without written permission.
- Compliance claims above what P402 holds.

### 8.4 Source-shape tests required

`app/pricing/proof-sprint/__tests__/page-copy.test.ts` and `app/pricing/paid-pilot/__tests__/page-copy.test.ts` enforce the forbidden-phrase list.

### 8.5 Phase go / no-go

**3AY-3 → 3AY-5:** after `/pricing` and `/trust` are live so the cross-links are real.

### 8.6 Estimated effort

- 1 day each, ~2 days total.

## 9. 3AY-6 — Partner page + partner program

### 9.1 Scope

- New route `app/partners/page.tsx` (or extend existing `app/partner/page.tsx`):
  - Three partner offers (3AX §22.1): developer affiliate (20%), integration partner, enterprise referrer (15% + 10% renewal).
  - Eligibility criteria (3AX §22.2).
  - Exclusions (3AX §22.3).
  - Attribution window (180 days).
  - Application CTA → `/partners/apply` form.
- Partner program one-pager downloadable as PDF.
- Partner FAQ section.

### 9.2 What 3AY-6 does not ship

- The partner **dashboard** (commission tracking, deal registration UI). That's deferred to a separate slice (3AY-6-Dashboard) tied to actual partner volume.
- Real attribution tracking infrastructure (the link param scheme exists; the persistence layer does not). Manual CRM tracking is acceptable for the first 10 partners.

### 9.3 Phase go / no-go

**3AY-5 → 3AY-6:** after launch pages are live so partners have something to point at. **3AY-6 → STOP:** explicit pause for traffic and customer signal before continuing to phases I–M.

### 9.4 Estimated effort

- 1 day.

## 10. 3AY-7 — Sales artifact pack (internal-only)

No public surface. Internal sales toolkit derived from 3AX.

### 10.1 Deliverables (all under `docs/sales/`)

- `1-pager-buyer-brief.md` — 1-page buyer brief: problem, product, pricing, next step.
- `12-slide-deck.md` — markdown source for the 12-slide deck (3AX §20.1).
- `proof-sprint-sow-template.md` — locked SOW text (3AX §10.10).
- `paid-pilot-sow-template.md` — locked SOW text (3AX §11.13).
- `regulated-pilot-sow-template.md` — Regulated Pilot variant.
- `enterprise-order-form-template.md` — order form template referencing rate card v1.
- `metric-definition-appendix.md` — verbatim from 3AX §6.
- `discount-policy-cheatsheet.md` — 3AX §28 condensed for sales.
- `objection-handling.md` — top 10 objections + scripted responses (from 3AX §30).
- `outbound-email-templates.md` — engineering leader email, FinOps email, follow-up cadence.

### 10.2 What 3AY-7 does not include

- An actual PowerPoint or Keynote file (markdown source can be rendered later).
- CRM automation (manual cadence is fine for first 5 deals).
- Email automation infrastructure.

### 10.3 Phase go / no-go

**3AY-7 can run in parallel with 3AY-1 through 3AY-6.** It does not touch any public surface and unblocks first-deal motion. Recommended to start on day 1 of 3AY rollout.

### 10.4 Estimated effort

- 2 days for the full pack.

## 11. 3AY-8 — Billing implementation kickoff (deferred)

### 11.1 Scope when triggered

- Stripe account configured with the production rate card.
- Metronome (or alternative) account configured with the event meter.
- New `lib/billing/pricing/` module connecting `lib/pricing/rate-card.ts` to plan entitlements.
- New `lib/billing/meter/` module wiring metered event counting to Metronome.
- New webhook routes for Stripe and Metronome events.
- New migration `v2_05N_billing_plans_and_subscriptions.sql` for plan, subscription, and event-mapping tables.
- Self-serve checkout for Sandbox → Developer.
- Sales-issued payment link for Business annual.

### 11.2 Why deferred

- No paying customer has asked for it yet.
- Building Stripe + Metronome before customer one is an asset that doesn't pay rent. The first customer's check can be invoiced manually via Stripe Invoicing. After that, automate.

### 11.3 Trigger condition

- 3AY-8 is approved only when **at least one of**:
  - A Paid Pilot is signed and the buyer asks "how do I pay you on annual."
  - Two Developer-tier customers are paying via manual Stripe invoices and the admin overhead is real.

### 11.4 Phase go / no-go

**3AY-6 → 3AY-8:** explicit founder approval + the trigger condition above.

### 11.5 Estimated effort when triggered

- 2–3 weeks.

## 12. 3AY-9 — Dashboard usage meter (deferred)

### 12.1 Scope when triggered

- New dashboard component showing: plan badge, included events, current consumption, projected month-end, estimated overage cost.
- 50/80/100/120% alert wiring (3AX §5.2).
- Hard cap toggle.
- New API route `GET /api/v2/billing/usage-snapshot` returning the data.
- Source-shape tests asserting no upsell scare language.

### 12.2 Why deferred

- The dashboard meter only matters once there's a meaningful denominator (paid plan with real included usage). Sandbox-only customers don't care about a meter; they care about getting to first event.

### 12.3 Trigger condition

- 3 or more paying customers with at least 30 days of activity each.

### 12.4 Estimated effort when triggered

- 3–5 days.

## 13. 3AY-10 — Onboarding monetization (deferred)

### 13.1 Scope when triggered

- Sign-up flow update: choose path (Build / Govern / Regulated / Agent builder).
- Post-first-event screen: "Add a `workflow_id` to start attribution."
- Day-1 / Day-3 / Day-7 email cadence (3AX §12.3).
- Activation analytics events (3AX §25.1).

### 13.2 Why deferred

- No point optimizing activation without traffic to optimize.

### 13.3 Trigger condition

- 3 or more paying customers OR 100+ Sandbox signups per month.

### 13.4 Estimated effort when triggered

- 3–4 days.

## 14. 3AY-11 — Customer success automations (deferred)

### 14.1 Scope when triggered

- Weekly Monday digest email (spend map, outcome coverage, control posture).
- Monthly executive report PDF.
- Renewal-90-days countdown trigger.
- Expansion trigger emails on workflow add / department add.

### 14.2 Trigger condition

- 5 or more paying customers.

### 14.3 Estimated effort when triggered

- 1 week.

## 15. 3AY-12 — A/B test infrastructure (deferred)

### 15.1 Scope when triggered

- PostHog (or Statsig) wiring into the homepage and `/pricing`.
- Experiment definitions per 3AX §26.1.
- Variant rotation and significance reporting.

### 15.2 Trigger condition

- `/pricing` sees >2,000 unique sessions per week for 4 consecutive weeks.

### 15.3 Estimated effort when triggered

- 3 days.

## 16. Cross-cutting requirements

These apply to every phase that touches a public surface.

### 16.1 Forbidden phrases (source-shape enforced)

Every new public-surface file must pass a forbidden-phrase scan:

- `verified[_-]?savings`
- `policy[_-]?auto[_-]?apply`
- `automatically optimize`
- `automatic optimization`
- `runtime enforcement (active|live|enabled)`
- `SOC ?2 compliant` unless paired with `roadmap` or `target`
- `HIPAA compliant` unless paired with `BAA`
- `ISO ?27001 certified`
- `FedRAMP` (unless authorized)
- Any specific savings percentage (`save \d+%`)

### 16.2 Required canonical phrases

Every public surface that discusses pricing must include the locked support line where appropriate:

- Homepage hero: "Start free. Production plans from $249/month. Enterprise pilots from $35k."
- Pricing page hero support: "Start free. Upgrade when usage and governance needs grow."
- Trust page guarantee: "Metadata-first. Tenant-scoped. Usage-based. Procurement-ready path."

### 16.3 Schema.org expectations

- `/pricing` gets `Product` + `Offer` JSON-LD for each plan with public price.
- `/pricing/proof-sprint` and `/pricing/paid-pilot` get `Service` JSON-LD.
- Each public surface keeps its existing canonical, OG, and Twitter card metadata.

### 16.4 Analytics events (3AX §25.1)

The following events should fire on each surface as it ships. Each phase wires only its events; the catalog is global:

- `homepage_hero_cta_clicked { cta: 'sandbox' | 'proof_sprint' }`
- `pricing_page_view { utm, referrer }`
- `pricing_tab_selected { tab }`
- `plan_card_viewed { plan }`
- `proof_sprint_cta_clicked { source }`
- `paid_pilot_cta_clicked { source }`
- `sandbox_signup_started { source }`
- `trust_page_view`
- `dpa_template_requested`
- `msa_template_requested`
- `partner_application_submitted`

Until 3AY-12 ships, fire to the existing analytics layer (Google Analytics + whatever is in `lib/analytics.ts`).

### 16.5 Sitemap and discoverability

Every new public route added in 3AY must be added to `app/sitemap.ts` with appropriate `priority` and `changeFrequency`. The apex-canonical posture from 3AP holds; no surface introduces a www reference.

### 16.6 Test discipline

Every new public surface file ships with:

- A source-shape vitest in the file's `__tests__/` directory.
- Forbidden-phrase scan.
- Canonical-phrase assertion where applicable.
- Plan-card price assertion (read from `lib/pricing/rate-card.ts`).

Failure of any source-shape test blocks merge. The CI for `master` enforces this.

## 17. Risks and mitigations

### 17.1 Risk: rewriting `/pricing` causes a temporary SEO drop

- Mitigation: keep all existing pricing URLs and add 301 redirects from any deprecated paths. Keep the canonical URL. Re-submit sitemap after launch.

### 17.2 Risk: a phase ships copy that violates 3AX

- Mitigation: source-shape tests in every phase. Reviewer-aloud test (read the page out loud without saying "savings").

### 17.3 Risk: building billing before there's a paid customer

- Mitigation: 3AY-8 has an explicit trigger condition. Do not build until the trigger fires.

### 17.4 Risk: dashboard meter built with no paying customers

- Mitigation: 3AY-9 has an explicit trigger condition.

### 17.5 Risk: founder time on surface work crowds out sales

- Mitigation: 3AY-7 (sales pack) is parallel with 3AY-1. Founder must spend at least 50% of weekly time on outbound + scoping calls. Engineering is bounded to 50%.

### 17.6 Risk: Enterprise quote requests pile up before billing infra exists

- Mitigation: 3AX §31.2 surfaces a "Request enterprise pricing" CTA that goes to a contact webhook. The founder responds within 24 hours with a Stripe-invoice-driven order form. No automation required for first 5 deals.

### 17.7 Risk: SOW templates conflict with 3AX

- Mitigation: 3AY-7 sales pack pulls SOW text from 3AX §10.10 and §11.13 verbatim. Future edits flow through 3AX governance.

## 18. Governance hooks

This plan is governed per 3AX §27.

- Owner: founder.
- Approval per phase: founder.
- Changes to 3AX that affect a phase in flight require pausing the phase, amending 3AX, and resuming.
- Every shipped phase records its commit hash and effective date.

## 19. Sequencing summary (the only chart you need)

```
Week 1:
  - 3AY-1  /pricing rebuild           (eng + copy)
  - 3AY-2  Homepage hero              (eng + copy)
  - 3AY-7  Sales artifact pack        (founder + sales) ← PARALLEL

Week 2:
  - 3AY-3  /trust procurement add     (eng + legal review)
  - Founder outbound: 5 scoping calls

Week 3:
  - 3AY-5  Proof Sprint LP            (eng + copy)
  - 3AY-5  Paid Pilot LP              (eng + copy)
  - 3AY-4  Docs banners               (eng)

Week 4:
  - 3AY-6  Partner page               (eng)
  - Founder outbound: 10 more scoping calls
  - First Proof Sprint candidate identified

— STOP gate —

Trigger-based later phases:
  - 3AY-8  Billing kickoff             after first Paid Pilot signs or 2nd Stripe invoice
  - 3AY-9  Dashboard meter             after 3 paying customers
  - 3AY-10 Onboarding monetization     after 3 paying customers
  - 3AY-11 CSM automations             after 5 paying customers
  - 3AY-12 A/B test infrastructure     after 2k+ weekly /pricing sessions
```

## 20. Acceptance criteria

This document is complete only when it answers each question below.

| Question | Section |
|---|---|
| Which surfaces change first? | §19 sequencing summary |
| What is the minimum viable change to `/pricing`? | §4 |
| What must not appear on any surface? | §4.4, §6.2, §8.3, §16.1 |
| Where is the single source of truth for plan prices in code? | §4.6 (`lib/pricing/rate-card.ts`) |
| Which phases are deferred and what triggers them? | §11–§15 |
| What tests run on every public surface? | §16.6 |
| Who approves what? | §18 |
| How long does the priority sweep take? | §4–§10 effort estimates, ~4 weeks |
| What does NOT ship in 3AY? | §11.2, §12.2, §13.2, §14, §15 (everything trigger-gated) |

## 21. Reaffirmed boundaries

- No code shipped by this slice.
- No public surface modified by this slice.
- No billing system implementation.
- No SQL execution. No Neon contact. No Redis touched. No migration run. No deploy.
- No claim of verified savings.
- No claim of policy auto-apply.
- No claim of runtime enforcement being live.
- No unsupported compliance claim.
- No customer logo or name used without written permission.

This plan is a sequencing document. Every phase below 3AY-0 is a separate, individually approvable slice. None of them are approved by this commit.
