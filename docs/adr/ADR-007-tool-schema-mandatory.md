# ADR-007: Tool Registry Schema Is Mandatory for Execution

**Date:** 2026-03-26
**Status:** Accepted

## Context

The tool registry (Phase 3) allows agents and plans to invoke external tools. Without schema enforcement, tools become a source of unpredictable failures and security vulnerabilities (prompt injection via malformed tool outputs, unexpected cost from unbounded tool calls).

## Decision

No tool can be invoked through the P402 execution pipeline without:

1. A registered entry in `tool_registry` with a valid `slug`
2. A `tool_versions` entry with a valid `input_schema` and `output_schema` (JSON Schema format)

Schema validation happens at two points:
- **Before invocation**: tool inputs validated against `input_schema`. Invalid inputs → execution error, no invocation.
- **After invocation**: tool outputs validated against `output_schema`. Outputs that violate schema → logged as errors, not silently passed forward.

This decision does not affect the existing A2A/Bazaar agent registry. The tool registry is for plan execution primitives; A2A is for agent-to-agent communication.

## Consequences

- Operators must register and schema-document tools before they can be used in plans
- Unregistered tools in planner output → plan validation failure (not runtime failure)
- Schema enforcement doubles as API documentation
- Cost and side-effect classification (`side_effect_class`) is a first-class field on every tool registration
