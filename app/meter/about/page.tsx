import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About, P402 Meter · Agentic Commerce on Arc Hackathon',
  description:
    'P402 Meter: Gemini-powered healthcare prior authorization where every AI token is priced in USDC and settled on Arc. Arc Hackathon, Best Gateway-Based Micropayments Integration.',
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
            Agentic Commerce on Arc
          </span>
          <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-500 uppercase">
            Micropayments Integration Track
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-20">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {'>'} _ P402 METER · AGENTIC COMMERCE ON ARC HACKATHON · SUBMISSION OVERVIEW
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
            AI Thinking<br />
            Has a Price.<br />
            <span className="text-primary">Now It Settles.</span>
          </h1>
          <p className="text-base font-bold text-neutral-50 max-w-2xl leading-relaxed mb-1">
            P402 Meter is a healthcare prior authorization review system where every AI token
            is priced in USDC and settled on Arc in real time.
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
              detail="Makes sub-cent per-action billing impossible. You'd need to batch 300+ AI micro-actions before you can charge for them, destroying real-time attribution."
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
              Upload a prior-auth document → Gemini 3.1 Flash reads it, classifies it, reviews it →
              every token of that thinking settles in USDC on Arc via Circle Gateway →
              Gemini 3.1 Pro audits the economics → humans approve the recommendation with
              full onchain proof of work.
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
              'USDC as native gas token, settlement costs $0.006/tx instead of $2.85 on ETH mainnet',
              'High transaction frequency, 55+ settlement events per session with no batching required',
              'P402\'s AI agent is registered with ERC-8004 (Arc\'s agent identity standard) for on-chain identity and reputation',
              'Specialist review escrow uses ERC-8183 (Arc\'s agent escrow standard), job creation, USDC funding, and deliverable-verified release',
              'Every economic event links to a verifiable entry in the Arc block explorer (ArcScan)',
            ]}
          />

          <TechBlock
            badge="Circle"
            color="border-info text-info"
            headline="The money layer that makes USDC move programmatically"
            points={[
              'Developer-Controlled Wallets on ARC-TESTNET, each metered session gets a dedicated Circle wallet, visible in the Circle Developer Console',
              'Circle\'s x402 payment gateway API (gateway-api-testnet.circle.com) handles settlement verification for each ledger event',
              'USDC at the Arc predeploy address (0x3600000000000000000000000000000000000000), no ETH needed, pure stablecoin workflow',
              'Circle Faucet provides testnet USDC, the full payment loop runs without any real funds',
              'Circle\'s payment gateway is registered at domain 26 on Arc testnet, enabling standards-based x402 payment verification',
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
            Most hackathon demos use simple e-commerce or generic chat flows to prove a payment
            concept. Prior authorization review is the opposite, it is document-heavy, policy-bound,
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
              detail="Complex cases route to specialist review agents under blockchain-verified escrow. The agent-to-agent payment loop is not a demo gimmick, it mirrors real payer escalation workflows where complex cases are handed off with a financial commitment attached."
            />
            <ContextCard
              label="The economics are real"
              detail="A human reviewer costs $15–50/hour for prior auth work. An AI-assisted review costs under $0.01. The margin explanation in the demo is not hypothetical, it is the business case."
            />
          </div>
        </section>

        {/* ── Prize Alignment ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="05" label="Prize Alignment" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Built to satisfy every judging criterion.
          </h2>
          <p className="font-mono text-neutral-500 text-sm">
            P402 Meter was designed explicitly against the judging criteria. Each check below maps
            to something visible in the live demo, not claimed in theory.
          </p>
          <div className="flex flex-col gap-3">
            <AlignmentRow
              prize="Primary Track, Best Gateway-Based Micropayments Integration"
              checks={[
                'Circle Gateway x402 API is the settlement verification layer, every ledger event is confirmed through gateway-api-testnet.circle.com',
                'Circle Developer-Controlled Wallets provision a dedicated USDC wallet per session on ARC-TESTNET, visible in Circle Developer Console',
                '55+ Circle-verified USDC micropayment settlements per review run on Arc testnet (Chain ID 5042002), verifiable on ArcScan',
                'Margin panel shows the exact case for Circle + Arc: $0.006/tx vs ETH mainnet $2.85/tx vs Stripe $0.30 minimum, micropayments are only possible on this stack',
                'No ETH required, pure USDC workflow enabled by Arc\'s native USDC gas token and Circle\'s Gateway',
              ]}
            />
            <AlignmentRow
              prize="Google Track, Best Use of Gemini Models + Google AI Studio"
              checks={[
                'Gemini 3.1 Flash is load-bearing across three distinct roles: multimodal document intake, function calling with forced ANY-mode tool invocation, and the live URAC-aligned streaming review with per-chunk USDC settlement',
                'Function calling uses FunctionCallingMode.ANY to guarantee all 3 typed tools are invoked and returns a structured JSON healthcare extract (payer, provider, procedure, urgency, confidence score) visible in the Work Order panel',
                'Flash also runs the approval gate with a conservative system instruction: "when any criterion is borderline, recommend escalation over approval," this is not a trivial classification, it is a policy-enforcing quality gate',
                'Gemini 3.1 Pro runs the post-session economic audit with an executive-level system instruction and unconstrained output: produces a 3-paragraph narrative comparing session cost against Stripe and Ethereum mainnet with strategic implications for payer operations',
                'Two model tiers used as an explicit architectural decision: Flash optimized for speed, streaming, and real-time pricing; Pro deployed for depth, analytical reasoning, and executive-quality narrative synthesis',
                'Multimodal: the sample PNG prior auth form in the Document Intake panel demonstrates Gemini 3.1 Flash reading printed form fields off a realistic scanned document via the inlineData API',
              ]}
            />
            <AlignmentRow
              prize="Bonus Track, Best Autonomous Commerce Application"
              checks={[
                'Specialist escalation triggers autonomous escrow creation (ERC-8183 on Arc testnet) without human intervention, the Specialist Escrow panel shows the job ID and USDC amount locked',
                'A cryptographic fingerprint of the specialist\'s output is recorded onchain, giving the agent-to-agent handoff a tamper-proof verifiable receipt',
                'The escrow release event appears in the Ledger as the payment loop closes, the full autonomous A2A commerce cycle is visible end-to-end on Arc',
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
            stateless where possible, and every settlement-producing route writes directly to Arc.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 font-mono text-xs">
            {[
              ['/api/meter/packet', 'Ingest document, SHA-256 hash, persist asset'],
              ['/api/meter/work-order', 'Gemini multimodal extraction → structured WorkOrder'],
              ['/api/meter/sessions', 'Open metered session with budget cap'],
              ['/api/meter/fund', 'Create Circle Developer-Controlled Wallet on ARC-TESTNET'],
              ['/api/meter/chat', 'SSE stream, per-chunk ledger events, reconcile, approval'],
              ['/api/meter/escrow', 'ERC-8183 specialist job create + deliverable hash'],
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

        {/* ── Judge Walkthrough ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="07" label="Judge Walkthrough" />
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
                detail: 'The Review Summary panel streams the AI review token by token. Each chunk simultaneously writes a ledger event, cost estimated, USDC amount recorded, Arc settlement queued. Watch the event count climb past 55.',
              },
              {
                step: '04',
                action: 'Open the Arc Proof drawer and verify each settlement',
                detail: 'Every ledger event has an ArcScan block explorer link. Click any link to verify the USDC transfer on Arc testnet. The settlement is real, the cost is real ($0.006/tx), and the total stays under $0.01.',
              },
              {
                step: '05',
                action: 'Scroll to the Economic Audit and the Margin Explanation panels',
                detail: 'After the review completes, Gemini Pro generates a cost breakdown. The Margin panel shows the exact comparison: Arc $0.006/tx vs ETH mainnet $2.85/tx vs Stripe $0.30 minimum. This is the business case for Arc in one number.',
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

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="border-2 border-primary p-8 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-primary uppercase tracking-wider">
            See it live
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The demo is the proof.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed max-w-xl">
            55+ Arc settlements. Under $0.01 total. Gemini reading a real PA form.
            Two distinct model roles. A2A escrow closing onchain. Every number
            verifiable on the block explorer.
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
        <div className="border-t border-neutral-700 pt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
            <span>P402 Meter · Agentic Commerce on Arc Hackathon · April 2026</span>
            <span>Arc × Circle × Gemini 3.1</span>
          </div>
          <div className="text-[9px] font-mono text-neutral-700 tracking-wide">
            Built by Zeshan Ahmad · attending on-site
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
