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

        {/* Trust chain */}
        <InheritedTrustStrip />

        {/* Why Tempo Works, contextual explanation after seeing it in action */}
        <MarginExplanationPanel />
      </div>
    </div>
  );
}
