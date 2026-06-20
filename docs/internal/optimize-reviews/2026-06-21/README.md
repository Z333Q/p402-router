# Internal Optimize Candidate Review — 2026-06-21

**Status:** review notes only. Docs only. No code, no runtime, no SQL, no tenant-visible action.
**Framework:** [`docs/internal/3AP-internal-candidate-quality-review-pack.md`](../../3AP-internal-candidate-quality-review-pack.md)
**Predecessor of:** [`3AQ-tenant-visible-draft-recommendation-plan.md`](../../3AQ-tenant-visible-draft-recommendation-plan.md) (plan only; not entered)

## Meeting agenda (3AP §11, 30 min)

| Time | Topic | Outcome |
|---|---|---|
| 0:00 — 0:05 | Counts and gates | 3 fixture candidates produced; production pilot returned 0. No new failing gates. No newly missing optional routes. |
| 0:05 — 0:15 | Review top candidates | Walk the three fixture candidates and score each per 3AP §4. |
| 0:15 — 0:20 | Reject / noisy | All three score 2 (synthetic origin); no rejections. |
| 0:20 — 0:25 | Data gaps | Production pilot tenant is too thin for any candidate type to fire. Note the gap; no instrumentation change requested in this slice. |
| 0:25 — 0:30 | Decision log and next actions | Recorded below in §"Decisions." |

## Sources reviewed

- **Fixture mode** (admin surface, `mode=fixture`): the demo dataset built by `lib/optimize/candidates/internal/fixtureData.ts` to exercise the review UX. Three candidates surfaced. Synthetic data; no tenant.
- **Production mode** (admin surface, `mode=production&tenant=4f689ea1-7340-476a-878e-9f0b930e5fd4&window_days=14`): real pilot tenant, 14-day window. Loaded `events=4, outcomes=0, shadow_decisions=2, allowlist=1`. Zero candidates surfaced.

Both numbers are reproduced and verified by the production QA sweep at https://p402.io (3AO closeout: `recommendation: "pass"`).

## Candidate roll-up

| # | candidate_id | type | tenant | confidence | score | status |
|---|---|---|---|---|---|---|
| 01 | `cand_missing_outcome_coverage_00000000-0000-0000-0000-000000000DEM:workflow-summarizer_*` | `missing_outcome_coverage` | demo (synthetic) | 0.760 | **2** | `needs_more_data` |
| 02 | `cand_high_cost_workflow_review_00000000-0000-0000-0000-000000000DEM:workflow-deep-research_*` | `high_cost_workflow_review` | demo (synthetic) | 0.858 | **2** | `needs_more_data` |
| 03 | `cand_model_allowlist_cleanup_00000000-0000-0000-0000-000000000DEM:legacy-instruct-7b_*` | `model_allowlist_cleanup` | demo (synthetic) | 1.000 | **2** | `needs_more_data` |
| — | n/a | (no candidates produced) | `4f689ea1-7340-476a-878e-9f0b930e5fd4` | n/a | — | n/a |

(The suffix after the slice on each fixture id is a per-run random + timestamp; the IDs above are templated to the slice for readability. The exact IDs from this run are stored in each candidate's individual review file.)

## Per-candidate notes

See individual files in this directory:

- [`01-missing-outcome-coverage.md`](./01-missing-outcome-coverage.md)
- [`02-high-cost-workflow-review.md`](./02-high-cost-workflow-review.md)
- [`03-model-allowlist-cleanup.md`](./03-model-allowlist-cleanup.md)
- [`04-production-pilot-empty.md`](./04-production-pilot-empty.md)

## Roll-up metrics (3AP §12 promotion gate inputs)

```
reviewed_count                    : 3      (fixture)
rejected_internal                 : 0
needs_more_data                   : 3
accepted_for_draft_review         : 0
blocked_safety                    : 0
blocked_low_confidence            : 0
false_positive_rate (1+2 / total) : 1.00   (3 of 3 scored 2; all synthetic)
candidates_scored_4_or_5          : 0
```

## 3AQ entry-criteria check (per 3AP §12 / 3AQ §3)

| # | Criterion | Threshold | Observed | Pass? |
|---|---|---|---|---|
| 1 | Reviewed candidates with final score | ≥ 20 | 3 | ❌ |
| 2 | False-positive rate | < 0.30 | 1.00 | ❌ |
| 3 | Candidates scored 4 or 5 | ≥ 5 | 0 | ❌ |
| 4 | Candidates in `blocked_safety` | 0 | 0 | ✅ |
| 5 | Reviewer notes complete for all reviewed | yes | yes | ✅ |
| 6 | Engine value explainable without claiming savings | yes | yes | ✅ |
| 7 | Tenant-visible draft copy drafted, no "savings" | yes | not yet | ❌ |
| 8 | 3AQ accepted in writing | yes | yes (commit `881ddd4`) | ✅ |

**Result:** 3AQ entry criteria are **not met** (4 of 8 fail). This is expected and acceptable. The 3AP framework explicitly anticipated zero promotions on the first review run.

## Decisions

1. All three fixture candidates remain `needs_more_data` because they are synthetic. They are useful only as evidence that the review UX renders the right fields. They are not eligible to advance to `accepted_for_draft_review` regardless of score.
2. The pilot tenant `4f689ea1-7340-476a-878e-9f0b930e5fd4` is too thin (4 events / 0 outcomes / 2 shadow / 1 allowlist) for the Phase 1 generators to fire. **No instrumentation change is requested as a result of this review** — the right answer is "wait for more data," not "rewire outcomes."
3. 3AQ remains plan-only. No reviewer publishes a draft. No tenant route is added.
4. Schedule the next review meeting once **either**:
   - the pilot tenant accumulates enough traffic that the production generator emits at least one candidate of any Phase 1 type, **or**
   - at least one additional tenant is enrolled in the read-only production loader and the combined traffic raises candidate volume.

## Next actions

- Owner: review group. Action: re-run `BASE_URL="https://p402.io" npm run qa:enterprise-auth-sweep` in two weeks (target 2026-07-05) to check whether pilot traffic has accumulated.
- Owner: product. Action: keep 3AQ-1 (reviewer publish path) **unstarted** until §"3AQ entry-criteria check" passes ≥ 6 of 8, including at least criteria 1, 3, and 7.
- Owner: nobody. Action: no tenant communication. No notification. No nudge.

## What did not happen (reaffirmed)

- No candidate became a recommendation.
- No tenant saw any output of this review.
- No tenant policy, allowlist, budget, or routing preference changed.
- No savings number, estimate, or range was discussed.
- No "Apply" path was exercised.
- No prompt or response content was read.
- No write was issued against any tenant table.

These statements are not aspirational; they are reaffirmed for this review's record.
