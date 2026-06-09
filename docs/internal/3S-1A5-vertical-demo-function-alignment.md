# 3S-1A.5: Vertical Demo Function Alignment Review

Status: read-only review. No code or copy changes in this slice.
Predecessors: 3S-1A (commit `bda09f9`, /meter canonical buyer-page template).
Successors: 3S-1A.6 (vertical demo CTA and copy alignment), then 3S-1B (/monitor, /control, /prove buyer pages).

This review audits the existing vertical demos against the P402 truth document and the new /meter canonical buyer-page template (3S-0 §4). It does not edit any demo page. It produces the function-and-CTA decisions that 3S-1A.6 will execute.

---

## 1. Executive summary

The dashboard side is well aligned. `lib/demo/scenarios.ts` defines four canonical scenarios (`enterprise_ai_spend_control`, `healthcare_prior_auth`, `legal_mna_due_diligence`, `real_estate_tenant_screening`) with strict safety labels: synthetic data, no PHI, no real PII, human final decision required, Optimize recommendations blocked, no prompt or response content. The dashboard pages (`/dashboard`, `/dashboard/accountability`, `/dashboard/prove`, `/dashboard/prove/outcomes`, `/dashboard/prove/event/[id]`) already preserve `demo=1&scenario=…` across navigation via `withDemoQs()`.

The public /meter vertical pages and their `/meter/about/*` case studies are looser. They predate 3S-0 and predate the dashboard scenario contract:

- `app/meter/enterprise/page.tsx`, `app/meter/about/enterprise/page.tsx`: claim "30–70% routing savings" with heuristic confidence scores (88–97%) on synthetic data. No measured baseline. Violates 3S-0 §0.
- `app/meter/about/page.tsx`: same 30–70% claim plus "577× cheaper than Stripe minimum" and "per-token billing is structurally impossible on every other rail."
- `app/meter/legal/page.tsx`, `app/meter/about/legal/page.tsx`: claim P402 ledger "satisfies ABA Formal Opinion 512." Opinion 512 prescribes understanding and supervision, not onchain settlement. Routing quality parity (Flash for NDAs, Pro for MSAs) is asserted without evidence.
- `app/meter/real-estate/page.tsx`, `app/meter/about/real-estate/page.tsx`: claim fraud score thresholds without validation, and frame HUD fair-housing compliance as something the ledger provides.
- `app/meter/healthcare/page.tsx`, `app/meter/about/healthcare/page.tsx`: correctly bounded. Explicit "Synthetic Records Only," explicit human-review gate, explicit "no autonomous denial." HIPAA boundary stated as scope, not assumed.

None of the vertical /meter pages currently link to the dashboard demo surfaces. The dashboard scenario plumbing exists and is correct; the public pages do not yet use it. That is the gap 3S-1A.6 must close.

The recommendation is: keep all four vertical demos. Treat them as proof objects per 3S-0 §4. In 3S-1A.6, scrub the unsafe claims, align each page on its scenario's `framing_disclaimer` from `lib/demo/scenarios.ts`, and replace the existing in-page anchor CTAs with explicit dashboard demo destinations using the canonical scenario aliases.

---

## 2. Scenario alias map (from `lib/demo/scenarios.ts`)

| Public route | Canonical scenario id | Accepted aliases (case-insensitive) | Dashboard query string |
| --- | --- | --- | --- |
| `/meter` | `enterprise_ai_spend_control` (default) | `enterprise`, `enterprise_ai_spend_control` | `demo=1` (default scenario omitted) |
| `/meter/enterprise` | `enterprise_ai_spend_control` | same | `demo=1` |
| `/meter/healthcare` | `healthcare_prior_auth` | `healthcare`, `healthcare_prior_auth` | `demo=1&scenario=healthcare_prior_auth` |
| `/meter/legal` | `legal_mna_due_diligence` | `legal`, `legal_mna_due_diligence` | `demo=1&scenario=legal_mna_due_diligence` |
| `/meter/real-estate` | `real_estate_tenant_screening` | `real_estate`, `real-estate`, `real_estate_tenant_screening` | `demo=1&scenario=real_estate_tenant_screening` |

Resolution rules: `getDemoScenario()` lowercases the query value and uses `Object.hasOwn` on the alias map. Unknown values fall back to `DEFAULT_SCENARIO` (`enterprise_ai_spend_control`). Demo mode itself is gated by `isDemoMode()`; the scenario value is ignored unless `demo=1` is present.

Dashboard pages that preserve `demo=1` and `scenario=…` across navigation (verified via grep `withDemoQs|getDemoScenario|searchParams.*demo`):

- `app/dashboard/page.tsx`
- `app/dashboard/accountability/page.tsx`
- `app/dashboard/prove/page.tsx`
- `app/dashboard/prove/outcomes/page.tsx`
- `app/dashboard/prove/event/[request_id]/page.tsx`

These are safe demo-CTA destinations. No other dashboard page is currently scenario-aware.

---

## 3. Demo-by-demo audit

### 3.1 `/meter/enterprise`

| Field | Value |
| --- | --- |
| Current page purpose | Live or synthetic org KPI dashboard with department breakdown, employee leaderboard, model mix, budget projections, routing-optimization panel. |
| Current buyer | CFO, CTO, head of AI, finance ops. |
| Current core workflow | Aggregate spend across departments/employees with projected month-end spend and "routing optimization findings." |
| Current CTA destinations | `Connect` to `/api/v2/enterprise/analytics`; `Case Study` to `/meter/about/enterprise`; `All Demos` to `/meter`. |
| Current dashboard destination | None. Page is self-contained synthetic dashboard; no link into `/dashboard?demo=1&scenario=enterprise_ai_spend_control`. |
| What it currently proves | Department/employee attribution. Heuristic "30–70%" routing savings on synthetic tasks. |
| What it should prove (truth) | Meter (event-level attribution), Monitor (visibility by owner/dept/workflow/model/provider), Prove (event detail and report). Optimize remains gated; do not present savings as live recommendations. Control surfaces budgets but does not claim runtime enforcement. |
| P402 layers to demonstrate | Meter, Monitor, Prove. Control surfaced as visibility only. Optimize gated. Settle not required for this vertical. |
| Unsafe / outdated / over-scoped claims | "30–70% routing savings" with heuristic confidence. "Routing code completion to Haiku saves 87%." Month-end projection rendered as forecast without disclaimer. "Anomaly detection triggered Sentinel review": Sentinel not defined. |
| Privacy / human-review boundary | Synthetic vs Live mode toggle exists. Avoid employee-ranking framing per 3S-0 §5; the page uses an "employee leaderboard" which risks surveillance framing. |
| Scenario key | `enterprise_ai_spend_control`. |
| Dashboard destination (recommended) | `/dashboard?demo=1` (default scenario), plus secondary deep links to `/dashboard/accountability?demo=1` and `/dashboard/prove?demo=1`. |
| Recommended action | Keep. Revise CTAs to link the dashboard scenario surfaces. Strip routing-savings claims. Reframe "employee leaderboard" as "budget allocation by team" per 3S-0 §5 employee-analytics language. |

### 3.2 `/meter/healthcare`

| Field | Value |
| --- | --- |
| Current page purpose | Prior authorization demo with HIPAA-aligned demo mode, synthetic records, human review gate, oversight packet export. |
| Current buyer | VP Utilization Management, Director Prior Authorization, CMO staff, compliance, Medicaid plan ops. |
| Current core workflow | Documentation extraction, completeness check, criteria mapping, reviewer summary, RFI-reason drafting. |
| Current CTA destinations | `Run Medicaid PA Demo` to `#demo`; `View Compliance Trace` to `#compliance-trace`; `About` to `/meter/about/healthcare`; `All Demos` back-link to `/meter`. |
| Current dashboard destination | None. In-page anchor demo. |
| What it currently proves | Per-operation receipts. 5-level budget hierarchy. Human review gate. Synthetic packet with SYN- prefixed IDs. |
| What it should prove (truth) | Meter (each AI operation is attributed). Monitor (cost and workflow activity). Control (rule checks, budget cap surfaces). Prove (evidence exportable). Privacy boundary: no PHI in public demo. Human review required. |
| P402 layers to demonstrate | Meter, Monitor, Control (visibility only), Prove, Privacy. Optimize gated. Settle optional. |
| Unsafe / outdated / over-scoped claims | None significant. Page is already aligned with the dashboard scenario's safety labels. |
| Privacy / human-review boundary | Explicit. `safety_labels` already enforce "No PHI", "Admin / non-clinical use", "Human approval required", "URAC-aligned audit posture". Reuse `framing_disclaimer`: "P402 does not make medical decisions." |
| Scenario key | `healthcare_prior_auth`. |
| Dashboard destination (recommended) | `/dashboard?demo=1&scenario=healthcare_prior_auth` and `/dashboard/prove?demo=1&scenario=healthcare_prior_auth`. |
| Recommended action | Keep. Add explicit dashboard CTAs alongside the existing in-page demo runner. No copy rewrite required. |

### 3.3 `/meter/legal`

| Field | Value |
| --- | --- |
| Current page purpose | M&A due diligence on a synthetic 8-document data room with tier routing and cross-document conflict detection. |
| Current buyer | Law firm partner, in-house GC, legal ops director, M&A associate. |
| Current core workflow | Per-document classification with complexity score; Flash for simple, Pro for complex; cross-document conflict surfacing; matter-level cost rollup. |
| Current CTA destinations | `Run Demo` to `#demo`; `Case Study` to `/meter/about/legal`; `Full Legal Case Study` to `/meter/about/legal`; `All Demos` back-link to `/meter`. |
| Current dashboard destination | None. In-page anchor demo. |
| What it currently proves | Tier routing. Cross-document conflicts. Per-matter cost. |
| What it should prove (truth) | Meter (per-document cost and attribution). Monitor (matter-level rollup). Prove (event detail supports legal-ops review). Privacy (synthetic data room, no real contracts). Human legal review required. |
| P402 layers to demonstrate | Meter, Monitor, Prove. Control via budget caps if shown. Optimize gated. Settle optional. |
| Unsafe / outdated / over-scoped claims | "P402 ledger satisfies ABA Formal Opinion 512": overclaim. Routing quality parity ("Flash adequately handles NDAs, Pro adequately handles MSAs"): asserted without evidence. "Specialist agent under MPP escrow": not implemented in this page. "Paralegal equivalent: $200–800": asymmetric labor cost comparison. |
| Privacy / human-review boundary | Implicit. Should adopt the dashboard scenario `safety_labels`: "Synthetic data room", "No real client contracts", "Human legal review required", "ABA-aligned audit posture". |
| Scenario key | `legal_mna_due_diligence`. |
| Dashboard destination (recommended) | `/dashboard?demo=1&scenario=legal_mna_due_diligence` and `/dashboard/prove?demo=1&scenario=legal_mna_due_diligence`. |
| Recommended action | Revise copy (strip ABA "satisfies" claim and routing-quality assumption; mark specialist-agent as future). Revise CTAs to dashboard scenarios. Keep workflow demo. |

### 3.4 `/meter/real-estate`

| Field | Value |
| --- | --- |
| Current page purpose | Tenant application screening across 3 synthetic applicants (clean, mismatch, fraud) with multimodal extraction and a fraud score. |
| Current buyer | Property management co, multi-family REIT, leasing platform, landlord. |
| Current core workflow | Flash extracts structured fields from 4 documents per applicant. Pro cross-checks income, identity, and bank statement. Fraud score and escalation threshold. |
| Current CTA destinations | `Screen Applicant` to `#demo`; `Case Study` to `/meter/about/real-estate`; `Full Real Estate Case Study` to `/meter/about/real-estate`; `All Demos` back-link to `/meter`. |
| Current dashboard destination | None. In-page anchor demo. |
| What it currently proves | Multimodal extraction. Cross-document consistency. Fraud signal scoring. |
| What it should prove (truth) | Meter (each document/screening step has cost and attribution). Monitor (applicant or workflow-level spend). Prove (evidence exists for review). Privacy (synthetic documents). Human decision required. |
| P402 layers to demonstrate | Meter, Monitor, Prove. Control via budget caps if shown. Optimize gated. Settle optional. |
| Unsafe / outdated / over-scoped claims | Fraud score threshold rendered as authoritative without validation. "HUD fair-housing audit trail" framed as compliance artifact; HUD does not prescribe onchain settlement. "Specialist fraud agent under MPP escrow": not implemented. "AI never makes final decision" is correctly stated in the about page but not surfaced clearly in the demo page hero. |
| Privacy / human-review boundary | Implicit. Should adopt dashboard scenario `safety_labels`: "Synthetic applicants", "No real PII", "Human final decision required", "HUD fair-housing audit posture". |
| Scenario key | `real_estate_tenant_screening`. |
| Dashboard destination (recommended) | `/dashboard?demo=1&scenario=real_estate_tenant_screening` and `/dashboard/prove?demo=1&scenario=real_estate_tenant_screening`. |
| Recommended action | Revise copy (clearly surface "human final decision required" in the hero; soften HUD claim from "audit trail satisfies" to "fair-housing audit posture, decisions made by the property manager"; mark specialist-agent as future). Revise CTAs to dashboard scenarios. Keep workflow demo. |

### 3.5 `/meter/about` and `/meter/about/<vertical>`

`/meter/about` carries the "30–70% routing savings" claim across all four verticals, plus the "577× cheaper than Stripe minimum" framing. Both must be removed under 3S-0 §0 (no savings claims without measured baseline) and §6 (no unsupported "structurally impossible" overclaim). The four `/meter/about/<vertical>` case studies inherit the verticals' unsafe claims plus add their own elaborations (Acme Corp projection table in enterprise; ABA 512 in legal; HUD framing in real estate).

Recommended action for the `about` pages: revise as part of 3S-1A.6. Do not split into separate pages. Keep them as deep-dive case studies. Strip the same claim families listed above. Re-anchor each case study to the dashboard scenario it represents.

---

## 4. Product-layer alignment matrix

What each vertical should prove against the P402 system line (Meter, Monitor, Control, Optimize, Settle, Prove):

| Vertical | Meter | Monitor | Control | Optimize | Settle | Prove | Privacy | Human review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Enterprise | ✓ event-level | ✓ owner/dept/workflow/model/provider | visibility only (no runtime claim) | gated (no recommendations) | not required | ✓ event detail and report | metadata-only mode visible | n/a (departmental policy) |
| Healthcare | ✓ per AI operation | ✓ workflow and case activity | rule checks visible (no autonomous denial) | gated | optional | ✓ oversight packet export | no PHI in public demo | required |
| Legal | ✓ per document | ✓ matter-level rollup | budget caps if shown (no runtime claim) | gated | optional | ✓ event detail for legal ops | synthetic data room | required (final judgment) |
| Real estate | ✓ per document/applicant | ✓ applicant/workflow level | budget caps if shown (no runtime claim) | gated | optional | ✓ event detail for fair-housing review | synthetic applicants | required (final decision) |

Cross-cutting non-claims (every vertical must avoid):
- "Optimize recommendations are live." Gated.
- "Runtime enforcement is live." Gated until flip-readiness passes.
- "Cloudflare routing is enabled." Not enabled.
- Generic savings percentages without measured baseline.
- "We never store content" (privacy overclaim; false in `full_trace` opt-in).
- Compliance overclaims ("satisfies HIPAA/HUD/ABA"). Use scope-named posture language: "HIPAA-aligned demo mode for synthetic records," "HUD fair-housing audit posture," "ABA-aligned audit posture."

---

## 5. Unsafe or outdated claim list (consolidated)

### Class A: hard claims to strip in 3S-1A.6

1. "30–70% routing savings." Source: `/meter/about/page.tsx`, `/meter/about/enterprise/page.tsx`, `/meter/enterprise/page.tsx`. Reason: no measured baseline. 3S-0 §0.
2. "577× cheaper than Stripe minimum." Source: `/meter/about/page.tsx`, original `/meter/page.tsx` (already removed in 3S-1A). Reason: arithmetic depends on unit definition; comparison is unbalanced.
3. "Per-token billing is structurally impossible on every existing payment rail." Source: `/meter/about/page.tsx`. Reason: overclaim conflating economic and technical feasibility.
4. "P402 ledger satisfies ABA Formal Opinion 512." Source: `/meter/about/legal/page.tsx`, `/meter/legal/page.tsx`. Reason: Opinion 512 prescribes understanding and supervision, not onchain settlement.
5. "HUD fair-housing audit trail" framed as compliance artifact. Source: `/meter/real-estate/page.tsx`, `/meter/about/real-estate/page.tsx`. Reason: HUD regs do not prescribe onchain settlement. Reframe as "HUD fair-housing audit posture" matching scenario `safety_labels`.
6. "Specialist agent under MPP escrow" presented as working. Source: legal and real-estate about pages. Reason: not implemented. Reframe as future capability.
7. "Sentinel review triggered." Source: `/meter/about/enterprise/page.tsx`. Reason: Sentinel system not defined in the public surface. Either define or remove.

### Class B: tone / framing to adjust

8. "Employee leaderboard" on `/meter/enterprise`. Reframe to "budget allocation by team" or "workflow value by team" per 3S-0 §5 employee-analytics language. No punitive ranking.
9. "Paralegal equivalent: $200–800" and similar manual-labor cost anchors. Reframe as "operating cost in the legacy workflow" without lower- or upper-bound asymmetry.
10. Month-end "projected spend" on `/meter/enterprise` without disclaimer. Add disclaimer that projection assumes synthetic velocity holds.
11. Metric-as-CTA pattern. Source: prior versions of `/meter` and any vertical that surfaces chips like `55+ events per session`, `577× cheaper`, `<$0.000001 per settlement` as headline calls-to-action. Reframe as proof chips with an explicit business meaning ("this workflow records 55+ economic events across model calls, budget checks, outcomes, and evidence status"), and only when the count is current, repeatable, and tied to the displayed demo. CTAs remain action verbs (`Install Meter`, `View dashboard proof`, `See evidence`, `Run AI Spend Audit`, `Start with one metered event`).

### Class C: claims already correct

11. Healthcare page's "no autonomous denial," "Synthetic Records Only," HIPAA boundary as scope (not assumption). Keep as is.
12. Dashboard scenario `framing_disclaimer` strings in `lib/demo/scenarios.ts`. These are the canonical disclaimer texts. Vertical pages should match them, not the other way around.

---

## 6. Recommended CTA map

Three pass-through guidance rules:
- **Primary CTA per vertical demo** is the buyer action `View dashboard proof`. Destination: the dashboard scenario surface so the buyer sees Meter, Monitor, and Prove working with the named scenario.
- **Secondary CTA per vertical demo** is `See evidence`. Destination: the Prove scenario surface.
- **Footer CTA** points at `/meter/about/<vertical>` (case study), which is the deeper narrative.

CTA-label rule (applies to every vertical):
- CTAs must read as buyer actions, not metrics. `Install Meter`, `See dashboard`, `View dashboard proof`, `See evidence`, `Start with one metered event`, `Run AI Spend Audit`, `Read the docs`. Not `55+ events per session`, not `577× cheaper`, not `<$0.000001 settlement`. Metrics belong in proof chips, not CTAs.
- Proof chips and metrics may appear below the hero, attached to specific demo workflows, with an explicit business meaning: "This workflow records 55+ economic events across model calls, budget checks, outcomes, and evidence status." Never as a standalone count without that context.

### `/meter/enterprise`

| Position | Label | Destination |
| --- | --- | --- |
| Hero primary | `View dashboard proof` | `/dashboard?demo=1` |
| Hero secondary | `See evidence` | `/dashboard/prove?demo=1` |
| Hero tertiary | `Run AI Spend Audit` | `/get-access?intent=ai-spend-audit` |
| Footer | `Case study` | `/meter/about/enterprise` |

### `/meter/healthcare`

| Position | Label | Destination |
| --- | --- | --- |
| Hero primary | `View dashboard proof` | `/dashboard?demo=1&scenario=healthcare_prior_auth` |
| Hero secondary | `See evidence` | `/dashboard/prove?demo=1&scenario=healthcare_prior_auth` |
| Hero tertiary | `Run prior auth demo` | `#demo` (existing in-page demo, unchanged) |
| Footer | `Case study` | `/meter/about/healthcare` |

### `/meter/legal`

| Position | Label | Destination |
| --- | --- | --- |
| Hero primary | `View dashboard proof` | `/dashboard?demo=1&scenario=legal_mna_due_diligence` |
| Hero secondary | `See evidence` | `/dashboard/prove?demo=1&scenario=legal_mna_due_diligence` |
| Hero tertiary | `Run M&A demo` | `#demo` (existing in-page demo, unchanged) |
| Footer | `Case study` | `/meter/about/legal` |

### `/meter/real-estate`

| Position | Label | Destination |
| --- | --- | --- |
| Hero primary | `View dashboard proof` | `/dashboard?demo=1&scenario=real_estate_tenant_screening` |
| Hero secondary | `See evidence` | `/dashboard/prove?demo=1&scenario=real_estate_tenant_screening` |
| Hero tertiary | `Run screening demo` | `#demo` (existing in-page demo, unchanged) |
| Footer | `Case study` | `/meter/about/real-estate` |

No vertical CTA should point at `/dashboard/accountability` directly. Accountability is a deeper read inside Mission Control and is reachable from `/dashboard` once the buyer is there. Direct linking adds friction without a stronger story.

`Run AI Spend Audit` only appears on `/meter/enterprise` (enterprise buyer). Healthcare, legal, and real estate buyers go to the dashboard scenario; the audit is an enterprise-procurement motion that does not fit a single vertical workflow.

The hero `Install Meter` CTA from the canonical `/meter` buyer page is not repeated on the verticals because the verticals already assume the buyer has read `/meter`.

---

## 7. Recommended implementation slices

### 3S-1A.6: Vertical Demo CTA and Copy Alignment

Single slice. Edits the four vertical demo pages and the five about pages. No dashboard changes. No `lib/demo/*` changes (scenario contract already correct).

Scope:
- `app/meter/enterprise/page.tsx`
- `app/meter/healthcare/page.tsx`
- `app/meter/legal/page.tsx`
- `app/meter/real-estate/page.tsx`
- `app/meter/about/page.tsx`
- `app/meter/about/enterprise/page.tsx`
- `app/meter/about/healthcare/page.tsx`
- `app/meter/about/legal/page.tsx`
- `app/meter/about/real-estate/page.tsx`

Edits per page:
1. Strip every Class A claim listed in §5.
2. Reframe every Class B claim listed in §5.
3. Add a hero CTA pair pointing at the dashboard scenario URLs in §6.
4. Surface the dashboard scenario `safety_labels` from `lib/demo/scenarios.ts` near the hero. Use the canonical `framing_disclaimer` near the demo runner.
5. Remove em dashes and arrow glyphs (the marketing copy guard currently shows the bulk of its findings on these pages).
6. Keep existing in-page demo flows, components, and stores untouched.
7. Keep the `/meter/about/*` deep narrative structure; do not split or merge pages.

Acceptance for 3S-1A.6:
- Marketing copy guard reports zero findings on all nine pages.
- `npx tsc --noEmit` clean.
- Build green.
- All hero CTAs resolve to a valid dashboard route preserving `demo=1[&scenario=…]`.
- Each vertical's hero surfaces the matching `framing_disclaimer` text from `lib/demo/scenarios.ts`.

### Then 3S-1B (existing plan)

Fork `/monitor`, `/control`, `/prove` from `/meter` (3S-1A) buyer template.

---

## 8. Explicit non-goals

- No changes to the dashboard scenario contract in `lib/demo/scenarios.ts` or `lib/demo/accountability-story.ts`.
- No changes to the dashboard pages (`/dashboard`, `/dashboard/accountability`, `/dashboard/prove`, `/dashboard/prove/outcomes`, `/dashboard/prove/event/[id]`).
- No new vertical demos.
- No new dashboard demos.
- No new scenario keys.
- No new aliases beyond the existing five.
- No changes to in-page demo runners (`#demo`), demo stores (`_store/`), demo components (`_components/`), or demo fixtures (`_demo/`).
- No runtime enforcement changes. No budget-guard changes. No Optimize logic changes. No migrations. No Neon SQL execution. No settlement code changes. No contracts. No Bazaar flow changes. No pricing changes.
- No homepage rewrite.
- No `/monitor`, `/control`, `/optimize`, `/settle`, `/prove`, `/enterprise`, `/developers`, `/ai-spend-audit`, `/pricing`, `/trust`, `/partners` rewrites.
- No CI wiring of `check:marketing-copy`. Remains report-only.
- Runtime flip remains blocked. Optimize recommendations remain blocked.

---

## 9. Acceptance criteria before any demo CTA changes

3S-1A.5 (this review) is accepted when:
- All four vertical demos and five about pages are inventoried (§3).
- Scenario alias map captured against `lib/demo/scenarios.ts` (§2).
- Product-layer alignment matrix captured (§4).
- Unsafe-claim list captured with Class A / B / C split (§5).
- Recommended CTA map produced for every vertical (§6).
- 3S-1A.6 slice scope and acceptance defined (§7).
- Explicit non-goals listed (§8).
- No code or copy changes made by this review.

3S-1A.6 (implementation) is accepted when:
- All Class A claims removed across the nine pages.
- All Class B claims reframed.
- Hero CTAs on each vertical demo point at the dashboard scenario URLs in §6.
- Canonical `framing_disclaimer` and `safety_labels` surfaced near each vertical demo hero.
- Marketing copy guard reports zero findings on the nine modified files.
- `npx tsc --noEmit` clean, build green, tests pass.
- No vertical demo runner (`#demo` flow) regresses.
- No dashboard demo behavior changes.
- No runtime, budget-guard, Optimize, migration, Neon SQL, contract, settlement, or Bazaar changes.
