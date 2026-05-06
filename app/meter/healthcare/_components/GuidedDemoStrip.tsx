'use client';

import { useState, useCallback } from 'react';
import { useMeterStore } from '../_store/useMeterStore';
import { DEMO_PACKET_CONTENT } from '../_demo/packets/prior-auth-demo';

type DemoPhase =
  | 'idle'
  | 'loading_packet'
  | 'extracting'
  | 'executing'
  | 'done';

const PHASE_LABELS: Record<DemoPhase, string> = {
  idle:           'Run Full Demo →',
  loading_packet: 'Loading packet…',
  extracting:     'Gemini extracting…',
  executing:      'Billing in real time…',
  done:           '✓ Demo Complete',
};

export function GuidedDemoStrip() {
  const {
    setPacket, setWorkOrder, setSession, sessionState,
    safeMode, reset,
  } = useMeterStore();

  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const isRunning = phase !== 'idle' && phase !== 'done';
  const isDone = phase === 'done';
  const isIdle = sessionState === 'idle';

  const runDemo = useCallback(async () => {
    if (!isIdle) { reset(); return; }

    setError(null);
    setPhase('loading_packet');

    const budgetCap = 0.50;
    const content = DEMO_PACKET_CONTENT;

    // ── Step 1: Set packet ──────────────────────────────────────────────────
    setPacket(
      {
        id: crypto.randomUUID(),
        tenantId: 'demo',
        assetType: 'text',
        sourceLabel: 'guided-demo',
        deidentified: true,
        packetType: 'prior_auth_packet',
        previewText: content.slice(0, 300),
        createdAt: new Date().toISOString(),
      },
      content,
    );

    await delay(400);
    setPhase('extracting');

    if (safeMode) {
      // Safe mode: inject work order + session directly
      const sessionId = `safe_${crypto.randomUUID().slice(0, 8)}`;
      const workOrderId = `wo_safe_${crypto.randomUUID().slice(0, 8)}`;

      setWorkOrder(
        {
          id: workOrderId,
          tenantId: 'demo',
          sessionId,
          requestId: `req_${crypto.randomUUID().slice(0, 8)}`,
          workflowType: 'prior_auth_review',
          packetFormat: 'text',
          packetSummary: content.slice(0, 800),
          policySummary: 'Standard utilization management criteria for outpatient diagnostic services.',
          budgetCapUsd: budgetCap,
          approvalRequired: true,
          deidentified: true,
          reviewMode: 'safe',
          executionMode: 'safe',
          toolTrace: ['parsePriorAuthDocument', 'createReviewSession', 'addLedgerEstimate'],
          status: 'session_open',
          geminiModel: 'gemini-3.1-flash',
          healthcareExtract: {
            requestId: `req_${crypto.randomUUID().slice(0, 8)}`,
            payerName: 'Demo Payer Organization',
            memberIdMasked: '***-**-7842',
            providerName: 'Demo Medical Group',
            procedureRequested: 'Outpatient Advanced Diagnostic Imaging',
            diagnosisSummary: 'Outpatient diagnostic imaging, standard prior auth category',
            urgencyLevel: 'routine',
            caseType: 'prior_auth',
            extractedConfidence: 0.94,
            attachmentCount: 4,
            requiresSpecialistReview: false,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        false,
      );
      setSession(sessionId, budgetCap);
      setPhase('done');
      return;
    }

    // ── Live mode: call APIs ────────────────────────────────────────────────
    try {
      const woRes = await fetch('/api/meter/work-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packetContent: content, budgetHintUsd: budgetCap, packetFormat: 'text' }),
      });
      const woData = await woRes.json() as {
        workOrder?: Parameters<typeof setWorkOrder>[0];
        degraded?: boolean;
        error?: string;
      };
      if (!woRes.ok || !woData.workOrder) throw new Error(woData.error ?? 'extraction failed');
      setWorkOrder(woData.workOrder, woData.degraded ?? false);

      const sessRes = await fetch('/api/meter/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetCapUsd: woData.workOrder.budgetCapUsd, workOrderId: woData.workOrder.id }),
      });
      const sessData = await sessRes.json() as { sessionId?: string; budgetCapUsd?: number; error?: string };
      if (!sessRes.ok) throw new Error(sessData.error ?? 'session failed');
      setSession(sessData.sessionId ?? 'demo', sessData.budgetCapUsd ?? budgetCap);

      setPhase('executing');
      // ReviewSummaryPane will auto-execute once state = work_order_ready
      // Poll for done state
      await pollForDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'demo failed');
      setPhase('idle');
    }
  }, [isIdle, safeMode, setPacket, setWorkOrder, setSession, reset]);

  async function pollForDone() {
    // Give the user 90s max before marking done
    for (let i = 0; i < 90; i++) {
      await delay(1000);
      const state = useMeterStore.getState().sessionState;
      if (state === 'review_complete' || state === 'approved' || state === 'held') {
        setPhase('done');
        return;
      }
    }
    setPhase('done');
  }

  if (isDone) {
    return (
      <div className="border-2 border-success bg-neutral-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-success uppercase tracking-widest">
            ✓ Full Demo Complete
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            Scroll down to see Arc Proof + Governed Outcome
          </span>
        </div>
        <button
          className="btn btn-secondary text-[10px]"
          onClick={() => { reset(); setPhase('idle'); }}
        >
          Reset → Run Again
        </button>
      </div>
    );
  }

  return (
    <div className="border-2 border-neutral-700 bg-neutral-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono font-bold text-neutral-300 uppercase tracking-widest">
          One-Click Demo
        </span>
        <span className="text-[10px] font-mono text-neutral-600">
          {safeMode ? 'Safe mode · Gemini bypassed' : 'Live mode · Real Gemini + Arc settlement'}
        </span>
        {error && (
          <span className="text-[10px] font-mono text-error">{error}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Progress indicators */}
        {isRunning && (
          <div className="flex items-center gap-2 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
            <Step label="Packet" done={phase !== 'loading_packet'} active={phase === 'loading_packet'} />
            <span className="text-neutral-800">→</span>
            <Step label="Extract" done={phase === 'executing'} active={phase === 'extracting'} />
            <span className="text-neutral-800">→</span>
            <Step label="Billing" done={false} active={phase === 'executing'} />
          </div>
        )}

        <button
          className={`btn text-xs ${isIdle ? 'btn-primary' : 'btn-secondary'}`}
          onClick={runDemo}
          disabled={isRunning}
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-primary animate-pulse" />
              {PHASE_LABELS[phase]}
            </span>
          ) : (
            PHASE_LABELS[phase]
          )}
        </button>
      </div>
    </div>
  );
}

function Step({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <span className={done ? 'text-success' : active ? 'text-warning animate-pulse' : 'text-neutral-700'}>
      {done ? '✓' : active ? '⬤' : '○'} {label}
    </span>
  );
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
