# 01 — `missing_outcome_coverage` (fixture)

```
candidate_id:  cand_missing_outcome_coverage_00000000-0000-0000-0000-000000000DEM:workflow-summarizer_<runtime>
reviewer:      review-group
review_date:   2026-06-21
score:         2
status:        needs_more_data
```

## Reason

The candidate fired correctly on the demo fixture: 500 events on `(tenant=demo, workflow=workflow-summarizer)` over a 14-day window, 100 resolved outcomes (20% coverage), full shadow coverage. The engine's gates passed (5/5) and confidence reached 0.760, comfortably above `CONFIDENCE_MIN = 0.70`.

The score is **2** ("noisy, keep internal") because the data is synthetic. A synthetic candidate cannot rule out the false-positive paths in §8 of 3AP — there is no real seasonality, no real instrumentation gap, no real owner to consult. The candidate is useful as proof that the review UX renders the right fields, not as a signal worth acting on.

## Evidence gaps

- No real tenant attached. Slice tenant id is the synthetic demo id `00000000-0000-0000-0000-000000000DEM`.
- Outcome definition is whatever the fixture builder emitted; not a tenant-agreed definition.
- Baseline window is the fixture's fixed `2026-06-01..2026-06-15`, not a live, rolling window.

## Risk notes

- Could be misread as a real candidate if read out of context.
- Would not survive a buyer challenge ("what tenant is this for?").
- Synthetic candidates intentionally pass every Phase 1 gate; gate-pass is therefore not a quality signal here.

## Next action

Hold for more data. Re-review only against real tenant data with a real workflow owner identified. No further work on this fixture candidate.
