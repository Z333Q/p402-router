# 3Y-Shadow-Pilot-Retry — Result Record

Tenant-scoped, time-boxed runtime shadow rerun against production after
3Z-C OpenRouter live catalog refresh shipped and 3Z-E Redis fallback
hygiene shipped. Recorded for slice continuity. No enforcement.

## Outcome

Pass. One `tcs_shadow_decision` event emitted; no `tcs_shadow_failed`;
no runtime denial occurred.

## Observed signal

| Field              | Value                          |
| ------------------ | ------------------------------ |
| HTTP response      | 200                            |
| Axis               | `max_cost_per_request_usd`     |
| Code               | `MAX_COST_PER_REQUEST_EXCEEDED`|
| Source             | `tenant_default`               |
| Scope              | `tenant`                       |
| `configured_value` | `0.0000001`                    |
| `observed_value`   | `0.00000224`                   |
| `would_have_denied`| `true`                         |
| `enforcement_mode` | `shadow`                       |
| `provider_called`  | `true`                         |

The estimated cost (~$2.24e-6) exceeded the tenant-default cap (1e-7)
by ~22x. Shadow recorded the would-have-denial; the runtime path did
not block; the provider was called and returned a normal completion.

## Confirmations

- No runtime denial from tenant_control_settings.
- No `p402:tcs:enforce:*` key used (preflight + postcheck both empty).
- Tenant shadow key `p402:tcs:shadow:tenant:{tenant}` disabled and
  deleted after the request; never persisted beyond the TTL window.
- Global shadow key `p402:tcs:shadow:enabled` never set during this
  pilot.
- No PATCH, no SQL, no Neon contact, no migration applied, no code
  edits.

## What this validates

- The 3Y-Shadow-Wireup contract is reproducible against the post-3Z-C
  catalog: shadow continues to compute cost-estimate against the
  hybrid catalog (live + static fallback) and emit a structurally
  correct decision when the request would exceed the cap.
- The 3Z-E Redis hygiene did not regress the shadow path: the
  singleton remains reachable in production and the kill-switch read
  succeeded (decision was emitted, not silently skipped).
- The provider-success path through OpenRouter (`deepseek/deepseek-chat`)
  continues to return HTTP 200 alongside an active tenant-shadow read.

## Next slice block

Runtime enforcement remains blocked. No global shadow toggle. No
`p402:tcs:enforce:*` key namespace introduced. Optimize / savings /
policy-auto-apply work remains out of scope.
