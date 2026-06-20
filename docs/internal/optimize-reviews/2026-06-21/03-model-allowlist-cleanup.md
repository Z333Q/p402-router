# 03 — `model_allowlist_cleanup` (fixture)

```
candidate_id:  cand_model_allowlist_cleanup_00000000-0000-0000-0000-000000000DEM:legacy-instruct-7b_<runtime>
reviewer:      review-group
review_date:   2026-06-21
score:         2
status:        needs_more_data
```

## Reason

The candidate fires on `(tenant=demo, model=legacy-instruct-7b)`: the model has been in the synthetic tenant's allowlist for the full 14-day baseline window with zero metered traffic, the tenant has >50 accepted outcomes across other models, and the model was not added within the 7-day guard window. Gates pass (6/6) and confidence is the maximum (1.000) because every input saturates by construction for this type.

Score is **2** because the fixture is synthetic. A perfect confidence score on a fixture is expected and meaningless; it is not a signal of real candidate quality.

## Evidence gaps

- No tenant owner. The synthetic allowlist contains "legacy-instruct-7b" because the fixture builder put it there to exercise this generator. There is no buyer who chose to add this model.
- No view of intent. A real cleanup candidate cannot be scored above 3 until the reviewer can answer "did the tenant put this model on the allowlist on purpose?" That answer is not available for synthetic data.

## Risk notes

- This type has a specific intentionally-strict false-positive pattern (3AP §8): a buyer may have permitted a model for governance reasons (audit, contractual obligation, future enablement) while not routing live traffic to it. Removing such a model would weaken the tenant's stance. The score-2 hold prevents that mistake.
- Confidence 1.000 is **not** a green light for this type. It only means the binary "zero traffic on a stable allowlist entry" test passed and the type-term saturated.

## Next action

Hold for more data. When a real tenant produces a `model_allowlist_cleanup` candidate, the next action is *to ask the tenant whether the model should remain*, not to remove it. There is no path in this product that removes an allowlist entry without a tenant decision.
