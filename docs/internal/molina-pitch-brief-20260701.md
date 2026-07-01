# Molina Healthcare — Pitch Brief

**Meeting:** Google Meet, ~4 hours out from 2026-07-01 12:00 PT
**Buyer:** Head of AI, Molina Healthcare (`molinahealthcare.com`)
**Format:** warm intro, live demo OK, unknown specific AI initiative
**Presenter:** Zeshan (solo)
**Objective:** close a Regulated Pilot ($50k, 90 days). Fallback: AI Spend Audit ($1,500). Anything else is a follow-up meeting, not a close.

Read this doc once before the call. Everything you need is here. Do not open the rehearsal pack or the demo script mid-call — they are the source; this is the derivative.

---

## 60-second opener (memorize)

"Thanks for making the time. Quick context on P402 before we open the dashboard: most AI spend inside a payer lives outside finance's line of sight. Teams ship calls, the bill arrives, and nobody can answer who spent it, on which program, on which model, or whether it should have been allowed. That is a compliance problem before it is a cost problem. P402 is the accountability layer underneath your AI stack. Every request is metered, attributed, policy-evaluated in shadow, and turned into finance-grade receipts. We do not touch optimization until the evidence base is trusted. Today I want to walk you through what is actually shipping in production, be honest about what is deliberately blocked, and end with a scoped 90-day path for Molina if it fits."

Then: "Before we jump in — anything specific you were hoping to see, or any Molina AI workload you want me to keep in mind while we go through the surfaces?"

That single question turns a generic demo into a Molina demo. Whatever they name (prior-auth AI, member service chatbot, coding QA, appeals letter generation, medical necessity summarization), map every dashboard surface back to that workload as you walk.

---

## Why this lands for a payer specifically

You do not need to name-drop these. Have them loaded so you can react.

- **Multi-state Medicaid attribution.** Molina holds ~15 state Medicaid contracts. Each state is its own cost center under its own contract with its own auditor. AI spend on a member-service chatbot for Ohio Medicaid is a different line item from the same call on Texas Medicaid. Meter + tenant/department attribution is the answer.
- **Prior-auth AI risk.** Prior authorization is the most scrutinized AI use in a payer today (CMS interoperability rule, state-level bills, and public heat). Shadow-decision evidence lets Molina say "we can prove what our AI would have denied, without letting it deny anything in production." That is a compliance posture, not a cost pitch.
- **Multi-vendor governance.** A large payer runs OpenAI enterprise, Anthropic, at least one Azure OpenAI tenancy, and often Google. P402 sits under all of them. You are not asking them to rip out a vendor. You are asking them to see across vendors.
- **Audit-ready receipts.** CMS, HHS OIG, state auditors, and internal SOX all want a paper trail. Prove is that paper trail. Frame it as "finance-grade" even to a technical audience — the Head of AI reports to a CFO or CTO with a CFO nearby.
- **Agent governance.** If Molina is running or planning autonomous agents (appeals drafting, coding review, member service triage), P402 is the spend guardrail. Do not oversell — this is a future-fit talking point, not a shipped capability claim.

## HIPAA / BAA — the honest line

You will get asked. Have this ready, verbatim:

"P402 stores decision metadata, not prompt or response content. No PHI enters the metering pipeline by design. A formal BAA is on our roadmap and we would sign one as part of a Regulated Pilot scoping. Today we can architect the pilot so no PHI ever touches P402: your provider calls stay direct, and we meter the economic event — tenant, department, provider, model, cost, decision — without touching the payload."

If they push: "For a 90-day pilot, we can start with synthetic or de-identified workload to prove the pipeline before we sign the BAA. The BAA is a gating condition for production PHI, not for pilot design."

Do not promise a signed BAA before pilot start. Do not overclaim SOC 2 status.

---

## Demo click path (exact order — 12 minutes total)

Open a fresh browser window. Sign in to the demo tenant. Close every other tab. Screen-share.

### 0. Frame (30 sec)

Say the opener. Ask the Molina-workload question. Note the answer.

### 1. Meter — `/dashboard/meter` (90 sec)

Click Meter. Point at the request list.

> "Every AI request lands here as a metered economic event. Provider, model, cost, tenant, department. No prompt content, no response content — decision metadata only. If we mapped a Molina state contract to a tenant and a workload to a department, every call under that program shows up here with a cost. This is the source of truth. Everything downstream reads from it."

**If they named a workload:** "So if your prior-auth AI was routed through P402, every call would be tagged to the prior-auth department under Molina's tenant, and this list would tell you cost-per-decision, provider mix, and volume — with no PHI in the ledger."

### 2. Monitor — `/dashboard/monitor` (60 sec)

Click Monitor. Skim provider health + routing + cache hit.

> "Operations view. Provider health, routing decisions, cache hit rate. If a provider degrades, it shows up here first. Read-only."

Do not linger. Monitor is not the headline.

### 3. Control — `/dashboard/control` (3 min — **HEADLINE**)

Click Control. Scroll to budget burn. Then scroll to shadow decisions.

> "This is governance readiness. Budget burn at four levels, allowlist status, denied spend, human review queue."

Then scroll to shadow decisions:

> "This is the new piece and the reason I am prioritizing this stage. Every policy we could enforce runs in production today — in shadow mode. We record what would have been denied. The request still completes. The provider is still called. Traffic is not interrupted. We log the would-have-denial as evidence. This row here — `provider_called=true`, `would_have_denied=true` — is a real production request. We captured the evidence. We did not block it."

**Molina translation:** "For a payer, this is the audit posture. You can prove to CMS or a state auditor what your AI would have blocked, without production risk of your AI actually blocking a member's authorization. Shadow first, enforcement after evidence is trusted."

Pin the boundary explicitly: "Runtime enforcement is intentionally off. Turning it on is a separate approved slice with its own evidence gate. We do not enforce until you approve enforcement."

### 4. Prove — `/dashboard/prove` (90 sec)

Click Prove.

> "Prove is the audit-ready surface. Finance-grade receipts. Idempotent. Cost per accepted outcome, not cost per request. Thin data shows up as thin data. We do not paper over anything."

**Molina translation:** "This is the receipt file a CFO or a compliance officer wants to see. Every metered event has an idempotent receipt. Nothing is reconstructed from logs after the fact."

### 5. Outcomes — `/dashboard/prove/outcomes` (90 sec)

Click Outcomes.

> "Outcomes bridges economics and quality. When an outcome event lands — accepted, rejected, human-reviewed — it attaches to the prior economic event so cost-per-accepted can be computed honestly. The outcome signals are tenant-supplied. We do not synthesize them."

**Molina translation:** "For prior-auth, cost per approved authorization. For coding QA, cost per corrected code. You define the outcome event. We attach it to the spend."

### 6. Settle — `/dashboard/settle` (60 sec — optional, only if time)

Click Settle.

> "Every USDC settlement processed through the P402 facilitator. The ledger is `processed_tx_hashes`. Treasury address is verifiable on Basescan. Read-only. We never overwrite a financial-integrity table."

Skip this if you are running long. It is a "how" surface, not a "why buy" surface for a Head of AI.

### 7. What is intentionally not on (60 sec — say this, do not skip)

Do not open Optimize. Say instead:

> "Two things I am not showing you, on purpose. First, Optimize recommendations are not live. We do not generate a recommendation we cannot defend, and defending a recommendation requires the evidence base to be trusted first. Second, runtime enforcement is off. Both are deliberate. Each will ship behind its own approved evidence gate. If a vendor is showing you optimization recommendations without an evidence base, they are guessing on your behalf. We will not."

This is your differentiation moment. Payer buyers respect vendors who do not overclaim.

### 8. Close and pivot to the ask (60 sec)

> "That is the shipped product. Accountability first, optimization second. Everything blocked is blocked on purpose. Given what you said about [their named workload], here is what I would propose for Molina."

Then go to the ask.

---

## The ask (primary — go for this first)

### Regulated Pilot — $50,000 / 90 days

Say it exactly like this:

> "For Molina I would recommend our Regulated Pilot. Ninety days. Fifty thousand. Privacy mode and evidence requirements included, because healthcare is one of the four verticals we designed the Regulated Pilot for. Fifty percent of the pilot fee credits toward an annual contract if you sign within thirty days of pilot close."

Then propose the shape (adapt to their named workload):

> "Concretely: two workflows of your choice — for a payer that is often one clinical AI workflow like prior-auth support and one operational AI workflow like member service. Ninety days of shadow-only evidence capture on both. Monthly readout with your team plus whoever your CMIO or CFO wants in the room. Success criteria we agree on in the SOW — for example, one hundred percent tenant attribution across both workflows, cost-per-decision at the department level, and shadow-decision evidence coverage on your top policy candidates."

Then ask directly:

> "Would that shape work for Molina, or do you want me to reshape it?"

Stop talking. Let them respond.

### Fallback ask — do not lead with this

If they hesitate on $50k, or say they need to loop in procurement:

> "If a full pilot is too big a first commitment while procurement gets involved, we also run a fixed-scope AI Spend Audit. Fifteen hundred dollars. Fourteen days. One vendor invoice review, one usage import, one dashboard preview, workflow-level cost analysis, executive report at the end. One hundred percent of the fee credits toward the Regulated Pilot if you sign within thirty days. It exists exactly for buyers who want an executive-grade first look before pilot commitment."

The audit is the escalation bridge, not a downgrade. Frame it as "designed for procurement-heavy verticals like yours."

### What you are NOT offering Molina

- Do not mention the $35k Paid Pilot. It is not the healthcare offer. Regulated Pilot supersedes it for payers.
- Do not offer a free trial. There isn't one, and offering it undermines the paid ladder.
- Do not name-drop a customer you do not have written permission from. You do not have any yet.

---

## Objection quick-reference

**"Show me the savings number."**
"Not yet. We do not claim a savings number we have not verified for your workload. The Outcomes surface is where that conversation starts — cost per accepted outcome, on your data, in a pilot. A savings claim is a pilot output, not a sales input."

**"We already have Azure OpenAI enterprise / an OpenAI enterprise agreement."**
"Perfect. P402 sits underneath the enterprise contract. We do not replace your provider relationship. We make the spend under that contract visible at the department, program, and outcome level. Your enterprise agreement is the ceiling. P402 tells you what actually lives under it."

**"How is this different from Portkey / Helicone / Datadog LLM observability?"**
"Observability tells you what happened. P402 tells you what should have happened, what would have been blocked under a proposed policy, and what it would cost either way. Observability is one surface of seven. Accountability is the layer above observability."

**"Do you store prompts or responses?"**
"No. Decision metadata only. No prompt content, no response content, no PHI in the metering pipeline by design."

**"How does HIPAA / BAA work?"**
Use the honest line above. Do not improvise.

**"What if your service is down?"**
"Provider calls are not gated on us in the current shadow posture. If we go down, you capture less evidence during the outage. We do not block your customer traffic. Enforcement — which is intentionally off today — would be a separate posture with its own SLA conversation."

**"Who owns the policy?"**
"You do. Policy is tenant-scoped. We do not push policy from our side."

**"Why should I trust your shadow numbers?"**
"Because the writer is default-off, the persistence is opt-in per tenant, and every row is queryable via API and dashboard so you can audit the same evidence we render. Two production rows were written by the pilot writer to validate the persistence boundary. That is the honest number."

**"When can we see enforcement / optimization live?"**
"They ship behind their own approved evidence gates. Enforcement follows accepted shadow evidence. Optimize recommendations follow accepted Outcomes coverage. Neither is a date we quote before the evidence gate is closed. That is a feature of how we ship, not a bug."

**"We would need to run this through security review."**
"Absolutely — that is exactly why the Regulated Pilot exists. Privacy mode and evidence requirements are baked into the pilot scope so security review is part of pilot week one, not a blocker to pilot start. What is Molina's typical security-review lead time?"

**"Send me a pricing sheet."**
Do not send a full rate card cold. Send Regulated Pilot terms only. Frame: "Rate card is available under NDA; here is the Regulated Pilot page you can share internally."

---

## What NOT to say (memorize)

- "We save you X percent." You have not verified a number.
- "We block bad calls." You observe. You do not block.
- "Enforcement is a toggle." It is an approved slice with an evidence gate.
- "Recommendations are coming next week." They are not.
- "Policy auto-applies." It does not.
- "We have healthcare customers." You do not yet.
- "We are SOC 2 / HIPAA compliant." You are not yet certified. You are architected to be.
- Any percentage, dollar figure, or row count beyond the numbers in this brief.
- Any comparison to a named competitor beyond the observability line already scripted.

---

## Screens NOT to open on screen-share

- `/models` — inherits a "saving 15–40% vs direct API calls" claim you have not verified for Molina.
- `/dashboard/evals` — carries a "planned mode typically improves scores by 15–40%" claim.
- `/meter/healthcare` — vertical landing page carries synthetic scenario claims.
- Admin routes (any `/admin/*`).
- Billing UI, wallet UI, API key UI — nothing personal.
- Any tab with a personal calendar, email, or Slack.

Pre-flight your browser before the call. Close every tab except the demo tenant.

---

## 30-second post-meeting close

If they say yes to the pilot:

> "Great. I will send a Regulated Pilot SOW draft within twenty-four hours. It will include the two workflows we discussed, the shadow-only posture, the monthly readout cadence, the success criteria, and the BAA path. Who on your side should be on the SOW routing — you, procurement, and legal? Any preferred paper trail?"

If they say yes to the audit:

> "Great. I will send the AI Spend Audit engagement letter today. Fourteen-day clock starts on countersignature. I need one vendor invoice, one usage export, and thirty minutes of your team's time in week one. The audit output is a written executive report and a live dashboard preview — you get to see the surfaces on your own data before the pilot conversation."

If they say maybe:

> "Understood. What would you need to see in the next thirty days to move to a pilot conversation? I would rather come back with the specific evidence you want than send generic follow-up material."

Then stop talking.

---

## Post-meeting email template (send within 4 hours of the call)

Subject: `P402 — Molina next step`

```
[Name],

Thanks for the time today. Quick recap on what I heard and what I proposed.

What I heard from you:
- [their named workload or priority]
- [any objection they raised — one line each]
- [their timeline signal, if any]

What I proposed:
- Regulated Pilot: 90 days, $50k, two Molina workflows, shadow-only,
  monthly readout with your team.
- Success criteria we would define together in the SOW.
- 50% of pilot fee credits toward annual if signed within 30 days of
  pilot close.
- BAA is a pilot-scoping conversation; no PHI in the P402 pipeline
  by design.

Fallback if procurement lead time is an issue:
- AI Spend Audit: 14 days, $1,500, executive report + dashboard preview.
- 100% credits toward the Regulated Pilot if signed within 30 days.

What I would like from you:
- Confirmation of the workflow shape (or a redirect if I got it wrong).
- Names for SOW routing on your side.
- Molina's security-review lead time so we can sequence properly.

I will hold [a specific proposed pilot start date, e.g., "the week of
July 21"] pending your response.

Zeshan
P402
```

Do not attach the rate card. Do not attach a deck.

---

## Pre-call checklist (5 minutes before the meeting)

- [ ] Close every browser tab except the demo tenant.
- [ ] Sign into the demo tenant.
- [ ] `/dashboard/meter` loads clean.
- [ ] `/dashboard/monitor` loads clean.
- [ ] `/dashboard/control` — the shadow decisions panel renders. If it renders zero rows, do not panic; you tell the buyer "shadow persistence is default-off per tenant; here is the API returning the pilot rows" and switch to the API tab.
- [ ] `/dashboard/prove` loads clean.
- [ ] `/dashboard/prove/outcomes` loads clean.
- [ ] `/dashboard/settle` loads clean (optional demo).
- [ ] `/dashboard/optimize` is NOT opened — you talk about it, you do not click it.
- [ ] Notepad open for their named workload + objections.
- [ ] This brief open on your phone. Rehearsal pack closed.
- [ ] Water. Bathroom. Do not eat in the ten minutes before the call.

---

## One-line summary

Accountability first, optimization second. Regulated Pilot, ninety days, fifty thousand, healthcare vertical. Ask, then stop talking.
