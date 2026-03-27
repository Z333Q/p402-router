# ADR-004: Every Paid Action Requires Trace Node and Receipt Linkage

**Date:** 2026-03-26
**Status:** Accepted

## Context

P402 settles payments on-chain via x402 (EIP-3009). As the system adds multi-node plan execution, each node may incur cost. We need a clear rule for what constitutes a settled action and how it is recorded.

## Decision

Every execution step that incurs cost (model call, tool invocation, external service) must:

1. Have a corresponding `trace_node` row in the database before execution begins
2. Have a corresponding `payment_event` or credit deduction record after execution completes
3. Have those two records linked (trace_node references payment_event_id)

No execution that costs money happens without a trace entry. No settlement happens without a receipt linked to a trace node.

Settlement aggregation (ADR-008) is compatible with this rule: individual node costs are tracked in `trace_nodes`, and the single on-chain settlement references all trace nodes it covers via the `trace_id`.

## Consequences

- Full auditability: given any transaction hash, you can trace it to a specific trace, specific nodes, and specific inputs/outputs
- Users can see exactly what they paid for at node granularity
- Disputes can be resolved by replaying the trace
- Implementation must write trace_node rows before execution (not after), even if the execution fails
