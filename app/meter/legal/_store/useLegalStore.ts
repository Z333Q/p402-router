'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContractDoc } from '../_demo/contracts/matter-acme-beta';

export type MatterSessionState =
  | 'idle'
  | 'matter_open'
  | 'classifying'
  | 'routing'
  | 'reviewing'
  | 'cross_checking'
  | 'matter_complete'
  | 'audit_done';

export type DocReviewState =
  | 'pending'
  | 'classifying'
  | 'queued'
  | 'reviewing'
  | 'done'
  | 'escalated';

export interface DocReview {
  docId: string;
  state: DocReviewState;
  reviewText: string;
  conflictFlags: string[];
  costUsd: number;
  tokensUsed: number;
  modelUsed: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MatterLedgerEntry {
  id: string;
  docId: string;
  docType: string;
  tier: 'flash' | 'pro';
  tokensUsed: number;
  costUsd: number;
  txHash?: string;
  provisional: boolean;
  createdAt: string;
}

export interface ConflictFlag {
  docIdA: string;
  docIdB: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  clause: string;
}

export interface MatterAudit {
  sessionId: string;
  totalCostUsd: number;
  docCount: number;
  proDocCount: number;
  flashDocCount: number;
  avgCostPerDocUsd: number;
  conflictCount: number;
  routingEfficiencyPct: number;
  comparisonParalegalUsd: number;
  savingsVsParalegalUsd: number;
  recommendation: string;
  createdAt: string;
}

export interface MatterProof {
  sessionId: string;
  totalAmountUsd: number;
  totalAmountUsdcE6: number;
  txHashes: string[];
  explorerLinks: string[];
  docCount: number;
  status: 'pending' | 'partial' | 'verified' | 'safe_mode';
  createdAt: string;
}

interface LegalState {
  // ── Session ────────────────────────────────────────────────────────────────
  sessionState: MatterSessionState;
  sessionId: string | null;
  budgetCapUsd: number;
  budgetSpentUsd: number;

  // ── Document selection ─────────────────────────────────────────────────────
  selectedDocIds: string[];

  // ── Per-document reviews ───────────────────────────────────────────────────
  docReviews: Record<string, DocReview>;
  activeDocId: string | null;

  // ── Matter ledger ──────────────────────────────────────────────────────────
  ledgerEntries: MatterLedgerEntry[];

  // ── Cross-document conflicts ───────────────────────────────────────────────
  conflicts: ConflictFlag[];

  // ── Proof + audit ──────────────────────────────────────────────────────────
  matterProof: MatterProof | null;
  matterAudit: MatterAudit | null;

  // ── UI ─────────────────────────────────────────────────────────────────────
  error: string | null;
  safeMode: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  setSessionState: (s: MatterSessionState) => void;
  openMatter: (sessionId: string, docIds: string[]) => void;
  setDocState: (docId: string, state: DocReviewState) => void;
  setActiveDoc: (docId: string | null) => void;
  appendDocReviewText: (docId: string, delta: string) => void;
  completeDocReview: (docId: string, costUsd: number, tokensUsed: number, model: string) => void;
  addLedgerEntry: (entry: MatterLedgerEntry) => void;
  setConflicts: (conflicts: ConflictFlag[]) => void;
  setMatterProof: (proof: MatterProof) => void;
  setMatterAudit: (audit: MatterAudit) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

const initDocReview = (doc: ContractDoc): DocReview => ({
  docId: doc.id,
  state: 'pending',
  reviewText: '',
  conflictFlags: [],
  costUsd: 0,
  tokensUsed: 0,
  modelUsed: doc.tier === 'pro' ? 'gemini-2.0-pro' : 'gemini-2.0-flash',
});

export const useLegalStore = create<LegalState>()(
  persist(
    (set) => ({
      sessionState: 'idle',
      sessionId: null,
      budgetCapUsd: 0.12,
      budgetSpentUsd: 0,

      selectedDocIds: [],
      docReviews: {},
      activeDocId: null,
      ledgerEntries: [],
      conflicts: [],
      matterProof: null,
      matterAudit: null,
      error: null,
      safeMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'safe',

      setSessionState: (s) => set({ sessionState: s }),

      openMatter: (sessionId, docIds) =>
        set((state) => {
          const docReviews: Record<string, DocReview> = { ...state.docReviews };
          // Import at call-site to avoid circular deps — caller passes full ContractDoc list
          // Here we just init from docIds; caller fills in the rest
          docIds.forEach((id) => {
            if (!docReviews[id]) {
              docReviews[id] = {
                docId: id,
                state: 'pending',
                reviewText: '',
                conflictFlags: [],
                costUsd: 0,
                tokensUsed: 0,
                modelUsed: '',
              };
            }
          });
          return {
            sessionId,
            selectedDocIds: docIds,
            docReviews,
            sessionState: 'matter_open',
          };
        }),

      setDocState: (docId, state) =>
        set((s) => ({
          docReviews: {
            ...s.docReviews,
            [docId]: { ...s.docReviews[docId]!, state },
          },
        })),

      setActiveDoc: (docId) => set({ activeDocId: docId }),

      appendDocReviewText: (docId, delta) =>
        set((s) => ({
          docReviews: {
            ...s.docReviews,
            [docId]: {
              ...s.docReviews[docId]!,
              reviewText: (s.docReviews[docId]?.reviewText ?? '') + delta,
              state: 'reviewing',
            },
          },
          sessionState: 'reviewing',
        })),

      completeDocReview: (docId, costUsd, tokensUsed, model) =>
        set((s) => {
          const spent = s.budgetSpentUsd + costUsd;
          return {
            docReviews: {
              ...s.docReviews,
              [docId]: {
                ...s.docReviews[docId]!,
                state: 'done',
                costUsd,
                tokensUsed,
                modelUsed: model,
                completedAt: new Date().toISOString(),
              },
            },
            budgetSpentUsd: spent,
          };
        }),

      addLedgerEntry: (entry) =>
        set((s) => ({
          ledgerEntries: [...s.ledgerEntries, entry],
          budgetSpentUsd: s.budgetSpentUsd + entry.costUsd,
        })),

      setConflicts: (conflicts) =>
        set({ conflicts, sessionState: conflicts.length > 0 ? 'cross_checking' : 'matter_complete' }),

      setMatterProof: (proof) => set({ matterProof: proof }),

      setMatterAudit: (audit) => set({ matterAudit: audit, sessionState: 'audit_done' }),

      setError: (msg) => set({ error: msg }),

      reset: () =>
        set({
          sessionState: 'idle',
          sessionId: null,
          budgetCapUsd: 0.12,
          budgetSpentUsd: 0,
          selectedDocIds: [],
          docReviews: {},
          activeDocId: null,
          ledgerEntries: [],
          conflicts: [],
          matterProof: null,
          matterAudit: null,
          error: null,
        }),
    }),
    { name: 'p402-legal-store' }
  )
);
