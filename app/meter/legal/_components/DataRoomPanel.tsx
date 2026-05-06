'use client';

import { CONTRACTS, MATTER, type ContractDoc } from '../_demo/contracts/matter-acme-beta';
import { useLegalStore } from '../_store/useLegalStore';

export function DataRoomPanel() {
  const { sessionState, selectedDocIds, docReviews, openMatter, setDocState } = useLegalStore();
  const isIdle = sessionState === 'idle';

  function handleOpenMatter() {
    const allIds = CONTRACTS.map((c) => c.id);
    // Generate a deterministic session ID for the demo
    const sessionId = `legal_${Date.now().toString(36)}`;
    openMatter(sessionId, allIds);
    // Initialize all docs as pending with their tier
    allIds.forEach((id) => setDocState(id, 'pending'));
  }

  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b-2 border-neutral-700 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-0.5">Data Room</div>
          <div className="text-xs font-bold uppercase tracking-tight">{MATTER.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-neutral-500">{MATTER.dealValue} · {MATTER.closingTarget}</span>
          {isIdle && (
            <button
              onClick={handleOpenMatter}
              className="btn btn-primary text-[10px] px-3 py-1"
            >
              Open Matter →
            </button>
          )}
        </div>
      </div>

      <div className="divide-y-2 divide-neutral-800">
        {CONTRACTS.map((doc) => {
          const review = docReviews[doc.id];
          const state = review?.state ?? 'pending';
          return <DocRow key={doc.id} doc={doc} state={state} isActive={selectedDocIds.includes(doc.id)} />;
        })}
      </div>

      <div className="border-t-2 border-neutral-700 px-4 py-2 flex items-center justify-between text-[10px] font-mono text-neutral-500">
        <span>{CONTRACTS.length} contracts · {CONTRACTS.filter(c => c.tier === 'pro').length} → Gemini Pro · {CONTRACTS.filter(c => c.tier === 'flash').length} → Gemini Flash</span>
        <span>Budget cap: ${MATTER.budgetCapUsd.toFixed(2)}</span>
      </div>
    </div>
  );
}

function DocRow({ doc, state, isActive }: { doc: ContractDoc; state: string; isActive: boolean }) {
  const { setActiveDoc, activeDocId } = useLegalStore();
  const isSelected = activeDocId === doc.id;

  const stateColor = {
    pending: 'text-neutral-600',
    classifying: 'text-warning',
    queued: 'text-neutral-500',
    reviewing: 'text-primary',
    done: 'text-success',
    escalated: 'text-error',
  }[state] ?? 'text-neutral-600';

  const stateDot = {
    pending: '○',
    classifying: '◐',
    queued: '◌',
    reviewing: '●',
    done: '✓',
    escalated: '!',
  }[state] ?? '○';

  const tierColor = doc.tier === 'pro' ? 'text-warning border-warning' : 'text-neutral-500 border-neutral-700';

  return (
    <button
      onClick={() => setActiveDoc(isSelected ? null : doc.id)}
      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${isSelected ? 'bg-neutral-800' : 'hover:bg-neutral-850'} ${!isActive ? 'opacity-40' : ''}`}
    >
      <div className="flex-shrink-0 flex items-center gap-2 w-[120px]">
        <span className="text-[9px] font-mono text-neutral-600 tabular-nums w-10">{doc.id.replace('doc-', '#')}</span>
        <span className={`text-[9px] font-mono font-bold ${stateColor}`}>{stateDot}</span>
        <span className={`text-[8px] font-mono px-1.5 py-0.5 border uppercase ${tierColor}`}>
          {doc.tier === 'pro' ? 'Pro' : 'Flash'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold text-neutral-200 truncate">{doc.type}</div>
            <div className="text-[9px] font-mono text-neutral-600 truncate">{doc.parties}</div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[9px] font-mono text-neutral-600">{doc.pages}pp</span>
            <span className="text-[8px] font-mono text-neutral-700">≈${doc.estimatedCostUsd.toFixed(6)}</span>
          </div>
        </div>
        {isSelected && (
          <div className="mt-1.5 text-[9px] font-mono text-neutral-500 leading-relaxed">
            <span className="text-neutral-600 uppercase text-[8px]">Routing rationale: </span>
            {doc.tierRationale}
          </div>
        )}
      </div>
    </button>
  );
}
