# 3AP: Internal Candidate Quality Review Pack

**Status:** docs only. Internal-only review framework. No code. No runtime change. No new product behavior.
**Predecessor:** 3AN (`4c63850`) — Internal candidate surface cleanup.
**Successor (planned, not approved):** 3AQ — Tenant-Visible Draft Recommendation Plan.

## 0. Hard boundaries (true throughout this pack)

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- Candidate persistence: not in Phase 1.
- No prompt or response content read or stored.

Nothing in this pack changes any of the above. This is a review framework, not a product surface.

## 1. Purpose

This pack helps internal reviewers (engineering + product) judge whether the candidates produced by the Phase 1 generator are good enough to advance toward tenant-visible *draft* recommendations in a later, separately approved phase.

It exists because the gap between "the engine produced a candidate" and "we are willing to show a buyer a recommendation" is large, deliberate, and not crossable on confidence-score alone. Human review is the bridge.

The output of using this pack is **review notes**, not recommendations. Notes stay in this repository (or an internal tracker), are visible only to internal reviewers, and never reach a tenant surface.

## 2. Candidate types under review

Phase 1 types only:

- `missing_outcome_coverage`
- `high_cost_workflow_review`
- `model_allowlist_cleanup`

Explicitly **out of scope** for this pack, and out of scope for Phase 1 in general:

- `cheaper_equivalent_model`
- `provider_substitution`
- `budget_cap_adjustment`
- verified savings
- apply workflow
- rollback workflow
- policy auto-apply
- runtime enforcement
- tenant-visible recommendations

If a reviewer finds themselves talking about any of these, they are out of scope. Document the conversation, do not act on it, and bring it back to a future planning slice.

## 3. Reviewer checklist

For each candidate the reviewer must answer, in order:

1. **Evidence completeness.** Does `evidence_snapshot` contain a non-trivial event/outcome/shadow id range for the asserted slice and window?
2. **Data volume.** Is the event count meaningful relative to the tenant's typical traffic? A 10-event slice is rarely meaningful.
3. **Attribution quality.** Is `comp_attr` close to 1.00? If material spend is unattributed, the slice itself is suspect.
4. **Outcome coverage.** Does coverage match the type's logic? (Low for `missing_outcome_coverage`; high for `high_cost_workflow_review`.)
5. **Confidence score.** Is the score comfortably above `CONFIDENCE_MIN` (0.70) or is it borderline?
6. **Gate results.** Read each gate's `value` vs `threshold` and confirm none is "barely passing."
7. **Actionable.** If the candidate were shown to a tenant in a later phase, what would the tenant do with it? If the answer is "nothing concrete," the candidate is not actionable.
8. **False-positive risk.** Is there a plausible alternative explanation for this signal? See §8.
9. **Should it stay internal?** Is the reasoning defensible to a buyer, or only to an engineer with full context?
10. **More data required?** Would a longer window, more outcomes, or better attribution change the answer?

If any of 1–6 fails, score the candidate **1** or **2** without further debate. Reviewer time is finite.

## 4. Quality scoring rubric

A single integer per candidate.

| Score | Meaning |
|---|---|
| **1** | Reject. Evidence is missing, the slice is nonsense, or the type does not fit the data. |
| **2** | Noisy, keep internal. Real signal but too thin, too narrow, or too easily explained away. |
| **3** | Plausible, needs more data. Signal looks real but the baseline window or outcome coverage is insufficient. |
| **4** | Strong internal candidate. Defensible, well-supported, would survive an internal challenge. Still internal. |
| **5** | Eligible for a future draft-recommendation phase. The candidate is strong, evidence is complete, false-positive paths are ruled out, and there is no remaining internal objection. |

**Score 5 is not a recommendation.** It is a status that means "if a tenant-visible draft phase existed, this candidate would be eligible to be considered for that phase." There is no tenant-visible draft phase today.

A reviewer may not score a candidate **5** unless every checklist item in §3 passes and every false-positive category in §8 has been actively considered and ruled out.

## 5. Review status model

Internal-only statuses. No tenant-visible state.

| Status | Meaning |
|---|---|
| `internal_candidate` | Default. The engine emitted it; no one has reviewed it. |
| `rejected_internal` | Reviewed, scored 1, will not be revisited unless data materially changes. |
| `needs_more_data` | Reviewed, scored 2 or 3. The candidate is held pending a longer window or better outcome attribution. |
| `accepted_for_draft_review` | Reviewed, scored 4 or 5. Eligible for consideration in a future, separately approved draft-recommendation phase. |
| `blocked_safety` | Reviewed and held because shipping anything related to this candidate could harm a tenant (e.g., policy would itself fail policy). |
| `blocked_low_confidence` | The confidence score is below threshold or unstable. Not actionable without re-running on better data. |

There is no `applied` status. There is no `tenant_visible` status. There is no `savings_verified` status. Adding any of these belongs to a later, separately approved phase.

## 6. Review notes template

Use this exact shape for every candidate reviewed. Keep notes in a Markdown file under `docs/internal/optimize-reviews/<YYYY-MM-DD>/<candidate_id>.md` once a directory is added (a later commit may add the directory; until then, paste into a shared internal doc).

```
candidate_id: <opaque id from the engine>
reviewer:     <name or handle>
review_date:  <YYYY-MM-DD>
score:        <1..5>
status:       <one of §5>
reason:       <one paragraph, plain language>
evidence_gaps:
  - <missing or weak input>
  - ...
risk_notes:
  - <false-positive path considered>
  - ...
next_action:  <one sentence, mandatory>
```

`next_action` is never "apply" or "show tenant." It is one of: "discard," "hold for more data," "re-review after window extension," "raise in next review meeting," "park for future tenant-visible draft phase."

## 7. Per-type review guidance

### 7.1 `missing_outcome_coverage`

- **Good signal.** A workflow slice with hundreds or thousands of metered events but resolved-outcome coverage far below the 0.40 ceiling, against a stable 14-day baseline, with attribution completeness near 1.00.
- **Bad signal.** Slice has fewer than the meaningful-volume floor; outcome definition is ambiguous in this tenant; the workflow is brand new.
- **Next action.** Instrumentation cleanup. The proposal a future phase would make is "wire outcome reporting for this workflow." It is not a cost-optimization proposal and must not be framed as one.

### 7.2 `high_cost_workflow_review`

- **Good signal.** A repeated workflow slice (same `(tenant_id, workflow_id)`) with cost-per-accepted-outcome at least 2x the tenant median across at least four peer workflows, and at least 30 accepted outcomes on the slice itself within the baseline window.
- **Bad signal.** A handful of one-off expensive events; a workflow that runs only when a human triggers it (so cost variance is intrinsic); a workflow that just started.
- **Next action.** Workflow review. The proposal a future phase would make is "look at this workflow." It is not a model-substitution proposal. Substitution belongs to a separately approved later phase that does not exist today.

### 7.3 `model_allowlist_cleanup`

- **Good signal.** A model has been in the tenant allowlist for the full baseline window with zero metered traffic, the tenant has meaningful overall accepted-outcome volume, and removing the model would not affect any live workflow.
- **Bad signal.** The allowlist is intentionally restrictive (a buyer chose to permit a model but route traffic elsewhere); the model is reserved for a sensitive workflow; the model was recently added (within the 7-day guard window).
- **Next action.** Policy review. The proposal a future phase would make is "ask the tenant whether this model should remain in the allowlist." It is not an automatic allowlist change. There is no automatic allowlist change anywhere in this product.

## 8. False-positive handling

Common patterns to consider before scoring 4 or 5:

- **Low traffic.** Slice has few events; small-number variance is dominating.
- **Missing outcomes.** Coverage is thin enough that the cost-per-accepted-outcome computation is unstable.
- **Seasonal spike.** Traffic moved (a launch, a campaign, a customer onboarding) during the baseline window.
- **Test traffic.** A staging or QA workload leaked into the metered set.
- **Demo traffic.** Internal demos against a real tenant inflate or distort the slice.
- **One-time provider incident.** A provider outage or rate-limit storm spiked retry cost.
- **Incomplete attribution.** A material fraction of slice spend is unattributed to a workflow.
- **Intentionally strict policy.** The tenant explicitly chose the current policy; a "cleanup" candidate is actually a request to weaken the tenant's stance.

If any pattern explains the candidate, the candidate cannot be scored 5. Mark `needs_more_data` or `rejected_internal` and record the pattern in `risk_notes`.

## 9. Evidence requirements before tenant-visible draft recommendations

A candidate becomes eligible for a future tenant-visible draft phase only when **all** are true:

1. Sufficient event volume on the slice (above the engine's `n_sample` saturation point or its type-specific floor).
2. Sufficient outcome coverage (above `OUTCOME_COVERAGE_MIN = 0.60`, or, for `missing_outcome_coverage`, the coverage is explicitly the signal and the gate inverts).
3. Stable baseline window (`BASELINE_WINDOW_DAYS = 14`, continuous, no policy or allowlist edit during the window).
4. Clear owner or workflow slice (the `slice` field identifies a tenant + workflow or tenant + model, not a wildcard).
5. No prompt or response content is required to explain the candidate. If a reviewer can't explain it without naming content, the candidate is out of bounds.
6. No material attribution gap (`comp_attr ≥ 1 - ATTRIBUTION_GAP_MAX = 0.90`).
7. Confidence above threshold (`CONFIDENCE_MIN = 0.70`), not borderline.
8. Reviewer score of 4 or 5.
9. Reviewer status of `accepted_for_draft_review`.

Failing any single criterion holds the candidate. There is no "best two out of three."

## 10. What must not happen

- No candidate becomes a recommendation automatically.
- No candidate is shown to a tenant in Phase 1.
- No tenant policy is changed by review activity.
- No runtime behavior changes (no allowlist edit, no budget edit, no enforcement toggle).
- No savings are claimed in any form (no number, no estimate, no range).
- No provider or model substitution is performed or suggested as a substitution.
- No "Apply" UI exists.
- No "Auto-apply" UI exists.
- No tenant email, dashboard banner, or in-app notification is sent in connection with any reviewed candidate.

If a reviewer notices any of the above happening, that is a stop-the-line event for the review meeting.

## 11. Review meeting format (30 minutes)

Standing internal-only meeting. Open the admin `/admin/optimize-candidates` page in fixture and production modes during the meeting.

| Time | Topic |
|---|---|
| 0:00 — 0:05 | Counts and gates. Total candidates, by-type breakdown, any newly failing gate, any new optional-missing route from the QA harness. |
| 0:05 — 0:15 | Review top candidates. Walk the highest-confidence candidates that have not been reviewed, applying §3 and §4. |
| 0:15 — 0:20 | Reject / noisy. Quickly dispose of any low-score candidates and record the reason. |
| 0:20 — 0:25 | Data gaps. Note attribution or outcome gaps that should drive instrumentation work, not optimization work. |
| 0:25 — 0:30 | Decision log and next actions. Commit notes to the review file; assign owners. Do not skip. |

Anything that takes longer than 30 minutes is a separate planning slice, not a review item.

## 12. Promotion criteria for the next phase

Before any decision to plan tenant-visible draft recommendations, all of the following must be true:

- At least **20** reviewed candidates have a final score recorded.
- The false-positive rate (candidates scored 1 plus 2 divided by total reviewed) is below an internally agreed threshold. Suggested starting value: **0.30**. Adjust at the next review meeting if data shows otherwise.
- At least **5** candidates are scored **4** or **5**.
- No candidate is sitting in `blocked_safety`.
- Reviewer notes are complete for every candidate counted toward the above.
- The internal value of the engine is explainable without claiming savings.
- A draft of tenant-visible copy exists and has been read aloud by someone who is not on the engineering team without provoking the word "savings."
- A draft-recommendation route is **planned** in a separate doc, not implemented.

Missing any of the above blocks promotion. There is no exception path.

## 13. Next phase proposal

Name: **3AQ — Tenant-Visible Draft Recommendation Plan.**

3AQ is **plan only** unless separately approved. Its purpose is to define how a tenant would see a draft recommendation, how the tenant would inspect the evidence behind it, and how the tenant would decline, hold, or escalate it. No "Apply" path is part of 3AQ; apply belongs to a later phase under its own gate.

3AQ does not change Phase 1. The hard boundaries listed in §0 remain in force throughout 3AQ.

## 14. Closing reminder

This pack is the bridge. It is not the product. The product remains the accountability foundation. Anything that crosses the bridge does so with a written reviewer note, a defensible score, and the same hard boundaries that have held since 3AI.
