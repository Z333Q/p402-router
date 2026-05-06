'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ScreeningDemoStrip } from './_components/ScreeningDemoStrip';
import { ApplicantSelector } from './_components/ApplicantSelector';
import { ScreeningPanel } from './_components/ScreeningPanel';
import { ScreeningLedger } from './_components/ScreeningLedger';
import { useRealEstateStore } from './_store/useRealEstateStore';

export default function RealEstateDemoPage() {
  const { error, setError, reset, safeMode, screeningState } = useRealEstateStore();
  const [streamText, setStreamText] = useState('');
  const isStreaming = screeningState === 'extracting' || screeningState === 'consistency_check';

  const handleStreamText = useCallback((text: string) => setStreamText(text), []);
  const handleStreamReset = useCallback(() => setStreamText(''), []);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 flex flex-col">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/meter" className="text-sm font-bold hover:text-primary transition-colors text-neutral-50">
            P402 Meter
          </Link>
          <span className="text-neutral-700">·</span>
          <span className="text-sm font-bold text-neutral-400">Real Estate</span>
          <span className="text-neutral-700">·</span>
          <span className="border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide border-neutral-700 text-neutral-400">
            Tempo Mainnet
          </span>
          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${safeMode ? 'border-warning text-warning' : 'border-success text-success'}`}>
            {safeMode ? 'Demo' : 'Live'}
          </span>
        </div>
        <button className="btn btn-secondary text-xs" onClick={reset}>Reset</button>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full">

        {/* Hero */}
        <div className="max-w-2xl">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
            Tenant screening<br />
            <span className="text-primary">at sub-penny cost.</span>
          </h1>
          <div className="flex flex-col gap-1.5 mb-6">
            <p className="text-base text-neutral-300 leading-relaxed">
              3 applicant scenarios. 4 documents each. Gemini Flash extracts structured fields from every document.
            </p>
            <p className="text-base text-neutral-300 leading-relaxed">
              Gemini Pro cross-checks income, identity, and bank statement arithmetic. Fraud signals trigger escalation.
            </p>
            <p className="text-base text-neutral-300 leading-relaxed">
              Every AI action settles on Tempo mainnet. Total cost: under $0.0001 per applicant.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="border-2 border-primary text-primary text-xs font-bold font-mono px-3 py-1.5">
              $0.02–$0.05 per applicant
            </span>
            <span className="border-2 border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5">
              3 scenarios: clean · mismatch · fraud
            </span>
            <span className="border-2 border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5">
              Fraud score · escalation threshold
            </span>
            <span className="border-2 border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5">
              HUD fair-housing audit trail · Tempo
            </span>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <a href="#demo" className="btn btn-primary text-sm px-5">Screen Applicant →</a>
            <Link href="/meter/about/real-estate" className="btn btn-secondary text-sm">Case Study</Link>
            <Link href="/meter" className="btn btn-secondary text-sm">← All Demos</Link>
          </div>
        </div>

        {/* Demo strip */}
        <div id="demo">
          <ScreeningDemoStrip onStreamText={handleStreamText} onStreamReset={handleStreamReset} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="border-2 border-error px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-mono text-error">{error}</span>
            <button className="text-[10px] font-mono text-neutral-400 hover:text-neutral-50 uppercase" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <ApplicantSelector />
            <ScreeningLedger />
          </div>
          <div className="flex flex-col gap-6">
            <ScreeningPanel streamText={streamText} isStreaming={isStreaming} />
          </div>
        </div>

        {/* What this proves */}
        <div className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">What this demo proves</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Multimodal Volume Economics',
                body: 'The Scenario A clean applicant costs ~$0.000022 total — 4 documents, 2 models, full extraction + consistency check. At 1,000 applications/month, that\'s $22 in AI costs versus $30,000–$80,000 in manual or vendor screening fees.',
              },
              {
                title: 'Fraud Signal Scoring',
                body: 'Scenario C triggers escalation at score 87 (threshold: 65). The signals: three-way name inconsistency, bank statement arithmetic error, wrong routing number for the claimed geography, unverifiable employer. Each signal is a ledger event with a Tempo proof.',
              },
              {
                title: 'HUD Fair-Housing Audit Trail',
                body: 'Every screening decision is an immutable record on Tempo — which model ran, which documents were checked, what the output was. The AI never makes the final decision (the property manager does), but the AI\'s reasoning is fully auditable under HUD fair-housing guidelines.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="flex flex-col gap-2">
                <div className="text-[9px] font-bold font-mono text-primary uppercase tracking-wider">{title}</div>
                <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <Link href="/meter/about/real-estate" className="text-[10px] font-mono text-info hover:text-primary uppercase tracking-wider border border-info hover:border-primary px-3 py-1.5 transition-colors">
              Full Real Estate Case Study →
            </Link>
            <Link href="/meter" className="text-[10px] font-mono text-neutral-500 hover:text-primary uppercase tracking-wider border border-neutral-700 hover:border-primary px-3 py-1.5 transition-colors">
              ← All Demos
            </Link>
          </div>
        </div>

        {/* Cross-links */}
        <div className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Same infrastructure · Three more demos</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Link href="/meter/healthcare" className="border-2 border-primary p-4 flex flex-col gap-2 hover:bg-neutral-800 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Healthcare</span>
                <span className="border border-success text-success text-[8px] font-mono px-1.5 py-0.5 uppercase">Live</span>
              </div>
              <div className="text-sm font-bold uppercase text-primary">Prior Auth Review</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">Live Gemini + Tempo settlement. 55+ events per run. URAC-aligned review with economic audit.</p>
              <span className="text-[10px] font-mono text-primary mt-auto">Run Demo →</span>
            </Link>
            <Link href="/meter/legal" className="border-2 border-neutral-700 hover:border-primary p-4 flex flex-col gap-2 hover:bg-neutral-800 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Legal</span>
                <span className="border border-success text-success text-[8px] font-mono px-1.5 py-0.5 uppercase">Live</span>
              </div>
              <div className="text-sm font-bold uppercase group-hover:text-primary transition-colors">M&A Due Diligence</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">8 contracts. Flash or Pro routing per doc. Cross-document conflict detection. ABA audit trail.</p>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-primary transition-colors mt-auto">Run Demo →</span>
            </Link>
            <Link href="/meter/enterprise" className="border-2 border-neutral-700 hover:border-info p-4 flex flex-col gap-2 hover:bg-neutral-800 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase">Enterprise</span>
                <span className="border border-info text-info text-[8px] font-mono px-1.5 py-0.5 uppercase">Demo</span>
              </div>
              <div className="text-sm font-bold uppercase group-hover:text-info transition-colors">AI Cost Management</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">Org → dept → project → employee attribution. Routing optimization. Budget projections.</p>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-info transition-colors mt-auto">View Dashboard →</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-700 pt-6 flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
          <span>P402 Meter · Real Estate · Tempo Mainnet</span>
          <div className="flex gap-4">
            <Link href="/meter/about/real-estate" className="hover:text-neutral-400 transition-colors">Case Study</Link>
            <Link href="/meter/healthcare" className="hover:text-neutral-400 transition-colors">Healthcare Demo</Link>
            <Link href="/meter/legal" className="hover:text-neutral-400 transition-colors">Legal Demo</Link>
            <Link href="/meter" className="hover:text-neutral-400 transition-colors">All Demos</Link>
            <a href="https://explore.tempo.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">Tempo ↗</a>
          </div>
        </div>

      </div>
    </div>
  );
}
