'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ScreeningState =
  | 'idle'
  | 'extracting'
  | 'consistency_check'
  | 'fraud_scoring'
  | 'escalating'
  | 'complete';

export type DocExtractionState = 'pending' | 'extracting' | 'done' | 'error';

export interface ExtractedFields {
  applicantName?: string;
  claimedIncome?: number;
  verifiedIncome?: number;
  employer?: string;
  employmentStartDate?: string;
  bankBalance?: string;
  depositAmounts?: number[];
  idName?: string;
  idDob?: string;
  address?: string;
}

export interface DocExtraction {
  docId: string;
  state: DocExtractionState;
  fields: ExtractedFields;
  rawText: string;
  costUsd: number;
  tokensUsed: number;
}

export interface ScreeningLedgerEntry {
  id: string;
  docId: string;
  docLabel: string;
  model: 'flash' | 'pro';
  step: 'extraction' | 'consistency' | 'fraud' | 'escalation';
  tokensUsed: number;
  costUsd: number;
  provisional: boolean;
  txHash?: string;
  createdAt: string;
}

export interface ConsistencyResult {
  incomeMatch: boolean;
  nameParity: boolean;
  addressParity: boolean;
  depositMatch: boolean;
  inconsistencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
  narrativeSummary: string;
}

export interface FraudAssessment {
  score: number;         // 0–100
  threshold: number;
  escalated: boolean;
  signals: string[];
  recommendation: 'approved' | 'conditional' | 'declined' | 'escalated';
  narrativeSummary: string;
}

interface RealEstateState {
  screeningState: ScreeningState;
  activeScenarioId: string | null;
  sessionId: string | null;

  extractions: Record<string, DocExtraction>;
  ledgerEntries: ScreeningLedgerEntry[];
  consistency: ConsistencyResult | null;
  fraud: FraudAssessment | null;

  totalCostUsd: number;
  safeMode: boolean;
  error: string | null;

  setScreeningState: (s: ScreeningState) => void;
  setActiveScenario: (id: string | null) => void;
  startSession: (scenarioId: string) => void;
  setDocExtractionState: (docId: string, state: DocExtractionState) => void;
  completeDocExtraction: (docId: string, fields: ExtractedFields, rawText: string, costUsd: number, tokens: number) => void;
  addLedgerEntry: (e: ScreeningLedgerEntry) => void;
  setConsistency: (r: ConsistencyResult) => void;
  setFraud: (a: FraudAssessment) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useRealEstateStore = create<RealEstateState>()(
  persist(
    (set) => ({
      screeningState: 'idle',
      activeScenarioId: null,
      sessionId: null,
      extractions: {},
      ledgerEntries: [],
      consistency: null,
      fraud: null,
      totalCostUsd: 0,
      safeMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'safe',
      error: null,

      setScreeningState: (s) => set({ screeningState: s }),

      setActiveScenario: (id) => set({ activeScenarioId: id }),

      startSession: (scenarioId) =>
        set({
          activeScenarioId: scenarioId,
          sessionId: `re_${Date.now().toString(36)}`,
          screeningState: 'extracting',
          extractions: {},
          ledgerEntries: [],
          consistency: null,
          fraud: null,
          totalCostUsd: 0,
          error: null,
        }),

      setDocExtractionState: (docId, state) =>
        set((s) => ({
          extractions: {
            ...s.extractions,
            [docId]: {
              ...(s.extractions[docId] ?? { docId, fields: {}, rawText: '', costUsd: 0, tokensUsed: 0 }),
              state,
            },
          },
        })),

      completeDocExtraction: (docId, fields, rawText, costUsd, tokens) =>
        set((s) => ({
          extractions: {
            ...s.extractions,
            [docId]: { docId, state: 'done', fields, rawText, costUsd, tokensUsed: tokens },
          },
          totalCostUsd: s.totalCostUsd + costUsd,
        })),

      addLedgerEntry: (e) =>
        set((s) => ({
          ledgerEntries: [...s.ledgerEntries, e],
          totalCostUsd: s.totalCostUsd + (e.provisional ? 0 : e.costUsd),
        })),

      setConsistency: (r) =>
        set({ consistency: r, screeningState: 'fraud_scoring' }),

      setFraud: (a) =>
        set({
          fraud: a,
          screeningState: a.escalated ? 'escalating' : 'complete',
        }),

      setError: (msg) => set({ error: msg }),

      reset: () =>
        set({
          screeningState: 'idle',
          activeScenarioId: null,
          sessionId: null,
          extractions: {},
          ledgerEntries: [],
          consistency: null,
          fraud: null,
          totalCostUsd: 0,
          error: null,
        }),
    }),
    { name: 'p402-realestate-store' }
  )
);
