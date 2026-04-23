'use client';

import { useEffect, useRef, useState } from 'react';
import { useMeterStore } from '../_store/useMeterStore';
import type { SseFrame, LedgerEvent, ApprovalRecord } from '@/lib/meter/types';

export function ReviewSummaryPane() {
  const {
    workOrder,
    sessionId,
    streamText,
    streamDone,
    sessionState,
    safeMode,
    appendStreamText,
    appendLedgerEvent,
    setStreamDone,
    setApproval,
    setSessionState,
    setError,
  } = useMeterStore();

  const [executing, setExecuting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during stream
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamText]);

  const canExecute =
    sessionState === 'work_order_ready' ||
    sessionState === 'session_opening';

  async function executeReview() {
    if (!workOrder || !sessionId) return;
    setExecuting(true);
    setSessionState('streaming');

    try {
      const res = await fetch('/api/meter/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packetContent: workOrder.packetSummary ?? 'Prior authorization review packet',
          workOrderId: workOrder.id,
          sessionId,
          budgetCapUsd: workOrder.budgetCapUsd,
          policySummary: workOrder.policySummary,
          safeMode,
        }),
      });

      if (!res.ok || !res.body) throw new Error('stream failed to start');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const frame = JSON.parse(raw) as SseFrame & { approval?: ApprovalRecord; proofRefs?: string[] };

            if (frame.type === 'text_delta') {
              appendStreamText(frame.delta);
            } else if (frame.type === 'ledger_event') {
              appendLedgerEvent(frame.event as LedgerEvent);
            } else if (frame.type === 'stream_done') {
              setStreamDone(frame.totalCostUsd, frame.totalTokens);
              if (frame.approval) {
                setApproval({
                  sessionId: sessionId,
                  workOrderId: workOrder.id,
                  insideBudget: frame.approval.insideBudget ?? true,
                  policyCompliant: frame.approval.policyCompliant ?? true,
                  outputInScope: frame.approval.outputInScope ?? true,
                  recommendation: frame.approval.recommendation ?? 'approve_for_manual_review',
                  reasonSummary: frame.approval.reasonSummary ?? '',
                  createdAt: new Date().toISOString(),
                });
              }
            } else if (frame.type === 'error') {
              setError(frame.message);
            }
          } catch { /* malformed SSE line */ }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'execution failed');
      setSessionState('work_order_ready');
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="card p-0 flex flex-col h-full">
      {/* Header */}
      <div className="section-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary text-[10px]">03</span>
          <span className="text-sm font-bold tracking-wider uppercase">UM Review Summary</span>
        </div>
        <StreamStateBadge state={sessionState} done={streamDone} executing={executing} />
      </div>

      {/* Stream content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto p-4 min-h-[200px] max-h-[320px] bg-neutral-900"
      >
        {!streamText && !executing && (
          <div className="flex flex-col gap-2 pt-1">
            <p className="text-sm font-bold text-neutral-200">Start the review to see the payer-ops summary.</p>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Gemini will produce a utilization management summary with rationale, policy reference, and recommendation.
            </p>
          </div>
        )}
        {streamText && (
          <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
            {streamText}
          </p>
        )}
        {executing && !streamDone && <span className="inline-block w-2 h-3 bg-primary animate-pulse ml-1" />}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-neutral-700 flex items-center justify-between">
        <div className="text-xs text-neutral-400">
          {workOrder ? 'gemini-2.0-flash' : 'No work order'}
        </div>
        {canExecute && !streamDone && (
          <button
            className="btn btn-primary text-xs"
            onClick={executeReview}
            disabled={executing || !workOrder || !sessionId}
          >
            {executing ? 'Executing...' : 'Execute Review →'}
          </button>
        )}
        {streamDone && (
          <div className="text-[10px] font-mono text-success uppercase font-bold">
            ✓ Complete
          </div>
        )}
      </div>
    </div>
  );
}

function StreamStateBadge({
  state,
  done,
  executing,
}: {
  state: string;
  done: boolean;
  executing: boolean;
}) {
  if (done) return <span className="text-[10px] font-mono text-success uppercase">✓ Done</span>;
  if (executing) return <span className="text-[10px] font-mono text-warning uppercase animate-pulse">Streaming...</span>;
  if (state === 'work_order_ready' || state === 'session_opening')
    return <span className="text-[10px] font-mono text-info uppercase">Ready</span>;
  return <span className="text-[10px] font-mono text-neutral-400 uppercase">Waiting for work order</span>;
}
