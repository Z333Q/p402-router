import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'P402 Meter · Per-Token AI Billing on Tempo',
  description:
    'Three industry demos. One infrastructure. Per-token AI settlement on Tempo mainnet via MPP.',
};

export default function MeterHubPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
          P402 Meter
        </span>
        <div className="flex items-center gap-3">
          <span className="border border-primary px-2 py-0.5 text-[10px] font-mono text-primary uppercase tracking-wider">
            Tempo Mainnet · MPP
          </span>
          <Link href="/meter/about" className="text-[10px] font-mono text-neutral-500 hover:text-neutral-300 uppercase tracking-wider transition-colors">
            About →
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col gap-16">

        {/* Hero */}
        <section className="flex flex-col gap-6 max-w-3xl">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {'>'} _ P402 METER · PER-TOKEN AI SETTLEMENT INFRASTRUCTURE
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
            The meter<br />
            AI has<br />
            <span className="text-primary">been missing.</span>
          </h1>
          <p className="text-base font-mono text-neutral-300 max-w-2xl leading-relaxed">
            Three industries. Three workflows. One settlement layer.
            Every AI token priced in USDC.e and settled on Tempo mainnet via MPP
            at under $0.000001 per event.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="border border-primary text-primary text-[10px] font-mono px-3 py-1 uppercase tracking-wider">
              55+ events per session
            </span>
            <span className="border border-neutral-700 text-neutral-400 text-[10px] font-mono px-3 py-1 uppercase tracking-wider">
              &lt;$0.000001 per Tempo settlement
            </span>
            <span className="border border-neutral-700 text-neutral-400 text-[10px] font-mono px-3 py-1 uppercase tracking-wider">
              577× cheaper than Stripe minimum
            </span>
          </div>
        </section>

        {/* Three demo cards */}
        <section className="flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-2">
            Three live demos
          </div>

          <DemoCard
            number="01"
            industry="Healthcare"
            title="Prior Authorization Review"
            status="live"
            description="Upload a prior-auth document. Gemini Flash reads it, classifies it, streams a URAC-aligned UM review. Every token settles as a USDC.e event on Tempo. Gemini Pro audits the economics. Human approves."
            unitEconomics="$0.00035 per full review"
            vsBaseline="vs $25–100 manual review"
            buyer="Health plan · TPA · Utilization management vendor"
            highlight="Per-token meter readings · Economic audit · Clinical governance"
            href="/meter/healthcare"
            aboutHref="/meter/about/healthcare"
          />

          <DemoCard
            number="02"
            industry="Legal"
            title="M&A Due Diligence Contract Review"
            status="coming-soon"
            description="Upload a data room of 5–10 contracts. P402 routes each document to the right model tier (Flash for NDAs, Pro for MSAs). Cross-document conflict detection. Per-matter cost readout. Specialist escalation under MPP escrow."
            unitEconomics="&lt;$0.10 per matter"
            vsBaseline="vs $200–800 paralegal time"
            buyer="Law firm partner · In-house GC · Legal ops director"
            highlight="Routing decisions visible · Budget cap per matter · ABA-audit trail"
            href="/meter/legal"
            aboutHref="/meter/about/legal"
          />

          <DemoCard
            number="03"
            industry="Real Estate"
            title="Tenant Application Screening"
            status="coming-soon"
            description="Upload an applicant packet: rental form, pay stubs, bank statement, ID. Gemini Flash extracts structured fields multimodally. Gemini Pro runs cross-document consistency. Fraud signal triggers specialist escalation under MPP escrow."
            unitEconomics="$0.02–$0.05 per applicant"
            vsBaseline="vs $30–80 manual screening"
            buyer="Property management co · Multi-family REIT · Leasing platform"
            highlight="Multimodal volume economics · Fraud escalation · HUD fair-housing audit trail"
            href="/meter/real-estate"
            aboutHref="/meter/about/real-estate"
          />
        </section>

        {/* What all three prove */}
        <section className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            What all three prove together
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight">
            P402 is industry-agnostic AI cost infrastructure.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[11px] font-mono text-neutral-400 leading-relaxed">
            <div className="flex flex-col gap-1">
              <span className="text-primary font-bold uppercase tracking-wider text-[9px]">Same router</span>
              <span>Healthcare, legal, and real estate workflows run on the same P402 router, the same Tempo settler, the same MPP payment layer. The domain changes. The infrastructure does not.</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-primary font-bold uppercase tracking-wider text-[9px]">Intentionally different</span>
              <span>Clinical (URAC-governed), transactional (ABA ethics rules), multimodal-volume (HUD fair housing). Three distinct regulatory regimes. One settlement pattern covers all of them.</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-primary font-bold uppercase tracking-wider text-[9px]">The common denominator</span>
              <span>Every high-stakes AI workflow has the same gap: no metered cost visibility, no per-action audit trail, no sub-cent settlement rail. P402 fills it once, across all three.</span>
            </div>
          </div>
          <Link href="/meter/about" className="self-start text-[10px] font-mono text-info hover:text-primary uppercase tracking-wider border border-info hover:border-primary px-3 py-1.5 transition-colors">
            Full P402 Story →
          </Link>
        </section>

        {/* Footer nav */}
        <div className="border-t border-neutral-700 pt-6 flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
          <span>P402 Meter · Tempo Mainnet · MPP</span>
          <div className="flex gap-4">
            <Link href="/meter/about" className="hover:text-neutral-400 transition-colors">About</Link>
            <a href="https://explore.tempo.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">Tempo Explorer ↗</a>
            <a href="https://p402.io/docs/router" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">Docs ↗</a>
          </div>
        </div>

      </div>
    </div>
  );
}

function DemoCard({
  number, industry, title, status, description, unitEconomics, vsBaseline,
  buyer, highlight, href, aboutHref,
}: {
  number: string;
  industry: string;
  title: string;
  status: 'live' | 'coming-soon';
  description: string;
  unitEconomics: string;
  vsBaseline: string;
  buyer: string;
  highlight: string;
  href: string;
  aboutHref: string;
}) {
  const isLive = status === 'live';
  return (
    <div className={`border-2 flex flex-col lg:flex-row ${isLive ? 'border-primary' : 'border-neutral-700'}`}>
      {/* Number + status column */}
      <div className={`flex-shrink-0 flex flex-col items-center justify-start gap-2 px-5 py-5 border-b-2 lg:border-b-0 lg:border-r-2 ${isLive ? 'border-primary' : 'border-neutral-700'}`}>
        <span className={`text-3xl font-bold font-mono tabular-nums ${isLive ? 'text-primary' : 'text-neutral-600'}`}>{number}</span>
        {isLive ? (
          <span className="border border-success text-success text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider">Live</span>
        ) : (
          <span className="border border-neutral-700 text-neutral-600 text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider">Soon</span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-1">{industry}</div>
            <h3 className="text-lg font-bold uppercase tracking-tight text-neutral-50">{title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col items-end">
              <span className={`text-base font-bold font-mono tabular-nums ${isLive ? 'text-primary' : 'text-neutral-500'}`}>{unitEconomics}</span>
              <span className="text-[9px] font-mono text-neutral-600 uppercase">{vsBaseline}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">{description}</p>

        <div className="flex flex-col gap-1">
          <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">Buyer</div>
          <div className="text-[10px] font-mono text-neutral-400">{buyer}</div>
        </div>

        <div className="text-[10px] font-mono text-neutral-500 border-l-2 border-neutral-700 pl-3">
          {highlight}
        </div>

        <div className="flex gap-3 mt-1 flex-wrap">
          {isLive ? (
            <Link href={href} className="btn btn-primary text-xs px-4 py-1.5">
              Run Demo →
            </Link>
          ) : (
            <span className="border-2 border-neutral-700 text-neutral-600 text-xs font-mono px-4 py-1.5 uppercase tracking-wider cursor-not-allowed">
              Coming Soon
            </span>
          )}
          <Link href={aboutHref} className="border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 text-xs font-mono px-4 py-1.5 uppercase tracking-wider transition-colors">
            Case Study →
          </Link>
        </div>
      </div>
    </div>
  );
}
