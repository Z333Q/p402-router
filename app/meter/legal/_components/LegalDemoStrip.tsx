'use client';

import { useCallback, useState } from 'react';
import { CONTRACTS, MATTER } from '../_demo/contracts/matter-acme-beta';
import { useLegalStore } from '../_store/useLegalStore';
import type { SseFrame } from '@/lib/meter/types';

export function LegalDemoStrip() {
  const {
    sessionState, sessionId, safeMode, docReviews,
    openMatter, setDocState, setActiveDoc, appendDocReviewText,
    completeDocReview, addLedgerEntry, setConflicts, setSessionState, setError,
  } = useLegalStore();

  const [running, setRunning] = useState(false);

  const isIdle = sessionState === 'idle';
  const isDone = sessionState === 'cross_checking' || sessionState === 'matter_complete' || sessionState === 'audit_done';
  const docsComplete = Object.values(docReviews).filter((r) => r?.state === 'done' || r?.state === 'escalated').length;

  const handleRunAll = useCallback(async () => {
    if (running) return;
    setRunning(true);

    const newSessionId = `legal_${Date.now().toString(36)}`;
    const allIds = CONTRACTS.map((c) => c.id);
    openMatter(newSessionId, allIds);
    allIds.forEach((id) => setDocState(id, 'pending'));
    setSessionState('classifying');

    // Review documents sequentially (Flash docs first, then Pro)
    const ordered = [...CONTRACTS].sort((a, b) => {
      if (a.tier === b.tier) return a.complexityScore - b.complexityScore;
      return a.tier === 'flash' ? -1 : 1;
    });

    for (const doc of ordered) {
      setActiveDoc(doc.id);
      setDocState(doc.id, 'reviewing');

      try {
        const res = await fetch('/api/meter/legal/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docId: doc.id,
            docType: doc.type,
            tier: doc.tier,
            content: doc.content,
            sessionId: newSessionId,
            matterContext: 'Acme Corp acquires Beta Technologies for $42M. Key concerns: ML model IP ownership, customer change-of-control consents, California non-compete enforceability.',
            safeMode,
          }),
        });

        if (!res.ok || !res.body) {
          setDocState(doc.id, 'pending');
          continue;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalCost = 0;
        let finalTokens = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const frame = JSON.parse(line.slice(6)) as SseFrame;
              if (frame.type === 'text_delta') {
                appendDocReviewText(doc.id, frame.delta);
              } else if (frame.type === 'ledger_event') {
                addLedgerEntry({
                  id: frame.event.id,
                  docId: doc.id,
                  docType: doc.type,
                  tier: doc.tier,
                  tokensUsed: frame.event.tokensEstimate ?? 0,
                  costUsd: frame.event.costUsd,
                  provisional: frame.event.provisional,
                  txHash: frame.event.settlementTxHash,
                  createdAt: frame.event.createdAt,
                });
                if (!frame.event.provisional) {
                  finalCost = frame.event.costUsd;
                }
              } else if (frame.type === 'stream_done') {
                finalCost = frame.totalCostUsd;
                finalTokens = frame.totalTokens;
              } else if (frame.type === 'error') {
                setError(frame.message);
              }
            } catch { /* skip malformed */ }
          }
        }

        const model = doc.tier === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
        completeDocReview(doc.id, finalCost, finalTokens, model);
      } catch (err) {
        setDocState(doc.id, 'pending');
        setError(err instanceof Error ? err.message : 'Review failed');
      }
    }

    // Cross-document conflict detection
    setSessionState('cross_checking');
    await new Promise((r) => setTimeout(r, 1200));

    setConflicts([
      {
        docIdA: 'doc-003',
        docIdB: 'doc-007',
        description: 'MSA change-of-control notification vs. Acquisition Agreement closing condition',
        severity: 'high',
        clause: 'MSA §8.1 requires customer consent for assignment; Acquisition Agreement §4.1(e) requires 80% ARR consent — scope of "consent" undefined.',
      },
      {
        docIdA: 'doc-006',
        docIdB: 'doc-007',
        description: 'Lease assignment landlord consent timing vs. closing timeline',
        severity: 'medium',
        clause: 'Lease Assignment requires landlord consent within 30 days of closing; Acquisition Agreement §4.2 does not make lease assignment a closing condition.',
      },
      {
        docIdA: 'doc-007',
        docIdB: 'doc-007',
        description: 'Earnout revenue definition vs. financial statement GAAP basis',
        severity: 'medium',
        clause: 'Acquisition Agreement §6.2 "Beta Division Revenue" not cross-referenced to GAAP treatment in §3.4 financial representations.',
      },
      {
        docIdA: 'doc-004',
        docIdB: 'doc-008',
        description: 'CTO retention non-compete vs. founder non-compete scope',
        severity: 'low',
        clause: 'CTO agreement restricts 4 states, 18 months; Founder agreement is worldwide, 24 months — inconsistent treatment of similarly-situated employees.',
      },
    ]);

    setRunning(false);
  }, [running, safeMode, openMatter, setDocState, setActiveDoc, setSessionState, appendDocReviewText, completeDocReview, addLedgerEntry, setConflicts, setError]);

  if (isDone) {
    return (
      <div className="border-2 border-success p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-success text-lg">✓</span>
          <div>
            <div className="text-xs font-bold text-neutral-50 uppercase">Matter review complete</div>
            <div className="text-[10px] font-mono text-neutral-400">
              {docsComplete} documents reviewed · Cross-document conflicts detected · Ready for attorney review
            </div>
          </div>
        </div>
        <button
          onClick={() => useLegalStore.getState().reset()}
          className="btn btn-secondary text-xs"
        >
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className="border-2 border-neutral-700 p-4 flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-1">One-Click Demo</div>
        <div className="text-sm font-bold text-neutral-50 mb-2">
          Review all {CONTRACTS.length} contracts in the Acme / Beta data room
        </div>
        <div className="flex flex-wrap gap-2 text-[9px] font-mono text-neutral-500">
          <span className="border border-neutral-700 px-2 py-0.5">{CONTRACTS.filter(c => c.tier === 'flash').length}× Gemini Flash (NDAs, LOI, leases)</span>
          <span className="border border-warning text-warning px-2 py-0.5">{CONTRACTS.filter(c => c.tier === 'pro').length}× Gemini Pro (MSA, employment, IP, merger agreement)</span>
          <span className="border border-neutral-700 px-2 py-0.5">Cross-document conflict detection</span>
          <span className="border border-neutral-700 px-2 py-0.5">Per-matter Tempo settlement</span>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2">
        {isIdle ? (
          <button onClick={handleRunAll} className="btn btn-primary text-sm px-6">
            Run Full Matter →
          </button>
        ) : running ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono text-primary animate-pulse">
              Reviewing {docsComplete}/{CONTRACTS.length}…
            </span>
            <div className="w-32 h-1 bg-neutral-800">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(docsComplete / CONTRACTS.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <button onClick={handleRunAll} className="btn btn-primary text-sm px-6">
            Run Full Matter →
          </button>
        )}
        <span className="text-[9px] font-mono text-neutral-600">
          Est. &lt;${(MATTER.budgetCapUsd).toFixed(2)} total
        </span>
      </div>
    </div>
  );
}
