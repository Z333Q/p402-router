# 3AI: Optimize Engine Plan

**Status:** plan only. No code. No recommendations generated. No savings proof. No policy auto-apply.
**Predecessor:** 3AH (Enterprise Buyer Rehearsal Pack).
**Successor:** to be approved per phase below.

## 0. Framing

P402 has shipped the accountability foundation:

```
Meter → Monitor → Control → Shadow Evidence → Prove → Outcomes → Optimize Readiness
```

This plan defines the **Optimize engine**: the product that converts the accountability layer into trustworthy recommendations and, eventually, verified savings.

**Hard boundaries that stay true throughout this plan:**

- Runtime enforcement remains blocked.
- Optimize recommendations remain blocked.
- Verified savings proof remains blocked.
- Policy auto-apply remains blocked.
- No prompt or response content is read or stored by the engine.
- The engine consumes existing economic events, outcome records, and shadow decisions. It does not create new runtime paths.

This document is a design. Nothing in it ships without an explicitly approved follow-up slice.

---

## 1. What counts as an optimization recommendation

A recommendation is a **draft, human-reviewable proposal** that, if approved and applied, is expected to change AI spend or quality in a measurable direction, and whose change is itself measurable after the fact.

A recommendation must satisfy all of:

1. **Specific.** It names a concrete change (model A → model B for workflow X under tenant T).
2. **Bounded.** It applies to a defined slice (tenant, workflow, time window, traffic share).
3. **Reversible.** It has a defined rollback rule and rollback owner.
4. **Measurable.** It has a pre-period baseline and a post-period measurement plan agreed before apply.
5. **Defensible.** It cites the evidence rows (event IDs, outcome IDs, shadow decision IDs) that produced it.
6. **Gated.** It carries a confidence score and passes the gate defined in §4.

If any of the above is missing, the engine must not produce the recommendation.

### Recommendation types (initial set)

| Type | Plain meaning |
|---|---|
| `cheaper_equivalent_model` | Workflow X on model A could move to model B at lower cost with comparable outcome quality. |
| `provider_substitution` | Same model class, different provider, lower cost or higher reliability. |
| `budget_cap_adjustment` | Observed spend ceiling for tenant/workflow is materially below or above current cap. |
| `model_allowlist_cleanup` | Models in the allowlist that show no traffic over the baseline window. |
| `high_cost_workflow_review` | Workflow whose cost-per-accepted-outcome is a material outlier. |
| `missing_outcome_coverage` | Workflow has spend but insufficient outcome attribution to evaluate. Recommendation is to instrument, not to substitute. |

Out of scope for the initial engine:

- Prompt rewriting.
- Caching policy changes.
- Streaming/non-streaming substitutions.
- Multi-step plan reshaping.

These can be added in later phases under their own gates.

---

## 2. Required inputs

The engine reads only from the existing accountability layer. It does not introduce new collection paths.

| Input | Source | Purpose |
|---|---|---|
| Economic events | Meter ledger | Cost, provider, model, tenant, workflow attribution. |
| Outcome records | Outcomes surface | Accepted / rejected / unknown outcome attribution. |
| Shadow decisions | Shadow evidence store | What policy would have denied, and what still ran. |
| Provider/model cost data | Pricing catalog | Cost per unit for substitution math. |
| Quality / outcome score | Outcomes | Per-workflow acceptance rate or equivalent. |
| Attribution completeness | Meter + Outcomes join | Share of spend tied to a tenant, workflow, and outcome. |
| Evidence coverage | Shadow evidence | Share of traffic with a shadow decision attached. |

Inputs that are **explicitly excluded**:

- Prompt content.
- Response content.
- PII payloads.
- Any field not already present in metered, outcome, or shadow tables.

---

## 3. Recommendation gate

A candidate recommendation must pass every gate below or it is silently discarded. The engine never surfaces a borderline recommendation with a warning. Borderline is rejected.

| Gate | Requirement |
|---|---|
| Minimum outcome coverage | At least `OUTCOME_COVERAGE_MIN` of in-scope events have a resolved outcome. |
| Minimum accepted outcomes | At least `ACCEPTED_OUTCOME_MIN` accepted outcomes in the baseline window. |
| Baseline window | At least `BASELINE_WINDOW_DAYS` of continuous traffic on the candidate slice. |
| Cost-per-accepted-output available | A non-null, non-degenerate cost-per-accepted-outcome can be computed for both the current and proposed configurations. |
| No major attribution gaps | Unattributed spend share on the slice is at most `ATTRIBUTION_GAP_MAX`. |
| Confidence score | Confidence score above `CONFIDENCE_MIN` (see §6). |
| Slice traffic share | Slice represents at least `SLICE_TRAFFIC_MIN` of tenant traffic by spend, so the recommendation is material. |
| Shadow consistency | No active shadow decision pattern contradicts the recommendation (e.g., proposed model would itself fail policy). |

Threshold values are intentionally not fixed in this plan. They are set in the first phase that touches code, and they are stored as tenant-overridable configuration, not in the engine binary.

---

## 4. Approval model

The engine never applies a change. Approval is a separate, explicit human action.

State machine:

```
draft → submitted → approved → applied → measured → closed
                              ↘ rejected → closed
                              ↘ withdrawn → closed
applied → rolled_back → closed
```

Rules:

1. Every recommendation is created in `draft`.
2. Submission moves it to `submitted` and freezes the evidence snapshot (event IDs, outcome IDs, shadow IDs, baseline window).
3. Approval requires a named human approver and a written rollback rule.
4. Approval does not apply the change. A separate `apply` action does.
5. Apply requires the approver's rollback rule to already exist.
6. There is no auto-apply. There is no scheduled apply. There is no batch apply across tenants.
7. Rollback can be triggered manually at any time after apply, before measurement closes.
8. Closure requires a measurement record (§5), even if the result is "no detectable change."

Approver roles in the initial design:

- Tenant approver (required).
- Optional P402 internal reviewer for high-blast-radius recommendations (above a configurable slice threshold).

---

## 5. Apply, rollback, and verified savings methodology

### Apply

- Apply changes configuration only (model allowlist, routing preference, budget cap).
- Apply never silently rewrites historical events or outcomes.
- Apply writes a configuration change record linked to the recommendation ID.
- Apply records the apply timestamp as the boundary between baseline and post-period.

### Rollback

- Every recommendation carries a rollback rule defined at approval time.
- Rollback rules are one of:
  - revert to previous configuration snapshot,
  - revert if a named metric crosses a named threshold within a named window.
- Rollback writes its own configuration change record linked to the recommendation ID.
- Rollback closes the measurement period at the rollback timestamp.

### Verified savings methodology

Savings are reported only after measurement. The methodology:

1. **Pre-period baseline.** Continuous window of length `BASELINE_WINDOW_DAYS` immediately before apply. Frozen at submission.
2. **Post-period.** Continuous window of length `POSTPERIOD_WINDOW_DAYS` immediately after apply, or until rollback.
3. **Cost change.** Compare cost-per-accepted-outcome on the slice across the two windows.
4. **Outcome change.** Compare accepted-outcome rate on the slice across the two windows.
5. **Confidence interval.** Report a CI on the cost-change and outcome-change estimates. Methodology committed before measurement.
6. **Verified savings claim** is allowed only if:
   - cost-per-accepted-outcome decreased,
   - accepted-outcome rate did not degrade beyond `OUTCOME_DEGRADATION_MAX`,
   - the confidence interval excludes zero on the cost-change estimate,
   - no rollback occurred during the post-period.
7. If any of the above fails, the result is recorded as "no verified savings" with the underlying numbers. The engine must not soften this.

P402 does not surface a savings number that has not been through this pipeline.

---

## 6. Confidence model

Confidence is a single 0 to 1 score attached to every candidate recommendation. It is the gate input in §3, not a vibes label.

Inputs to confidence:

- Sample size of in-scope events.
- Outcome coverage on the slice.
- Variance of cost-per-accepted-outcome over the baseline window.
- Attribution completeness on the slice.
- Evidence coverage from shadow decisions.
- For substitution recommendations: similarity score between current and proposed configuration on a defined model-capability axis.

Confidence is computed by a deterministic function defined in the implementation phase. It is **not** a model output. It is auditable arithmetic.

A recommendation below `CONFIDENCE_MIN` is discarded, not downgraded.

---

## 7. How P402 avoids unsafe recommendations

A recommendation is unsafe if applying it would degrade quality, break policy, or move spend in a direction the buyer cannot defend. The engine prevents this through layered constraints:

1. **No content access.** The engine cannot read prompts or responses, so it cannot make recommendations that depend on content semantics it has not measured.
2. **Outcome-gated.** Substitution recommendations require accepted-outcome coverage on the slice. No outcome data, no substitution recommendation.
3. **Shadow-consistency check.** A proposed configuration is rejected if shadow evaluation shows it would itself trigger denials under current policy.
4. **Slice size floor.** Recommendations below `SLICE_TRAFFIC_MIN` are discarded as immaterial.
5. **One change at a time.** A recommendation changes one variable. Bundled changes are not allowed in the initial engine.
6. **Cooldown.** A given slice cannot receive a new recommendation until the previous one closes.
7. **Rollback precondition.** Apply is blocked unless a rollback rule exists.
8. **No auto-apply.** Human approval is structurally required.
9. **No silent overwrite.** Configuration changes are append-only records linked to recommendation IDs.

---

## 8. Recommendation schema (logical, not DDL)

A draft record includes at minimum:

```
recommendation_id
tenant_id
type                       # see §1 type list
slice                      # tenant_id, workflow_id, optional model/provider scope
proposal                   # named, structured change
evidence_snapshot          # event IDs, outcome IDs, shadow decision IDs, window bounds
baseline                   # pre-period metrics, frozen at submission
confidence_score
confidence_inputs          # auditable breakdown
gate_results               # per-gate pass/fail with values
state                      # draft | submitted | approved | applied | measured | closed | rejected | withdrawn | rolled_back
rollback_rule              # required at approval
approver                   # required at approval
apply_record_id            # set at apply
measurement_record_id      # set at measurement close
created_at, updated_at
```

No prompt content, no response content, no PII fields.

DDL is deferred to the implementation phase. This document defines the shape, not the migration.

---

## 9. Implementation phases

Each phase is a discrete, independently approvable slice. Nothing later than phase 1 is committed by this document.

### Phase 0 — this plan (current)
- Docs only.
- Output: this file.
- Gate to phase 1: written buyer or internal review sign-off that the design is the product we want.

### Phase 1 — read-only candidate generation (internal)
- Internal-only batch job that reads existing tables and emits candidate recommendations into an internal review surface.
- No tenant visibility.
- No apply path.
- No savings claim.
- Used to validate that the gate in §3 produces a non-empty, non-spammy set on real data.

### Phase 2 — draft surface (tenant-visible, no apply)
- Tenant dashboard surface that shows draft recommendations with evidence.
- No submit, no approve, no apply.
- Used to validate that recommendations read as defensible to a buyer.

### Phase 3 — submission and approval
- Submit, approve, reject, withdraw transitions.
- No apply.
- Rollback rules required at approval.

### Phase 4 — apply and rollback
- Configuration change records.
- Rollback rules enforced.
- Cooldown enforced.

### Phase 5 — measurement and verified savings
- Post-period measurement.
- Verified savings methodology per §5.
- First conditions under which a savings number may be displayed.

### Phase 6 — broaden recommendation types
- Add types beyond the initial six in §1, each gated on its own go/no-go criteria.

---

## 10. Go / no-go criteria

Per-phase gates. Each must pass before the next phase begins.

**Phase 0 → 1**
- Plan accepted in writing.
- Threshold variables (`OUTCOME_COVERAGE_MIN`, etc.) assigned initial values.
- Confidence function specified.

**Phase 1 → 2**
- Internal candidate generation runs on production data without producing recommendations that violate any gate.
- At least one defensible recommendation produced per recommendation type for which data exists.
- Zero recommendations produced for slices lacking outcome coverage.

**Phase 2 → 3**
- Tenant review of draft surface yields a written assessment that recommendations are understandable and evidence-backed.
- No surfaced recommendation has been retracted as indefensible.

**Phase 3 → 4**
- Approval flow exercised end to end in a non-production tenant.
- Every approved recommendation has a rollback rule.
- Audit trail of state transitions verified.

**Phase 4 → 5**
- At least one apply and one rollback executed against non-production configuration with full audit trail.
- Cooldown verified.
- Configuration change records verified append-only.

**Phase 5 → 6**
- At least one applied recommendation has produced a measurement record under §5.
- Verified savings methodology produced a result (positive, negative, or null) without manual adjustment.
- Buyer or internal reviewer accepts the methodology as defensible.

---

## 11. Out of scope for this plan

- DDL and migrations.
- Specific threshold values.
- Specific UI layouts.
- Specific code paths or file changes.
- Pricing of optimization as a product surface.
- Multi-tenant rollups for cross-tenant recommendations.
- Predictive (vs. observational) recommendations.

These return only via their own approved slices.

---

## 12. Bottom line

The accountability layer is the prerequisite. This plan defines the engine that converts it into recommendations, then into applied changes, then into verified savings, without ever bypassing human approval or claiming savings that were not measured.

Until a phase is explicitly approved, the boundaries hold:

- Runtime enforcement: blocked.
- Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
