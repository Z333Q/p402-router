'use client';

import { useCallback } from 'react';
import { CONTRACTS } from '../_demo/contracts/matter-acme-beta';
import { useLegalStore } from '../_store/useLegalStore';
import type { SseFrame } from '@/lib/meter/types';

export function ReviewPanel() {
  const {
    sessionState, sessionId, activeDocId, docReviews, safeMode,
    setDocState, appendDocReviewText, completeDocReview, addLedgerEntry,
    setActiveDoc, setConflicts, setError, setSessionState,
  } = useLegalStore();

  const activeDoc = activeDocId ? CONTRACTS.find((c) => c.id === activeDocId) : null;
  const review = activeDocId ? docReviews[activeDocId] : null;

  const handleRunReview = useCallback(async () => {
    if (!activeDoc || !sessionId) return;

    setDocState(activeDoc.id, 'reviewing');

    try {
      const res = await fetch('/api/meter/legal/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: activeDoc.id,
          docType: activeDoc.type,
          tier: activeDoc.tier,
          content: activeDoc.content,
          sessionId,
          matterContext: 'Acme Corp acquires Beta Technologies for $42M. Key diligence concerns: IP ownership of ML models, customer change-of-control consents, founder non-compete enforceability under California law.',
          safeMode,
        }),
      });

      if (!res.ok || !res.body) {
        setError(`Review API returned ${res.status}`);
        setDocState(activeDoc.id, 'pending');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalCost = 0;
      let finalTokens = 0;
      let model = activeDoc.tier === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

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
              appendDocReviewText(activeDoc.id, frame.delta);
            } else if (frame.type === 'ledger_event') {
              addLedgerEntry({
                id: frame.event.id,
                docId: activeDoc.id,
                docType: activeDoc.type,
                tier: activeDoc.tier,
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
          } catch {
            // malformed frame — skip
          }
        }
      }

      completeDocReview(activeDoc.id, finalCost, finalTokens, model);

      // After each doc review, check if all selected docs are done
      const allDone = CONTRACTS.every((c) => {
        const r = useLegalStore.getState().docReviews[c.id];
        return r?.state === 'done' || r?.state === 'escalated';
      });

      if (allDone) {
        // Run cross-document conflict detection
        setSessionState('cross_checking');
        runCrossDocCheck();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
      setDocState(activeDoc.id, 'pending');
    }
  }, [activeDoc, sessionId, safeMode, setDocState, appendDocReviewText, completeDocReview, addLedgerEntry, setError, setSessionState, setConflicts]);

  function runCrossDocCheck() {
    // Synthetic cross-document conflicts based on what the Gemini reviews would find
    setTimeout(() => {
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
          clause: 'Lease Assignment requires landlord consent within 30 days of closing; Acquisition Agreement §4.2 does not make lease assignment a closing condition — creates post-close risk.',
        },
        {
          docIdA: 'doc-007',
          docIdB: 'doc-007',
          description: 'Earnout revenue definition vs. financial statement GAAP basis',
          severity: 'medium',
          clause: 'Acquisition Agreement §6.2 "Beta Division Revenue" definition not cross-referenced to GAAP treatment in §3.4 financial representations.',
        },
        {
          docIdA: 'doc-004',
          docIdB: 'doc-008',
          description: 'CTO retention agreement non-compete vs. founder non-compete scope',
          severity: 'low',
          clause: 'CTO agreement §6.1 restricts 4 states, 18 months; Founder agreement §2.1 is worldwide, 24 months — inconsistent treatment of similarly-situated employees.',
        },
      ]);
    }, 1500);
  }

  function handleRunAll() {
    const pendingDocs = CONTRACTS.filter((c) => {
      const r = docReviews[c.id];
      return !r || r.state === 'pending';
    });
    if (pendingDocs.length === 0) return;

    // Set first pending as active and kick off sequential reviews
    const first = pendingDocs[0];
    if (first) {
      setActiveDoc(first.id);
      // Reviews will be triggered by the user clicking "Run Review" for each,
      // or we can run them sequentially — for demo UX, activate the first
    }
  }

  const isDone = review?.state === 'done' || review?.state === 'escalated';
  const isReviewing = review?.state === 'reviewing';
  const canRun = activeDoc && sessionState !== 'idle' && review?.state === 'pending';

  return (
    <div className="border-2 border-neutral-700 flex flex-col min-h-[400px]">
      <div className="border-b-2 border-neutral-700 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-0.5">
            {activeDoc ? `Reviewing — ${activeDoc.type}` : 'Contract Review'}
          </div>
          {activeDoc && (
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-mono px-1.5 py-0.5 border uppercase ${activeDoc.tier === 'pro' ? 'border-warning text-warning' : 'border-neutral-600 text-neutral-500'}`}>
                {activeDoc.tier === 'pro' ? 'Gemini Pro' : 'Gemini Flash'}
              </span>
              <span className="text-[10px] font-mono text-neutral-500">{activeDoc.parties}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canRun && (
            <button onClick={handleRunReview} className="btn btn-primary text-[10px] px-3 py-1">
              Run Review →
            </button>
          )}
          {isReviewing && (
            <span className="text-[9px] font-mono text-primary animate-pulse">Reviewing…</span>
          )}
          {isDone && (
            <span className="text-[9px] font-mono text-success">✓ Done</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!activeDoc ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="text-neutral-700 text-4xl">⚖</div>
            <p className="text-xs font-mono text-neutral-600">
              {sessionState === 'idle'
                ? 'Open a matter to begin.'
                : 'Select a contract from the data room to review.'}
            </p>
          </div>
        ) : review?.reviewText ? (
          <div className="text-[11px] font-mono text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {review.reviewText}
            {isReviewing && (
              <span className="inline-block w-2 h-3 bg-primary ml-1 animate-pulse" />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="text-[9px] font-mono text-neutral-600 uppercase">
              {activeDoc.tier === 'pro' ? '● Gemini Pro' : '● Gemini Flash'}
            </div>
            <p className="text-xs font-mono text-neutral-500 max-w-xs">
              {activeDoc.type} · {activeDoc.pages} pages · complexity {activeDoc.complexityScore}/10
            </p>
            <p className="text-[10px] font-mono text-neutral-600 max-w-sm italic">
              {activeDoc.tierRationale}
            </p>
            {canRun && (
              <button onClick={handleRunReview} className="btn btn-primary text-xs mt-2">
                Run Review →
              </button>
            )}
          </div>
        )}
      </div>

      {review?.state === 'done' && (
        <div className="border-t border-neutral-800 px-4 py-2 flex items-center justify-between text-[9px] font-mono text-neutral-500">
          <span>{review.modelUsed} · {review.tokensUsed.toLocaleString()} tokens</span>
          <span className="text-success">${review.costUsd.toFixed(7)}</span>
        </div>
      )}
    </div>
  );
}
