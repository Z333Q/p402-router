# 3AQ: Tenant-Visible Draft Recommendation Plan

**Status:** plan only. No code. No new tenant surface implemented in this slice. No persistence. No apply path. No savings claim.
**Predecessor:** 3AP (`371784a`) — Internal Candidate Quality Review Pack.
**Successor:** to be decided per phase below. Implementation begins only after the §3 entry gate is met and this plan is accepted in writing.

## 0. Hard boundaries (true throughout 3AQ)

- Runtime enforcement: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- Apply path: blocked. No "Apply" button. No "Auto-apply" toggle. Not in 3AQ. Not in any of its phases.
- No prompt content read or stored.
- No response content read or stored.
- No background mutation of tenant configuration, allowlist, routing preference, or budget cap as a result of this surface.

What 3AQ *does* introduce: a tenant-visible, read-only **draft recommendation** surface that lets a tenant inspect a small, defensible set of candidates that have already passed internal review. Tenants can acknowledge, hold, decline, or escalate. They cannot apply, because apply does not exist.

## 1. Purpose and scope

3AP gave reviewers a way to convert internal candidates into reviewer-scored notes. 3AQ defines how a tenant would see the candidates that reviewers actively chose to expose, under the same accountability discipline that runs through the rest of the product.

In scope:

- The contract between an internally `accepted_for_draft_review` candidate and a tenant-visible draft.
- The page, API, and JSON shape a tenant would see.
- The tenant-side actions and their state transitions.
- The copy rules that make this surface defensible.
- The architecture sketch and the phased implementation gate.

Out of scope (deferred to separately approved slices, or out of the product entirely):

- Apply, rollback, configuration change, allowlist edit, budget edit.
- Savings number, percentage, or estimate.
- Recommendation generation, scoring, or auto-promotion outside the internal review path.
- Automatic email, in-app banner, or push notification on tenant.
- Any of the recommendation types Phase 1 does not implement (`cheaper_equivalent_model`, `provider_substitution`, `budget_cap_adjustment`).

## 2. Terminology

A four-tier separation. Mixing tiers is the most common way this surface goes wrong; the words exist to keep them apart.

| Tier | Word | Visibility | Means |
|---|---|---|---|
| 1 | `internal_candidate` | Internal only | Engine emitted it; no human has reviewed it. |
| 2 | `accepted_for_draft_review` | Internal only | Reviewer scored 4 or 5 per 3AP §4–5. Eligible to be promoted to tier 3. |
| 3 | `draft_recommendation` | **Tenant-visible** | A reviewer has explicitly published the candidate as a draft for this tenant. Still not applied. Still not a savings claim. |
| 4 | `recommendation` | Reserved | Does not exist in 3AQ. Reserved for a later phase that includes apply, rollback, and post-period measurement. Mentioning tier 4 in 3AQ artifacts is itself a copy bug. |

The only tier this plan introduces to tenants is **tier 3, "draft recommendation."** Anything written, shown, or sent to a tenant under 3AQ must explicitly use the word "draft" and never the bare word "recommendation."

## 3. Entry criteria (must be true before any 3AQ phase begins)

From 3AP §12. Restated to keep this doc self-contained:

1. At least **20** reviewed candidates with a final score recorded.
2. False-positive rate (candidates scored 1 or 2 / total reviewed) below the agreed threshold (initial: **0.30**).
3. At least **5** candidates scored **4** or **5**.
4. No candidate in `blocked_safety`.
5. Reviewer notes complete for every candidate counted above.
6. The internal value of the engine is explainable without claiming savings.
7. A draft of tenant-visible copy exists and reads acceptably without the word "savings."
8. This document (3AQ) is accepted in writing.

Failing any item blocks 3AQ phase 1. There is no exception path.

## 4. Tenant surface (planned, not implemented)

Single read-only page, gated behind existing tenant dashboard auth.

- Route (planned): `/dashboard/optimize/drafts`. Listed in the existing Optimize section of the dashboard nav under a clearly distinct label, **"Drafts (internal pilot)"**. Adding this route, the link, or the label is not permitted until §3 passes.
- API (planned): `GET /api/v2/optimize/drafts` and `GET /api/v2/optimize/drafts/:id`. Both read-only.
- Visibility: a tenant sees only drafts owned by the tenant. Cross-tenant exposure is forbidden by construction.
- Empty state (the most common state): a clear, single-paragraph message stating that no drafts exist for this tenant and that drafts only appear after explicit internal review.

The page is allowed to render *zero* drafts for months. Zero drafts is a normal, expected state. The empty state must read that way.

## 5. Display contract per draft

A draft renders the following fields and **only** these fields.

```
draft_id
type                    # see §2 of 3AJ for Phase 1 types
slice                   # tenant_id, workflow_id?, model_id?
window                  # start, end, days
evidence                # event count, outcome count, shadow count
                        # NEVER per-event content, NEVER prompts, NEVER responses
why                     # short narrative paragraph written by the reviewer
                        # (not generated, not templated from the type)
gates                   # list of {name, value, threshold, passed}
                        # rendered as a transparent gate strip, not a confidence number
status                  # draft | acknowledged | held | declined | escalated
created_at
last_updated_at
reviewer_initials       # who published the draft
```

What does **not** appear in the display, ever:

- A confidence score formatted as a percentage or letter grade.
- A dollar amount, currency symbol, percentage saved, or "estimated savings" field.
- A "recommendation" word in the bare form. The word is always "draft" or "draft recommendation."
- An "Apply," "Auto-apply," "Accept," or "Approve and apply" control.
- Any field whose value is derived from prompt or response content.
- A model name presented as a substitution suggestion. (`high_cost_workflow_review` is a workflow-level review, not a model substitution.)

The display is intentionally austere. A tenant should leave the page with a clear sense of what we observed, why we observed it, and what we are not claiming.

## 6. Tenant actions

A tenant can perform exactly the following actions. None of them mutate tenant configuration, policy, allowlist, or runtime behavior.

| Action | Means | Side effect |
|---|---|---|
| Acknowledge | "I have seen this." | Updates `status` to `acknowledged`. Records `last_updated_at`. |
| Hold | "Come back to me with more data." | Updates `status` to `held`. Optional `tenant_note`. |
| Decline | "Not interested, do not surface this again." | Updates `status` to `declined`. Optional `tenant_note`. The draft is hidden from the default view; reviewers can still inspect it internally. |
| Escalate | "I want to talk to someone." | Updates `status` to `escalated`. Sends an internal notification to the review group (Slack or equivalent), never an automated tenant communication. |

There is no Apply action. The four above are all the surface offers. Each is idempotent and reversible by re-issuing a different action.

A tenant action is allowed even if no `tenant_note` is provided. Notes are optional metadata, not justification.

## 7. Evidence inspection

A tenant can drill into a draft to see:

- The same `gates` list rendered on the row.
- A linkified evidence snapshot: counts only. Event id ranges are present in the JSON for an internal reviewer's benefit, but the tenant-rendered drill-down displays counts and window bounds, not raw ids.
- The reviewer's `why` paragraph.
- A standing footer line that reads: *"P402 makes AI spend accountable before optimization begins. Drafts are observations under internal review. Nothing here changes your configuration."*

Drill-down does **not** expose:

- Cost-per-accepted-outcome or any derived dollar amount.
- A predicted impact, even with a confidence interval. Predictions belong to the post-period measurement phase, which does not exist in 3AQ.
- The internal reviewer's score (1–5). The score lives in 3AP's review notes, not on tenant-facing surfaces.

## 8. Copy rules

Bound rules. Violations are merge blockers for any 3AQ implementation slice.

- The word "draft" must precede every use of "recommendation."
- The phrase "verified savings" must not appear.
- The phrase "estimated savings" must not appear.
- The phrase "auto-apply" must not appear.
- The phrase "automatically optimize" must not appear.
- The standing footer line in §7 must appear on every drill-down view.
- A tooltip on every gate row explains in one sentence what that gate measures. No tooltip claims an outcome.

A source-shape test should later assert these copy bounds across the route source.

## 9. State machine

Draft lifecycle from the moment a reviewer publishes it.

```
draft → acknowledged
     → held
     → declined
     → escalated → (reviewer-driven) → withdrawn
```

Notes:

- A draft is **withdrawn** only by an internal reviewer, never by a tenant action. Withdrawal removes the draft from the tenant view and records the reason in internal review notes.
- No `applied` state. No `measured` state. No `savings_verified` state. Adding any of these is out of scope for 3AQ.
- Terminal states are `declined`, `withdrawn`, and (for the purposes of tenant view) `acknowledged` once it has been visible for an internally agreed cooldown window.

## 10. Notifications

In 3AQ phase 1, the surface is **pull only**. A tenant sees drafts when they navigate to the page. No email, no in-app banner, no push, no dashboard badge tells them that drafts exist.

A tenant-pull-only posture is intentional: it removes any pressure to act, and it keeps the surface from becoming a sales channel. Notifications belong to a later, separately approved phase whose entry gate includes a check that notifications are not perceived as upsell.

## 11. Safety, data, and access rules

- Tenant scoping: every database read on the draft tables is parameterized on `tenant_id = $1`. Cross-tenant queries are forbidden.
- No prompt or response content is read or stored at any point in the draft pipeline.
- Internal reviewers can publish a draft only via an admin-gated path (`requireAdminAccess('system.*')` per 3AM convention); tenants cannot create or edit drafts.
- The tenant-facing API surface contains only `GET` endpoints and the four action `POST` endpoints listed in §6. No `PATCH`, `PUT`, or `DELETE` is introduced for tenants.
- The draft tables (if introduced) are append-mostly: state transitions are recorded as additional rows with timestamps, not as in-place mutations.
- Rate limiting on tenant actions follows the existing tenant API rate-limit policy; no new posture is introduced.

## 12. Architecture sketch (planned shapes, not DDL)

The minimum viable shape, sketched at the level of names and intent:

```
optimize_drafts                       # one row per published draft
  id, tenant_id, candidate_ref,
  type, slice_json, window_json,
  evidence_summary_json,              # counts only
  gates_json,
  why_text,
  reviewer_id, reviewer_initials,
  current_status,                     # mirrors §9 terminal state
  created_at, last_updated_at

optimize_draft_actions                # append-only ledger
  id, draft_id, actor_kind,           # 'tenant' | 'reviewer'
  actor_ref,
  action,                             # acknowledge | hold | decline | escalate | publish | withdraw
  tenant_note,                        # optional
  created_at
```

What this sketch is **not**:

- It is not a migration. No DDL is included.
- It is not a code contract. Field names will be revisited when phase 1 implementation is planned.
- It does not bind to any specific persistence target. Postgres is the obvious choice; the decision is deferred to phase-level planning so that an internal JSON store could be used during phase 0 prototyping.

What this sketch is:

- An explicit assertion that the tenant-visible state and the reviewer-driven history are kept in separate tables. The action ledger is the source of truth; `current_status` is a denormalized projection for cheap reads.
- An explicit assertion that no content fields are part of the schema.

## 13. Implementation phases (each independently approvable)

Each phase has its own go / no-go gate (§14). Nothing later than 3AQ-0 is approved by this document.

| Phase | Name | Output |
|---|---|---|
| **3AQ-0** | This plan | The plan you are reading. Docs only. |
| **3AQ-1** | Reviewer publish path | Internal-only path for a reviewer to publish an `accepted_for_draft_review` candidate as a draft. Stored in an internal store, not yet tenant-visible. No tenant route. |
| **3AQ-2** | Tenant read-only surface | `/dashboard/optimize/drafts` and `GET /api/v2/optimize/drafts`. Renders drafts. No tenant actions yet. |
| **3AQ-3** | Tenant actions | Acknowledge, Hold, Decline, Escalate. Action ledger persistence. No notifications. |
| **3AQ-4** | Reviewer withdrawal + cooldowns | Reviewer can withdraw; cooldown rules per state. Still no apply. |
| **3AQ-5** | Tenant copy review | Independent copy review (legal or PMM) on the rendered surface against §8 rules. |
| **3AQ-6** | Open question: notifications | Notifications **may** be considered in a separately approved slice. Default answer is "no." Requires evidence that absence of notifications is the bottleneck before this phase is even planned. |

`Apply` is not on this list. It is in a different track that has not been planned and that this plan does not authorize.

## 14. Go / no-go criteria (per-phase)

**3AQ-0 → 3AQ-1**
- §3 entry criteria met.
- This document accepted in writing.

**3AQ-1 → 3AQ-2**
- Reviewer publish path tested against fixture and at least one internal review meeting's accepted candidates.
- Internal store contains only the fields listed in §12, no content fields.
- Source-shape tests forbid prompt/response content, savings phrasing, and apply-style verbs across the new code paths.

**3AQ-2 → 3AQ-3**
- Tenant page renders the empty state cleanly for tenants with zero drafts.
- Drill-down displays the §5 contract exactly, no extra fields.
- Independent copy reviewer reads the surface aloud without uttering the word "savings."

**3AQ-3 → 3AQ-4**
- Action ledger persists state transitions append-only.
- A reviewer can reconstruct every draft's state from the ledger alone.
- No code path mutates tenant configuration, policy, or routing as a side effect of any action.

**3AQ-4 → 3AQ-5**
- Withdrawal works and removes the draft from tenant view immediately.
- Cooldown rules are agreed and configurable.

**3AQ-5 → 3AQ-6**
- Copy review passes.
- No standing copy bug is open.

**3AQ-6 → (notification phase, if ever)**
- Evidence shows that absent notifications, tenants are missing high-quality drafts that they would value.
- A separate plan exists that proves notifications cannot read as upsell.

## 15. What 3AQ does not change

Even fully implemented, 3AQ leaves all of the following unchanged:

- Tenant configuration, allowlist, budget caps, routing preference.
- Runtime enforcement posture (still blocked).
- Verified savings posture (still blocked).
- Optimize recommendations as a generated product (Phase 1 internal-only).
- The accountability chain: Meter → Monitor → Control → Shadow Evidence → Prove → Outcomes → Optimize Readiness. 3AQ sits inside Optimize Readiness; it does not graduate Optimize to a new tier.

## 16. Closing reminder

The bridge from internal review to a tenant-visible *draft* is the smallest possible step from "we know" to "the tenant knows we know." It is not the step to "we did something about it." That step has its own track, its own gates, and is not authorized here.

Until each phase is explicitly approved, the boundaries hold.
