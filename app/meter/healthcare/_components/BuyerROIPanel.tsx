'use client';

import { useState } from 'react';
import { useMeterStore } from '../_store/useMeterStore';

const COST_PER_CASE_MANUAL = 35;    // midpoint of $25–45 UM nurse review
const COST_PER_CASE_P402 = 0.00035; // actual demo cost (55 events ~$0.00035)
const IMPLEMENTATION_WEEKS = 6;     // typical P402 integration timeline

function formatDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function BuyerROIPanel() {
  const { streamDone, frequencyStats } = useMeterStore();
  const [casesPerYear, setCasesPerYear] = useState(50_000);
  const [manualCostPerCase, setManualCostPerCase] = useState(COST_PER_CASE_MANUAL);
  const [siMarginPct, setSiMarginPct] = useState(40);

  if (!streamDone) return null;

  const costPerCaseP402 = frequencyStats.totalCostUsd > 0 ? frequencyStats.totalCostUsd : COST_PER_CASE_P402;
  const currentAnnualCost = casesPerYear * manualCostPerCase;
  const p402AnnualCost = casesPerYear * costPerCaseP402;
  const annualSavings = currentAnnualCost - p402AnnualCost;
  const savingsMultiple = Math.round(currentAnnualCost / p402AnnualCost);
  const siAnnualRevenue = annualSavings * (siMarginPct / 100);
  const implementationCostAtMargin = siAnnualRevenue / 2; // rough 6-month engagement cost

  const sliderSteps = [
    { label: '5K', value: 5_000 },
    { label: '25K', value: 25_000 },
    { label: '50K', value: 50_000 },
    { label: '100K', value: 100_000 },
    { label: '250K', value: 250_000 },
    { label: '500K', value: 500_000 },
  ];

  return (
    <div className="border-2 border-neutral-700 flex flex-col">

      {/* Header */}
      <div className="border-b-2 border-neutral-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Economics</span>
          <span className="text-[10px] font-mono text-neutral-700">·</span>
          <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Interactive ROI</span>
        </div>
        <div className="text-[10px] font-mono text-neutral-600 uppercase">Your numbers → your outcome</div>
      </div>

      <div className="px-6 py-6 flex flex-col gap-6">

        {/* Volume selector */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Prior Authorizations / Year</div>
            <div className="text-sm font-bold tabular-nums text-neutral-100">{casesPerYear.toLocaleString()}</div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {sliderSteps.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setCasesPerYear(value)}
                className={`text-[10px] font-bold font-mono uppercase px-3 py-1.5 border-2 transition-colors
                  ${casesPerYear === value
                    ? 'border-primary text-primary'
                    : 'border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main numbers grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-2 border-neutral-700">

          {/* Current cost */}
          <div className="border-b-2 lg:border-b-0 lg:border-r-2 border-neutral-700 px-5 py-5 flex flex-col gap-2">
            <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Current Annual Cost</div>
            <div className="text-3xl font-bold tabular-nums text-neutral-300 leading-none">
              {formatDollar(currentAnnualCost)}
            </div>
            <div className="text-[10px] font-mono text-neutral-600 leading-relaxed">
              {casesPerYear.toLocaleString()} cases × ${manualCostPerCase}/case<br />
              UM nurse + physician advisor + vendor
            </div>
            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-mono text-neutral-600 uppercase">Per-case cost</div>
                <div className="flex gap-1">
                  {[25, 35, 45, 65, 100].map((v) => (
                    <button
                      key={v}
                      onClick={() => setManualCostPerCase(v)}
                      className={`text-[9px] font-mono px-1.5 py-0.5 border transition-colors
                        ${manualCostPerCase === v
                          ? 'border-neutral-400 text-neutral-200'
                          : 'border-neutral-700 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400'}`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* P402 cost */}
          <div className="border-b-2 lg:border-b-0 lg:border-r-2 border-neutral-700 px-5 py-5 flex flex-col gap-2">
            <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">P402 Annual Cost</div>
            <div className="text-3xl font-bold tabular-nums text-primary leading-none">
              {formatDollar(p402AnnualCost)}
            </div>
            <div className="text-[10px] font-mono text-neutral-600 leading-relaxed">
              {casesPerYear.toLocaleString()} cases × ${costPerCaseP402.toFixed(5)}/case<br />
              55 Tempo settlements · actual demo cost
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between">
              <div className="text-[9px] font-mono text-neutral-600 uppercase">Reduction</div>
              <div className="text-xs font-bold text-primary">{savingsMultiple.toLocaleString()}× cheaper</div>
            </div>
          </div>

          {/* Annual savings */}
          <div className="px-5 py-5 flex flex-col gap-2">
            <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Annual Savings</div>
            <div className="text-3xl font-bold tabular-nums text-success leading-none">
              {formatDollar(annualSavings)}
            </div>
            <div className="text-[10px] font-mono text-neutral-600 leading-relaxed">
              Freed from operational AI processing<br />
              Every dollar auditable on Tempo
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between">
              <div className="text-[9px] font-mono text-neutral-600 uppercase">3-year value</div>
              <div className="text-xs font-bold text-success">{formatDollar(annualSavings * 3)}</div>
            </div>
          </div>
        </div>

        {/* SI partner economics — the integrator's opportunity */}
        <div className="border-2 border-neutral-700 flex flex-col">
          <div className="border-b border-neutral-700 px-5 py-3 flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Implementation Partner Economics</span>
            <span className="text-[9px] font-mono text-neutral-600 uppercase">Accenture · Deloitte · KPMG · etc.</span>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">Client saves</div>
              <div className="text-xl font-bold tabular-nums text-success">{formatDollar(annualSavings)}/yr</div>
              <div className="text-[9px] font-mono text-neutral-600">the case for change</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">SI implementation</div>
              <div className="text-xl font-bold tabular-nums text-neutral-300">{IMPLEMENTATION_WEEKS} weeks</div>
              <div className="text-[9px] font-mono text-neutral-600">typical integration timeline</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">SI margin</div>
                <div className="flex gap-1">
                  {[20, 30, 40, 50].map((v) => (
                    <button
                      key={v}
                      onClick={() => setSiMarginPct(v)}
                      className={`text-[9px] font-mono px-1.5 py-0.5 border transition-colors
                        ${siMarginPct === v
                          ? 'border-info text-info'
                          : 'border-neutral-700 text-neutral-600 hover:border-neutral-600'}`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xl font-bold tabular-nums text-info">{formatDollar(siAnnualRevenue)}/yr</div>
              <div className="text-[9px] font-mono text-neutral-600">{siMarginPct}% of client savings</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">Engagement value</div>
              <div className="text-xl font-bold tabular-nums text-info">{formatDollar(implementationCostAtMargin)}</div>
              <div className="text-[9px] font-mono text-neutral-600">6-month project at margin</div>
            </div>
          </div>
          <div className="border-t border-neutral-700 px-5 py-3">
            <p className="text-[10px] font-mono text-neutral-600 leading-relaxed">
              P402 is infrastructure, not a vendor. Partners own the implementation relationship, the training, the workflow integration, and the ongoing support contract. The on-chain audit trail makes every engagement fully verifiable — no opaque vendor billing.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
