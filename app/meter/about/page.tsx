import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — P402 Meter · AI Billing on Arc',
  description:
    'P402 Meter is a Gemini-powered prior authorization workflow where every AI token is priced in USDC and settled on Arc. Usage-Based Compute Billing for healthcare operations.',
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
            Arc Hackathon 2026
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
            {'>'} _ P402 METER · SUBMISSION OVERVIEW
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
            AI Thinking<br />
            Has a Price.<br />
            <span className="text-primary">Now It Settles.</span>
          </h1>
          <p className="text-base font-mono text-neutral-400 max-w-2xl leading-relaxed">
            P402 Meter is the first system to price AI computation at the token level and settle
            each event in USDC on Arc in real time. Prior authorization review in healthcare is
            the proof — a document-heavy, high-stakes workflow where every reasoning step has
            measurable value and every cent of cost can be governed, attributed, and audited.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/meter" className="btn btn-primary text-sm px-6 py-2">
              Live Demo →
            </Link>
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm px-6 py-2"
            >
              Arc Block Explorer →
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
              detail="Makes sub-cent per-action billing impossible. You'd need to batch 300+ AI micro-actions before you can charge for them — destroying real-time attribution."
            />
            <ProblemCard
              stat="~$2.85"
              label="ETH mainnet gas cost per ERC-20 transfer"
              detail="Settlement costs more than the AI work itself. Every blockchain before Arc makes per-token settlement economically irrational."
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
            Every token an AI generates is a priced USDC event on Arc.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            P402 Meter instruments the Gemini generation stream at the chunk level. Each text
            chunk emitted by the model triggers a ledger event: tokens estimated, cost calculated
            at $0.0000006/token, USDC amount recorded, event written to Arc. A single prior
            authorization review generates 55+ onchain events. Total cost: under $0.01.
          </p>
          <div className="border-2 border-primary p-6 flex flex-col gap-4">
            <div className="text-[10px] font-mono text-primary uppercase tracking-wider">
              The workflow in one sentence
            </div>
            <p className="text-lg font-bold leading-snug">
              Upload a prior-auth document → Gemini reads it, classifies it, reviews it →
              every token of that thinking settles in USDC on Arc → Gemini Pro audits the
              economics → humans approve the recommendation with full proof of work.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricCard value="55+" label="Onchain events per review" sublabel="1 per token chunk emitted" />
            <MetricCard value="&lt;$0.01" label="Total cost per action" sublabel="vs $2.85 on ETH mainnet" highlight />
            <MetricCard value=">99.7%" label="Cost saving vs ETH" sublabel="Arc USDC gas at $0.006/tx" />
          </div>
        </section>

        {/* ── Technology Stack ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="03" label="Technology" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Three technologies. One economic model.
          </h2>

          <TechBlock
            badge="Arc"
            color="border-primary text-primary"
            headline="The settlement layer that makes sub-cent billing real"
            points={[
              'USDC as native gas token — settlement costs $0.006/tx instead of $2.85',
              'High transaction frequency — 55+ events per session without batching',
              'ERC-8004 for AI agent identity and reputation on Arc testnet',
              'ERC-8183 for specialist review escrow — job creation, funding, and release',
              'Every economic event links to a verifiable Arc block explorer entry',
            ]}
          />

          <TechBlock
            badge="Circle"
            color="border-info text-info"
            headline="The money layer that makes USDC move programmatically"
            points={[
              'Developer-Controlled Wallets on ARC-TESTNET — each session gets a dedicated wallet visible in Circle Developer Console',
              'Circle Gateway x402 API for settlement verification at gateway-api-testnet.circle.com',
              'USDC predeploy at 0x3600000000000000000000000000000000000000 on Arc',
              'Circle Faucet for testnet USDC — no ETH needed, pure stablecoin workflow',
              'Gateway domain 26 on Arc testnet for cross-chain portability',
            ]}
          />

          <TechBlock
            badge="Gemini"
            color="border-warning text-warning"
            headline="The intelligence layer that makes AI work governable"
            points={[
              'Gemini Flash — multimodal document intake via inlineData (image, PDF, text)',
              'Function calling with 3 typed tools: parsePriorAuthDocument, createReviewSession, addLedgerEstimate',
              'Structured healthcare extract: payer, provider, procedure, urgency, case type, confidence score',
              'Flash drives the live review stream — every chunk is a priced ledger event',
              'Gemini Pro — post-run economic audit with cost breakdown, ETH/Stripe comparison, and narrative explanation',
              'Gemini Pro is distinct from Flash: slower, deeper reasoning, used only for the final audit summary',
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
            Most hackathon demos use simple e-commerce or generic chat flows to prove a payment
            concept. Prior authorization review is the opposite — it is document-heavy, policy-bound,
            multi-step, explainability-critical, and economically significant. If per-token billing
            works here, it works everywhere.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ContextCard
              label="Governance is mandatory"
              detail="Clinical AI must explain every decision. P402's governed session model — budget caps, approval gates, audit trails — is not optional overhead here. It is the product."
            />
            <ContextCard
              label="Document reasoning is load-bearing"
              detail="Gemini's multimodal intake reads actual prior auth forms. This is not prompt-wrapped text. It is vision-based structured extraction with typed function calls."
            />
            <ContextCard
              label="Specialist delegation is natural"
              detail="Complex cases route to specialist review agents under ERC-8183 escrow. The A2A payment loop is not a demo gimmick — it mirrors real payer escalation workflows."
            />
            <ContextCard
              label="The economics are real"
              detail="A human reviewer costs $15–50/hour for prior auth work. An AI-assisted review costs under $0.01. The margin explanation in the demo is not hypothetical — it is the business case."
            />
          </div>
        </section>

        {/* ── Prize Alignment ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="05" label="Prize Alignment" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Built to satisfy every judging criterion.
          </h2>
          <div className="flex flex-col gap-3">
            <AlignmentRow
              prize="Arc Grand Prize — Usage-Based Compute Billing"
              checks={[
                'Real per-action pricing at $0.0000006/token — well under $0.01 limit',
                '55+ onchain transactions per demo run on Arc testnet (chain 5042002)',
                'Margin explanation visible in UI: Arc $0.006/tx vs ETH $2.85/tx vs Stripe $0.30 min',
                'Arc and Circle infrastructure visible throughout — wallets, settlements, block explorer links',
              ]}
            />
            <AlignmentRow
              prize="Gemini Sponsor Prize"
              checks={[
                'Gemini Flash is load-bearing — multimodal intake, function calling, live review stream',
                'Function calling with 3 typed tools producing structured JSON healthcare extract',
                'Gemini Pro has a distinct role — post-run economic audit, not the same model doing everything',
                'Flash and Pro are both demonstrable in the UI with separate labeled outputs',
                'Explanation quality: every recommendation includes Gemini-generated rationale',
              ]}
            />
            <AlignmentRow
              prize="Secondary — Agent-to-Agent Payment Loop"
              checks={[
                'Specialist escalation via ERC-8183 creates a funded escrow job on Arc testnet',
                'Deliverable hash (keccak256 of specialist output) anchors the A2A handoff',
                'escrow_release ledger event records the payment loop completion onchain',
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 font-mono text-xs">
            {[
              ['/api/meter/packet', 'Ingest document, SHA-256 hash, persist asset'],
              ['/api/meter/work-order', 'Gemini multimodal extraction → structured WorkOrder'],
              ['/api/meter/sessions', 'Open metered session with budget cap'],
              ['/api/meter/fund', 'Create Circle Developer-Controlled Wallet on ARC-TESTNET'],
              ['/api/meter/chat', 'SSE stream — per-chunk ledger events, reconcile, approval'],
              ['/api/meter/escrow', 'ERC-8183 specialist job create + deliverable hash'],
              ['/api/meter/trust', 'ERC-8004 agent identity + reputation read'],
              ['/api/meter/audit', 'Gemini Pro economic audit — cost breakdown + narrative'],
            ].map(([route, desc]) => (
              <div key={route} className="border border-neutral-700 px-3 py-2 flex flex-col gap-0.5">
                <span className="text-primary font-bold">{route}</span>
                <span className="text-neutral-400">{desc}</span>
              </div>
            ))}
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
            Load the demo packet. Watch Gemini extract it. Hit Execute Review. Watch 55+ economic
            events appear in real time. See the total cost land under $0.01. Then look at the
            margin panel and ask whether any other payment rail could do this.
          </p>
          <div className="flex gap-4 flex-wrap mt-2">
            <Link href="/meter" className="btn btn-primary text-sm px-8 py-3">
              Run the Demo →
            </Link>
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm px-8 py-3"
            >
              Verify on Arc →
            </a>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-neutral-700 pt-6 flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
          <span>P402 Meter · Arc Hackathon 2026</span>
          <span>Arc × Circle × Gemini</span>
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
