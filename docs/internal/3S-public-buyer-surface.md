# 3S-0: Public Buyer Surface Conversion System

Status: strategy and copy standard. Not implementation.
Owner: growth and frontend.
Predecessors: 3R-C must be committed and Vercel-green before 3S-1A implementation begins.
Successors: 3S-0B (marketing copy quality guard), 3S-1A (/meter canonical template), then 3S-1B and onward.

This document is the operating spec for the public website conversion system. It defines page inventory, funnel direction, buyer paths, the canonical /meter page template, the copy and quality standard, SEO and LLM visibility rules, agent-friendly UX, responsive requirements, pricing risk handling, sequencing, and acceptance criteria.

Memory entries about 3S must point to this file. This file is the source of truth.

This document follows its own punctuation rules. No em dashes. No double hyphens used as em dashes. No decorative arrow glyphs. Use colons, commas, periods, and semicolons.

---

## 0. Strategic decisions locked in 3S-0

These decisions are settled. Implementation phases inherit them.

1. /meter is the canonical buyer-page template. Build it first. Fork to /monitor, /control, /optimize, /settle, /prove.
2. Pricing rewrite is gated by the pricing decision note in section 11. Do not publish a hard plan table before billing enforcement is reconciled.
3. Homepage rewrite comes after /meter template is approved and merged.
4. Partners are part of the funnel, not a side page. Partner CTA appears on the homepage buyer-path cards.
5. Technical protocol pages remain discoverable. SDK, CLI, MCP, Claude Skill, x402, AP2, A2A, ERC-8004, OpenAPI, /docs, llms.txt, and llms-full.txt are preserved.
6. The /optimize page must use gated-status copy. Optimize recommendation logic is not live.
7. The /control page must not imply runtime flip is live.
8. Cloudflare must not be described as enabled routing.
9. Savings claims require measured baseline and outcome data. No generic savings claims.
10. P402 meters economics, not content. Privacy boundary stated wherever trust language appears.

Category statement: AI spend accountability infrastructure.
Primary promise: Make AI spend accountable.
Bridge line: Every token needs an owner. Every AI feature needs margin control.
System line: Meter usage. Monitor budgets. Control spend. Optimize margins. Settle payable work. Prove every economic event.
Privacy line: P402 meters economics, not content.

---

## 1. Page inventory

Public marketing surface in scope for 3S.

Buyer pages (vertical, product system):
- /meter
- /monitor
- /control
- /optimize (gated copy)
- /settle
- /prove

Audience pages:
- / (homepage)
- /enterprise
- /developers
- /partners
- /ai-spend-audit

Trust and pricing:
- /pricing (gated by decision note)
- /trust

Existing technical SEO routes to preserve (kept as engine pages, internally linked to the new buyer pages, titles refreshed carefully, canonical and sitemap maintained):
- /product/routing
- /product/payments
- /product/controls
- /product/orchestration
- /product/ecosystem
- /product/escrow
- /status

Existing vertical demo pages to preserve and align (linked from the buyer journey, not rewritten in 3S-1A):
- /meter/healthcare
- /meter/legal
- /meter/real-estate
- /meter/enterprise

Partner routes (preserved and linked from the funnel):
- /partners
- /partners/apply
- /partner (authenticated partner portal)

Buyer SEO landing pages, later sub-slice (not part of 3S-1A; add after the canonical buyer pages and homepage land):
- /enterprise-ai-budget-dashboard
- /ai-token-usage-dashboard
- /embedded-ai-margin-control
- /ai-cogs-dashboard
- /ai-cost-optimization

Technical entry points (preserved, not rewritten in 3S-1A):
- /docs
- /docs/api
- /docs/skill
- /docs/mcp
- /changelog

Discoverability assets (kept current):
- /llms.txt
- /llms-full.txt
- /openapi.yaml
- /sitemap.xml
- /robots.txt

Out of scope for 3S:
- Dashboard routes under /dashboard.
- Internal admin routes.
- Cloudflare-facilitator project.
- Contracts and Hardhat artifacts.

---

## 2. Funnel map

Top of funnel:
- Homepage hero.
- AI Spend Audit landing.
- Developer docs entry.
- Partner landing.
- Search and LLM-driven entry on any buyer page.

Mid funnel:
- Vertical buyer pages: /meter, /monitor, /control, /prove, /settle.
- /optimize as future-state education with gated status.
- /enterprise and /developers as audience hubs.

Bottom of funnel:
- Start free (developer).
- Install Meter (developer or pilot).
- Run AI Spend Audit (enterprise).
- See evidence (compliance).
- Apply as partner (partner).
- Read docs (technical buyer).
- See dashboard (evaluator).

Each page must move toward one of these seven actions. No page may end without a primary CTA.

---

## 3. Buyer-path map

Five paths surface on the homepage and recur as page-level CTAs.

1. Developer building AI software.
   Primary CTA: Start free.
   Message: Know AI feature margin.
   Entry pages: /, /developers, /meter, /docs.

2. Enterprise AI spend manager.
   Primary CTA: Run AI Spend Audit.
   Message: See department, employee, workflow, model, and vendor spend.
   Entry pages: /, /enterprise, /ai-spend-audit, /monitor.

3. Regulated workflow operator.
   Primary CTA: See evidence.
   Message: Track cost, review status, privacy mode, and exportable evidence.
   Entry pages: /, /prove, /trust.

4. Agent builder.
   Primary CTA: Read docs.
   Message: Give agents budgets, receipts, and payment traces.
   Entry pages: /, /developers, /docs, /settle.

5. Partner.
   Primary CTA: Apply as partner.
   Message: Help clients deploy AI spend accountability.
   Entry pages: /, /partners, /partners/apply.

Each buyer page must show the relevant CTA above the fold and at the final section.

---

## 4. Canonical /meter template

/meter is the template all buyer pages fork from. Build once, structure stable, copy varies.

Section order:

1. Hero
   H1: Meter every AI call before it becomes budget leakage.
   Subheadline: P402 turns each AI request into an economic event with owner, workflow, model, provider, tokens, cost, budget, policy result, outcome, and evidence status.
   Primary CTA: Install Meter.
   Secondary CTA: See dashboard.
   Trust line: No prompt storage required. Metadata-only mode is available from the first event.

2. Problem
   Title: AI spend arrives too late.
   Copy: Provider invoices show totals after usage happens. They do not show which customer, feature, workflow, department, employee, model, or retry caused the cost. P402 records that ownership when the event happens.

3. What Meter records
   Cards: Owner. Workflow. Model. Tokens. Cost. Budget. Policy result. Outcome. Evidence.

4. How it works
   Step 1: Create a P402 key.
   Step 2: Send a request through the OpenAI-compatible endpoint or report a meter-only event.
   Step 3: Attach customer, feature, department, employee, workflow, or task metadata.
   Step 4: See the event in the ledger.

5. Privacy
   Title: Meter economics, not content.
   Modes: metadata-only, fingerprint-only, redacted trace, private gateway, full trace opt-in.

6. Proof
   Use dashboard proof surfaces: event detail, outcome card, privacy posture, governance verdict, cost and token math, evidence status. No generic AI illustrations.

7. For developers
   Title: Know the cost and margin of every AI feature.
   CTA: Start free.

8. For enterprise
   Title: Give finance a real AI usage ledger.
   CTA: Run AI Spend Audit.

9. FAQ (six entries minimum)
   Does P402 need prompt content?
   Does Meter require settlement?
   Is P402 a replacement for OpenRouter?
   How is this different from LLM observability?
   How is this different from FinOps?
   What is the first integration step?

10. Final CTA
    Title: Give every token an owner.
    CTA: Install Meter.

Vertical variants (forks of this template):

- /monitor. H1: See where AI spend goes, who owns it, and whether it produced value. Proof: spend by department, employee, customer, feature, workflow, provider, model, outcome, evidence.
- /control. H1: Set budget and policy boundaries before AI spend grows. Gated note: runtime flip remains gated until readiness checks pass.
- /optimize. H1: Prepare AI spend for measured savings. Gated note: Optimize recommendations remain gated until outcome data and proof quality are sufficient.
- /settle. H1: Turn payable AI work into receipts and settlement records. Note: Meter works before settlement. Settlement is added when AI work becomes payable.
- /prove. H1: Prove where AI spend went. Proof: event detail, search, evidence bundle, outcome status, privacy posture, finance report, CSV appendix.

---

## 5. Copy style guide

Tone:
- Short sentences.
- Plain nouns.
- Active voice.
- Concrete objects.
- Buyer language first. Proof language second. Protocol language third.
- One idea per sentence.
- No filler intros.
- No metaphors.
- No generic AI transformation claims.

Punctuation:
- No em dashes. No double hyphens used as em dashes.
- Commas, colons, periods, semicolons only.
- No decorative arrows in body copy.
- No emoji in product pages.
- No excessive parentheses.
- No exclamation marks in enterprise copy.

Sentence construction rule for every page section:
1. First sentence names a real buyer problem.
2. Second sentence says what P402 does.
3. Section names an object in the product.
4. CTA tells the user what to do next.
5. Claim reflects shipped or gated capability.

Preferred word bank:
meter, owner, budget, margin, evidence, receipt, policy, workflow, department, employee, customer, model, provider, outcome, review, export, forecast, deny, approve, prove, settle, route, cost, token, ledger, event, control, report, audit.

Employee analytics language (Monitor and Control):
Use: budget efficiency, workflow value, coaching opportunity, policy compliance, usage quality, support needed, budget allocation.
Avoid: worst employee, offender, abuser, violator, wasteful employee. No shame framing. No punitive wording. No surveillance framing.

Trust language:
Say: P402 records economic metadata by default. Prompt and response storage are off by default. Customers choose the privacy mode. Meter-only mode lets your backend call the model provider directly and report the economic event. P402 helps teams export evidence for finance, procurement, compliance, and audit review.
Do not say: P402 never stores content in every mode. P402 is compliant.

Protocol language placement:
- Lead with buyer problem.
- Surface protocol terms (x402, AP2, A2A, ERC-8004, MCP, SDK, CLI) only after the buyer claim is established.
- Keep protocol language in proof sections, technical pages, and docs entry points.

Trust proof rubric (every buyer page):
Every buyer page must include at least three of the following four trust signals:
1. Privacy boundary: what P402 does and does not need.
2. Status boundary: shipped, gated, or future.
3. Proof object: dashboard, event detail, evidence report, receipt, export, or docs.
4. Conversion next step: Start free, Run AI Spend Audit, See evidence, Apply as partner, or Read docs.

---

## 6. Banned words, phrases, punctuation, and claim rules

Banned punctuation:
- Em dash.
- Double hyphen as em dash.
- Decorative arrows in body copy.
- Emoji on product pages.

Banned or strongly discouraged words and phrases:
unlock, seamless, game changer, revolutionary, cutting edge, powerful, robust, harness, utilize, delve, landscape, ever-evolving, transformative, innovative (when unspecific), frictionless (unless proven by UX), world-class, best-in-class (in public copy), AI-native (unless defined on-page), agentic era (outside protocol docs), autonomous future, crystal clear, reimagine, skyrocket, supercharge, future-proof, effortless, scalable (without proof), secure (without specifics), enterprise-ready (without proof), compliant (without naming scope).

Banned unsupported claims:
- Generic savings claims without measured baseline and outcome data.
- "Compliant" without naming the scope and the artifact (for example, evidence export for SOC 2 review).
- "Secure" without naming the specific control.
- "Enterprise-ready" without naming the proof artifact.
- "Runtime enforcement is live" since runtime flip is gated.
- "Optimize recommendations are live" since Optimize is gated.
- "Cloudflare routing is enabled" since it is not enabled.
- "We never store content" since that is false in full-trace opt-in mode.

Allowlist (legitimate technical terms that must not be flagged):
x402, AP2, A2A, ERC-8004, MCP, SDK, CLI, EIP-3009, EIP-2612, EIP-712, EIP-7702, TIP-20, USDC, Tempo, Base, OpenAPI, JSON-RPC, NextAuth, RainbowKit, viem, wagmi, ethers, OpenRouter, Stripe, Coinbase, CDP, FinOps, observability, OAuth, SAML, SSO, SOC 2 (when factual).

These banned and allow lists feed 3S-0B (marketing copy quality guard).

---

## 7. SEO title and meta table

Title tags (60 characters or less where possible):

| Route | Title |
| --- | --- |
| / | P402 Meter \| Make AI Spend Accountable |
| /meter | AI Usage Metering for Token Spend \| P402 |
| /monitor | AI Spend Dashboard for Teams and Models \| P402 |
| /control | AI Spend Controls and Policy Simulator \| P402 |
| /optimize | AI Cost Optimization Readiness \| P402 |
| /settle | x402 Receipts for Payable AI Work \| P402 |
| /prove | AI Spend Evidence and Audit Reports \| P402 |
| /enterprise | Enterprise AI Budget Dashboard \| P402 |
| /developers | AI Feature Margin Dashboard for Developers \| P402 |
| /pricing | Pricing for Accountable AI Spend \| P402 |
| /trust | Trust, Privacy, and Evidence for AI Spend \| P402 |
| /partners | P402 Partner Program for AI Spend Accountability |
| /ai-spend-audit | AI Spend Audit for Enterprise Teams \| P402 |

Meta description rule: descriptions should be 120 to 155 characters where possible. Each must state one buyer problem, one P402 solution, and one concrete object. No hype. No unsupported claim.

Examples:
- /: P402 meters every AI call and turns token usage into a live ledger for budgets, margins, workflows, policy results, and evidence.
- /enterprise: Give finance a dashboard for AI spend by department, employee, workflow, model, vendor, budget, outcome, and evidence status.
- /developers: Track AI COGS, feature margin, customer cost, retry waste, context waste, and cost per accepted output with P402 Meter.
- /meter: Turn every AI call into an economic event with owner, workflow, model, provider, tokens, cost, budget, policy result, outcome, and evidence.
- /monitor: See where AI spend goes by department, workflow, model, vendor, and customer, with outcome and evidence status.
- /control: Set budgets and policy boundaries for AI usage by team, workflow, model, and vendor. Runtime enforcement is gated.
- /optimize: Prepare AI spend for measured savings across models, cache, retries, and context. Recommendations are gated until proof is ready.
- /settle: Issue receipts and settlement records for payable AI work using x402 schemes on Base.
- /prove: Export evidence bundles, finance reports, and event proof for every AI economic event.
- /trust: Privacy modes, evidence options, and exportable records for AI economic events. P402 meters economics, not content.
- /partners: Refer, implement, and advise teams adopting AI spend accountability with the P402 partner program.
- /ai-spend-audit: A one-time engagement that produces an AI Spend Accountability Report covering attribution, leakage, and evidence readiness.
- /pricing: Plans and offers for accountable AI spend across developer, enterprise, and partner tracks.

---

## 8. Structured data mapping

Use JSON-LD only where the schema matches the page. Do not mark offers, reviews, ratings, awards, certifications, or compliance unless factual.

| Route | JSON-LD types |
| --- | --- |
| / | Organization, WebSite, SoftwareApplication |
| /meter | SoftwareApplication, Product, FAQPage |
| /monitor | SoftwareApplication, Product, FAQPage |
| /control | SoftwareApplication, Product, FAQPage |
| /optimize | SoftwareApplication, Product, FAQPage (gated status surfaced in description) |
| /settle | SoftwareApplication, TechArticle, FAQPage |
| /prove | SoftwareApplication, Product, FAQPage |
| /enterprise | Service, Product, FAQPage |
| /developers | TechArticle, SoftwareApplication |
| /pricing | Product, OfferCatalog, FAQPage (only after pricing decision note) |
| /trust | Organization, TechArticle, FAQPage |
| /partners | Service, Organization, FAQPage |
| /ai-spend-audit | Service, Product, FAQPage |
| /docs/api | TechArticle, APIReference (if APIReference type is in use elsewhere in the codebase) |
| /changelog | CollectionPage, Article entries if supported |

Rules:
- Do not add schema for features that are not on the page.
- Do not claim ratings or reviews.
- OfferCatalog on /pricing only after billing enforcement is reconciled.
- FAQPage entries must match the visible FAQ on the page.

---

## 9. LLM and agent discoverability plan

Goal: humans, search engines, LLMs, and browser agents should all parse the public surface.

The site must make it easy for LLMs to answer:
- What is P402?
- Who is P402 for?
- What problem does P402 solve?
- What does P402 meter?
- Does P402 require prompt storage?
- What is Meter? Monitor? Control? Optimize? Settle? Prove?
- What is gated and what is shipped?
- How does P402 differ from observability, FinOps, gateways, and x402 tools?
- How does a developer start? An enterprise? A partner?

LLM content assets to maintain:
- /llms.txt. Short product summary, canonical product pages, docs entry points, pricing, trust, changelog, partner program, API reference, SDK, CLI, MCP, Claude Skill, OpenAPI. One sentence description per link. Updated after page route changes.
- /llms-full.txt. Full content index for retrieval.
- /openapi.yaml. Current API surface.
- /sitemap.xml. Current routes.
- /robots.txt. Crawlable.

llms.txt is an index, not a ranking signal. Keep it accurate and update it whenever a public route changes.

Agent-friendly UX requirements (apply to every page):
- Real button elements for actions.
- Real anchor elements for links.
- Form elements with label associations.
- CTA text visible and specific.
- No layout shift after load.
- No hover-only navigation.
- No hidden CTAs.
- No transparent overlays over clickable elements.
- No modal traps.
- Primary CTA visible near top on mobile.
- Stable IDs for key sections.
- aria-labels where visual text is not enough.
- Semantic section, nav, main, header, footer.
- Stable route names.
- Descriptive URLs.
- Deterministic forms.
- llms.txt linked plainly in footer or docs, not hidden by CSS.

SEO foundational rules:
- Original point of view per page.
- Clear information architecture.
- Descriptive URLs.
- Crawlable HTML.
- Concise title tags. Unique meta descriptions.
- Clean H1 and H2 hierarchy. One H1 per page.
- Internal links between related buyer pages.
- Canonical URLs.
- Sitemap entries.
- No keyword stuffing. No hidden links. No fake mentions.
- No duplicated generic text across pages.

Old and new route handling (engine pages plus buyer pages):
- Keep /product/routing, /product/payments, /product/controls, /product/orchestration, /product/ecosystem, /product/escrow, and /status live.
- Refresh titles carefully without dropping current rankings.
- Add canonical tags.
- Link old product pages to the new buyer pages, and link buyer pages back to the relevant old product page where appropriate.
- Update sitemap.xml to include both.
- Track old and new query clusters separately in analytics.

Internal linking map:
- / links to /meter, /enterprise, /developers, /trust, /pricing, /partners.
- /meter links to /developers, /enterprise, /monitor, /prove, /docs.
- /monitor links to /meter, /control, /prove.
- /control links to /monitor, /prove, /trust.
- /optimize links to /meter, /prove, /pricing (clearly states gated status).
- /settle links to /docs, /trust, /prove.
- /prove links to /trust, /enterprise, /ai-spend-audit.
- /enterprise links to /ai-spend-audit, /monitor, /prove, /trust.
- /developers links to /meter, /docs, /pricing, SDK, CLI, MCP.
- /partners links to /ai-spend-audit, /developers, /enterprise, /partners/apply.
- /pricing links to /developers, /enterprise, /settle, /partners.
- /trust links to /meter, /prove, /docs.
- Old product engine pages (/product/*) link forward to the relevant new buyer page (for example, /product/routing to /optimize and /meter, /product/payments to /settle, /product/controls to /control).
- Vertical demo pages (/meter/healthcare, /meter/legal, /meter/real-estate, /meter/enterprise) link to /meter, /monitor, and /prove.

---

## 10. Responsive UX requirements

Mobile:
- One primary CTA per screen section.
- Hero text under 8 lines on common mobile widths.
- CTA buttons full width or easy to tap.
- Sticky bottom CTA allowed only if it does not obscure content.
- Dashboard visuals collapse into readable cards.
- Pricing cards stack.
- Product system cards stack in this order: Meter, Monitor, Control, Optimize, Settle, Prove.
- No dense comparison tables without horizontal handling.

Tablet:
- Two-column layouts allowed.
- Product cards in two or three columns.
- CTA group remains visible.
- Pricing selector readable.

Desktop:
- Strong hero with dashboard proof.
- Product system visible above or near first scroll.
- Buyer-path cards visible.
- Navigation dropdowns do not hide key CTA.
- Screenshots and dashboard mockups do not overpower copy.

Accessibility:
- One H1 per page.
- Clean H2 hierarchy.
- Buttons and links have readable text.
- Forms have labels.
- Focus states visible.
- Color is not the sole status indicator.
- Tables have headers.
- Pricing cards readable by screen readers.
- CTA order follows visual order.

Performance:
- Light hero.
- No heavy video above the fold.
- Optimized images.
- Avoid large client bundles for static marketing pages.
- Prefer server-rendered or static content.
- Dashboard previews optimized.
- No layout shift.
- Mobile-first.

Design system:
- Neo-brutalist structure.
- IBM Plex Sans for UI.
- JetBrains Mono for monospace.
- Primary accent: lime (#B6FF2E via CSS var).
- Cyan only for functional states: focus, loading, status.
- No rounded classes. No shadow classes.
- Strong borders on cards.
- Buttons uppercase, high weight.
- CSS variables only. No raw hex.
- High contrast. No low-contrast gray body copy.
- No new visual language.
- No gradients unless already in the system.
- Dashboard proof surfaces, not generic AI illustrations.

---

## 11. Pricing decision note

Pricing is the riskiest page. A page that promises enforcement the system does not deliver creates operational debt. The /pricing rewrite is therefore gated.

Before 3S-6 (pricing rewrite), produce a pricing decision document answering:

1. What plans are currently charged by Stripe or on-chain billing?
2. What request limits are enforced today?
3. What platform fees are enforced today?
4. Are Free, Build, Growth, Scale already backed by billing logic? If not, which?
5. Is AI Spend Audit sold manually or through checkout?
6. Is Department Dashboard sold manually or through checkout?
7. Which settlement fees are enforced today?
8. Are Optimize add-ons sold now, or future?
9. Which legacy Pro and Enterprise plans remain live?
10. What wording avoids mismatch between page copy and billing behavior?

Until resolved, the /pricing surface uses "plans and offers" language, not hard enforcement claims.

Recommended split:

- Use "plans" only where billing enforcement exists or where manual sales covers fulfillment:
  Free, Build, Growth, Scale, Enterprise.

- Use "offers" for enterprise:
  AI Spend Audit, Department Dashboard, Business, Enterprise, Regulated Enterprise.

Settlement pricing remains an add-on. Surfaced, not buried, not led with.

No public price point may exceed what billing actually enforces. No public plan may imply enforcement that the runtime does not provide.

### Escrow positioning note

Escrow is optional settlement protection for payable AI work. Meter works without escrow. Receipts work without escrow. Settlement works without escrow where immediate payment is enough. Escrow is relevant when a task has a payer, payee, deliverable, acceptance condition, timeout, dispute path, or refund path.

Escrow belongs under: Settle, Prove, Bazaar, marketplace workflows, payable AI work, agent commerce, dispute and refund workflows, high-value task workflows.

Escrow does not belong as: a homepage hero claim, a Meter claim, a first activation path, a required path for every AI call, a default path for every agent function, a replacement for receipts, a replacement for Meter, or a replacement for Prove.

Product rule: Meter first. Receipt second. Escrow only when the workflow needs conditional release.

### Escrow product risk

Escrow can create a failure mode where an agent starts work but payment is not funded, released, or settled. P402 must not make escrow a default dependency for agent execution until escrow lifecycle safety is reviewed.

Escrow safety rule: no paid agent task should begin under escrow unless escrow is funded or payment authorization is confirmed. If escrow funding fails, return escrow_required or payment_required before tool execution. If release fails after accepted work, record release_failed and preserve evidence. Do not silently stop the function. Do not hide unpaid work.

Required escrow lifecycle states: created, funded, authorized, work_started, submitted, accepted, released, disputed, refunded, expired, failed.

Required separations: work authorization, work execution, outcome acceptance, funds release, evidence export.

### Escrow status language

Allowed:
- Optional escrow for payable AI work.
- Conditional release for marketplace tasks.
- Escrow evidence can support dispute review.
- Meter and receipts still work without escrow.

Not allowed:
- Escrow every AI call.
- Escrow guarantees payment.
- Escrow is required for all agent functions.
- Trustless escrow solves agent commerce.
- Escrow is live for every workflow unless verified.

### Escrow page placement in 3S

- /product/escrow: preserve as technical engine page. Do not promote to top-level nav in 3S-1A.
- /settle: mention escrow as optional conditional release.
- /partners: mention marketplace and implementation partners where relevant.
- /pricing: keep Bazaar escrow fee under Settlement Add-On, gated by the pricing decision note.
- /docs: preserve escrow docs if they exist.

Do not add: /escrow as a main buyer page, a homepage escrow section, a pricing hero around escrow, or escrow copy on /meter.

---

## 12. Implementation sequencing

Order of work after 3R-C is merged and Vercel is green.

3S-0: this document. Strategy and copy standard. (Now.)
3S-0B: marketing copy quality guard. Node script, report-only. Scoped to public marketing routes. Allowlist for technical terms. Not a build gate until after /meter is approved.
3S-1A: /meter canonical buyer-page template. Shared components, header, footer, structured data, FAQ block, dashboard proof block, privacy block, CTA block.
3S-1B: fork /monitor, /control, /prove from the /meter template. /control uses gated-status copy.
3S-1C: fork /optimize and /settle from the /meter template. /optimize uses gated-status copy.
3S-2: homepage rewrite. Buyer-path cards, problem block, system block, trust block, proof block, final CTA.
3S-3: /enterprise audience hub and /ai-spend-audit landing.
3S-4: /developers audience hub.
3S-5: /trust rewrite. Privacy modes, evidence options, exportable records.
3S-6: /pricing rewrite. Gated by pricing decision note.
3S-7: /partners conversion path, including /partners/apply.
3S-8: docs entry point alignment (/docs, /docs/api, /docs/skill, /docs/mcp links from buyer pages).
3S-9: structured data audit across all 3S routes.
3S-10: llms.txt and llms-full.txt refresh.
3S-11: sitemap and robots.txt audit, including old /product/* routes and vertical demo routes.
3S-12: analytics events wired for the conversion taxonomy below.
3S-13: later buyer SEO landing pages (/enterprise-ai-budget-dashboard, /ai-token-usage-dashboard, /embedded-ai-margin-control, /ai-cogs-dashboard, /ai-cost-optimization). Each forks the /meter template, with copy tuned to the head term.
3S-14: old product engine page refresh (/product/routing, /product/payments, /product/controls, /product/orchestration, /product/ecosystem, /product/escrow, /status). Titles, internal links, canonicals, sitemap.
3S-15: Escrow Safety and Positioning Review.
  Scope: inspect /product/escrow; inspect escrow contracts and service routes; inspect Bazaar auto-escrow flow; map escrow lifecycle states; verify funded, released, disputed, refunded, expired, failed states; verify no unpaid-agent silent failure; verify economic event and evidence record even when release fails; decide whether /product/escrow remains a technical engine page or becomes a buyer page later; decide if escrow pricing remains Bazaar-only or broader Settle add-on.
  Constraints: no runtime changes unless separately approved. No contract changes. No settlement code changes. No Bazaar flow changes. No migrations. No Neon SQL execution.

Conversion event taxonomy (wired in 3S-12, names stable across pages):
cta_start_free_clicked
cta_install_meter_clicked
cta_see_dashboard_clicked
cta_ai_spend_audit_clicked
cta_book_demo_clicked
cta_partner_apply_clicked
cta_read_docs_clicked
cta_export_sample_evidence_clicked
buyer_path_developer_clicked
buyer_path_enterprise_clicked
buyer_path_regulated_clicked
buyer_path_agent_clicked
buyer_path_partner_clicked
pricing_plan_selected
demo_vertical_selected

Hard constraints across every sub-slice:
- No runtime enforcement changes.
- No budget-guard changes.
- No Optimize recommendation logic.
- No migrations.
- No Neon SQL execution.
- No Cloudflare routing changes.
- No OpenRouter adapter changes.
- No savings claims without measured baseline and outcome data.
- No claim that runtime flip is enabled.
- No claim that Optimize recommendations are live.
- No claim that Cloudflare traffic is enabled.
- Do not delete technical pages.
- Do not delete /product/* engine pages.
- Do not delete vertical demo pages.
- No escrow implementation changes in 3S. No contract changes. No settlement code changes. No Bazaar flow changes.
- Do not remove SDK, CLI, MCP, Claude Skill, x402, AP2, A2A, Base, ERC-8004, semantic cache, receipts, or evidence language.
- Do not stage generated artifacts unless explicitly intended.

Pre-commit report required for each sub-slice:
- routes changed
- copy changed
- CTA map
- SEO metadata changed
- structured data changed
- mobile, tablet, desktop check
- no em dash check
- banned words check
- no unsupported claims
- no runtime enforcement changes
- no Optimize logic changes
- no migrations
- no Neon SQL execution
- build result
- tsc result
- targeted tests if applicable
- generated artifacts restored unless intentionally staged

Commit naming:
- 3S-0: docs(growth): define public buyer surface conversion system
- 3S-0B: chore(growth): add marketing copy quality guard (report-only)
- 3S-1A: feat(marketing): add meter-led public page template
- 3S-1B: feat(marketing): fork monitor, control, and prove from meter template
- 3S-1C: feat(marketing): fork optimize and settle from meter template with gated status
- 3S-2: feat(marketing): reposition homepage for AI spend accountability
- 3S-3: feat(marketing): add enterprise hub and AI Spend Audit landing
- 3S-4: feat(marketing): align developers hub with meter template
- 3S-5: feat(marketing): align trust and prove pages with evidence funnel
- 3S-6: feat(marketing): update pricing surface for accountable AI spend
- 3S-7: feat(marketing): add partner conversion path
- 3S-8: docs(marketing): align docs entry points with buyer pages
- 3S-9: feat(marketing): structured data audit across 3S routes
- 3S-10: docs(marketing): refresh llms.txt and llms-full.txt
- 3S-11: chore(marketing): sitemap and robots audit
- 3S-12: feat(marketing): wire conversion analytics taxonomy
- 3S-13: feat(marketing): add buyer SEO landing pages
- 3S-14: feat(marketing): refresh old product engine pages
- 3S-15: chore(growth): escrow safety and positioning review

---

## 13. Acceptance criteria

3S-0 (this document) is accepted when:
- All thirteen required sections are present and complete.
- /meter is named as canonical template.
- Pricing decision note is included.
- Banned words and punctuation rules are included.
- SEO title and meta table is included.
- Structured data map is included.
- LLM and agent discoverability plan is included.
- Responsive UX and accessibility rules are included.
- Partner funnel is part of the buyer-path map.
- Old /product/* engine pages, vertical demo pages, and later SEO landing pages are inventoried.
- Trust proof rubric is included.
- The document itself contains zero em dashes and zero decorative arrow glyphs.
- No public routes are touched.
- No runtime changes.
- No budget-guard changes.
- No Optimize logic changes.
- No migrations and no Neon SQL execution.
- .env.example is not staged unless that is the separate 3R-C commit.

3S overall (entire public surface) is accepted when:
- A cold visitor understands "P402 makes AI spend accountable" in under 10 seconds on the homepage.
- A qualified visitor reaches their next step in one click:
  Developer: Start free.
  Enterprise: Run AI Spend Audit.
  Compliance: See evidence.
  Partner: Apply as partner.
  Technical buyer: Read docs.
  Investor: Understand category and market wedge.
- /meter and forked buyer pages pass the anti-slop section checklist in section 5.
- /optimize, /control, and any settlement copy preserve gated-status language.
- llms.txt, llms-full.txt, sitemap.xml, robots.txt, and openapi.yaml are current.
- Structured data validates and matches visible content.
- Accessibility checks pass.
- Conversion analytics events fire under the taxonomy above.
- The marketing copy quality guard (3S-0B) runs clean against the public marketing routes.
- Old /product/* engine pages remain live with refreshed titles and forward links.
- Vertical demo pages remain live and link into the new buyer journey.

Out of acceptance for 3S:
- Hard pricing enforcement claims beyond what billing executes.
- Optimize recommendation claims.
- Runtime flip claims.
- Cloudflare routing claims.
- "Compliant" or "secure" claims without scope.
- Generic savings claims.
