# ADR-006: OpenAPI Is the Canonical Public Contract

**Date:** 2026-03-26
**Status:** Accepted

## Context

P402 serves AI agents programmatically. Machine-readable API contracts are first-class requirements. The existing `public/openapi.yaml` covers the current V1/V2 surface. The new `/v1/execute` endpoint and supporting endpoints need to be represented in the contract.

## Decision

The OpenAPI spec at `public/openapi.yaml` (and served at `/api/openapi.json`) is the authoritative definition of the public API. Specifically:

- Every new public endpoint must be added to `public/openapi.yaml` before or immediately after implementation
- Request/response types in `lib/contracts/` are the implementation-side source of truth; OpenAPI reflects them
- Breaking changes to existing endpoints require a version bump
- The spec is served at a stable URL so agents can discover it via `/.well-known/agent.json`

## Consequences

- Documentation is always in sync with implementation (enforced by convention, not tooling in Phase 0)
- AI agents can self-discover the API surface
- New endpoints require two artifacts: code + OpenAPI entry
