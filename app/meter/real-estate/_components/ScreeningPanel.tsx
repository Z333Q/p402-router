'use client';

import { useRealEstateStore } from '../_store/useRealEstateStore';
import { SCENARIOS } from '../_demo/applicants/scenarios';

export function ScreeningPanel({ streamText, isStreaming }: { streamText: string; isStreaming: boolean }) {
  const { screeningState, activeScenarioId, fraud } = useRealEstateStore();
  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId);

  if (screeningState === 'idle') {
    return (
      <div className="border-2 border-neutral-700 flex flex-col min-h-[360px]">
        <div className="border-b-2 border-neutral-700 px-4 py-3">
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-0.5">Screening Output</div>
          <div className="text-xs font-bold uppercase">AI Extraction + Consistency Analysis</div>
        </div>
        <div className="flex-1 flex items-center justify-center py-16">
          <p className="text-xs font-mono text-neutral-600 text-center">
            Select an applicant scenario and click "Screen Applicant" to begin.
          </p>
        </div>
      </div>
    );
  }

  const outcomeStyle: Record<string, string> = {
    approved:    'border-success bg-success text-neutral-900',
    conditional: 'border-warning bg-warning text-neutral-900',
    declined:    'border-error bg-error text-neutral-50',
    escalated:   'border-error bg-error text-neutral-50',
  };

  const outcomeLabel: Record<string, string> = {
    approved:    '✓ APPROVED',
    conditional: '⚡ CONDITIONAL',
    declined:    '✗ DECLINED',
    escalated:   '⚠ ESCALATED — Specialist Review',
  };

  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b-2 border-neutral-700 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-0.5">
            {scenario ? `Screening — ${scenario.name}` : 'Screening Output'}
          </div>
          <div className="text-xs font-bold uppercase">Extraction · Consistency · Fraud Assessment</div>
        </div>
        {isStreaming && (
          <span className="text-[9px] font-mono text-primary animate-pulse">Analyzing…</span>
        )}
        {!isStreaming && fraud && (
          <span className={`text-[9px] font-mono px-2 py-1 border uppercase font-bold ${outcomeStyle[fraud.recommendation] ?? 'border-neutral-600 text-neutral-400'}`}>
            {outcomeLabel[fraud.recommendation] ?? fraud.recommendation}
          </span>
        )}
      </div>

      <div className="overflow-y-auto max-h-[520px] p-4">
        {streamText ? (
          <div className="text-[11px] font-mono text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {streamText}
            {isStreaming && <span className="inline-block w-2 h-3 bg-primary ml-1 animate-pulse" />}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <span className="text-[9px] font-mono text-primary animate-pulse">Initializing screening…</span>
          </div>
        )}
      </div>

      {/* Fraud score bar */}
      {scenario && !isStreaming && (
        <div className="border-t-2 border-neutral-700 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-500 uppercase">Fraud Signal Score</span>
            <span className={`text-sm font-bold tabular-nums ${
              scenario.fraudScore >= scenario.fraudThreshold ? 'text-error' :
              scenario.fraudScore >= 30 ? 'text-warning' : 'text-success'
            }`}>{scenario.fraudScore}/100</span>
          </div>
          <div className="relative w-full h-2 bg-neutral-800">
            <div
              className={`h-full transition-all duration-700 ${
                scenario.fraudScore >= scenario.fraudThreshold ? 'bg-error' :
                scenario.fraudScore >= 30 ? 'bg-warning' : 'bg-success'
              }`}
              style={{ width: `${scenario.fraudScore}%` }}
            />
            {/* Threshold marker */}
            <div
              className="absolute top-0 h-full w-0.5 bg-neutral-500"
              style={{ left: `${scenario.fraudThreshold}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[8px] font-mono text-neutral-700">
            <span>Clean</span>
            <span>Escalation threshold ({scenario.fraudThreshold})</span>
            <span>High fraud</span>
          </div>
        </div>
      )}
    </div>
  );
}
