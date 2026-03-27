# ADR-003: Bounded DAG Planning Before Recursive Agents

**Date:** 2026-03-26
**Status:** Accepted

## Context

The planner service must generate execution graphs. There are two broad architectural options:

1. **Recursive agents** — agents that can spawn sub-agents, loop, reflect, and modify their own execution plan mid-flight (ReAct, MRKL, etc.)
2. **Bounded DAG** — a finite directed acyclic graph generated once, validated, then executed sequentially

Recursive agents offer more capability in theory but introduce unbounded execution loops, unpredictable cost, and difficult policy enforcement.

## Decision

Phase 2 implements bounded, non-recursive DAG planning only:

- Maximum 5 nodes per plan (configurable per tenant, hard cap at 20)
- No cycles in the execution graph (validated before execution begins)
- No self-modifying plans (a node cannot add or remove nodes from the running plan)
- No recursive loops (a node cannot invoke the planner)
- Plans are generated once, validated, then executed sequentially

The planner generates the full graph before any node executes. Budget validation happens against the full plan, not incrementally.

Expand to recursive/dynamic replanning only after the bounded system is proven in production with measurable plan success rate > 90%.

## Consequences

- Predictable cost at plan validation time
- Policy enforcement against the full plan is possible
- Budget reservation can be made upfront
- Some complex, multi-turn reasoning tasks cannot be expressed; they fall back to the direct path
- Plan success rate is the key metric for deciding when to lift this restriction
