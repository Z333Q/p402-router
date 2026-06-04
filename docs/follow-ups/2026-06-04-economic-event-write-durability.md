# Follow-up: economic event write failures need a durable failure path

**Filed:** 2026-06-04
**Discovered during:** Slice 2C review (hosted-routing wiring into `ai_economic_events`)
**Severity:** P2 — visible at scale; not blocking individual response paths
**Owner:** unassigned

## Summary

The chat-completions and meter-only paths call `writeEconomicEvent` fire-and-forget. On failure the writer catches the rejection in `app/api/v2/chat/completions/route.ts` and logs:

```ts
console.error('[economic-events] hosted-routing write failed:', e instanceof Error ? e.message : e);
```

Fire-and-forget is appropriate for response latency — a successful chat completion should not be blocked by a metering write. But **`console.error` alone is unacceptable for an economic ledger**. A failed write today disappears into stdout and never reaches `ai_economic_events`. There is no way to:

- count how many events were lost
- replay failed writes after a DB outage
- tell a CFO "your billed AI activity matches your event ledger"
- prove evidence coverage in audit

## Required change

Add an outbox table that captures **only the failure record + retry state**. The original prompt and response content MUST NEVER appear in this table — the privacy contract is the whole product claim. The outbox stores enough metadata to reconstruct an `ai_economic_events` row from existing sources (chat completions response, request metadata) on retry.

### Proposed schema (target: `v2_053_economic_event_outbox.sql`)

```sql
CREATE TABLE IF NOT EXISTS economic_event_write_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  source TEXT NOT NULL,                           -- 'chat_completions' | 'meter_only' | ...
  error_code TEXT,                                -- 'db_unavailable' | 'check_violation' | ...
  error_message TEXT,                             -- short, redacted; NEVER prompt/response
  attempt_count INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'          -- pending | resolved | abandoned
    CHECK (status IN ('pending','resolved','abandoned')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,     -- METADATA ONLY: token counts, cost, ids
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, request_id)                  -- one outbox row per request
);

CREATE INDEX IF NOT EXISTS idx_eewf_pending
  ON economic_event_write_failures (status, next_retry_at)
  WHERE status = 'pending';
```

### Hard rules for the payload column

- MUST NOT contain `prompt`, `prompt_text`, `messages`, `response`, `response_text`, `completion`, `content`, `chat_history`, `file`, `document`, `transcript`.
- MUST contain only what `EconomicEventInput` would carry minus content: `request_id, source, tenant_id, api_key_id, owner_*, department_*, employee_*, customer_*, project_*, feature_*, workflow_*, task_type, action_type, provider, model_used, input_tokens, output_tokens, cost_usd, governance_decision, etc.`
- Retry worker reconstructs from `payload` + re-resolves privacy via the resolver. No content was ever stored, so retry produces the same privacy posture as the original attempt would have.

### Required code changes

1. `lib/economic-events/writer.ts`: on INSERT failure, instead of throwing, write to the outbox in a separate connection. If the outbox write also fails, fall back to `console.error` (same as today) — but the outbox covers the 99% common case (transient DB error, brief Neon hiccup).
2. `app/api/v2/chat/completions/route.ts`: simplify the `.catch` to just count metrics; the writer now owns durability.
3. Cron at `app/api/internal/cron/economic-events/retry` reads `status='pending' AND next_retry_at <= NOW()`, replays the row through `writeEconomicEvent`, marks resolved or increments attempt_count with exponential backoff, abandons after N attempts.
4. `/dashboard/audit` (or a new evidence panel) shows outbox depth + abandoned count so customers can verify "P402 ledger covers 100% of billed activity."

## Acceptance criteria for the fix

1. Killing the DB connection during a chat completion still records an outbox row.
2. Restoring the DB causes the retry worker to drain the outbox into `ai_economic_events`.
3. Outbox rows contain no prompt/response content (unit test scans every JSONB key for sentinel values).
4. Privacy mode resolved at retry time matches what it would have been at original attempt time (test with admin scope override that changes between original and retry — semantics should NOT silently change).
5. Audit page surfaces outbox depth and a "last N abandoned" list.

## Why this is a separate ticket and not blocking 2C

Slice 2C ships the privacy contract for the success path, which is the visible product claim. Durability is a reliability bet that the rec engine and CFO reporting will eventually depend on. It should land before either of those, and absolutely before the rec engine reads `ai_economic_events` as canonical (because gaps in the ledger become gaps in optimization recommendations).
