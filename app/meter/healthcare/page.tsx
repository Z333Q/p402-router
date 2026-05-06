'use client';

import { SafeModeBanner } from './_components/SafeModeBanner';
import { ComplianceBoundaryBanner } from './_components/ComplianceBoundaryBanner';
import { SessionBar } from './_components/SessionBar';
import { FrequencyCounter } from './_components/FrequencyCounter';
import { CircleInfraStrip } from './_components/CircleInfraStrip';
import { GuidedDemoStrip } from './_components/GuidedDemoStrip';
import { PacketIntakeCard } from './_components/PacketIntakeCard';
import { WorkOrderCard } from './_components/WorkOrderCard';
import { ReviewSummaryPane } from './_components/ReviewSummaryPane';
import { LedgerPane } from './_components/LedgerPane';
import { TempoProofDrawer } from './_components/TempoProofDrawer';
import { ApprovalDecisionCard } from './_components/ApprovalDecisionCard';
import { InheritedTrustStrip } from './_components/InheritedTrustStrip';
import { MarginExplanationPanel } from './_components/MarginExplanationPanel';
import { EconomicAuditPanel } from './_components/EconomicAuditPanel';
import { TempoSettlementProof } from './_components/TempoSettlementProof';
import { BuyerStoryCard } from './_components/BuyerStoryCard';
import { BuyerROIPanel } from './_components/BuyerROIPanel';
import { useMeterStore } from './_store/useMeterStore';

export default function MeterPage() {
  const { error, setError, reset, safeMode, lightMode, setLightMode } = useMeterStore();

  const themeClass = lightMode ? 'meter-light' : 'meter-dark';

  return (
    <div className={`min-h-screen flex flex-col ${lightMode ? 'bg-neutral-50' : 'bg-neutral-900'}`}>
      {/* Safe Mode banner, thin bar, always first */}
      <SafeModeBanner />

      {/* Compact utility bar */}
      <div className={`border-b-2 px-6 py-3 flex items-center justify-between ${lightMode ? 'border-neutral-300 bg-white' : 'border-neutral-700 bg-neutral-900'}`}>
        <div className="flex items-center gap-3">
          <a href="/meter" className={`text-sm font-bold hover:text-primary transition-colors ${lightMode ? 'text-neutral-900' : 'text-neutral-50'}`}>P402 Meter</a>
          <span className={lightMode ? 'text-neutral-400' : 'text-neutral-700'}>·</span>
          <span className={`text-sm font-bold ${lightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>Healthcare</span>
          <span className={lightMode ? 'text-neutral-400' : 'text-neutral-700'}>·</span>
          <span className={`border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${lightMode ? 'border-neutral-400 text-neutral-600' : 'border-neutral-700 text-neutral-400'}`}>
            Tempo Mainnet
          </span>
          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${safeMode ? 'border-warning text-warning' : 'border-success text-success'}`}>
            {safeMode ? 'Demo' : 'Live'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Light / dark toggle */}
          <button
            onClick={() => setLightMode(!lightMode)}
            className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 border-2 transition-none ${lightMode ? 'border-neutral-900 bg-neutral-900 text-neutral-50' : 'border-neutral-600 bg-transparent text-neutral-400 hover:border-neutral-400 hover:text-neutral-200'}`}
          >
            {lightMode ? '◐ Dark' : '◑ Light'}
          </button>
          <button className="btn btn-secondary text-xs" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className={`${themeClass} flex-1 px-6 py-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full`}>
        {/* Story block, first screen, one job per row */}
        <div className="max-w-2xl">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-neutral-50 mb-4">
            Real-time AI billing<br />
            <span className="text-primary">for payer operations</span>
          </h1>
          <div className="flex flex-col gap-1.5 mb-6">
            <p className="text-base text-neutral-300 leading-relaxed">
              Upload a prior auth document, Gemini reads it, classifies it, reviews it.
            </p>
            <p className="text-base text-neutral-300 leading-relaxed">
              Every AI token settles as a USDC.e event on Tempo. Total cost: under $0.001.
            </p>
            <p className="text-base text-neutral-300 leading-relaxed">
              The ledger, the cost, and the proof stay visible from start to finish.
            </p>
          </div>
          {/* Proof chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="border-2 border-primary text-primary text-xs font-bold font-mono px-3 py-1.5">
              55+ Tempo settlements per run
            </span>
            <span className="border-2 border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5">
              &lt;$0.000001 per settlement vs $2.85 on ETH
            </span>
            <span className="border-2 border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5">
              Gemini Flash + Pro · multimodal
            </span>
            <span className="border-2 border-neutral-600 text-neutral-300 text-xs font-mono px-3 py-1.5">
              USDC.e TIP-20 · Tempo mainnet
            </span>
          </div>
          {/* Action cluster */}
          <div className="flex flex-wrap gap-3 items-center">
            <a href="#demo" className="btn btn-primary text-sm px-5">Run Demo →</a>
            <a href="/meter/about/healthcare" className="btn btn-secondary text-sm">About</a>
            <a href="/meter" className="btn btn-secondary text-sm">← All Demos</a>
            <a href="https://explore.tempo.xyz" target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm">Tempo Explorer ↗</a>
          </div>
        </div>

        {/* Buyer story — who you are, what you pay today, what you're about to see */}
        <BuyerStoryCard />

        {/* One-click demo, primary action, anchor target */}
        <div id="demo">
          <GuidedDemoStrip />
        </div>

        {/* Compliance boundary */}
        <ComplianceBoundaryBanner />

        {/* Metrics scoreboard */}
        <SessionBar />
        <FrequencyCounter />

        {/* Tempo + MPP infrastructure strip */}
        <CircleInfraStrip />

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

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Packet + Work Order */}
          <div className="flex flex-col gap-6">
            <PacketIntakeCard />
            <WorkOrderCard />
          </div>

          {/* Right column: Review + Ledger + Proof + Approval */}
          <div className="flex flex-col gap-6">
            <ReviewSummaryPane />
            <LedgerPane />
            <TempoProofDrawer />
            <ApprovalDecisionCard />
          </div>
        </div>

        {/* Settlement proof — tx hash + Tempo explorer link, appears after stream completes */}
        <TempoSettlementProof />

        {/* Economic audit, Gemini Pro post-run, appears after review completes */}
        <EconomicAuditPanel />

        {/* Interactive ROI — buyer economics + SI partner opportunity */}
        <BuyerROIPanel />

        {/* Trust chain */}
        <InheritedTrustStrip />

        {/* Why Tempo Works, contextual explanation after seeing it in action */}
        <MarginExplanationPanel />

        {/* Cross-links to the other live demos */}
        <div className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
          <div className={`text-[10px] font-mono uppercase tracking-widest ${lightMode ? 'text-neutral-500' : 'text-neutral-500'}`}>
            Same infrastructure · Three more demos
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <a href="/meter/legal" className="border-2 border-neutral-700 hover:border-primary p-4 flex flex-col gap-2 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Legal</span>
                <span className="border border-success text-success text-[8px] font-mono px-1.5 py-0.5 uppercase">Live</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">M&A Due Diligence</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">
                8 contracts routed Flash or Pro by complexity. Cross-document conflict detection. Per-matter Tempo ledger.
              </p>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-primary transition-colors mt-auto">Run Demo →</span>
            </a>

            <a href="/meter/real-estate" className="border-2 border-neutral-700 hover:border-primary p-4 flex flex-col gap-2 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Real Estate</span>
                <span className="border border-success text-success text-[8px] font-mono px-1.5 py-0.5 uppercase">Live</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-tight group-hover:text-primary transition-colors">Tenant Screening</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">
                3 applicant scenarios. Fraud score 0–100. Escalation threshold. Flash + Pro extraction and consistency.
              </p>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-primary transition-colors mt-auto">Run Demo →</span>
            </a>

            <a href="/meter/enterprise" className="border-2 border-neutral-700 hover:border-info p-4 flex flex-col gap-2 transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Enterprise</span>
                <span className="border border-info text-info text-[8px] font-mono px-1.5 py-0.5 uppercase">Demo</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-tight group-hover:text-info transition-colors">AI Cost Management</div>
              <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">
                Org → dept → project → employee attribution. Routing optimization. Budget projections. Synthetic dashboard live now.
              </p>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-info transition-colors mt-auto">View Dashboard →</span>
            </a>
          </div>
          <div className="flex gap-3 pt-1">
            <a href="/meter" className="text-[10px] font-mono text-neutral-500 hover:text-primary uppercase tracking-wider border border-neutral-700 hover:border-primary px-3 py-1.5 transition-colors">
              ← All Demos
            </a>
            <a href="/meter/about" className="text-[10px] font-mono text-neutral-500 hover:text-primary uppercase tracking-wider border border-neutral-700 hover:border-primary px-3 py-1.5 transition-colors">
              Full P402 Story →
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
