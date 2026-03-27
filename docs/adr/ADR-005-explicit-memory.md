# ADR-005: Memory Is Explicit and Typed, Not Prompt-Only

**Date:** 2026-03-26
**Status:** Accepted

## Context

LLM applications commonly inject memory as unstructured text into prompts ("here is what I know about you: ..."). This approach is fragile, untestable, and creates privacy and access-control problems.

## Decision

Memory in P402 is a structured, explicitly typed operation:

- Memory reads and writes are operations with defined schemas, not implicit prompt injections
- Memory entries have a typed `memory_type`: `session`, `preference`, `operational`, or `economic`
- Reads return structured objects that the caller explicitly merges into context (not auto-injected)
- All reads and writes are logged in `memory_access_logs`
- No memory write happens without an explicit `write_reason`
- TTL is enforced for session and operational memory; preference memory is persistent until explicit deletion

Memory is built in Phase 5 (last) because it requires the execution layer, trace layer, and eval layer to be stable first. Building memory too early creates complexity without payoff.

## Consequences

- Auditable: every memory access is logged
- Testable: memory operations are deterministic function calls, not stochastic prompt injections
- Privacy-safe: access control is at the read API level, not at the prompt level
- More implementation work than prompt injection, justified by auditability and control
