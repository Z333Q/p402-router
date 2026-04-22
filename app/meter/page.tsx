'use client';

import { SafeModeBanner } from './_components/SafeModeBanner';
import { ComplianceBoundaryBanner } from './_components/ComplianceBoundaryBanner';
import { SessionBar } from './_components/SessionBar';
import { FrequencyCounter } from './_components/FrequencyCounter';
import { PacketIntakeCard } from './_components/PacketIntakeCard';
import { WorkOrderCard } from './_components/WorkOrderCard';
import { ReviewSummaryPane } from './_components/ReviewSummaryPane';
import { LedgerPane } from './_components/LedgerPane';
import { ArcProofDrawer } from './_components/ArcProofDrawer';
import { ApprovalDecisionCard } from './_components/ApprovalDecisionCard';
import { InheritedTrustStrip } from './_components/InheritedTrustStrip';
import { OptionalReleaseStrip } from './_components/OptionalReleaseStrip';
import { MarginExplanationPanel } from './_components/MarginExplanationPanel';
import { SpecialistEscrowCard } from './_components/SpecialistEscrowCard';
import { EconomicAuditPanel } from './_components/EconomicAuditPanel';
import { useMeterStore } from './_store/useMeterStore';

export default function MeterPage() {
  const { error, setError, reset } = useMeterStore();

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Safe Mode banner — always first */}
      <SafeModeBanner />

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between bg-neutral-900">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">P402 Meter</span>
          <span className="text-neutral-700">·</span>
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
            Real-Time AI Billing · Arc × Circle × Gemini
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-500 uppercase">
            Arc Testnet
          </div>
          <button
            className="btn btn-secondary text-[10px]"
            onClick={reset}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
        {/* Hero heading */}
        <div>
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">
            {'>'} _ ARC HACKATHON · USAGE-BASED COMPUTE BILLING · GEMINI PRIZE
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight leading-none">
            AI Thinking Has a Price.
            <br />
            <span className="text-primary">Watch It Settle on Arc.</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-400 font-mono max-w-2xl">
            P402 Meter prices every AI token in USDC and settles it on Arc in real time.
            Prior authorization review is the proof — 55+ onchain events per run, sub-$0.01 per action,
            governed by Gemini. Try doing that on Ethereum or Stripe.
          </p>
        </div>

        {/* Compliance boundary */}
        <ComplianceBoundaryBanner />

        {/* Session bar */}
        <SessionBar />

        {/* Frequency counter — always visible */}
        <FrequencyCounter />

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

          {/* Right column: Review + Ledger + Specialist + Proof + Approval */}
          <div className="flex flex-col gap-6">
            <ReviewSummaryPane />
            <LedgerPane />
            <SpecialistEscrowCard />
            <ArcProofDrawer />
            <ApprovalDecisionCard />
          </div>
        </div>

        {/* Economic audit — Gemini Pro post-run, appears after review completes */}
        <EconomicAuditPanel />

        {/* Margin explanation — judge-visible proof point */}
        <MarginExplanationPanel />

        {/* Trust and release strip — below main grid */}
        <InheritedTrustStrip />
        <OptionalReleaseStrip />
      </div>
    </div>
  );
}
