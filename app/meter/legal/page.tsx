'use client';

import Link from 'next/link';
import { MeterFunnelFooter } from '../_components/MeterFunnelFooter';
import { MeterBrand } from '../_components/MeterBrand';
import { LegalDemoStrip } from './_components/LegalDemoStrip';
import { DataRoomPanel } from './_components/DataRoomPanel';
import { ReviewPanel } from './_components/ReviewPanel';
import { MatterLedger } from './_components/MatterLedger';
import { ConflictPanel } from './_components/ConflictPanel';
import { useLegalStore } from './_store/useLegalStore';

export default function LegalDemoPage() {
  const { error, setError, reset, safeMode } = useLegalStore();

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 flex flex-col">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MeterBrand section="Legal" />
          <span className="text-neutral-700">·</span>
          <span className="border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide border-neutral-700 text-neutral-400">
            Tempo Mainnet
          </span>
          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${safeMode ? 'border-warning text-warning' : 'border-success text-success'}`}>
            {safeMode ? 'Demo' : 'Live'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary text-xs" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full">

        {/* Hero */}
        <div className="max-w-2xl">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
            M&A due diligence<br />
            <span className="text-primary">at AI speed.</span>
          </h1>
          <div className="flex flex-col gap-1.5 mb-6">
            <p className="text-base text-neutral-300 leading-relaxed">
              8 contracts. 3 complex agreements reviewed by Gemini Pro. 4 simple documents by Flash.
            </p>
            <p className="text-base text-neutral-300 leading-relaxed">
              Every token priced and settled on Tempo. Cross-document observations surface as ledger events for counsel.
            </p>
            <p className="text-base text-neutral-300 leading-relaxed">
              Total AI cost: under $0.0015 per matter. Operating cost in the legacy workflow is materially higher; counsel makes the final judgment in either path.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Synthetic data room', 'No real client contracts', 'Human legal review required', 'ABA-aligned audit posture'].map((label) => (
              <span key={label} className="border-2 border-neutral-600 text-neutral-300 text-[10px] font-mono uppercase tracking-wide px-3 py-1.5">
                {label}
              </span>
            ))}
          </div>
          <p className="text-[11px] font-mono text-neutral-500 leading-relaxed mb-6">
            P402 does not provide legal advice or final judgment. Routing observations (Flash vs Pro complexity) are descriptive measurements of the demo run, not recommendations.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <Link href="/dashboard?demo=1&scenario=legal_mna_due_diligence" className="btn btn-primary text-sm px-5">View dashboard proof</Link>
            <Link href="/dashboard/prove?demo=1&scenario=legal_mna_due_diligence" className="btn btn-secondary text-sm">See evidence</Link>
            <a href="#demo" className="btn btn-secondary text-sm">Run M&amp;A demo</a>
            <Link href="/meter/about/legal" className="btn btn-secondary text-sm">Case study</Link>
            <Link href="/meter" className="btn btn-secondary text-sm">All demos</Link>
          </div>
        </div>

        {/* One-click demo */}
        <div id="demo">
          <LegalDemoStrip />
        </div>

        {/* Error banner */}
        {error && (
          <div className="border-2 border-error bg-neutral-900 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-mono text-error">{error}</span>
            <button
              className="text-[10px] font-mono text-neutral-400 hover:text-neutral-50 uppercase"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Data room + ledger */}
          <div className="flex flex-col gap-6">
            <DataRoomPanel />
            <MatterLedger />
          </div>

          {/* Right: Review + conflicts */}
          <div className="flex flex-col gap-6">
            <ReviewPanel />
            <ConflictPanel />
          </div>
        </div>

        {/* What this proves */}
        <div className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">What this demo proves</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Intelligent Tier Routing',
                body: 'P402 routes each document to a model based on a complexity score derived from this demo. NDAs and leases are routed to Flash ($0.075/1M tokens); MSAs, employment agreements, and merger docs to Pro ($1.50/1M tokens). Counsel reviews the routing decision and the resulting output and decides whether to accept it.',
              },
              {
                title: 'Cross-Document Conflict Detection',
                body: 'After individual reviews complete, Gemini Pro cross-references key clause definitions across the data room. In this matter, it surfaces 4 conflicts including a high-risk inconsistency between the MSA change-of-control clause and the acquisition agreement closing conditions.',
              },
              {
                title: 'ABA-aligned audit posture',
                body: 'Every AI action (model selection, review output, conflict flag) is a ledger event settled on Tempo mainnet. The immutable record supports an ABA-aligned audit posture under Formal Opinion 512: the attorney can verify what the AI did and why, and approve or reject each output. The opinion itself prescribes supervision and understanding; the ledger does not replace either.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="flex flex-col gap-2">
                <div className="text-[9px] font-bold font-mono text-primary uppercase tracking-wider">{title}</div>
                <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <Link href="/meter/about/legal" className="text-[10px] font-mono text-info hover:text-primary uppercase tracking-wider border border-info hover:border-primary px-3 py-1.5 transition-colors">
              Case study
            </Link>
            <Link href="/meter" className="text-[10px] font-mono text-neutral-500 hover:text-primary uppercase tracking-wider border border-neutral-700 hover:border-primary px-3 py-1.5 transition-colors">
              All demos
            </Link>
          </div>
        </div>

        {/* Cross-links to the other live demos */}
        <div className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Same infrastructure, three more demos</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Link href="/meter/healthcare" className="border-2 border-primary p-4 flex flex-col gap-2 transition-colors hover:bg-neutral-800 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Healthcare</span>
                <span className="border border-success text-success text-[8px] font-mono px-1.5 py-0.5 uppercase">Live</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-tight text-primary">Medicaid PA Governance</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">Per-operation receipts. 5-level client budget hierarchy. Human review gate. CMS-0057-F + HIPAA-aligned demo.</p>
              <span className="text-[10px] font-mono text-primary mt-auto">Run demo</span>
            </Link>

            <Link href="/meter/real-estate" className="border-2 border-neutral-700 hover:border-primary p-4 flex flex-col gap-2 transition-colors hover:bg-neutral-800 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Real Estate</span>
                <span className="border border-success text-success text-[8px] font-mono px-1.5 py-0.5 uppercase">Live</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">Tenant Screening</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">3 applicant scenarios. Fraud signal score with escalation threshold. HUD fair-housing audit posture; human reviewer makes the final decision.</p>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-primary transition-colors mt-auto">Run demo</span>
            </Link>

            <Link href="/meter/enterprise" className="border-2 border-neutral-700 hover:border-info p-4 flex flex-col gap-2 transition-colors hover:bg-neutral-800 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Enterprise</span>
                <span className="border border-info text-info text-[8px] font-mono px-1.5 py-0.5 uppercase">Demo</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-tight group-hover:text-info transition-colors">AI Cost Management</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">Org, dept, project, and team attribution. Routing observations. Budget visibility.</p>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-info transition-colors mt-auto">View dashboard</span>
            </Link>
          </div>
        </div>

        <MeterFunnelFooter context="legal" />

      </div>
    </div>
  );
}
