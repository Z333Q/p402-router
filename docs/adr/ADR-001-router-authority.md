# ADR-001: Router Is the Single Execution Authority

**Date:** 2026-03-26
**Status:** Accepted

## Context

The P402 system is adding retrieval, planning, tool registry, memory, and evaluation services as part of the intelligence layer build. These services need a clear authority model — who can call whom, and which component is the single gate for external requests.

## Decision

The router is the single execution authority. All execution, all policy enforcement, all settlement, and all tracing flows through the router. New intelligence services (retrieval, planner, tools, eval, memory) are internal services called **by** the router. They do not call each other directly and they do not accept external requests.

- `POST /v1/execute` is the canonical public entry point
- `lib/execution/execute-request.ts` is the canonical internal entry point
- No intelligence service exposes a public-facing execution endpoint
- The existing V2 surface (`/api/v2/chat/completions`) is preserved as a direct-path alias and is not modified

## Consequences

- Any new capability that involves executing AI work must be added to the execution pipeline in `execute-request.ts`, not as a standalone API endpoint
- Intelligence services are internal library modules, not microservices
- The router accumulates authority; individual services remain thin
- Testing complexity is concentrated at the router boundary
