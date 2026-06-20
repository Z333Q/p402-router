# 3AK: Optimize Phase 1 Candidate Generator Core

**Status:** implementation. Internal-only, fixture-driven, no DB, no tenant surface.
**Predecessor:** 3AJ (Phase 1 plan).
**Successor:** 3AL — Read-Only Production Dry Run (planned, not implemented here).

## What shipped

Internal candidate generator core, implemented per the 3AJ plan:

```
lib/optimize/candidates/
  types.ts
  thresholds.ts
  confidence.ts
  pipeline.ts
  index.ts
  generators/
    shared.ts
    missingOutcomeCoverage.ts
    highCostWorkflowReview.ts
    modelAllowlistCleanup.ts
  __tests__/
    fixtures.ts
    thresholds.test.ts
    confidence.test.ts
    missingOutcomeCoverage.test.ts
    highCostWorkflowReview.test.ts
    modelAllowlistCleanup.test.ts
    pipeline.test.ts
    safety.test.ts
scripts/optimize/
  generate-candidates.ts
```

## What did not ship

- No DB store. Candidates are emitted as in-memory return values and as JSON on stdout from the CLI.
- No migration. No SQL. No Redis. No Neon.
- No tenant-visible route. No `/api/v2/optimize/*`, no `/dashboard/optimize` candidate display.
- No apply path. No rollback. No savings claim. No policy auto-apply.
- No production data path. CLI explicitly refuses `--allow-production`.
- Of the six recommendation types in 3AI, only the three Phase 1 types are implemented. The other three are intentionally absent.

## Threshold values

From `lib/optimize/candidates/thresholds.ts`, sourced from 3AJ §1:

| Threshold | Value |
|---|---|
| `OUTCOME_COVERAGE_MIN` | 0.60 |
| `ACCEPTED_OUTCOME_MIN` | 50 |
| `BASELINE_WINDOW_DAYS` | 14 |
| `ATTRIBUTION_GAP_MAX` | 0.10 |
| `CONFIDENCE_MIN` | 0.70 |
| `SLICE_TRAFFIC_MIN` | 0.02 |
| `POSTPERIOD_WINDOW_DAYS` | 14 |
| `OUTCOME_DEGRADATION_MAX` | 0.05 |

Env overrides (`OPTIMIZE_*`) are read at load time; non-numeric overrides fall back to defaults.

## Confidence function

Six normalized inputs, fixed weights summing to 1.00, deterministic. Per-candidate `confidence_inputs` exposes raw, normalized, weight, and contribution for every input so a reviewer reconstructs the score by summing contributions. Verified by `confidence.test.ts` and `pipeline.test.ts`.

## CLI

```
npx tsx scripts/optimize/generate-candidates.ts --fixture <path.json>
```

`--allow-production` is rejected with a non-zero exit. Phase 1 reads fixture JSON only.

## Tests

| File | Purpose |
|---|---|
| `thresholds.test.ts` | locks the eight default values and env-override behavior |
| `confidence.test.ts` | weights-sum, determinism, reconstruction, NaN/Inf handling |
| `missingOutcomeCoverage.test.ts` | accept/reject paths, gate completeness |
| `highCostWorkflowReview.test.ts` | outlier accept, ratio-below-floor reject, peer-count reject, accepted-floor reject |
| `modelAllowlistCleanup.test.ts` | zero-traffic accept, traffic reject, recent-add reject, tenant-floor reject, removed-in-window reject |
| `pipeline.test.ts` | Phase 1 type set, aggregation, schema completeness, score reconstruction |
| `safety.test.ts` | CLI refuses prod by default, no prompt/response field names, no tenant-visible Optimize route, no db/redis imports, no savings/apply phrases |

## Go / no-go for next slice (3AL)

3AL is a separate, approved slice. Preconditions before it begins:

- 3AK merged and tests green.
- An internal reviewer accepts the fixture-driven candidate output as defensible.
- A read-only DB query layer is defined separately, with explicit confirmation it only reads `ai_economic_events`, `request_outcomes`, `runtime_control_shadow_decisions`, and the tenant allowlist.
- Output remains internal-only. No tenant-visible surface introduced as part of 3AL.

## Hard boundaries (unchanged)

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No prompt content, no response content, read or stored.
