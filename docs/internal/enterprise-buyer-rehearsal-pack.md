# Enterprise Buyer Rehearsal Pack (3AH)

**Audience:** founder + technical buyer conversations.
**Status:** rehearsal pack. Docs only. No code, runtime, or data behavior implied.

## Core positioning

P402 makes AI spend accountable before optimization begins.

The product chain is the talking spine. Walk it in order. Do not skip ahead.

```
Meter → Monitor → Control → Shadow Evidence → Prove → Outcomes → Optimize Readiness
```

Each stage answers one buyer question:

| Stage | Buyer question |
|---|---|
| Meter | Do you see every AI call? |
| Monitor | Can you describe what is happening right now? |
| Control | Can you describe what would have been blocked? |
| Shadow Evidence | Can you prove it without breaking traffic? |
| Prove | Can you show finance the receipts? |
| Outcomes | Can you tie spend to a result? |
| Optimize Readiness | Are you ready to act on the evidence? |

## Hard boundaries (memorize, never violate)

- Runtime enforcement remains blocked.
- Optimize recommendations remain blocked.
- No verified savings proof yet.
- No policy auto-apply.
- No production settlement execution claim.
- Shadow evidence is observational evidence, not enforcement.
- Persistence is evidence capture, not enforcement.
- No prompt or response content is stored in shadow evidence.

If a buyer asks for any of the above, the answer is: not yet, and that is intentional.

---

## 1. 5-minute founder demo script

Goal: convince the buyer that AI spend is unaccountable today, and that accountability is a prerequisite for optimization.

**0:00 to 0:45 — frame**
"Most AI spend lives outside finance's line of sight. Teams ship calls, the bill arrives, and no one can answer who, what, why, or whether it should have been allowed. P402 makes AI spend accountable before we touch optimization."

**0:45 to 2:00 — show Meter and Monitor**
Open the dashboard. Show traffic flowing. Point at request counts, provider mix, tenant attribution. Say: "Every request is metered. Every request is attributed. This is the foundation. Without it, optimization is guessing."

**2:00 to 3:30 — show Control and Shadow Evidence**
Open the Control surface. Show the shadow decision feed. Point at a row where `would_have_denied=true` while `provider_called=true`. Say: "This is a real production request. The policy says it should not have happened. Production traffic was not interrupted. We captured the evidence anyway. That is shadow mode. Enforcement is intentionally off."

**3:30 to 4:30 — show Prove and Outcomes**
Open Prove. Show audit-ready receipts. Open Outcomes. Say: "Finance gets receipts. Operators get an outcome view. Together they answer: was this spend worth it?"

**4:30 to 5:00 — close**
"Optimize is the next stage. We are not turning it on until the evidence base is trusted. That is the point. Accountability first, optimization second."

---

## 2. 12-minute technical buyer walkthrough

Goal: convince a technical buyer (platform lead, FinOps, security) that the foundation is sound and that the blocked surfaces are blocked on purpose.

**Minutes 0 to 2 — architecture frame**
- Router sits in front of provider calls.
- Every call is metered, attributed, and policy-evaluated.
- Policy evaluation runs in shadow mode in production today.
- Shadow decisions are persisted as evidence, not as enforcement state.

**Minutes 2 to 4 — Meter and Monitor**
- Show request volume, provider breakdown, tenant attribution.
- Explain idempotent event recording.
- Note: this is observability of spend, not just observability of latency.

**Minutes 4 to 7 — Control and shadow evidence**
- Show the Control dashboard.
- Pull up a row: `provider_called=true`, `would_have_denied=true`.
- Show `/api/v2/control/shadow-decisions` returning the same evidence via API.
- State plainly: the writer is disabled. There is no runtime enforcement path enabled. Two production rows have been written, by design, to validate the persistence boundary.
- Confirm: no prompt content, no response content, no PII payload is stored. Evidence is decision metadata only.

**Minutes 7 to 9 — Prove**
- Show audit receipts.
- Explain idempotency on event ingest.
- Explain that receipts are derived from metered events, not reconstructed from logs.

**Minutes 9 to 11 — Outcomes**
- Show the Outcomes surface.
- Frame it as: spend joined to a result signal, so finance can ask "was this worth it" instead of "what was this."

**Minute 11 to 12 — what is not on**
- Optimize recommendations are blocked.
- Runtime enforcement is blocked.
- Savings proof is not claimed.
- Policy auto-apply is not built.
- Each will require its own approved slice with its own evidence gate.

---

## 3. Live vs blocked matrix

| Capability | State | Notes |
|---|---|---|
| Metering | live | Every request recorded with tenant attribution. |
| Monitoring | live | Provider mix, volume, attribution surfaces. |
| Control policy evaluation | live, shadow only | Decisions computed, traffic not interrupted. |
| Shadow decision persistence | live, scoped | Production wrote 2 rows in the pilot. Writer remains disabled by default. |
| Shadow evidence API | live | `/api/v2/control/shadow-decisions` returns evidence. |
| Shadow evidence dashboard | live | Control surface renders evidence. |
| Prove receipts | live | Idempotent event-derived. |
| Outcomes readiness | live | Surface present. |
| Runtime enforcement | blocked | No production path enabled. |
| Optimize recommendations | blocked | No recommendations surfaced. |
| Verified savings proof | blocked | No savings number is claimed. |
| Policy auto-apply | blocked | Not built. |
| Production settlement execution claim | blocked | Not claimed. |

---

## 4. Proof summary

The current proof base for the buyer:

- Production runtime shadow decision was emitted.
- HTTP 200 on the originating request. Traffic was not interrupted.
- `provider_called=true` on the same request.
- `would_have_denied=true` on the evaluated policy.
- Production persistence wrote 2 rows under the pilot.
- `/api/v2/control/shadow-decisions` returns the captured evidence.
- The dashboard has a Control shadow evidence surface that renders the same rows.

This is enough to demonstrate that:

1. Policy evaluation runs in production.
2. Evidence is captured without enforcing.
3. The evidence is queryable through API and dashboard.

It is not a claim that enforcement, savings, or auto-apply is on.

---

## 5. Objection handling

**"Why isn't enforcement on?"**
Because enforcement without trusted evidence is a customer outage waiting to happen. We turn on enforcement after the evidence base is accepted by the buyer. That sequence is the product.

**"Can you show me the savings?"**
Not yet. We do not claim a savings number we have not verified. The Outcomes surface is the readiness layer for that conversation. A savings claim is a separate, approved slice.

**"Are recommendations live?"**
No. Optimize recommendations are intentionally blocked until evidence is trusted. We will not generate a recommendation we cannot defend.

**"Do you store our prompts?"**
No. Shadow evidence captures decision metadata. No prompt content, no response content.

**"How is this different from observability vendors?"**
Observability tells you what happened. P402 tells you what should have happened, what would have been blocked, and what it would have cost either way. That is the accountability layer.

**"How is this different from a gateway?"**
Gateways route. P402 routes, meters, evaluates policy, captures decision evidence, and produces finance-grade receipts. The gateway is one stage of seven.

**"Why should I trust the shadow numbers?"**
Because the writer is disabled by default, the pilot wrote a known small number of rows, and the evidence is queryable end to end. The buyer can audit the same rows the dashboard shows.

**"What is the deployment risk?"**
Low. Enforcement is off. The system observes. Turning on enforcement is a later, explicit decision.

**"Who owns the policy?"**
The tenant. Policy is tenant-scoped. We do not push policy.

**"What happens if your service is down?"**
Provider calls are not gated on us in the current shadow posture. We capture less evidence during an outage. We do not block customer traffic.

---

## 6. Accenture and browser-license conversation angle

Use this angle when the buyer is a large SI or a procurement-driven enterprise with seat-based AI tooling.

- Browser-licensed AI gives a per-seat ceiling. It does not give per-call attribution, per-tenant policy, or finance-grade receipts.
- A consultancy footprint multiplies the accountability gap. Many seats, many engagements, one bill.
- P402 sits underneath whatever seat licensing the buyer already pays for. We do not replace the license. We make the spend underneath it accountable.
- The Accenture-style angle is: "Your seat license tells you who logged in. P402 tells you what each engagement actually spent, on which provider, under which policy, with which decision."
- Tie it back to the chain: Meter and Monitor answer the procurement question. Control and Shadow Evidence answer the risk question. Prove answers the finance question. Outcomes answers the engagement-margin question.
- Do not promise savings. Promise accountability. Savings is a later conversation.

---

## 7. What to show first

Order matters. Show in this order, every time.

1. Mission Control overview. One screen, real traffic.
2. Control surface with a shadow decision row visible.
3. The same row via `/api/v2/control/shadow-decisions`.
4. Prove receipts.
5. Outcomes surface.

Do not open Optimize first. Do not open Settle deep flows first. Lead with accountability.

---

## 8. What not to say

- Do not say "we block bad calls." We do not. We observe.
- Do not say "we save you X percent." We have not verified a number.
- Do not say "recommendations are coming next week." They are blocked behind an approved slice.
- Do not say "policy auto-apply." It does not exist.
- Do not say "production settlement execution." We do not claim it.
- Do not say "we store prompts for analysis." We do not.
- Do not say "enforcement is a toggle." It is a deliberate, approved slice with its own evidence gate.
- Do not improvise dollar figures, percentage savings, or row counts beyond the proof summary.
- Do not compare to a named competitor without a written line approved in advance.

---

## 9. Buyer follow-up email bullets

Drop these into the post-meeting email. Adjust tone, keep claims.

- P402 makes AI spend accountable before optimization begins.
- Every request is metered and attributed at the tenant level.
- Policy evaluation runs in production today, in shadow mode. Traffic is not interrupted.
- We capture decision evidence, not prompt or response content.
- Production shadow persistence is validated. Evidence is queryable via API and dashboard.
- Receipts are finance-grade and idempotent.
- Outcomes ties spend to a result signal for engagement-level review.
- Runtime enforcement, Optimize recommendations, savings proof, and policy auto-apply are intentionally blocked. Each requires its own approved slice.
- Next step suggestion: a scoped shadow pilot on a single tenant or engagement.

---

## 10. Internal demo checklist

Run through this before any external call.

- [ ] Dashboard loads without console error on the demo account.
- [ ] Mission Control renders real traffic.
- [ ] Control surface renders at least one shadow decision row.
- [ ] `/api/v2/control/shadow-decisions` returns evidence when called from the demo environment.
- [ ] Prove receipts render.
- [ ] Outcomes surface renders.
- [ ] Optimize surface is not opened during the demo path.
- [ ] No browser tab has an admin-only or internal-only URL.
- [ ] Wallet, keys, and personal identifiers are not visible on screen.
- [ ] Proof summary numbers match this document (HTTP 200, provider_called=true, would_have_denied=true, 2 persisted rows).
- [ ] Hard-boundary list is fresh in memory before opening the call.
- [ ] Follow-up email draft is queued.

---

## Closing reminder

The pitch is the chain. The chain is the product. Accountability first, optimization second. Everything blocked is blocked on purpose, and saying so is a feature of the pitch, not a weakness of it.
