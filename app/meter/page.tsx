import type { Metadata } from 'next';
import Link from 'next/link';
import { MeterFunnelFooter } from './_components/MeterFunnelFooter';
import { MeterBrand } from './_components/MeterBrand';

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
        <MeterBrand />
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

        {/* Four demo cards */}
        <section className="flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-2">
            Four use cases
          </div>

          <DemoCard
            number="01"
            industry="Health Insurance · Utilization Management"
            title="Prior Authorization Review"
            subtitle="AI reads insurance coverage requests and writes clinical decisions — for the teams that decide whether a treatment gets approved"
            status="live"
            description="Health plans and TPAs process thousands of prior-auth requests a month. Each one goes to a nurse or doctor for review — costing $25–100 in staff time. This demo uploads a real prior-auth document: Gemini Flash reads and classifies it, streams a URAC-aligned clinical review, and settles every token as a USDC.e event on Tempo. Gemini Pro audits the economics. A human makes the final approval call."
            unitEconomics="$0.00035 per full review"
            vsBaseline="vs $25–100 manual review"
            buyer="Health plan · TPA · Utilization management vendor · Medical director"
            highlight="Per-token meter readings · Economic audit · URAC-aligned clinical governance"
            href="/meter/healthcare"
            aboutHref="/meter/about/healthcare"
          />

          <DemoCard
            number="02"
            industry="Law Firms · Corporate Legal · M&A"
            title="Contract Due Diligence Review"
            subtitle="AI reads an entire merger data room and flags contract conflicts — for lawyers and legal ops teams handling deals"
            status="live"
            description="When a company acquires another, lawyers read hundreds of contracts to find risks, inconsistencies, and missing clauses. This demo simulates an M&A deal (Acme acquires Beta) with 8 synthetic contracts — NDAs, leases, an MSA, employment agreements, IP assignment, and the merger agreement itself. Flash handles the routine docs, Pro handles the high-stakes ones. AI flags cross-document conflicts. Every token is priced and settled per matter on Tempo."
            unitEconomics="&lt;$0.10 per matter"
            vsBaseline="vs $200–800 paralegal time"
            buyer="Law firm partner · In-house GC · Legal ops director · M&A associate"
            highlight="Tier routing visible per document · Cross-document conflict detection · ABA-audit trail"
            href="/meter/legal"
            aboutHref="/meter/about/legal"
          />

          <DemoCard
            number="03"
            industry="Property Management · Multi-Family Real Estate"
            title="Tenant Application Screening"
            subtitle="AI reads rental applications and scores fraud risk — for landlords and property managers deciding who gets approved"
            status="live"
            description="Property managers screen hundreds of rental applications a month, each requiring manual review of pay stubs, IDs, bank statements, and rental history. This demo runs 3 applicant scenarios (4 documents each): Flash extracts structured fields from each doc, Pro checks cross-document consistency, and the system outputs a fraud score from 0–100 with an escalation threshold. Every applicant is billed and settled per-token on Tempo."
            unitEconomics="$0.02–$0.05 per applicant"
            vsBaseline="vs $30–80 manual screening"
            buyer="Property management co · Multi-family REIT · Leasing platform · Landlord"
            highlight="Fraud score 0–100 · Escalation threshold · HUD fair-housing audit trail"
            href="/meter/real-estate"
            aboutHref="/meter/about/real-estate"
          />

          <DemoCard
            number="04"
            industry="Any Enterprise · Any Industry · Any Department"
            title="Enterprise AI Spend Control"
            subtitle="Drop P402 in front of any team's AI usage — see every token, every cost, every department, across the whole company"
            status="live"
            cta="View Dashboard →"
            description="Every enterprise using AI has the same problem: a monthly invoice with no breakdown. You can't see which team spent what, which model was used, or which calls were waste. P402 sits between your teams and every AI provider — attributing every token to an org, department, project, and employee. Budget caps are enforced before the call goes out. Gemini Pro identifies where cheaper models handle tasks just as well. Works for Engineering, Marketing, Legal, Finance, or any combination."
            unitEconomics="30–70% model cost reduction"
            vsBaseline="vs opaque monthly invoices"
            buyer="CFO · CTO · Head of AI · Engineering lead · Finance ops"
            highlight="Org → dept → project → employee attribution · Model routing optimization · Budget projections"
            href="/meter/enterprise"
            aboutHref="/meter/about/enterprise"
            accent
          />
        </section>

        {/* What all four prove */}
        <section className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            What all four prove together
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight">
            P402 is the metering layer AI has been missing — vertical and horizontal.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-[11px] font-mono text-neutral-400 leading-relaxed">
            <div className="flex flex-col gap-1">
              <span className="text-primary font-bold uppercase tracking-wider text-[9px]">Three vertical workflows</span>
              <span>Healthcare, legal, and real estate prove P402 works for specific high-stakes document workflows with distinct regulatory requirements. Same settlement layer, three different compliance regimes.</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-primary font-bold uppercase tracking-wider text-[9px]">One horizontal platform</span>
              <span>Enterprise proves P402 works as the AI cost layer across every department simultaneously — Engineering, Marketing, Legal, Finance. The vertical workflows run inside the enterprise platform.</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-primary font-bold uppercase tracking-wider text-[9px]">The routing insight</span>
              <span>Enterprise is where routing optimization pays the biggest dividend. When you can see that Engineering uses Opus for tasks Haiku handles equally well, the 30–70% savings becomes real and actionable.</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-primary font-bold uppercase tracking-wider text-[9px]">The common denominator</span>
              <span>Every AI workflow — vertical or horizontal — has the same gap: no per-action cost attribution, no sub-cent settlement rail, no onchain audit trail. P402 fills it once across all four.</span>
            </div>
          </div>
          <Link href="/meter/about" className="self-start text-[10px] font-mono text-info hover:text-primary uppercase tracking-wider border border-info hover:border-primary px-3 py-1.5 transition-colors">
            Full P402 Story →
          </Link>
        </section>

        <MeterFunnelFooter context="hub" />

      </div>
    </div>
  );
}

function DemoCard({
  number, industry, title, subtitle, status, cta, description, unitEconomics, vsBaseline,
  buyer, highlight, href, aboutHref, accent,
}: {
  number: string;
  industry: string;
  title: string;
  subtitle: string;
  status: 'live' | 'coming-soon';
  cta?: string;
  description: string;
  unitEconomics: string;
  vsBaseline: string;
  buyer: string;
  highlight: string;
  href: string;
  aboutHref: string;
  accent?: boolean;
}) {
  const isLive = status === 'live';
  const borderColor = isLive ? (accent ? 'border-info' : 'border-primary') : 'border-neutral-700';
  const numColor = isLive ? (accent ? 'text-info' : 'text-primary') : 'text-neutral-600';
  const costColor = isLive ? (accent ? 'text-info' : 'text-primary') : 'text-neutral-500';
  return (
    <div className={`border-2 flex flex-col lg:flex-row ${borderColor}`}>
      {/* Number + status column */}
      <div className={`flex-shrink-0 flex flex-col items-center justify-start gap-2 px-5 py-5 border-b-2 lg:border-b-0 lg:border-r-2 ${borderColor}`}>
        <span className={`text-3xl font-bold font-mono tabular-nums ${numColor}`}>{number}</span>
        {isLive ? (
          accent
            ? <span className="border border-info text-info text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider">Demo</span>
            : <span className="border border-success text-success text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider">Live</span>
        ) : (
          <span className="border border-neutral-700 text-neutral-600 text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider">Soon</span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1">{industry}</div>
            <h3 className="text-lg font-bold uppercase tracking-tight text-neutral-50">{title}</h3>
            <p className={`text-[12px] font-mono mt-1 leading-snug ${accent ? 'text-info' : 'text-primary'}`}>{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0 pl-4">
            <div className="flex flex-col items-end">
              <span className={`text-base font-bold font-mono tabular-nums ${costColor}`}>{unitEconomics}</span>
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
            <Link href={href} className={`btn text-xs px-4 py-1.5 ${accent ? 'btn-secondary border-info text-info hover:bg-info hover:text-neutral-900' : 'btn-primary'}`}>
              {cta ?? 'Run Demo →'}
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
