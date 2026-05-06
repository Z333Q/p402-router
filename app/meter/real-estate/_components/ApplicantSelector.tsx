'use client';

import { SCENARIOS, PROPERTY } from '../_demo/applicants/scenarios';
import { useRealEstateStore } from '../_store/useRealEstateStore';

const OUTCOME_STYLE: Record<string, string> = {
  approved:    'border-success text-success',
  conditional: 'border-warning text-warning',
  declined:    'border-error text-error',
  escalated:   'border-error text-error',
};

const OUTCOME_LABEL: Record<string, string> = {
  approved:    'Approved',
  conditional: 'Conditional',
  declined:    'Declined',
  escalated:   'Escalated',
};

export function ApplicantSelector() {
  const { activeScenarioId, screeningState, setActiveScenario } = useRealEstateStore();
  const isRunning = screeningState !== 'idle' && screeningState !== 'complete';

  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b-2 border-neutral-700 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-0.5">Applicant Scenarios</div>
          <div className="text-xs font-bold uppercase">{PROPERTY.address}</div>
        </div>
        <span className="text-[10px] font-mono text-neutral-500">${PROPERTY.monthlyRent.toLocaleString()}/mo · {PROPERTY.incomeRequirement}</span>
      </div>

      <div className="divide-y-2 divide-neutral-800">
        {SCENARIOS.map((scenario) => {
          const isActive = activeScenarioId === scenario.id;
          const isKnown = screeningState !== 'idle';

          return (
            <button
              key={scenario.id}
              onClick={() => !isRunning && setActiveScenario(scenario.id)}
              disabled={isRunning}
              className={`w-full text-left px-4 py-3 flex items-start gap-4 transition-colors
                ${isActive ? 'bg-neutral-800' : 'hover:bg-neutral-850'}
                ${isRunning && !isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {/* Fraud score indicator */}
              <div className="flex flex-col items-center gap-1 shrink-0 w-14">
                <div className={`text-xl font-bold tabular-nums ${
                  scenario.fraudScore >= scenario.fraudThreshold ? 'text-error' :
                  scenario.fraudScore >= 30 ? 'text-warning' : 'text-success'
                }`}>
                  {scenario.fraudScore}
                </div>
                <div className="text-[7px] font-mono text-neutral-600 uppercase">Fraud Score</div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold text-neutral-100">{scenario.name}</span>
                  {isKnown && (
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 border uppercase ${OUTCOME_STYLE[scenario.scenario] ?? 'border-neutral-700 text-neutral-500'}`}>
                      {OUTCOME_LABEL[scenario.scenario] ?? scenario.scenario}
                    </span>
                  )}
                </div>
                <div className="text-[9px] font-mono text-neutral-400 leading-relaxed mb-1">
                  {scenario.summary}
                </div>
                {isActive && scenario.inconsistencies.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    {scenario.inconsistencies.map((inc, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-error text-[8px] shrink-0 mt-0.5">⚠</span>
                        <span className="text-[9px] font-mono text-neutral-500 leading-relaxed">{inc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] font-bold tabular-nums text-primary">${scenario.estimatedTotalCostUsd.toFixed(6)}</span>
                <span className="text-[7px] font-mono text-neutral-700 uppercase">Est. cost</span>
                <span className="text-[9px] font-mono text-neutral-600">{scenario.documents.length} docs</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-neutral-800 px-4 py-2 text-[9px] font-mono text-neutral-600">
        Three scenarios: clean approval, income mismatch, likely fraud. All documents are synthetic.
      </div>
    </div>
  );
}
