# ADR-009: Mode Gate with Heuristic Classification for Simple Requests

**Date:** 2026-03-26
**Status:** Accepted

## Context

Adding retrieval and planning to every request adds latency and cost overhead. A request like "translate this to French" should not pay the overhead of context retrieval and plan generation. The system must route simple requests to a fast direct path without user configuration.

## Decision

Every request to `POST /v1/execute` passes through a deterministic, zero-cost mode gate implemented in `lib/execution/mode-gate.ts`.

### The Gate

Five binary questions, each contributing one point (0 or 1):

| Q | Question | Pass condition |
|---|---|---|
| Q1 | Is the task short? | `task.length < 500` chars |
| Q2 | Is attached data absent or minimal? | No `document_uri`, no `file_refs`, `input_data` text < 2000 chars |
| Q3 | Are tools not requested? | `constraints.tools_allowed` is false, null, or absent |
| Q4 | Does the task match a single-intent pattern? | Keyword/regex match for translation, summarization, classification, simple Q&A, short generation, code explanation, formatting |
| Q5 | Is the budget small? | `budget.cap <= 1.00` USD (configurable per tenant) |

Score >= `threshold` → `direct` path (reuses existing V2 routing engine, no planning overhead).
Score < `threshold` → `planned` path (full intelligence pipeline).

**Default threshold: 4 out of 5.** Configurable per tenant via `tenant_settings`.

### Mode Field Override

Users (and the SDK) can override the gate with an explicit `mode` field:
- `"auto"` — run the gate (default, never needs to be set)
- `"direct"` — always skip planning; single model call
- `"planned"` — always run the full pipeline

The documentation, quickstart, and SDK defaults never show the `mode` field. The first example a new user sees has no `mode`.

### No LLM Call in the Gate

The gate is pure logic. No model is invoked for classification. Gate latency target: < 5ms.

### Bias

The gate is biased toward planned (conservative). Score of 3 or below → planned. This means:
- A complex task will very rarely take the direct path (false positive for simplicity)
- A simple task may occasionally take the planned path (false negative), which is acceptable

### Direct Path

When mode resolves to `direct`, a synthetic single-node plan is created (no LLM call) and execution proceeds through the existing V2 routing engine. Overhead vs V2 chat/completions: < 50ms.

### Interaction with V2 API

`/api/v2/chat/completions` is a permanent direct-mode endpoint and is not modified. It does not go through the mode gate.

## Consequences

- New users interact with a system that feels instant for simple tasks and intelligent for complex tasks
- No mode configuration required for the majority of use cases
- The heuristic will occasionally be wrong; the eval system (Phase 4) detects systematic misclassification
- Threshold is configurable per tenant, enabling power users to always use planned mode
