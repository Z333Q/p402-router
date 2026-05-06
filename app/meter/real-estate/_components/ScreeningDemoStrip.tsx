'use client';

import { useState, useCallback, useRef } from 'react';
import { SCENARIOS } from '../_demo/applicants/scenarios';
import { useRealEstateStore } from '../_store/useRealEstateStore';
import type { SseFrame } from '@/lib/meter/types';

interface Props {
  onStreamText: (text: string) => void;
  onStreamReset: () => void;
}

export function ScreeningDemoStrip({ onStreamText, onStreamReset }: Props) {
  const {
    screeningState, activeScenarioId, safeMode,
    startSession, setDocExtractionState, completeDocExtraction,
    addLedgerEntry, setFraud, setConsistency, setScreeningState, setError,
  } = useRealEstateStore();

  const [running, setRunning] = useState(false);
  const streamTextRef = useRef('');

  const isIdle = screeningState === 'idle';
  const isDone = screeningState === 'complete' || screeningState === 'escalating';

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId);

  const handleScreen = useCallback(async (scenarioId: string) => {
    const sc = SCENARIOS.find((s) => s.id === scenarioId);
    if (!sc || running) return;

    setRunning(true);
    onStreamReset();
    streamTextRef.current = '';

    const sessionId = `re_${Date.now().toString(36)}`;
    startSession(scenarioId);

    // Mark all docs as extracting
    sc.documents.forEach((d) => setDocExtractionState(d.id, 'extracting'));

    try {
      const res = await fetch('/api/meter/real-estate/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          sessionId,
          documents: sc.documents.map((d) => ({
            id: d.id,
            label: d.label,
            type: d.type,
            model: d.extractionModel,
            content: d.content,
          })),
          safeMode,
        }),
      });

      if (!res.ok || !res.body) {
        setError(`API returned ${res.status}`);
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              streamTextRef.current += frame.delta;
              onStreamText(streamTextRef.current);
            } else if (frame.type === 'ledger_event') {
              const ev = frame.event;
              // Map eventKind to step
              const step = ev.eventKind === 'extraction_estimate'
                ? 'extraction' as const
                : ev.eventKind === 'review_estimate'
                ? 'consistency' as const
                : ev.eventKind === 'reconciliation' && ev.workOrderId?.startsWith('consistency_')
                ? 'consistency' as const
                : 'extraction' as const;

              // Find doc label
              const doc = sc.documents.find((d) => d.id === ev.workOrderId);
              const docLabel = doc?.label ?? (ev.workOrderId?.startsWith('consistency_') ? 'Consistency Check' : ev.workOrderId ?? '');
              const model = doc?.extractionModel ?? 'pro';

              addLedgerEntry({
                id: ev.id,
                docId: ev.workOrderId ?? '',
                docLabel,
                model,
                step,
                tokensUsed: ev.tokensEstimate ?? 0,
                costUsd: ev.costUsd,
                provisional: ev.provisional,
                txHash: ev.settlementTxHash,
                createdAt: ev.createdAt,
              });

              if (!ev.provisional && doc) {
                completeDocExtraction(doc.id, {}, '', ev.costUsd, ev.tokensEstimate ?? 0);
                setDocExtractionState(doc.id, 'done');
              }
            } else if (frame.type === 'stream_done') {
              // Set fraud assessment from scenario data
              setFraud({
                score: sc.fraudScore,
                threshold: sc.fraudThreshold,
                escalated: sc.scenario === 'escalated',
                signals: sc.inconsistencies,
                recommendation: sc.scenario,
                narrativeSummary: sc.summary,
              });
              setConsistency({
                incomeMatch: sc.claimedMonthlyIncome === sc.verifiedMonthlyIncome,
                nameParity: sc.inconsistencies.filter(i => i.toLowerCase().includes('name')).length === 0,
                addressParity: true,
                depositMatch: sc.claimedMonthlyIncome === sc.verifiedMonthlyIncome,
                inconsistencies: sc.inconsistencies,
                riskLevel: sc.fraudScore >= sc.fraudThreshold ? 'high' : sc.fraudScore >= 30 ? 'medium' : 'low',
                narrativeSummary: sc.summary,
              });
              setScreeningState(sc.scenario === 'escalated' ? 'escalating' : 'complete');
            } else if (frame.type === 'error') {
              setError(frame.message);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screening failed');
    } finally {
      setRunning(false);
    }
  }, [running, safeMode, startSession, setDocExtractionState, completeDocExtraction, addLedgerEntry, setFraud, setConsistency, setScreeningState, setError, onStreamText, onStreamReset]);

  if (isDone && scenario) {
    const outcomeStyle: Record<string, string> = {
      approved:    'border-success',
      conditional: 'border-warning',
      declined:    'border-error',
      escalated:   'border-error',
    };

    return (
      <div className={`border-2 p-4 flex items-center justify-between ${outcomeStyle[scenario.scenario] ?? 'border-neutral-700'}`}>
        <div className="flex flex-col gap-1">
          <div className="text-xs font-bold uppercase">
            {scenario.name} — Screening Complete
          </div>
          <div className="text-[10px] font-mono text-neutral-400">
            {scenario.summary}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => useRealEstateStore.getState().reset()}
            className="btn btn-secondary text-xs"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-neutral-700 p-4 flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mb-1">One-Click Screening</div>
        <div className="text-sm font-bold text-neutral-50 mb-2">
          AI-powered tenant application screening · 4 documents · Extraction + Consistency + Fraud Assessment
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {SCENARIOS.map((sc) => {
            const isActive = activeScenarioId === sc.id && running;
            const outcomeColor = sc.fraudScore >= sc.fraudThreshold ? 'border-error' : sc.fraudScore >= 30 ? 'border-warning' : 'border-success';
            return (
              <button
                key={sc.id}
                onClick={() => handleScreen(sc.id)}
                disabled={running}
                className={`text-left border-2 px-3 py-2 flex flex-col gap-1 transition-colors
                  ${isActive ? 'border-primary' : outcomeColor}
                  ${running && !isActive ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-800'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-neutral-100">{sc.name}</span>
                  <span className={`text-[9px] font-bold tabular-nums ${sc.fraudScore >= sc.fraudThreshold ? 'text-error' : sc.fraudScore >= 30 ? 'text-warning' : 'text-success'}`}>
                    Score: {sc.fraudScore}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-neutral-500 capitalize">{sc.scenario.replace('_', ' ')}</div>
                <div className="text-[8px] font-mono text-neutral-600">${sc.estimatedTotalCostUsd.toFixed(6)}</div>
                {isActive && (
                  <div className="text-[8px] font-mono text-primary animate-pulse">Screening…</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
