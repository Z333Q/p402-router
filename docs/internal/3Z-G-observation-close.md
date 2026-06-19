# 3Z-G — Tenant Shadow Observation Close

## Outcome

**Clean but low-signal.** The window ran without producing enough
decision volume to add new evidence beyond the prior controlled
pilot, but every safety invariant held.

The earlier controlled pilot (3Y-Shadow-Pilot-Retry, recorded in
`docs/internal/3Y-shadow-pilot-retry.md`) remains the canonical proof
of runtime shadow viability.

## Safety invariants

- Tenant shadow key was set with TTL, then disabled (`SET … 0 EX
  600`) and deleted (`DEL`) at window close.
- Global shadow key `p402:tcs:shadow:enabled` was never set during
  this window.
- No `p402:tcs:enforce:*` keys appeared.
- No runtime enforcement occurred from tenant_control_settings.
- No PATCH to production.
- No SQL, no Neon contact, no migration applied during the window.

## What this validates

- The kill-switch contract (tenant-scoped enable + TTL-bounded
  exposure) is operable in production without manual intervention.
- The dashboard severity-routed logs (3Z-F) continue to land at info
  for decisions and error for failures.
- No drift was observed in `provider_called` or `would_have_denied`.

## Next slice block

Runtime enforcement remains blocked.

After this window closed, the persistence path moved forward:

- **3AB-Prod Apply** — `v2_056_runtime_control_shadow_decisions.sql`
  applied to production through the gated runner.
- **3AC-Prod Persistence Pilot** — one controlled request emitted two
  shadow rows into the production table while the request returned
  HTTP 200; tenant-scoped persistence flags were armed with TTL, then
  set to 0 and `DEL`'d.
- **3AD** — documentation pushed at `ff4682a`.

Runtime enforcement remains explicitly out of scope. No
`p402:tcs:enforce:*` key has been created, read for value, or
referenced.
