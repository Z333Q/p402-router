# 3AJ: Optimize Phase 1 Thresholds and Candidate Generator Plan

**Status:** plan only. No code. No migrations. No SQL execution. No Redis. No production probes. No recommendations generated. No tenant-visible surface.
**Predecessor:** 3AI (f23a724) — Optimize Engine Plan.
**Successor:** Phase 1 implementation slice, only after explicit approval of this document.

## 0. Framing

3AI defined the Optimize engine as a staged pipeline. It deferred:

- specific threshold values,
- the confidence function,
- which recommendation types ship first.

This document closes those gaps for Phase 1.

Phase 1 is **internal-only, read-only candidate generation**. The goal is to see whether the engine, given real production data, produces a small set of defensible candidates without producing noise. Nothing here ships to tenants. Nothing here applies anything. Nothing here claims savings.

**Hard boundaries that stay true throughout Phase 1:**

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No prompt or response content is read or stored.
- No tenant mutation. No configuration change. No write to billing or routing.

---

## 1. Initial threshold values

These are initial values for Phase 1 only. They are stored as configuration, not constants in the binary. Tenant overrides are not exposed in Phase 1; internal overrides exist for tuning.

| Threshold | Initial value | Rationale |
|---|---|---|
| `OUTCOME_COVERAGE_MIN` | 0.60 | At least 60% of in-scope events on the slice must have a resolved outcome. Below this, comparisons are too lossy to trust. |
| `ACCEPTED_OUTCOME_MIN` | 50 | Minimum count of accepted outcomes in the baseline window. Below this, variance dominates. |
| `BASELINE_WINDOW_DAYS` | 14 | Two-week window absorbs weekday/weekend mix without becoming stale. |
| `ATTRIBUTION_GAP_MAX` | 0.10 | At most 10% of slice spend may be unattributed. Above this, the slice is not a slice, it is a guess. |
| `CONFIDENCE_MIN` | 0.70 | Below 0.70, the candidate is discarded, not downgraded. Aligns with 3AI §6. |
| `SLICE_TRAFFIC_MIN` | 0.02 | A slice must represent at least 2% of tenant spend on the relevant axis to be material. |
| `POSTPERIOD_WINDOW_DAYS` | 14 | Symmetric with baseline. Phase 1 does not measure, but the value is fixed for downstream consistency. |
| `OUTCOME_DEGRADATION_MAX` | 0.05 | Maximum allowed accepted-outcome rate drop in a post-period before savings cannot be claimed. Phase 1 does not measure; the value is reserved. |

Phase 1 does not exercise `POSTPERIOD_WINDOW_DAYS` or `OUTCOME_DEGRADATION_MAX` directly. They are listed here so Phase 5 inherits a single set of approved thresholds.

Values are revisited at the Phase 1 → 2 gate based on what the candidate generator actually produces.

---

## 2. Deterministic confidence function

Confidence is auditable arithmetic, not a model output. The function is total, deterministic, and explainable per candidate.

### Inputs

Each input is normalized to `[0, 1]` before weighting.

| Input | Symbol | Normalization |
|---|---|---|
| Sample size of in-scope events | `n_sample` | `min(n / 500, 1)` |
| Outcome coverage on slice | `cov_outcome` | identity, already in `[0, 1]` |
| Inverse variance of cost-per-accepted-outcome over baseline | `inv_var_cpao` | `1 / (1 + cv)` where `cv` is the coefficient of variation |
| Attribution completeness | `comp_attr` | `1 - gap_unattributed` |
| Evidence coverage from shadow decisions | `cov_shadow` | identity, share of slice traffic with a shadow decision row |
| Type-specific term | `term_type` | defined per type in §3 |

### Weights

Phase 1 starts with a flat-prior weighting and a single type-specific term so the math is auditable by inspection.

```
w_sample   = 0.15
w_outcome  = 0.25
w_invvar   = 0.15
w_attr     = 0.15
w_shadow   = 0.10
w_type     = 0.20
```

`sum(weights) = 1.00`.

### Score

```
confidence = w_sample * n_sample
           + w_outcome * cov_outcome
           + w_invvar  * inv_var_cpao
           + w_attr    * comp_attr
           + w_shadow  * cov_shadow
           + w_type    * term_type
```

Range: `[0, 1]`.

### Rejection rules

These are hard gates evaluated before scoring. Any failure means the candidate is dropped, not surfaced with a low score.

1. `cov_outcome < OUTCOME_COVERAGE_MIN` → drop.
2. accepted-outcome count < `ACCEPTED_OUTCOME_MIN` → drop.
3. baseline window not continuous for `BASELINE_WINDOW_DAYS` → drop.
4. `1 - comp_attr > ATTRIBUTION_GAP_MAX` → drop.
5. slice traffic share < `SLICE_TRAFFIC_MIN` → drop.
6. `confidence < CONFIDENCE_MIN` → drop.
7. type-specific safety check (see §3) fails → drop.

### Explainability output

Every surviving candidate carries a `confidence_inputs` block with:

- each input value (raw and normalized),
- the weight applied,
- the contribution to score,
- the list of gates evaluated and their pass/fail,
- the final score.

A reviewer must be able to reconstruct the score from this block alone, without rerunning the engine.

---

## 3. First three candidate types

Phase 1 ships these three only. Each is read-only and produces no configuration change.

### 3.1 `missing_outcome_coverage`

**What it says.** Tenant T has a workflow slice with spend but insufficient outcome attribution to evaluate.

**Why first.** It does not propose a model or provider change. It proposes instrumentation. It is the safest possible candidate type and it improves the data the rest of the engine depends on.

**Slice definition.** `(tenant_id, workflow_id)`.

**Inputs.**

- `ai_economic_events` count and spend on slice over `BASELINE_WINDOW_DAYS`.
- `request_outcomes` resolved count on slice.

**Gate specifics.**

- Drop the standard `OUTCOME_COVERAGE_MIN` rejection for this type. The candidate exists precisely because coverage is low.
- Require `cov_outcome < 0.40` (a stricter floor than the standard gate's 0.60) so the gap is unambiguous.
- Require slice spend share ≥ `SLICE_TRAFFIC_MIN`.
- Require `comp_attr ≥ 1 - ATTRIBUTION_GAP_MAX` on the spend side (we can see the spend, we just cannot see the outcome).

**Type-specific term.**

```
term_type = 1 - cov_outcome
```

Lower coverage produces a higher term, but the rejection rule forces `cov_outcome < 0.40`, so this term is bounded above 0.60.

**Safety check.** None beyond the standard gates. This type proposes no configuration change.

### 3.2 `high_cost_workflow_review`

**What it says.** Tenant T has a workflow whose cost-per-accepted-outcome is a material outlier relative to the tenant's own distribution. Recommend manual review.

**Why first.** It is review, not substitution. The output is "look at this," not "change to that." No quality risk.

**Slice definition.** `(tenant_id, workflow_id)`.

**Inputs.**

- `ai_economic_events` cost on slice.
- `request_outcomes` accepted count on slice.
- Tenant-level distribution of cost-per-accepted-outcome across workflows.

**Gate specifics.**

- Standard rejection rules apply (coverage, accepted count, attribution, slice share, confidence, baseline window).
- Require the slice's cost-per-accepted-outcome ≥ `2.0 ×` the tenant median across workflows in the same window.
- Require at least three other workflows present in the tenant distribution; otherwise the outlier comparison is meaningless.

**Type-specific term.**

```
ratio     = slice_cpao / tenant_median_cpao
term_type = clamp((ratio - 2.0) / 2.0, 0, 1)
```

Ratio 2.0 → 0.0. Ratio 4.0 → 1.0. Above 4.0 → 1.0.

**Safety check.** Drop if the slice has fewer than 30 accepted outcomes even if `ACCEPTED_OUTCOME_MIN` is satisfied globally; outlier comparisons demand more signal than average comparisons.

### 3.3 `model_allowlist_cleanup`

**What it says.** Tenant T's model allowlist contains models with no traffic over the baseline window. Recommend removal from the allowlist.

**Why first.** It proposes a configuration cleanup whose downside is bounded (a model that was not being used will continue to not be used). No quality risk, no spend risk.

**Slice definition.** `(tenant_id, model_id)` for each model in the tenant allowlist.

**Inputs.**

- Tenant model allowlist (configuration).
- `ai_economic_events` per `(tenant_id, model_id)` over `BASELINE_WINDOW_DAYS`.

**Gate specifics.**

- Drop `OUTCOME_COVERAGE_MIN` and `ACCEPTED_OUTCOME_MIN` for this type. The candidate is precisely about absence of traffic.
- Require zero events on the slice over the full `BASELINE_WINDOW_DAYS` window.
- Require the allowlist to have been stable (no add/remove) over the window; otherwise the absence may be a recent addition.
- Slice traffic share gate is replaced with: the tenant must have non-trivial total traffic over the window (≥ `ACCEPTED_OUTCOME_MIN` accepted outcomes tenant-wide), so cleanup is meaningful.

**Type-specific term.**

```
term_type = 1.0
```

The signal is binary: either the model had zero traffic over a stable window or it did not. If yes, the term is maxed. If no, the candidate is dropped by the gate.

**Safety check.** Drop if the model was added to the allowlist within the last 7 days, even if the stability check passes globally. Newly added models deserve a longer observation window than 14 days before recommending removal.

### What Phase 1 explicitly does not include

The following types are deferred to later phases:

- `cheaper_equivalent_model`
- `provider_substitution`
- `budget_cap_adjustment`

Reason: each requires either a quality-equivalence claim or a post-period measurement, both of which depend on Phase 4 and Phase 5 mechanisms.

---

## 4. Data sources

Phase 1 reads, never writes, the existing accountability layer.

| Source | Use |
|---|---|
| `ai_economic_events` | Cost, provider, model, tenant, workflow attribution. |
| `request_outcomes` | Accepted / rejected / unknown counts on slice. |
| `runtime_control_shadow_decisions` | Shadow coverage input to confidence; cross-check that proposed cleanups do not contradict shadow patterns. |
| Existing coverage / readiness helpers (Outcomes surface) | Reuse helpers rather than re-derive coverage math. Helpers must be read-only. |
| Tenant model allowlist configuration | Required for `model_allowlist_cleanup`. Read from current source of truth; do not duplicate. |

Fields explicitly **not** read:

- Prompt content.
- Response content.
- Any PII payload field.

---

## 5. Candidate output shape

Phase 1 candidates are written to an internal-only store. They are not tenant-visible.

Logical shape:

```
candidate_id            # opaque ID
tenant_id
type                    # missing_outcome_coverage | high_cost_workflow_review | model_allowlist_cleanup
slice                   # structured: { tenant_id, workflow_id? , model_id? }
evidence_snapshot       # event ID range, outcome ID range, shadow decision ID range, window bounds
gate_results            # per-gate { name, value, threshold, passed }
confidence_score        # 0..1
confidence_inputs       # per §2 explainability block
status                  # always: internal_candidate
created_at
```

No `proposal`, `approver`, `rollback_rule`, `apply_record_id`, or `measurement_record_id` in Phase 1. Those belong to Phase 3+ and including them prematurely invites accidental wiring.

---

## 6. Implementation file plan

This is the file layout that the Phase 1 implementation slice will use. Phase 1 itself is not approved by this document.

```
lib/optimize/
  candidates/
    types.ts                       # TS types for candidate, gate result, confidence inputs
    thresholds.ts                  # initial values from §1; sourced from env w/ defaults
    confidence.ts                  # deterministic confidence function (§2)
    generators/
      missingOutcomeCoverage.ts
      highCostWorkflowReview.ts
      modelAllowlistCleanup.ts
    pipeline.ts                    # orchestrates: load slice → gates → score → emit
    store.ts                       # internal-only persistence; read/write internal store only
    index.ts                       # public surface for internal callers

lib/optimize/candidates/__tests__/
  thresholds.test.ts
  confidence.test.ts
  generators.missing-outcome-coverage.test.ts
  generators.high-cost-workflow-review.test.ts
  generators.model-allowlist-cleanup.test.ts
  pipeline.test.ts

scripts/optimize/
  generate-candidates.ts           # internal CLI, batch run, internal use only

app/api/internal/optimize/candidates/route.ts
  # internal-only API, gated behind existing internal auth
  # GET: list candidates
  # no POST that mutates tenant state

app/internal/optimize/candidates/page.tsx
  # internal-only dashboard surface; not linked from tenant nav
```

Things that the implementation slice must **not** create in Phase 1:

- Any route under `/api/v2/optimize/*` that is tenant-visible.
- Any route under `/dashboard/optimize` that surfaces candidates.
- Any write to tenant configuration, allowlist, routing preference, or billing.
- Any cron, schedule, or auto-trigger. Phase 1 runs by manual CLI invocation.

DDL, if needed, is its own follow-up. Phase 1 may begin against an internal JSON or in-process store before introducing a migration, so that the generator's output can be inspected before persisting it to Postgres.

---

## 7. Safety

Every item below is a hard rule for Phase 1, not a guideline.

1. No prompt content read or stored.
2. No response content read or stored.
3. No tenant-visible recommendation surface.
4. No apply path. No code path that mutates tenant configuration.
5. No savings claim. No code path that computes or displays a savings number.
6. No policy auto-apply. No code path that touches `runtime_control_*` writers.
7. No production probe that places load on tenant infrastructure.
8. No Redis command, SQL execution, Neon migration, or PATCH operation as part of generator output. The generator emits candidates to an internal store and stops.
9. No background cron. Manual invocation only.
10. Internal API and internal dashboard are gated behind existing internal auth and are never linked from tenant-facing surfaces.

If any of these would need to be relaxed, the relaxation belongs to a later phase under its own gate.

---

## 8. Go / no-go criteria for implementation

These are the conditions that must be true before Phase 1 implementation may begin and before it may close.

### Pre-implementation (this plan → Phase 1 code slice)

- This document is reviewed and accepted in writing.
- Initial threshold values in §1 are accepted, or amended values are recorded here before code begins.
- Confidence function in §2 is accepted, including weights.
- The three candidate types in §3 are accepted as the Phase 1 set. The deferred three are explicitly out of scope.
- File plan in §6 is accepted; deviations are documented before implementation.

### Phase 1 → Phase 2 (after implementation runs)

- Generator runs against production data (read-only) via the internal CLI and completes without writing to any tenant-facing store.
- For each of the three types, the generator produces either a defensible candidate or zero candidates. No noise.
- Across a representative tenant set:
  - `missing_outcome_coverage` candidates exist only for slices where coverage is clearly below 0.40 and spend share is above the floor.
  - `high_cost_workflow_review` candidates exist only for slices whose cpao ratio to the tenant median is at least 2.0 and whose accepted-outcome count is at least 30.
  - `model_allowlist_cleanup` candidates exist only for models with zero traffic over a stable 14-day window.
- Every surviving candidate's `confidence_inputs` block reconstructs the score by inspection.
- Internal review confirms there are no false positives that would have surfaced as indefensible if shown to a tenant.
- Internal review confirms that no candidate references prompt or response content.
- Internal review confirms boundaries hold: no tenant surface created, no apply path created, no savings number displayed.

Only when these conditions are met may Phase 2 (tenant-visible draft surface, still no apply) be considered.

---

## 9. Bottom line

Phase 1 is the smallest possible step from "we have the data" to "we can show ourselves a candidate." It is internal, read-only, and bounded to three low-risk candidate types. It commits the threshold values and the confidence function so later phases inherit a single set of approved knobs.

Until each phase is explicitly approved, the boundaries hold:

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
