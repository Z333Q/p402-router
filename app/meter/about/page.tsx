import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About P402 Meter · Per-Token AI Settlement Infrastructure',
  description:
    'P402 Meter: why per-token AI billing requires Tempo mainnet, how MPP makes it programmable, and what four use cases prove together.',
};

export default function AboutRootPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <Link href="/meter" className="text-xs font-mono text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors">
          ← P402 Meter
        </Link>
        <div className="flex items-center gap-3">
          <span className="border border-primary px-2 py-0.5 text-[10px] font-mono text-primary uppercase tracking-wider">
            Tempo Mainnet · MPP
          </span>
          <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-500 uppercase">
            About
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-20">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {'>'} _ P402 METER · PER-TOKEN SETTLEMENT INFRASTRUCTURE
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
            The meter<br />
            AI has<br />
            <span className="text-primary">been missing.</span>
          </h1>
          <p className="text-base font-bold text-neutral-50 max-w-2xl leading-relaxed">
            Every serious AI workflow in 2026 has the same unsolved problem: you can measure what
            the AI did, but you cannot settle it in real time at token granularity. Not on Stripe.
            Not on Ethereum. Not on any cheap L2.
          </p>
          <p className="text-base font-mono text-neutral-400 max-w-2xl leading-relaxed">
            P402 Meter is the proof that the problem is solved. Four use cases, one settlement
            layer, sub-millidollar economics. Every AI token priced and settled onchain as it happens.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/meter" className="btn btn-primary text-sm px-6 py-2">
              See the Demos →
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

        {/* ── The Economic Problem ──────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="01" label="The Economic Problem" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Per-token billing is structurally impossible on every existing payment rail.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            It is not a product gap. It is a structural constraint. The economics of settlement
            on every existing rail make per-action AI billing irrational before you write a
            line of code.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RailCard
              rail="Stripe"
              cost="$0.30"
              unit="minimum per transaction"
              problem="A 50-token AI response costs $0.00003. Stripe's minimum is 577× that. You'd need to batch 10,000+ micro-actions before the rail makes economic sense — destroying real-time attribution."
              verdict="structurally broken for AI"
            />
            <RailCard
              rail="Ethereum Mainnet"
              cost="~$2.85"
              unit="per ERC-20 transfer"
              problem="Settlement costs 95,000× the AI work itself at $0.00003/response. Every per-token settlement burns more in gas than the revenue it records. Non-starter at any volume."
              verdict="economically irrational"
            />
            <RailCard
              rail="Cheap L2s"
              cost="$0.01–$0.10"
              unit="per transaction"
              problem="Better, but still 300–3,000× the cost of the AI action. At $0.01/settlement, a 55-event session costs $0.55 in gas alone — 1,600× the actual AI compute cost."
              verdict="still 2–3 orders of magnitude off"
            />
          </div>

          <div className="border-2 border-primary p-5 flex flex-col gap-3">
            <div className="text-[10px] font-mono text-primary uppercase tracking-wider">Tempo + MPP changes the math</div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[11px] font-mono text-neutral-300">
              <div className="flex flex-col gap-1">
                <span className="text-primary font-bold">&lt;$0.000001</span>
                <span className="text-neutral-500">per Tempo settlement via FeeAMM</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-primary font-bold">$0.00035</span>
                <span className="text-neutral-500">total for a 55-event healthcare session</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-primary font-bold">577×</span>
                <span className="text-neutral-500">below Stripe minimum per action</span>
              </div>
            </div>
            <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">
              Tempo&apos;s FeeAMM settles gas in TIP-20 stablecoins (USDC.e), not a native token.
              There is no ETH, no gas wars, no minimum viable transaction size imposed by the protocol.
              MPP (Machine Payment Protocol) provides the programmable payment orchestration layer on top.
            </p>
          </div>
        </section>

        {/* ── Technology ────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="02" label="Technology" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Four components. One economic model.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TechBlock
              badge="Tempo"
              color="border-primary text-primary"
              headline="Settlement layer"
              body="Tempo mainnet (Chain ID 4217). USDC.e TIP-20 transfers via FeeAMM. Gas paid in stablecoins. <$0.000001 per settlement. One real Tempo tx per session aggregates all provisional events into a verifiable onchain proof."
            />
            <TechBlock
              badge="MPP"
              color="border-info text-info"
              headline="Payment method layer"
              body="Machine Payment Protocol. Pre-funded TEMPO_TREASURY_PRIVATE_KEY wallet. Per-session-close settlement pattern: 55+ provisional ledger events, one real USDC.e transfer at stream close. mppx dual-402 challenge/response for machine-to-machine authorization."
            />
            <TechBlock
              badge="Gemini"
              color="border-warning text-warning"
              headline="Intelligence layer"
              body="Gemini 3.1 Flash for real-time multimodal intake, function calling, and streaming review. Gemini 3.1 Pro for post-session economic audit. Two model tiers: Flash for speed and streaming; Pro for depth and executive narrative."
            />
            <TechBlock
              badge="P402"
              color="border-neutral-400 text-neutral-400"
              headline="Router layer"
              body="P402 router selects the right model tier per document or action. Budget caps enforced pre-execution. AP2 mandates govern per-session spending. ERC-8004 agent identity on Base mainnet. Full audit trail from extraction to onchain proof."
            />
          </div>
        </section>

        {/* ── Four use cases ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="03" label="Four Use Cases, One Infrastructure" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Three vertical workflows. One horizontal platform.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            The three vertical demos stress different dimensions of the infrastructure:
            clinical governance, transactional routing, and multimodal volume.
            The enterprise demo proves the same infrastructure works as a horizontal
            cost management layer across every department, project, and employee simultaneously.
          </p>

          <div className="flex flex-col gap-4">
            <IndustryCard
              number="01"
              industry="Healthcare"
              workflow="Prior Authorization Review"
              status="live"
              facet="Per-token meter readings as the primary visual. Live ledger with running USDC cost. Economic audit panel as the climactic moment."
              unitEcon="$0.00035 per full review"
              vsBaseline="vs $25–100 manual"
              buyer="Health plan · TPA · UM vendor"
              regulatory="URAC / NCQA utilization management standards"
              href="/meter/healthcare"
              deepDiveHref="/meter/about/healthcare"
            />
            <IndustryCard
              number="02"
              industry="Legal"
              workflow="M&A Due Diligence Contract Review"
              status="live"
              facet="8-contract Acme/Beta data room. Flash for simple forms, Pro for complex agreements. Cross-document conflict detection. ABA-compliant audit trail on Tempo mainnet."
              unitEcon="&lt;$0.10 per matter"
              vsBaseline="vs $200–800 paralegal time"
              buyer="Law firm · In-house GC · Legal ops"
              regulatory="ABA Formal Opinion 512 (AI in legal practice)"
              href="/meter/legal"
              deepDiveHref="/meter/about/legal"
            />
            <IndustryCard
              number="03"
              industry="Real Estate"
              workflow="Tenant Application Screening"
              status="live"
              facet="3 applicant scenarios: clean, income mismatch, likely fraud. Flash extracts 4 documents per applicant. Pro runs cross-document consistency. Fraud score with escalation threshold."
              unitEcon="$0.02–$0.05 per applicant"
              vsBaseline="vs $30–80 manual screening"
              buyer="Property mgmt · REIT · Leasing platform"
              regulatory="HUD fair housing / ECOA bias compliance"
              href="/meter/real-estate"
              deepDiveHref="/meter/about/real-estate"
            />
            <IndustryCard
              number="04"
              industry="Enterprise"
              workflow="AI Cost Management Platform"
              status="demo-live"
              facet="Org → dept → project → employee → token attribution. Routing optimization recommendations. Budget projections. Immutable session receipts. Synthetic dashboard live now."
              unitEcon="30–70% model cost reduction"
              vsBaseline="vs opaque monthly invoices"
              buyer="CFO · CTO · Head of AI · Engineering lead"
              regulatory="SOC2 Type II / financial cost center controls"
              href="/meter/enterprise"
              deepDiveHref="/meter/about/enterprise"
              accent
            />
          </div>
        </section>

        {/* ── What all four prove ────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="04" label="What All Four Prove Together" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Vertical and horizontal. The infrastructure is the product.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            The three vertical demos prove per-token billing works for specific regulated workflows.
            The enterprise demo proves it works as the metering layer underneath every workflow
            simultaneously. Together they prove P402 is complete AI cost infrastructure.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProofCard
              claim="Same router, four distinct governance regimes"
              detail="URAC (clinical), ABA (legal), HUD (housing), SOC2 (enterprise). Different audit artifacts, different compliance requirements. Same P402 session model and budget cap architecture satisfies all four."
            />
            <ProofCard
              claim="Per-token economics are universal"
              detail="Healthcare: $0.0000006/token. Legal: routing by document complexity. Real estate: per-applicant at scale. Enterprise: per-employee, per-project, per-department. One pricing model covers all four."
            />
            <ProofCard
              claim="Enterprise is where the vertical workflows run"
              detail="A health plan with P402 Enterprise uses the healthcare demo infrastructure inside the enterprise cost layer. Legal teams use the contract review infrastructure inside the same cost layer. The verticals are instances of the platform."
            />
            <ProofCard
              claim="The audit trail is load-bearing in every use case"
              detail="Clinical decisions for URAC. Contract reviews for ABA. Screening decisions for HUD. Employee AI usage for SOC2. The P402 ledger — with Tempo settlement hashes — provides the tamper-evident record all four require."
            />
          </div>

          <div className="border-2 border-primary p-5 flex flex-col gap-3">
            <div className="text-[10px] font-mono text-primary uppercase tracking-wider">
              The common denominator across all four use cases
            </div>
            <p className="text-sm font-bold text-neutral-50 leading-relaxed">
              Every AI workflow — vertical or horizontal — has the same gap: no per-action cost
              attribution, no sub-cent settlement rail, no onchain audit trail.
              P402 fills it once. The four demos prove it from four different directions:
              clinical, transactional, volumetric, and organizational.
            </p>
          </div>
        </section>

        {/* ── How the demo runs ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="05" label="How the Demo Runs" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Two modes. All verifiable.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border-2 border-success p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success" />
                <span className="text-xs font-bold uppercase tracking-wider">Live Mode</span>
              </div>
              <span className="border border-success text-success text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider self-start">
                GOOGLE_API_KEY + TEMPO_TREASURY_PRIVATE_KEY set
              </span>
              <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Real Gemini calls. Pre-funded wallet submits one real USDC.e TIP-20 transfer
                at session close. Tempo Explorer link live immediately.
              </p>
            </div>
            <div className="border-2 border-info p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-info" />
                <span className="text-xs font-bold uppercase tracking-wider">Proof Replay</span>
              </div>
              <span className="border border-info text-info text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider self-start">
                Default — no keys required
              </span>
              <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Pre-recorded session stream. Real proof refs from a prior live run.
                All ledger events, approval gate, and economic audit run identically.
                No API keys needed to evaluate.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTAs ──────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CtaCard
            label="Healthcare"
            sub="Prior auth · Live now"
            href="/meter/healthcare"
            primary
          />
          <CtaCard
            label="Legal"
            sub="M&A diligence · Coming soon"
            href="/meter/about/legal"
            primary={false}
          />
          <CtaCard
            label="Real Estate"
            sub="Tenant screening · Coming soon"
            href="/meter/about/real-estate"
            primary={false}
          />
        </section>

        {/* Footer */}
        <div className="border-t border-neutral-700 pt-6 flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider flex-wrap gap-3">
          <span>P402 Meter · Tempo Mainnet · MPP · May 2026</span>
          <div className="flex gap-4">
            <Link href="/meter" className="hover:text-neutral-400 transition-colors">All Demos</Link>
            <a href="https://explore.tempo.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">Tempo Explorer ↗</a>
            <a href="https://p402.io/docs/router" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">Docs ↗</a>
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

function RailCard({ rail, cost, unit, problem, verdict }: {
  rail: string; cost: string; unit: string; problem: string; verdict: string;
}) {
  return (
    <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">{rail}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-error tabular-nums">{cost}</span>
        <span className="text-[10px] font-mono text-neutral-500 uppercase">{unit}</span>
      </div>
      <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">{problem}</p>
      <span className="border border-error text-error text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider self-start">{verdict}</span>
    </div>
  );
}

function TechBlock({ badge, color, headline, body }: {
  badge: string; color: string; headline: string; body: string;
}) {
  return (
    <div className="border border-neutral-700 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`border text-[10px] font-bold font-mono px-2 py-0.5 uppercase tracking-wider ${color}`}>
          {badge}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-50">{headline}</span>
      </div>
      <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">{body}</p>
    </div>
  );
}

function IndustryCard({
  number, industry, workflow, status, facet, unitEcon, vsBaseline,
  buyer, regulatory, href, deepDiveHref, accent,
}: {
  number: string; industry: string; workflow: string; status: 'live' | 'coming-soon' | 'demo-live';
  facet: string; unitEcon: string; vsBaseline: string; buyer: string;
  regulatory: string; href: string; deepDiveHref: string; accent?: boolean;
}) {
  const isLive = status === 'live';
  const isDemoLive = status === 'demo-live';
  const borderColor = isLive ? 'border-primary' : accent ? 'border-info' : 'border-neutral-700';
  const accentColor = isLive ? 'text-primary' : accent ? 'text-info' : 'text-neutral-600';
  const costColor = isLive ? 'text-primary' : accent ? 'text-info' : 'text-neutral-500';
  return (
    <div className={`border-2 p-5 flex flex-col gap-3 ${borderColor}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono font-bold ${accentColor}`}>{number}</span>
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">{industry}</span>
            {isLive && <span className="border border-success text-success text-[9px] font-mono px-1.5 py-0.5 uppercase">Live</span>}
            {isDemoLive && <span className="border border-info text-info text-[9px] font-mono px-1.5 py-0.5 uppercase">Demo</span>}
            {!isLive && !isDemoLive && <span className="border border-neutral-700 text-neutral-600 text-[9px] font-mono px-1.5 py-0.5 uppercase">Soon</span>}
          </div>
          <h3 className="text-base font-bold uppercase tracking-tight">{workflow}</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-lg font-bold font-mono tabular-nums ${costColor}`}>{unitEcon}</span>
          <span className="text-[9px] font-mono text-neutral-600 uppercase">{vsBaseline}</span>
        </div>
      </div>

      <p className="text-[11px] font-mono text-neutral-400 leading-relaxed border-l-2 border-neutral-700 pl-3">{facet}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-[10px] font-mono text-neutral-500">
        <div><span className="text-neutral-700 uppercase text-[9px]">Buyer · </span>{buyer}</div>
        <div><span className="text-neutral-700 uppercase text-[9px]">Regulatory · </span>{regulatory}</div>
      </div>

      <div className="flex gap-3 flex-wrap mt-1">
        {isLive && <Link href={href} className="btn btn-primary text-xs px-4 py-1.5">Run Demo →</Link>}
        {isDemoLive && (
          <Link href={href} className="border-2 border-info text-info hover:bg-info hover:text-neutral-900 text-xs font-mono px-4 py-1.5 uppercase tracking-wider transition-colors">
            View Dashboard →
          </Link>
        )}
        {!isLive && !isDemoLive && (
          <span className="border border-neutral-700 text-neutral-600 text-xs font-mono px-4 py-1.5 uppercase cursor-not-allowed">Coming Soon</span>
        )}
        <Link href={deepDiveHref} className="border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 text-xs font-mono px-4 py-1.5 uppercase tracking-wider transition-colors">
          Case Study →
        </Link>
      </div>
    </div>
  );
}

function ProofCard({ claim, detail }: { claim: string; detail: string }) {
  return (
    <div className="border border-neutral-700 p-4 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <span className="text-primary mt-0.5 shrink-0">✓</span>
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-50">{claim}</span>
      </div>
      <p className="text-[11px] font-mono text-neutral-400 leading-relaxed pl-4">{detail}</p>
    </div>
  );
}

function CtaCard({ label, sub, href, primary }: {
  label: string; sub: string; href: string; primary: boolean;
}) {
  return (
    <Link
      href={href}
      className={`border-2 p-5 flex flex-col gap-2 transition-colors ${primary ? 'border-primary hover:bg-primary hover:text-neutral-900 group' : 'border-neutral-700 hover:border-neutral-500'}`}
    >
      <span className={`text-lg font-bold uppercase tracking-tight ${primary ? 'text-primary group-hover:text-neutral-900' : 'text-neutral-400'}`}>
        {label} →
      </span>
      <span className={`text-[10px] font-mono uppercase tracking-wider ${primary ? 'text-neutral-400 group-hover:text-neutral-700' : 'text-neutral-600'}`}>
        {sub}
      </span>
    </Link>
  );
}
