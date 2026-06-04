# Follow-up: streaming response capture honesty (full_trace path)

**Filed:** 2026-06-04
**Discovered during:** Slice 2C wiring of hosted-routing into `ai_economic_events`
**Severity:** P3 — privacy-safe but misleading; product correctness issue if a customer enables `full_trace` and expects streamed responses to be captured
**Owner:** unassigned

## Summary

The streaming chat-completions path calls `recordHostedEconomicEvent` with `responseContent: undefined` because chunks are not accumulated server-side. The non-streaming path passes the full `response.choices` payload.

Under most privacy modes this is harmless — the writer drops or fingerprints content per policy. **But for `full_trace`** (admin-opted-in for debugging), a customer reasonably expects the streamed response to land in `ai_economic_events` if they enabled `store_responses=true`. Today it does not, and the event row gives no signal that the response was simply not captured. An audit reading the row would see `response_stored=false` and wrongly conclude either "policy denied storage" or "response was empty."

This is the kind of dishonesty the V5 privacy contract explicitly forbids. The product must not imply streamed responses are captured when they are not, and it must not let a customer believe their `full_trace` policy is working end-to-end when the streaming path silently skips capture.

## Required fix (split into a quick fix + a real fix)

### Quick fix (1-line, ships immediately — separate Slice)

Add a `response_capture_status` field to either:
- `ai_economic_events` (column, value enum), OR
- `ai_economic_events.metadata.response_capture_status` (JSONB key)

Values:
- `captured` — response was passed to writer and policy stored it
- `not_available_streaming` — streaming endpoint did not buffer the response
- `not_stored_per_privacy` — policy resolved to not store (correct behavior under `metadata_only` / `fingerprint_only`)
- `truncated` — response was captured but truncated for size
- `failed` — capture attempted and errored

Hosted-routing streaming stamps `not_available_streaming`. Non-streaming stamps `captured` or `not_stored_per_privacy` depending on policy resolution.

The event detail page (`/dashboard/meter/events/[id]`) and any evidence export must surface this field so audit cannot misread the row.

### Real fix (later)

Implement an SSE response accumulator under streaming when the resolved privacy mode is `redacted_trace` / `full_trace` and `store_responses=true`. Buffer chunks up to a configurable cap (e.g. 256KB), then call `writeEconomicEvent` with the accumulated body.

This needs:
- A streaming buffer that respects `retention_expires_at` (do not buffer if retention is 0).
- A cap on buffer size with truncation marker that flips `response_capture_status` to `truncated`.
- A test that proves accumulator behaves under disconnection (caller hangs up mid-stream).

## Acceptance criteria

1. After the quick fix, every `ai_economic_events` row has a clear `response_capture_status` and the event detail page shows it.
2. A tenant with `full_trace` + `store_responses=true` who hits the streaming endpoint sees `not_available_streaming` on the event row until the accumulator ships.
3. After the accumulator ships, the same tenant sees `captured` rows with `response_stored=true`.
4. No row ever has `response_stored=true` with an empty response payload — the two fields are consistent.

## Why this is a follow-up, not blocking 2C

The privacy contract is correct today — content is not leaked. The honesty issue is about UI signaling and audit semantics, not data exposure. It should land before the rec engine reads `ai_economic_events` because Optimize quality recommendations depend on having reliable response data (or knowing reliably that response data is unavailable).
