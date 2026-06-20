# 02 — `high_cost_workflow_review` (fixture)

```
candidate_id:  cand_high_cost_workflow_review_00000000-0000-0000-0000-000000000DEM:workflow-deep-research_<runtime>
reviewer:      review-group
review_date:   2026-06-21
score:         2
status:        needs_more_data
```

## Reason

The candidate fires on the synthetic `workflow-deep-research` slice: 600 events at $0.05 each with 500 accepted outcomes, against three peer workflows at $0.01 each with 500 accepted outcomes each. Cost-per-accepted-outcome ratio is ~5×, far above the 2× outlier floor. Gates pass (9/9). Confidence is 0.858.

Score is **2** for the same reason as candidate 01: the fixture is synthetic. The outlier comparison is engineered to fire. None of the false-positive paths in 3AP §8 — seasonal spike, test traffic, provider incident, intentionally strict policy — can be ruled out on synthetic data, because none of them apply to data the reviewer constructed.

## Evidence gaps

- Synthetic peer set. The four-workflow tenant distribution is built by the fixture, not observed.
- No workflow owner. The reviewer cannot ask "is this `workflow-deep-research` cost intentional?" because the workflow does not exist.
- No view into upstream behavior. The candidate says "this workflow is expensive relative to peers"; it does not say "and a tenant decision-maker did not intend that." Without that second leg, the candidate is not actionable.

## Risk notes

- This type is the most likely to be misread as a "model substitution recommendation." 3AP §7.2 explicitly forbids that framing in Phase 1: the action is workflow *review*, not model substitution. The score-2 hold is consistent with that boundary.
- If this candidate were real, the reviewer would still need to verify that the slice's outcome definition is comparable to its peers' outcome definitions. A workflow that defines "accepted" more strictly than its peers will look expensive without being wasteful.

## Next action

Hold for more data. When a real tenant produces a `high_cost_workflow_review` candidate, re-review against this checklist and contact the workflow owner before scoring above 2.
