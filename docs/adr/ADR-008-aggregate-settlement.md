# ADR-008: Aggregate Settlement Per Request, Track Cost Per Node

**Date:** 2026-03-26
**Status:** Accepted

## Context

The existing x402 settlement flow triggers one EIP-3009 `transferWithAuthorization` per request. With multi-node plan execution, each node incurs cost. Options:

1. **Per-node settlement** — one on-chain transaction per node
2. **Aggregate settlement** — one on-chain transaction per request (or per session funding event), with per-node cost tracked internally

## Decision

Aggregate settlement per request:
- On-chain settlement happens once per request (covering all node costs)
- Per-node costs are tracked internally in `trace_nodes.cost`
- The settlement amount equals the sum of all node costs
- The receipt links to the `trace_id` (which contains all nodes), not to individual nodes

For session-based execution (prepaid sessions), settlement is even simpler: costs are deducted from the session balance, and the session itself is the settlement unit.

This decision follows from ADR-004 (trace linkage) — the trace is the unit of accountability, and the settlement settles the trace.

## Consequences

- Minimizes gas cost (one transaction per request vs N per request)
- Minimizes latency (settlement happens at end of execution, not per node)
- Internal cost accounting still has full per-node granularity
- Disputes reference the trace, which provides node-level detail
- If aggregate amount exceeds budget reservation, execution is halted before settlement
