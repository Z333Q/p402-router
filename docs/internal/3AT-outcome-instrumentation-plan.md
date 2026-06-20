# 3AT: Outcome Instrumentation Plan

**Status:** plan only. No code. No SQL. No migration. No tenant-visible behavior.
**Predecessor:** 3AR (`f81e212`) — first internal review run. Production produced zero candidates; outcome coverage was the binding constraint.
**Successor:** to be decided per phase below. Implementation begins only after §11 entry gate.

## 0. Hard boundaries (true throughout 3AT)

- Runtime enforcement: blocked.
- Tenant-visible Optimize recommendations: blocked.
- Verified savings proof: blocked.
- Policy auto-apply: blocked.
- No prompt content read or stored.
- No response content read or stored.
- No production mutation as part of this plan.

What 3AT *does* propose: a small, additive, opt-in instrumentation path that lets a tenant emit per-request outcome events, so that the Optimize engine has the input it needs to refuse fewer candidates as noise.

## 1. Framing

The 3AR review run confirmed the engine is healthy: it correctly emitted zero candidates against the pilot tenant because there were 4 events and 0 outcomes in the window. The candidate generator is doing its job. The data is the constraint.

This plan defines how to grow outcome data without crossing any of the boundaries that the rest of the product holds.

In scope:
- A canonical outcome event schema, with fields chosen to be safe to log.
- The minimum tenant integration to start emitting outcomes.
- How outcomes attach to the existing `ai_economic_events` ledger.
- How dashboards display coverage (a state of readiness), not "savings."
- A phased rollout that begins read-only and ends with a stable contract.

Out of scope (deferred or out of the product):
- Prompt or response content storage. Forbidden everywhere.
- Automated tenant action based on outcome data.
- Recommendation generation off the back of new outcomes (covered by Phase 1 of the existing Optimize track; 3AT does not change that track).
- Savings claims of any kind.

## 2. Outcome types to capture

Phase 1 of 3AT captures a small, opinionated set. Each value is a status the calling system can decide without any model inference, so adoption does not require integrating an evaluator.

| Status | Meaning |
|---|---|
| `accepted` | The caller used the model's output as-is. The dominant happy path. |
| `rejected` | The caller discarded the output and did not retry. |
| `retried` | The caller discarded the output and triggered another call to satisfy the same request. The retry is its own event with its own potential outcome. |
| `escalated` | The caller passed the output to a different system or to a human reviewer. |
| `human_reviewed` | The output was reviewed by a human before being used. Independent of `accepted` / `rejected` — both can attach. |
| `failed` | The call failed before producing any usable output. Distinct from `rejected`, which is a caller decision. |

The set deliberately mirrors the `request_outcomes.status` CHECK constraint that already lives in `scripts/migrations/v2_051_action_type_and_outcomes.sql`. No schema change is required for this list; we are documenting what exists and committing to it.

Out of scope for Phase 1: quality scores other than a single `quality_score ∈ [0, 1]`. Multi-axis quality (helpfulness, factuality, etc.) is deferred to a later phase whose entry gate includes evidence that the single-axis score is being used productively.

## 3. Minimum outcome event schema

The shape the SDK and HTTP path emit. The DB table already exists; 3AT does not propose a migration.

```
outcome event {
  tenant_id           required          # UUID
  request_id          required          # the request_id used by ai_economic_events
  status              required          # one of §2
  quality_score?      optional          # 0..1 if present, else null
  source              required          # 'sdk' | 'api' | 'mcp' | 'cli' | 'webhook'
  client_version?     optional          # caller's SDK version
  metadata            optional          # JSON object, see §5 for what is allowed
  created_at          server-assigned   # not provided by client
}
```

Notes:
- The schema explicitly omits any text body field. The §6 ingest path rejects any payload containing forbidden field names regardless of nesting (see §6 enforcement).
- `quality_score` is an optional single-axis float so that callers who already grade outputs can submit a score without us asking what their grading scheme is.

## 4. Tenant / workflow attribution

Outcomes inherit attribution from the joined `ai_economic_events` row on `(tenant_id, request_id)`. The outcome row itself stores only `tenant_id` and `request_id`; everything else flows by join. This keeps the outcome path narrow and prevents tenants from accidentally rewriting workflow attribution after the fact.

Requirements before an outcome can be emitted:
1. `tenant_id` matches the authenticated tenant on the API call.
2. `request_id` corresponds to a metered event that exists in `ai_economic_events`. Unknown `request_id`s are accepted but flagged as "orphan" in admin tooling; they are not stored in `request_outcomes` until the event is observed.
3. Idempotency on `(tenant_id, request_id)` — already enforced by the existing unique constraint. Re-submission updates `status` only if the new `status` is more terminal than the previous one (e.g. `pending` → `accepted` is fine; `accepted` → `pending` is rejected).

The "more terminal" ordering is documented in the implementation phase, not here. It is a small rule, not a design decision.

## 5. Acceptable metadata fields (allow-list)

`metadata` is JSONB. To prevent it from becoming a backdoor for prompts/responses, Phase 1 of 3AT defines an allow-list. Anything outside the allow-list is dropped server-side with a logged warning. The allow-list is small on purpose:

| Field | Type | Use |
|---|---|---|
| `caller_workflow_step` | string | Optional human-readable label for the step inside the caller's pipeline. Bounded length. |
| `caller_role` | string | Coarse identifier of the role that triggered the call. Bounded length. |
| `quality_axes` | object of `{name: number}` | Optional per-axis quality scores. Numbers only; no strings. |
| `latency_to_acceptance_ms` | integer | Time between model response and caller's decision. |
| `retry_index` | integer | Which retry this outcome belongs to within a logical request. |
| `error_class` | string | Coarse failure class (`timeout`, `validation`, `provider_error`, etc.). Not a stack trace. |
| `cost_attribution_hint` | string | Optional cost-center hint for the caller's bookkeeping. Bounded length. |

All string fields have a published max length (e.g. 64 chars) defined when the contract ships. No string accepts the full message body of anything.

## 6. Forbidden fields (drop with warning)

Any incoming metadata key matching these patterns is dropped server-side and logged as a warning to the audit trail. Re-emitting under a synonym is also dropped (the patterns are intentionally broad):

- `prompt`, `prompt_*`, `*_prompt`
- `response`, `response_*`, `*_response`
- `messages`, `chat`, `chat_*`
- `raw_trace`, `trace`, `raw_*`, `stored_content`
- `completion_text`, `request_body`, `response_body`, `message_content`
- Anything whose value is a string longer than the field's published max length.

Enforcement happens at the ingest boundary, before persistence. There is no path by which a forbidden field reaches `request_outcomes.metadata`. A source-shape test in the implementation phase asserts this.

## 7. How tenants and SDKs submit outcomes

Two surfaces. Both are additive; neither changes existing paths.

### 7.1 HTTP

```
POST /api/v2/outcomes
Headers: Authorization: <tenant API key>
Body: { request_id, status, quality_score?, source, client_version?, metadata? }
```

Idempotent. Returns `202 Accepted` if the event exists or has a buffered orphan slot, `400` for shape errors, `404` for unknown request_id when orphan buffering is disabled, `401` for missing auth.

### 7.2 SDK helper

A thin SDK helper on top of the HTTP endpoint:

```
p402.outcomes.report({ requestId, status, qualityScore?, metadata? })
```

The helper:
- Pulls `tenant_id` and `source` from SDK config.
- Drops forbidden metadata keys client-side before sending (defense in depth; the server also drops them).
- Retries with backoff on transient network errors.
- Does **not** retry on `400` or `401`.

Both surfaces are opt-in. A tenant that does not call them simply has zero outcome coverage and continues to see the engine refuse candidates. The product still works; it just keeps refusing noise.

## 8. How outcomes map to `ai_economic_events`

The join is on `(tenant_id, request_id)`. This already works in the 3AL read-only loader (`lib/optimize/candidates/data/readOnlyLoader.ts`), which produces `event_id` for each outcome by joining `ai_economic_events`. No new join, no new index, no new view.

Three operational considerations carry forward into the implementation phase:

1. **Orphan handling.** If an outcome arrives before the metered event row is committed (race), the ingest path buffers it for a short window. Buffered orphans expire if the event never arrives. Buffering rules are stated in the implementation phase.
2. **Idempotency on `(tenant_id, request_id)`** is already a unique constraint. Re-submissions update `status` and `quality_score` only if monotonic per the ordering in §4.
3. **No backfill from prompt/response.** We do not generate retroactive outcomes from any stored content because no content is stored. Retroactive outcomes can be POSTed by tenants the same way live ones are.

## 9. Dashboard display: coverage, not savings

Dashboards introduce **one** new surface in 3AT: an outcome-coverage band on the existing Outcomes (Prove → Outcomes) page. The band shows three things and nothing more:

- Percent of in-window events with a resolved outcome.
- A small per-workflow heatmap rendered with the same gates the Optimize engine reads, with no value labels beyond the percentage and the count.
- A standing footer line: *"Coverage measures whether outcomes are reported. It is not a savings number, a recommendation, or an estimate of optimization."*

The band must not display:
- A dollar amount.
- A percentage labelled "savings."
- A label that reads "ready to optimize." The internal phrase is "outcome readiness," not "ready to optimize," because the latter implies an action that does not exist.

A source-shape test in the implementation phase forbids the strings "verified savings," "estimated savings," "auto-apply," and "automatically optimize" in any new component introduced by this slice.

## 10. How Optimize uses outcome coverage without claiming savings

Optimize already reads `request_outcomes` through the 3AL loader. 3AT does not change that. It only changes the volume the loader has to read.

Behaviour the product holds onto, restated:
- A higher outcome coverage allows more candidates to clear `OUTCOME_COVERAGE_MIN = 0.60` and the type-specific gates. The engine still refuses noisy candidates on its own thresholds; coverage only widens the set of slices that even reach scoring.
- The engine continues to drop borderline candidates rather than downgrading them.
- No candidate is auto-promoted to tenant visibility. The 3AP → 3AQ pipeline still requires human review.

The improvement from 3AT is a denser input, not a louder output.

## 11. Implementation phases (each independently approvable)

| Phase | Name | Output |
|---|---|---|
| **3AT-0** | This plan | The plan you are reading. Docs only. |
| **3AT-1** | Ingest endpoint, no SDK | `POST /api/v2/outcomes` with full §6 enforcement; integration tests against fixtures only; **no production write enabled**. |
| **3AT-2** | SDK helper | `p402.outcomes.report(...)` shipping in the SDK; opt-in; default off. |
| **3AT-3** | Coverage band on dashboard | The Outcomes-page band described in §9. Read-only. Renders empty until ingest is on. |
| **3AT-4** | Pilot tenant turn-on | A single pilot tenant flips the ingest path on for itself. Internal observation only; no Optimize copy change. |
| **3AT-5** | Stability + soak | 14-day soak window of pilot ingest. At the end, decide whether to widen to additional tenants. |
| **3AT-6** | Optional: cross-tenant analysis | Internal-only analysis of coverage trends. Plan-only at the start of this phase; subject to its own gate. |

Apply, savings, and tenant-visible recommendations are **not** in this phase list. They live in the Optimize track and have their own gates.

## 12. Go / no-go criteria (per-phase)

**3AT-0 → 3AT-1**
- This document accepted in writing.
- The §6 forbidden-field list locked.

**3AT-1 → 3AT-2**
- Ingest endpoint accepts, rejects, and dedupes correctly against fixtures.
- Source-shape tests forbid prompt/response field names, savings phrasing, and apply-style verbs across the new code paths.
- No production tenant has ingest enabled.

**3AT-2 → 3AT-3**
- SDK helper ships with a documented default-off posture.
- SDK source-shape tests assert the helper drops forbidden metadata client-side.
- Helper integration tests pass against a fixture endpoint.

**3AT-3 → 3AT-4**
- Coverage band renders the empty state correctly with zero ingest.
- Source-shape tests forbid "savings," "auto-apply," and "automatically optimize" in the new component.
- Independent copy reviewer reads the band aloud without uttering "savings."

**3AT-4 → 3AT-5**
- Pilot tenant has opted in to ingest, in writing.
- Internal observation confirms the pilot's ingest does not affect any other tenant's surface.
- No prompt or response content has been received (a sample inspection of stored metadata confirms zero forbidden fields).

**3AT-5 → 3AT-6 (or widening to additional tenants)**
- 14 days of pilot ingest with zero forbidden-field warnings logged.
- Outcome coverage on the pilot tenant has materially risen (definition agreed at gate time).
- A subsequent 3AR review run produces at least one non-rejected production candidate.
- No safety incident.

Failing any gate holds the phase. No exception path.

## 13. What 3AT does not change

Even fully implemented:

- Runtime enforcement remains blocked.
- Tenant-visible Optimize recommendations remain blocked.
- Verified savings proof remains blocked.
- Policy auto-apply remains blocked.
- The accountability chain (Meter → Monitor → Control → Shadow Evidence → Prove → Outcomes → Optimize Readiness) is unchanged.
- The 3AP → 3AQ promotion criteria for tenant-visible drafts are unchanged.

3AT is *fuel* for the existing engine, not a new product surface.

## 14. Closing reminder

The optimizer is not the bottleneck. Outcome data is. The right move is to grow the input, not to relax the output. Until each phase is explicitly approved, the boundaries hold.
