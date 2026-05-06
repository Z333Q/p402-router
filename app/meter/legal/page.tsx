'use client';

import Link from 'next/link';
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
          <Link href="/meter" className="text-sm font-bold hover:text-primary transition-colors text-neutral-50">
            P402 Meter
          </Link>
          <span className="text-neutral-700">·</span>
          <span className="text-sm font-bold text-neutral-400">Legal</span>
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
              Every token priced and settled on Tempo. Cross-document conflicts detected automatically.
            </p>
            <p className="text-base text-neutral-300 leading-relaxed">
              Total cost: under $0.0015. Paralegal equivalent: $200–800.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="border-2 border-primary text-primary text-xs font-bold font-mono px-3 py-1.5">
              &lt;$0.10 per matter
            </span>
            <span className="border-2 border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5">
              Intelligent tier routing — Flash or Pro per doc
            </span>
            <span className="border-2 border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5">
              Cross-document conflict detection
            </span>
            <span className="border-2 border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5">
              ABA audit trail · Tempo mainnet
            </span>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <a href="#demo" className="btn btn-primary text-sm px-5">Run Demo →</a>
            <Link href="/meter/about/legal" className="btn btn-secondary text-sm">Case Study</Link>
            <Link href="/meter" className="btn btn-secondary text-sm">← All Demos</Link>
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
                body: 'P402 routes each document to the right model based on complexity score. NDAs and leases go to Flash ($0.075/1M tokens). MSAs, employment agreements, and merger docs go to Pro ($1.50/1M tokens). The routing decision — and its rationale — is visible for every document.',
              },
              {
                title: 'Cross-Document Conflict Detection',
                body: 'After individual reviews complete, Gemini Pro cross-references key clause definitions across the data room. In this matter, it surfaces 4 conflicts including a high-risk inconsistency between the MSA change-of-control clause and the acquisition agreement closing conditions.',
              },
              {
                title: 'ABA-Compliant Audit Trail',
                body: 'Every AI action — model selection, review output, conflict flag — is a ledger event settled on Tempo mainnet. The immutable record satisfies ABA Formal Opinion 512 on AI use in legal practice: the attorney can verify what the AI did and why, and approve or reject each output.',
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
              Full Legal Case Study →
            </Link>
            <Link href="/meter" className="text-[10px] font-mono text-neutral-500 hover:text-primary uppercase tracking-wider border border-neutral-700 hover:border-primary px-3 py-1.5 transition-colors">
              ← All Demos
            </Link>
          </div>
        </div>

        {/* Cross-links to the other live demos */}
        <div className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Same infrastructure · Three more demos</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Link href="/meter/healthcare" className="border-2 border-primary p-4 flex flex-col gap-2 transition-colors hover:bg-neutral-800 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Healthcare</span>
                <span className="border border-success text-success text-[8px] font-mono px-1.5 py-0.5 uppercase">Live</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-tight text-primary">Prior Auth Review</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">Live Gemini + Tempo settlement. 55+ events per run. URAC-aligned UM review with economic audit.</p>
              <span className="text-[10px] font-mono text-primary mt-auto">Run Demo →</span>
            </Link>

            <Link href="/meter/real-estate" className="border-2 border-neutral-700 hover:border-primary p-4 flex flex-col gap-2 transition-colors hover:bg-neutral-800 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Real Estate</span>
                <span className="border border-success text-success text-[8px] font-mono px-1.5 py-0.5 uppercase">Live</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">Tenant Screening</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">3 applicant scenarios. Fraud score 0–100. Escalation threshold. HUD fair-housing audit trail.</p>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-primary transition-colors mt-auto">Run Demo →</span>
            </Link>

            <Link href="/meter/enterprise" className="border-2 border-neutral-700 hover:border-info p-4 flex flex-col gap-2 transition-colors hover:bg-neutral-800 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Enterprise</span>
                <span className="border border-info text-info text-[8px] font-mono px-1.5 py-0.5 uppercase">Demo</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-tight group-hover:text-info transition-colors">AI Cost Management</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">Org → dept → project → employee attribution. Routing optimization. Budget projections.</p>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-info transition-colors mt-auto">View Dashboard →</span>
            </Link>
          </div>
        </div>

        {/* Footer nav */}
        <div className="border-t border-neutral-700 pt-6 flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
          <span>P402 Meter · Legal · Tempo Mainnet</span>
          <div className="flex gap-4">
            <Link href="/meter/about/legal" className="hover:text-neutral-400 transition-colors">Case Study</Link>
            <Link href="/meter/healthcare" className="hover:text-neutral-400 transition-colors">Healthcare Demo</Link>
            <Link href="/meter" className="hover:text-neutral-400 transition-colors">All Demos</Link>
            <a href="https://explore.tempo.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">Tempo Explorer ↗</a>
          </div>
        </div>

      </div>
    </div>
  );
}
