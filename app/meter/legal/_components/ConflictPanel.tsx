'use client';

import { useLegalStore } from '../_store/useLegalStore';
import { CONTRACTS } from '../_demo/contracts/matter-acme-beta';

const SEVERITY_STYLE = {
  high: 'border-error text-error',
  medium: 'border-warning text-warning',
  low: 'border-neutral-600 text-neutral-500',
};

const SEVERITY_LABEL = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

export function ConflictPanel() {
  const { conflicts, sessionState } = useLegalStore();

  if (sessionState === 'idle' || sessionState === 'matter_open') return null;
  if (sessionState !== 'cross_checking' && sessionState !== 'matter_complete' && sessionState !== 'audit_done') {
    return null;
  }

  const docName = (id: string) => CONTRACTS.find((c) => c.id === id)?.type ?? id;

  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b-2 border-neutral-700 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-0.5">Cross-Document Analysis</div>
          <div className="text-xs font-bold uppercase">Conflict Detection · {conflicts.length} issue{conflicts.length !== 1 ? 's' : ''} found</div>
        </div>
        {conflicts.length > 0 && (
          <span className="border border-error text-error text-[9px] font-mono px-2 py-0.5 uppercase">
            {conflicts.filter(c => c.severity === 'high').length} High · {conflicts.filter(c => c.severity === 'medium').length} Med
          </span>
        )}
      </div>

      {conflicts.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <div className="text-success text-2xl mb-2">✓</div>
          <p className="text-xs font-mono text-neutral-500">No cross-document conflicts detected.</p>
        </div>
      ) : (
        <div className="divide-y-2 divide-neutral-800">
          {conflicts.map((conflict, i) => (
            <div key={i} className="px-4 py-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 border uppercase ${SEVERITY_STYLE[conflict.severity]}`}>
                      {SEVERITY_LABEL[conflict.severity]}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-200">{conflict.description}</span>
                  </div>
                  <div className="text-[9px] font-mono text-neutral-500 mb-1">
                    {docName(conflict.docIdA)}
                    {conflict.docIdA !== conflict.docIdB && ` ↔ ${docName(conflict.docIdB)}`}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-400 leading-relaxed border-l-2 border-neutral-700 pl-2">
                    {conflict.clause}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-neutral-800 px-4 py-2">
        <p className="text-[9px] font-mono text-neutral-600">
          Cross-document conflict detection runs after all contracts in the data room have been reviewed.
          Conflicts are surfaced by Gemini Pro cross-referencing key clause definitions across documents.
        </p>
      </div>
    </div>
  );
}
