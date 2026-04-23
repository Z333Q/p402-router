'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PacketAsset,
  WorkOrder,
  LedgerEvent,
  TrustSummary,
  ReleaseState,
  ApprovalRecord,
  ArcProofRecord,
  FrequencyStats,
  SpecialistJob,
  EconomicAudit,
} from '@/lib/meter/types';

export type SessionState =
  | 'idle'
  | 'packet_submitted'
  | 'work_order_extracting'
  | 'work_order_ready'
  | 'session_opening'
  | 'streaming'
  | 'reconciling'
  | 'proof_ready'
  | 'review_complete'
  | 'approved'
  | 'held'
  | 'released';

// Authorization event kinds, all per-chunk billing events
const AUTHORIZATION_KINDS = new Set([
  'extraction_estimate',
  'review_estimate',
  'followup_estimate',
  'specialist_review_estimate',
]);

interface MeterState {
  // ── Session ──────────────────────────────────────────────────────────────
  sessionState: SessionState;
  sessionId: string | null;
  budgetCapUsd: number;
  budgetSpentUsd: number;

  // ── Packet ────────────────────────────────────────────────────────────────
  packet: PacketAsset | null;
  packetContent: string;

  // ── Work order ────────────────────────────────────────────────────────────
  workOrder: WorkOrder | null;
  workOrderDegraded: boolean;
  workOrderDegradedReason: string | null;

  // ── Review stream ─────────────────────────────────────────────────────────
  messages: string[];
  streamText: string;
  streamDone: boolean;

  // ── Ledger ────────────────────────────────────────────────────────────────
  ledgerEvents: LedgerEvent[];
  frequencyStats: FrequencyStats;

  // ── Specialist escrow ─────────────────────────────────────────────────────
  specialistJob: SpecialistJob | null;

  // ── Economic audit ────────────────────────────────────────────────────────
  economicAudit: EconomicAudit | null;

  // ── Proof ─────────────────────────────────────────────────────────────────
  proofRecord: ArcProofRecord | null;

  // ── Approval ──────────────────────────────────────────────────────────────
  approvalRecord: ApprovalRecord | null;

  // ── Trust ─────────────────────────────────────────────────────────────────
  trustSummary: TrustSummary | null;

  // ── Release ───────────────────────────────────────────────────────────────
  releaseState: ReleaseState;

  // ── UI ────────────────────────────────────────────────────────────────────
  proofDrawerOpen: boolean;
  releaseDrawerOpen: boolean;
  error: string | null;
  safeMode: boolean;
  lightMode: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────
  setSafeMode: (v: boolean) => void;
  setLightMode: (v: boolean) => void;
  setSessionState: (s: SessionState) => void;
  setSession: (id: string, budget: number) => void;
  setPacket: (p: PacketAsset, content: string) => void;
  setWorkOrder: (wo: WorkOrder, degraded: boolean, reason?: string) => void;
  appendStreamText: (delta: string) => void;
  appendLedgerEvent: (e: LedgerEvent) => void;
  setStreamDone: (totalCostUsd: number, totalTokens: number) => void;
  setApproval: (a: ApprovalRecord) => void;
  setProof: (p: ArcProofRecord) => void;
  setTrustSummary: (t: TrustSummary) => void;
  setReleaseState: (r: Partial<ReleaseState>) => void;
  setSpecialistJob: (j: SpecialistJob) => void;
  setEconomicAudit: (a: EconomicAudit) => void;
  setProofDrawerOpen: (open: boolean) => void;
  setReleaseDrawerOpen: (open: boolean) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

const initialFrequencyStats: FrequencyStats = {
  authorizations: 0,
  arcBatches: 0,
  avgCostPerAction: 0,
  totalCostUsd: 0,
  runningCostUsd: 0,
};

const initialReleaseState: ReleaseState = {
  enabled: false,
  status: 'disabled',
};

export const useMeterStore = create<MeterState>()(
  persist(
    (set) => ({
      sessionState: 'idle',
      sessionId: null,
      budgetCapUsd: 0.5,
      budgetSpentUsd: 0,

      packet: null,
      packetContent: '',

      workOrder: null,
      workOrderDegraded: false,
      workOrderDegradedReason: null,

      messages: [],
      streamText: '',
      streamDone: false,

      ledgerEvents: [],
      frequencyStats: initialFrequencyStats,

      specialistJob: null,
      economicAudit: null,
      proofRecord: null,
      approvalRecord: null,
      trustSummary: null,
      releaseState: initialReleaseState,

      proofDrawerOpen: false,
      releaseDrawerOpen: false,
      error: null,
      safeMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'safe',
      lightMode: false,

      // ── Actions ─────────────────────────────────────────────────────────────
      setSafeMode: (v) => set({ safeMode: v }),
      setLightMode: (v) => set({ lightMode: v }),
      setSessionState: (s) => set({ sessionState: s }),

      setSession: (id, budget) =>
        set({ sessionId: id, budgetCapUsd: budget, sessionState: 'session_opening' }),

      setPacket: (p, content) =>
        set({ packet: p, packetContent: content, sessionState: 'packet_submitted' }),

      setWorkOrder: (wo, degraded, reason) =>
        set({
          workOrder: wo,
          workOrderDegraded: degraded,
          workOrderDegradedReason: reason ?? null,
          sessionState: 'work_order_ready',
          budgetCapUsd: wo.budgetCapUsd,
        }),

      appendStreamText: (delta) =>
        set((s) => ({ streamText: s.streamText + delta, sessionState: 'streaming' })),

      appendLedgerEvent: (e) =>
        set((s) => {
          const events = [...s.ledgerEvents, e];
          const totalCostUsd = events.reduce((acc, ev) => acc + ev.costUsd, 0);

          // Authorizations = all per-chunk billing events (extraction + review variants)
          const authorizations = events.filter((ev) => AUTHORIZATION_KINDS.has(ev.eventKind)).length;

          // Arc batches = reconciliation events + escrow_release events
          const arcBatches = events.filter(
            (ev) => ev.eventKind === 'reconciliation' || ev.eventKind === 'escrow_release' || ev.arcBatchId != null
          ).length;

          const avgCostPerAction = authorizations > 0 ? totalCostUsd / authorizations : 0;

          return {
            ledgerEvents: events,
            frequencyStats: {
              authorizations,
              arcBatches,
              avgCostPerAction,
              totalCostUsd,
              runningCostUsd: totalCostUsd,
            },
            budgetSpentUsd: totalCostUsd,
          };
        }),

      setStreamDone: (totalCostUsd, totalTokens) =>
        set((s) => ({
          streamDone: true,
          sessionState: 'review_complete',
          frequencyStats: {
            ...s.frequencyStats,
            totalCostUsd,
            runningCostUsd: totalCostUsd,
          },
          budgetSpentUsd: totalCostUsd,
        })),

      setApproval: (a) =>
        set({ approvalRecord: a, sessionState: a.recommendation === 'approve_for_manual_review' ? 'approved' : 'held' }),

      setProof: (p) => set({ proofRecord: p }),
      setTrustSummary: (t) => set({ trustSummary: t }),
      setSpecialistJob: (j) => set({ specialistJob: j }),
      setEconomicAudit: (a) => set({ economicAudit: a }),

      setReleaseState: (r) =>
        set((s) => ({ releaseState: { ...s.releaseState, ...r } })),

      setProofDrawerOpen: (open) => set({ proofDrawerOpen: open }),
      setReleaseDrawerOpen: (open) => set({ releaseDrawerOpen: open }),
      setError: (msg) => set({ error: msg }),

      reset: () =>
        set({
          sessionState: 'idle',
          sessionId: null,
          budgetCapUsd: 0.5,
          budgetSpentUsd: 0,
          packet: null,
          packetContent: '',
          workOrder: null,
          workOrderDegraded: false,
          workOrderDegradedReason: null,
          messages: [],
          streamText: '',
          streamDone: false,
          ledgerEvents: [],
          frequencyStats: initialFrequencyStats,
          specialistJob: null,
          economicAudit: null,
          proofRecord: null,
          approvalRecord: null,
          releaseState: initialReleaseState,
          proofDrawerOpen: false,
          releaseDrawerOpen: false,
          error: null,
        }),
    }),
    { name: 'p402-meter-store' }
  )
);
