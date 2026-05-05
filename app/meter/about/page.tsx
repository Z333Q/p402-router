import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About, P402 Meter · AI Billing on Tempo Mainnet',
  description:
    'P402 Meter: Gemini-powered healthcare prior authorization where every AI token is priced in USDC.e and settled on Tempo mainnet via MPP. Usage-Based Compute Billing.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <Link href="/meter" className="text-xs font-mono text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors">
          ← Back to Demo
        </Link>
        <div className="flex items-center gap-3">
          <span className="border border-primary px-2 py-0.5 text-[10px] font-mono text-primary uppercase tracking-wider">
            Tempo Mainnet · MPP
          </span>
          <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-500 uppercase">
            Usage-Based Compute Billing
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-20">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {'>'} _ P402 METER · TEMPO MAINNET · USAGE-BASED AI BILLING DEMO
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
            AI Thinking<br />
            Has a Price.<br />
            <span className="text-primary">Now It Settles.</span>
          </h1>
          <p className="text-base font-bold text-neutral-50 max-w-2xl leading-relaxed mb-1">
            P402 Meter is a healthcare prior authorization review system where every AI token
            is priced in USDC.e and settled on Tempo mainnet via MPP in real time.
          </p>
          <p className="text-base font-mono text-neutral-400 max-w-2xl leading-relaxed">
            Prior authorization review is the proof of concept: a document-heavy, high-stakes
            workflow where every reasoning step has measurable value and every cent of cost can
            be governed, attributed, and audited. If per-token AI billing works here, it works
            everywhere.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/meter" className="btn btn-primary text-sm px-6 py-2">
              Live Demo →
            </Link>
            <a
              href="https://explore.tempo.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm px-6 py-2"
            >
              Tempo Explorer →
            </a>
          </div>

        </section>

        {/* ── The Problem ───────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="01" label="The Problem" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            AI work in healthcare has no economic substrate.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProblemCard
              stat="$31B"
              label="Annual US prior auth administrative cost"
              detail="Much of it manual, repetitive, document-heavy reasoning work that AI can already do."
            />
            <ProblemCard
              stat="$0.30"
              label="Stripe minimum transaction fee"
              detail="Makes sub-cent per-action billing impossible. You'd need to batch 300+ AI micro-actions before you can charge for them, destroying real-time attribution."
            />
            <ProblemCard
              stat="~$2.85"
              label="ETH mainnet gas cost per ERC-20 transfer"
              detail="Settlement costs more than the AI work itself. Every high-fee chain makes per-token settlement economically irrational."
            />
            <ProblemCard
              stat="0"
              label="Existing systems with real-time per-token AI billing"
              detail="AI platforms bill monthly subscriptions or per-API-call batches. No system prices and settles at token granularity. Until now."
            />
          </div>
        </section>

        {/* ── The Solution ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="02" label="The Solution" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Every token an AI generates is a priced USDC.e event on Tempo.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            P402 Meter instruments the Gemini generation stream at the chunk level. Each text
            chunk emitted by the model triggers a ledger event: tokens estimated, cost calculated
            at $0.0000006/token, USDC.e amount recorded, event settled on Tempo. A single prior
            authorization review generates 55+ onchain events. Total cost: under $0.001.
          </p>
          <div className="border-2 border-primary p-6 flex flex-col gap-4">
            <div className="text-[10px] font-mono text-primary uppercase tracking-wider">
              The workflow in one sentence
            </div>
            <p className="text-lg font-bold leading-snug">
              Upload a prior-auth document → Gemini 3.1 Flash reads it, classifies it, reviews it →
              every token of that thinking settles in USDC.e on Tempo mainnet via MPP →
              Gemini 3.1 Pro audits the economics → humans approve the recommendation with
              full onchain proof of work.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricCard value="55+" label="Onchain events per review" sublabel="1 per token chunk emitted" />
            <MetricCard value="&lt;$0.001" label="Total cost per action" sublabel="vs $2.85 on ETH mainnet" highlight />
            <MetricCard value=">99.9%" label="Cost saving vs ETH" sublabel="Tempo FeeAMM sub-millidollar" />
          </div>
        </section>

        {/* ── Technology Stack ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="03" label="Technology" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Three technologies. One economic model.
          </h2>

          <TechBlock
            badge="Tempo"
            color="border-primary text-primary"
            headline="The settlement layer that makes sub-cent billing real"
            points={[
              'USDC.e (TIP-20) as native stablecoin — settlement costs <$0.000001/tx via FeeAMM instead of $2.85 on ETH mainnet',
              'High transaction frequency — 55+ provisional ledger events per session, one real Tempo tx at session close',
              'TIP-20 tokens use standard ERC-20 transfer() interface — no native ETH value, no gas token separate from stablecoins',
              'P402\'s AI agent is registered with ERC-8004 on Base mainnet (cross-chain identity) for verifiable agent identity and reputation',
              'Every settlement links to a verifiable entry in the Tempo block explorer (explore.tempo.xyz)',
              'FeeAMM handles gas in TIP-20 stablecoins — pure stablecoin workflow, no ETH required anywhere in the stack',
            ]}
          />

          <TechBlock
            badge="MPP"
            color="border-info text-info"
            headline="The payment method layer that makes machine payments programmable"
            points={[
              'Machine Payment Protocol (MPP / mppx) provides the payment orchestration layer for Tempo settlements',
              'Session wallet: a pre-funded TEMPO_TREASURY_PRIVATE_KEY wallet holds USDC.e and submits TIP-20 transfers on behalf of each metered session',
              'Per-session-close settlement: one real Tempo tx per review session aggregates all 55+ provisional events into a single onchain proof — no per-chunk gas burn',
              'USDC.e at the Tempo TIP-20 contract address — no ETH required, pure stablecoin workflow',
              'mppx provides the dual-402 challenge/response layer for machine-to-machine payment authorization via the Authorization: Payment header pattern',
              'Proof Replay mode activates automatically when TEMPO_TREASURY_PRIVATE_KEY is unset — full demo runs without any real funds',
            ]}
          />

          <TechBlock
            badge="Gemini"
            color="border-warning text-warning"
            headline="The intelligence layer that makes AI work governable"
            points={[
              'Gemini 3.1 Flash for multimodal document intake: reads scanned PA forms (image/PDF) and plain-text packets via the inlineData API with no separate OCR step',
              'Function calling in ANY mode with 3 typed tools (parsePriorAuthDocument, createReviewSession, addLedgerEstimate): forces Gemini to return structured, schema-validated fields and guarantees all three tools are invoked on every run',
              'Every extraction returns a typed healthcare object: payer name, provider name, procedure requested, urgency level, case type, confidence score, and specialist escalation flag',
              'Gemini 3.1 Flash drives the live streaming review with a URAC-aligned system instruction that enforces NCQA UM standards: labeled output sections, policy criteria citation, documentation completeness scoring, and a reviewer recommendation',
              'Gemini 3.1 Flash also runs the approval gate with a system instruction that enforces conservative evaluation: when any criterion is borderline, the model recommends escalation over approval',
              'Gemini 3.1 Pro runs the post-session economic audit with an executive-level system instruction and unconstrained output: produces a 3-paragraph analysis comparing session cost against Stripe and Ethereum mainnet, with strategic implications for payer operations',
              'Two deliberately selected model tiers: Flash for speed, streaming, and multimodal reasoning; Pro for depth, precision analysis, and narrative synthesis',
              'Multimodal demo: load the sample PA form PNG from the Document Intake panel and upload it via the Image/PDF tab to see Gemini 3.1 Flash read printed form fields off a realistic scanned document',
            ]}
          />
        </section>

        {/* ── Healthcare Context ────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="04" label="Why Healthcare" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Healthcare prior auth is the hardest possible proof of concept.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            Prior authorization review is document-heavy, policy-bound,
            multi-step, explainability-critical, and economically significant. If per-token billing
            works here, it works everywhere.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ContextCard
              label="Governance is mandatory"
              detail="Clinical AI must explain every decision. P402's governed session model, budget caps, approval gates, audit trails, is not optional overhead here. It is the product."
            />
            <ContextCard
              label="Document reasoning is load-bearing"
              detail="Gemini's multimodal intake reads actual prior auth forms. This is not prompt-wrapped text. It is vision-based structured extraction with typed function calls."
            />
            <ContextCard
              label="Specialist delegation is natural"
              detail="Complex cases route to specialist review agents under blockchain-verified escrow. The agent-to-agent payment loop mirrors real payer escalation workflows where complex cases are handed off with a financial commitment attached."
            />
            <ContextCard
              label="The economics are real"
              detail="A human reviewer costs $15–50/hour for prior auth work. An AI-assisted review costs under $0.01. The margin explanation in the demo is not hypothetical, it is the business case."
            />
          </div>
        </section>

        {/* ── Platform Alignment ────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="05" label="Platform Alignment" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Built to satisfy every technical criterion.
          </h2>
          <p className="font-mono text-neutral-500 text-sm">
            P402 Meter was designed explicitly against the platform requirements. Each check below maps
            to something visible in the live demo, not claimed in theory.
          </p>
          <div className="flex flex-col gap-3">
            <AlignmentRow
              prize="Usage-Based Compute Billing · Tempo Mainnet"
              checks={[
                'Every AI token Gemini generates is priced at $0.0000006/token and written as a discrete USDC.e ledger event — not batched, not estimated after the fact, one provisional event per streaming chunk in real time',
                '55+ onchain billing events per session: extraction estimates fire during document parsing, review estimates fire on every streaming chunk, reconciliation fires once with the verified token count and a real Tempo tx hash',
                'One real Tempo mainnet settlement tx per session: the TEMPO_TREASURY_PRIVATE_KEY wallet submits a single USDC.e ERC-20 transfer() at stream close, aggregating all provisional events into one verifiable onchain proof',
                'Tempo FeeAMM enables <$0.000001 per settlement vs $2.85 on ETH mainnet — 99.9%+ cost reduction makes token-granularity billing economically viable for the first time',
                'FrequencyCounter widget shows real-time billing velocity: tokens, cost, and event count incrementing with every chunk emitted',
                'Margin panel proves the economics: Tempo <$0.000001/tx vs ETH mainnet $2.85/tx vs Stripe $0.30 minimum. Usage-based billing at token granularity is structurally impossible on any other payment rail.',
              ]}
            />
            <AlignmentRow
              prize="B2B FinOps & Compliance"
              checks={[
                'Every review session has a budget cap enforced pre-execution: if projected cost exceeds the cap, the session is blocked before Gemini is invoked',
                'Approval gate runs a policy-enforcing quality pass after the review: insideBudget, policyCompliant, and outputInScope are evaluated independently and returned in the stream_done event',
                'EconomicAuditPanel (Gemini 3.1 Pro) produces a 3-paragraph executive narrative with cost-per-action benchmarks against Stripe and Ethereum mainnet, structured for a CFO or payer ops director audience',
                'Every ledger event is written to a persistent audit log with UUID, sessionId, workOrderId, eventKind, tokensEstimate, costUsd, costUsdcE6, provisional flag, and createdAt timestamp',
                'Tempo Explorer links on every reconciliation event: the full billing trail is independently verifiable at explore.tempo.xyz without trusting any P402 system',
                'URAC-compliant review format with labeled output sections (Request Classification, Policy Criteria Reference, Administrative Rationale, Documentation Completeness Assessment, Reviewer Recommendation) satisfies the audit artifact requirement for UM compliance programs',
              ]}
            />
            <AlignmentRow
              prize="Google Track: Best Use of Gemini Models"
              checks={[
                'Gemini 3.1 Flash is load-bearing across three distinct roles: multimodal document intake, function calling with forced ANY-mode tool invocation, and the live URAC-aligned streaming review with per-chunk USDC.e settlement',
                'Function calling uses FunctionCallingMode.ANY to guarantee all 3 typed tools are invoked and returns a structured JSON healthcare extract (payer, provider, procedure, urgency, confidence score) visible in the Work Order panel',
                'Flash also runs the approval gate with a conservative system instruction: "when any criterion is borderline, recommend escalation over approval" — this is not a trivial classification, it is a policy-enforcing quality gate',
                'Gemini 3.1 Pro runs the post-session economic audit with an executive-level system instruction and unconstrained output: produces a 3-paragraph narrative comparing session cost against Stripe and Ethereum mainnet with strategic implications for payer operations',
                'Two model tiers used as an explicit architectural decision: Flash optimized for speed, streaming, and real-time pricing; Pro deployed for depth, analytical reasoning, and executive-quality narrative synthesis',
                'Multimodal: the sample PNG prior auth form in the Document Intake panel demonstrates Gemini 3.1 Flash reading printed form fields off a realistic scanned document via the inlineData API',
              ]}
            />
            <AlignmentRow
              prize="Agent-to-Agent Payment Loop"
              checks={[
                'P402\'s AI agent has a registered ERC-8004 identity on Base mainnet (cross-chain) — agent identity, reputation, and budget controls inherited from the P402 trust stack',
                'AP2 mandates govern per-session spending: agent cannot exceed the budget cap, every action is policy-checked against a signed mandate before settlement',
                'InheritedTrustStrip shows the live trust depth: ERC-8004 identity, reputation-aware routing, AP2 budget controls, and replay protection — all verifiable',
                'ERC-8183 specialist escrow is planned for Phase 3 — A2A payment loop architecture is fully wired, escrow settlement returns 503 on Tempo Phase 1',
              ]}
            />
          </div>
        </section>

        {/* ── Architecture ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="06" label="Architecture" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Eight API routes. One coherent economic model.
          </h2>
          <p className="font-mono text-neutral-500 text-sm">
            Each route handles exactly one step of the workflow. They are independently testable,
            stateless where possible, and every settlement-producing route writes directly to Tempo.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 font-mono text-xs">
            {[
              ['/api/meter/packet', 'Ingest document, SHA-256 hash, persist asset'],
              ['/api/meter/work-order', 'Gemini multimodal extraction → structured WorkOrder'],
              ['/api/meter/sessions', 'Open metered session with budget cap'],
              ['/api/meter/wallet', 'Check Tempo settler wallet balance and signer address'],
              ['/api/meter/chat', 'SSE stream, per-chunk ledger events, reconcile + Tempo settle, approval'],
              ['/api/meter/escrow', 'ERC-8183 specialist escrow (Phase 3 — returns 503 on Tempo Phase 1)'],
              ['/api/meter/trust', 'ERC-8004 agent identity + reputation read'],
              ['/api/meter/audit', 'Gemini 3.1 Pro economic audit, executive 3-paragraph narrative + cost breakdown'],
            ].map(([route, desc]) => (
              <div key={route} className="border border-neutral-700 px-3 py-2 flex flex-col gap-0.5">
                <span className="text-primary font-bold">{route}</span>
                <span className="text-neutral-400">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Business Value ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="07" label="Business Case" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The buyer is the payer. The ROI is measurable.
          </h2>
          <p className="font-mono text-neutral-400 text-sm leading-relaxed">
            P402 Meter is not a demo for developers. The end buyer is a health plan, TPA, or
            utilization management vendor who currently pays $25-100 per manual prior auth review
            and receives no real-time cost visibility, no usage-based billing, and no audit trail
            that survives litigation.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-error tabular-nums">$25-100</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Manual review cost per case</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Human reviewer time for a standard prior authorization decision. Complex cases can exceed $200.
              </div>
            </div>
            <div className="border-2 border-primary p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-primary tabular-nums">&lt;$0.01</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">AI-metered review cost per case</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Gemini extraction + streaming review + economic audit + Tempo settlement. Every cent tracked and auditable.
              </div>
            </div>
            <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-success tabular-nums">Full audit trail</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Every action provable onchain</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Budget cap, approval gate, and ledger events are all verifiable. No black-box AI billing. No subscription guessing.
              </div>
            </div>
          </div>
          <div className="border border-neutral-700 p-4 flex flex-col gap-3">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">What changes for the buyer</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-[11px] font-mono text-neutral-400 leading-relaxed">
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">→</span><span>Usage-based vendor billing: pay per case reviewed, not per seat or per month</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">→</span><span>Per-action cost visibility: know exactly what each AI step cost before approving release</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">→</span><span>No subscription lock-in: metered pricing means cost scales with volume, not contract size</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">→</span><span>Audit-ready output: every review is an onchain artifact that survives a URAC or NCQA audit</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">→</span><span>Specialist delegation with financial proof: complex cases route to agents under verified escrow</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">→</span><span>Human approval stays required: no AI makes a coverage decision without a qualified reviewer</span></div>
            </div>
          </div>
        </section>

        {/* ── Judge Walkthrough ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="08" label="Judge Walkthrough" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Five steps. Under three minutes.
          </h2>
          <p className="font-mono text-neutral-400 text-sm leading-relaxed">
            Everything claimed on this page is verifiable in the live demo. Here is the exact
            sequence to evaluate it.
          </p>
          <div className="flex flex-col gap-3">
            {[
              {
                step: '01',
                action: 'Load a healthcare scenario',
                detail: 'In the Document Intake panel (left column), click any scenario row to load it, or download the sample PNG form and upload it via the Image/PDF tab to test Gemini multimodal vision.',
              },
              {
                step: '02',
                action: 'Click "Submit to Gemini" and watch the Work Order appear',
                detail: 'Gemini Flash extracts structured fields from the document using function calling. The Work Order panel shows the typed output: payer, provider, procedure, urgency level, case type, and a confidence score.',
              },
              {
                step: '03',
                action: 'Hit "Execute Review" and watch the Ledger fill in real time',
                detail: 'The Review Summary panel streams the AI review token by token. Each chunk simultaneously writes a ledger event — cost estimated, USDC.e amount recorded, Tempo settlement queued. Watch the event count climb past 55.',
              },
              {
                step: '04',
                action: 'Open the Tempo Proof drawer and verify the settlement',
                detail: 'The Tempo Proof drawer shows the settlement tx hash and block number. Click "Verify on Tempo →" to open the tx on explore.tempo.xyz. The USDC.e transfer is real, the cost is real (<$0.000001/tx), and the total stays under $0.001.',
              },
              {
                step: '05',
                action: 'Scroll to the Economic Audit and the Margin Explanation panels',
                detail: 'After the review completes, Gemini Pro generates a cost breakdown. The Margin panel shows the exact comparison: Tempo <$0.000001/tx vs ETH mainnet $2.85/tx vs Stripe $0.30 minimum. This is the business case for Tempo in one number.',
              },
            ].map(({ step, action, detail }) => (
              <div key={step} className="border border-neutral-700 flex">
                <div className="flex-shrink-0 w-12 flex items-center justify-center border-r border-neutral-700 bg-neutral-800">
                  <span className="text-primary font-bold font-mono text-sm">{step}</span>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <div className="text-sm font-bold text-neutral-50">{action}</div>
                  <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Mode Transparency ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="09" label="How the Demo Runs" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Three modes. Same architecture. All verifiable.
          </h2>
          <p className="font-mono text-neutral-400 text-sm leading-relaxed">
            P402 Meter adapts automatically to the environment. Every mode produces real ledger
            events and real proof references. Only the source of the AI text and the on-chain
            settlement change between modes.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <ModeCard
              mode="Live Mode"
              badge="GOOGLE_API_KEY + TEMPO_TREASURY_PRIVATE_KEY set"
              badgeColor="text-success border-success"
              detail="Real Gemini 3.1 Flash/Pro calls. Pre-funded TEMPO_TREASURY_PRIVATE_KEY wallet submits one real USDC.e TIP-20 transfer on Tempo mainnet at session close. Tempo Explorer link is live immediately."
              indicator="success"
            />
            <ModeCard
              mode="Proof Replay"
              badge="Default (no keys required)"
              badgeColor="text-info border-info"
              detail="Pre-recorded stream replays a real prior-auth session. 55 chunks. Real proof refs from a prior live run. All ledger events, approval gate, and economic audit run identically. No API keys needed to run or judge."
              indicator="info"
            />
            <ModeCard
              mode="Quota Fallback"
              badge="Auto (free-tier Gemini limit hit)"
              badgeColor="text-warning border-warning"
              detail="If the Gemini free tier returns a 429 or quota error, the system silently switches to Proof Replay mid-session. A thin amber notice appears. The rest of the demo proceeds identically."
              indicator="warning"
            />
          </div>

          {/* Tempo MPP settlement flow */}
          <div className="border-2 border-neutral-700 flex flex-col">
            <div className="border-b-2 border-neutral-700 px-4 py-3">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                Tempo MPP Settlement Flow (per session)
              </span>
            </div>
            <div className="p-4 font-mono text-[11px] text-neutral-400 flex flex-col gap-1 leading-relaxed">
              <span><span className="text-primary">1.</span> Gemini emits token chunk → cost calculated at $0.0000006/token</span>
              <span className="text-neutral-700 ml-4">↓</span>
              <span><span className="text-primary">2.</span> Ledger event written: eventKind=review_estimate, costUsdcE6, provisional=true</span>
              <span className="text-neutral-700 ml-4">↓</span>
              <span><span className="text-primary">3.</span> Repeat for 55+ chunks — stream closes, reconciliation triggered</span>
              <span className="text-neutral-700 ml-4">↓</span>
              <span><span className="text-primary">4.</span> Tempo settler submits single USDC.e ERC-20 transfer() on Tempo mainnet (Chain ID 4217)</span>
              <span className="text-neutral-700 ml-4">↓</span>
              <span><span className="text-primary">5.</span> waitForTransactionReceipt confirms after 1 block — FeeAMM gas paid in USDC.e</span>
              <span className="text-neutral-700 ml-4">↓</span>
              <span><span className="text-primary">6.</span> Reconciliation event written: settlementTxHash, settlementBlock, provisional=false</span>
              <span className="text-neutral-700 ml-4">↓</span>
              <span><span className="text-primary">7.</span> Tempo Explorer link available immediately at explore.tempo.xyz/tx/{'{'}txHash{'}'}</span>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="border-2 border-primary p-8 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-primary uppercase tracking-wider">
            See it live
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The demo is the proof.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed max-w-xl">
            55+ Tempo settlements. Under $0.001 total. Gemini reading a real PA form.
            Two distinct model roles. Real USDC.e TIP-20 transfers on Tempo mainnet.
            Every number verifiable on the block explorer.
          </p>
          <div className="flex gap-4 flex-wrap mt-2">
            <Link href="/meter" className="btn btn-primary text-sm px-8 py-3">
              Run the Demo →
            </Link>
            <a
              href="https://explore.tempo.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm px-8 py-3"
            >
              Verify on Tempo →
            </a>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-neutral-700 pt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
            <span>P402 Meter · Tempo Mainnet · MPP Demo · May 2026</span>
            <span>Tempo × MPP × Gemini 3.1</span>
          </div>
          <div className="text-[9px] font-mono text-neutral-700 tracking-wide">
            Built by Zeshan Ahmad · p402.io
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="border-2 border-primary text-primary text-[10px] font-bold font-mono px-2 py-0.5 uppercase">
        {number}
      </span>
      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function ProblemCard({ stat, label, detail }: { stat: string; label: string; detail: string }) {
  return (
    <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
      <div className="text-2xl font-bold text-error tabular-nums">{stat}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">{label}</div>
      <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</div>
    </div>
  );
}

function MetricCard({ value, label, sublabel, highlight }: {
  value: string; label: string; sublabel: string; highlight?: boolean;
}) {
  return (
    <div className={`border-2 p-4 flex flex-col gap-1 ${highlight ? 'border-primary' : 'border-neutral-700'}`}>
      <div className={`text-3xl font-bold tabular-nums ${highlight ? 'text-primary' : 'text-neutral-50'}`}>
        {value}
      </div>
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">{label}</div>
      <div className="text-[10px] font-mono text-neutral-500">{sublabel}</div>
    </div>
  );
}

function TechBlock({ badge, color, headline, points }: {
  badge: string; color: string; headline: string; points: string[];
}) {
  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b-2 border-neutral-700 px-4 py-3 flex items-center gap-3">
        <span className={`border-2 ${color} text-xs font-bold px-3 py-1 uppercase tracking-wider`}>
          {badge}
        </span>
        <span className="text-sm font-bold text-neutral-50">{headline}</span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {points.map((point, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] font-mono text-neutral-400">
            <span className="text-primary mt-0.5 shrink-0">→</span>
            <span>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="border border-neutral-700 p-4 flex flex-col gap-2">
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-50 flex items-center gap-2">
        <span className="text-primary">✓</span>
        {label}
      </div>
      <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</div>
    </div>
  );
}

function ModeCard({ mode, badge, badgeColor, detail, indicator }: {
  mode: string; badge: string; badgeColor: string; detail: string; indicator: 'success' | 'info' | 'warning';
}) {
  const dotColor = indicator === 'success' ? 'bg-success' : indicator === 'warning' ? 'bg-warning' : 'bg-info';
  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b border-neutral-700 px-4 py-3 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-xs font-bold text-neutral-50 uppercase tracking-wider">{mode}</span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <span className={`border text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider self-start ${badgeColor}`}>
          {badge}
        </span>
        <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

function AlignmentRow({ prize, checks }: { prize: string; checks: string[] }) {
  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b border-neutral-700 px-4 py-3 bg-neutral-800">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">{prize}</span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] font-mono text-neutral-300">
            <span className="text-success mt-0.5 shrink-0">✓</span>
            <span>{check}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
