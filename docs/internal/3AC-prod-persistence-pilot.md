# 3AC-Prod Persistence Pilot — Result

Single controlled production write test of the tenant-control shadow
persistence path. Proves one chat request through `/api/v2/chat/completions`
emits structured `tcs_shadow_decision` events and persists them into
`runtime_control_shadow_decisions` while the request is still allowed.

Runtime enforcement remains explicitly blocked. This pilot does not
introduce, read, or reference any `p402:tcs:enforce:*` Redis key.

## Outcome

Pass.

## Production deploy

- Operator-confirmed prod deploy >= commit `93d8d4e` (persistence writer
  is shipped from that commit).

## Tenant

- `tenant_id`: `4f689ea1-7340-476a-878e-9f0b930e5fd4`

## Redis preflight (before)

All four reads returned nil or empty.

- `p402:tcs:shadow:enabled` -> `null`
- `p402:tcs:shadow:tenant:4f689ea1-7340-476a-878e-9f0b930e5fd4` -> `null`
- `p402:tcs:shadow_persist:enabled` -> `null`
- `SCAN p402:tcs:enforce:*` -> `[]`

## SQL preflight

- `SELECT COUNT(*) FROM runtime_control_shadow_decisions` -> `0`

## Flags armed (tenant-scoped only)

- `SET p402:tcs:shadow:tenant:4f689ea1-7340-476a-878e-9f0b930e5fd4 = 1 EX 600`
- `SET p402:tcs:shadow_persist:enabled = 1 EX 600`

Global `p402:tcs:shadow:enabled` was not set. No enforce key was set or
referenced.

## Request

- `POST https://www.p402.io/api/v2/chat/completions`
- headers:
  - `Authorization: Bearer <pilot tenant API key>`
  - `x-p402-tenant: 4f689ea1-7340-476a-878e-9f0b930e5fd4`
  - `x-p402-department: pilot-persist`
- body:
  ```json
  {
    "model": "deepseek/deepseek-chat",
    "messages": [{ "role": "user", "content": "Reply with one word: ok" }],
    "max_tokens": 5,
    "p402": {
      "prefer_providers": ["openrouter"],
      "exclude_providers": ["google", "anthropic"]
    }
  }
  ```

## Response

- HTTP `200`
- `provider`: `openrouter`
- `model` (routed): `deepseek/deepseek-chat-v3`
- `request_id`: `bf56ab5e-fc78-4152-9015-feae0b3bbf8a`
- `usage`: prompt 9, completion 1, total 10
- `cost_usd`: `0.000003`
- `choices[0].message.content`: `"ok"`
- no `TENANT_CONTROL_*` runtime denial; request completed through the
  provider

## SQL after

- `row_count_before`: `0`
- `row_count_after`: `2`

Two axes fired on the same request, both with the same `request_id`
`bf56ab5e-fc78-4152-9015-feae0b3bbf8a`. The schema allows multiple rows
per (request, axis) by design.

### Persisted rows (latest first)

| axis | code | source | scope | enforcement_mode | would_have_denied | provider_called | model_requested |
|---|---|---|---|---|---|---|---|
| `max_cost_per_request_usd` | `MAX_COST_PER_REQUEST_EXCEEDED` | `tenant_default` | `tenant` | `shadow` | `true` | `true` | `deepseek/deepseek-chat` |
| `allowed_models` | `MODEL_NOT_ALLOWED` | `tenant_default` | `tenant` | `shadow` | `true` | `true` | `deepseek/deepseek-chat` |

No `prompt`, `response`, `messages`, `tool_calls`, or `raw_trace`
columns exist on the table; only metadata is persisted, per the
migration contract.

## Cleanup

Set to 0 then DEL, both succeeded.

- `SET p402:tcs:shadow:tenant:4f689ea1-7340-476a-878e-9f0b930e5fd4 = 0 EX 600` -> `OK`
- `SET p402:tcs:shadow_persist:enabled = 0 EX 600` -> `OK`
- `DEL p402:tcs:shadow:tenant:4f689ea1-7340-476a-878e-9f0b930e5fd4` -> `1`
- `DEL p402:tcs:shadow_persist:enabled` -> `1`

Post-DEL re-verification: both keys nil, `SCAN p402:tcs:enforce:*` -> `[]`.

## Dashboard / API verification (3AD)

`GET https://www.p402.io/api/v2/control/shadow-decisions` with the pilot
tenant credentials returned HTTP `200` with:

- `migration_pending`: `false`
- `byAxis`: 2 entries (`allowed_models`, `max_cost_per_request_usd`)
- `byCode`: 2 entries (`MAX_COST_PER_REQUEST_EXCEEDED`,
  `MODEL_NOT_ALLOWED`)
- `topGaps`: 2 entries, both tied to `request_id`
  `bf56ab5e-fc78-4152-9015-feae0b3bbf8a`
- `recent`: 2 entries, same `request_id`

The `/dashboard/control` UI is cookie-authed (NextAuth) and renders the
Shadow Decisions panel client-side; operator spot-check confirms the
panel no longer shows the migration-pending state and now lists the two
persisted rows. No enforcement copy, no savings proof, no Optimize
recommendations, no policy auto-apply copy is shown.

## Safety confirmations

- no PATCH
- no migration
- no code edit
- no commit beyond this doc
- no push beyond this doc
- no Neon SQL editor
- no broad production probes
- no global shadow flag set
- no `p402:tcs:enforce:*` key created or read for value
- runtime enforcement remains blocked
- persistence writer remains default off after cleanup

## Next gates

Awaiting explicit approval. Enforcement (`p402:tcs:enforce:*`) remains
out of scope.
