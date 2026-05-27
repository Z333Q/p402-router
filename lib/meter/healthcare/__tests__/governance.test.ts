// lib/meter/healthcare/__tests__/governance.test.ts
// Unit tests for the Medicaid MCO PA governance layer.

import { describe, it, expect } from 'vitest';
import {
  aggregateSpend,
  budgetStatus,
  evaluateOperationAgainstBudget,
  buildOversightPacket,
  buildReceipt,
} from '../governance';
import {
  DEFAULT_BUDGET_HIERARCHY,
  SYNTHETIC_OPERATION_RECEIPTS,
  SYNTHETIC_BH_CASE,
  MEDICAID_MCO_PROFILE,
  SYNTHETIC_CRITERIA_MAPPING,
  SYNTHETIC_DRAFT_RFI_REASON,
} from '../mock-data';
import { deriveReceipts } from '../derive-receipts';
import type { LedgerEvent } from '@/lib/meter/types';

describe('budgetStatus', () => {
  it('returns allowed when well under cap', () => {
    expect(budgetStatus(0.01, 1)).toBe('allowed');
  });

  it('returns warning at >= 80% of cap', () => {
    expect(budgetStatus(0.8, 1)).toBe('warning');
    expect(budgetStatus(0.9, 1)).toBe('warning');
  });

  it('returns blocked at or above cap', () => {
    expect(budgetStatus(1, 1)).toBe('blocked');
    expect(budgetStatus(1.5, 1)).toBe('blocked');
  });

  it('treats zero cap as allowed', () => {
    expect(budgetStatus(0, 0)).toBe('allowed');
  });
});

describe('aggregateSpend', () => {
  it('sums all allowed receipts into the case bucket', () => {
    const agg = aggregateSpend(SYNTHETIC_OPERATION_RECEIPTS);
    const expected = 0.0024 + 0.0031 + 0.0046 + 0.0012;
    expect(agg.currentSpendUsd.case).toBeCloseTo(expected, 6);
  });

  it('aggregates per-agent spend', () => {
    const agg = aggregateSpend(SYNTHETIC_OPERATION_RECEIPTS);
    expect(agg.currentSpendUsd.agents['documentation-extraction-agent']).toBeCloseTo(0.0024, 6);
    expect(agg.currentSpendUsd.agents['reviewer-summary-agent']).toBeCloseTo(0.0046, 6);
  });

  it('client, line-of-business, and workflow spend equal case spend when starting from zero', () => {
    const agg = aggregateSpend(SYNTHETIC_OPERATION_RECEIPTS);
    expect(agg.currentSpendUsd.client).toBeCloseTo(agg.currentSpendUsd.case, 6);
    expect(agg.currentSpendUsd.lineOfBusiness).toBeCloseTo(agg.currentSpendUsd.case, 6);
    expect(agg.currentSpendUsd.workflow).toBeCloseTo(agg.currentSpendUsd.case, 6);
  });

  it('skips receipts with policyStatus=denied', () => {
    const mixed = [
      ...SYNTHETIC_OPERATION_RECEIPTS,
      {
        ...SYNTHETIC_OPERATION_RECEIPTS[0]!,
        receiptId: 'rcpt_SYN_DENY',
        costUsd: 999,
        policyStatus: 'denied' as const,
      },
    ];
    const agg = aggregateSpend(mixed);
    // case spend must not include the denied 999
    expect(agg.currentSpendUsd.case).toBeLessThan(1);
  });

  it('returns empty agents map when there are no receipts', () => {
    const agg = aggregateSpend([]);
    expect(agg.currentSpendUsd.case).toBe(0);
    expect(agg.currentSpendUsd.agents).toEqual({});
  });
});

describe('evaluateOperationAgainstBudget', () => {
  it('allows an operation that fits both case cap and agent cap', () => {
    const r = evaluateOperationAgainstBudget(
      DEFAULT_BUDGET_HIERARCHY,
      'documentation-extraction-agent',
      0.001,
    );
    expect(r.policyStatus).toBe('allowed');
    expect(r.mandateStatus).toBe('within_budget');
  });

  it('denies when case spend would exceed case cap', () => {
    const hierarchy = {
      ...DEFAULT_BUDGET_HIERARCHY,
      currentSpendUsd: {
        ...DEFAULT_BUDGET_HIERARCHY.currentSpendUsd,
        case: 0.149,
      },
    };
    const r = evaluateOperationAgainstBudget(hierarchy, 'documentation-extraction-agent', 0.01);
    expect(r.policyStatus).toBe('denied');
    expect(r.mandateStatus).toBe('budget_exceeded');
  });

  it('denies when agent spend would exceed agent cap', () => {
    const hierarchy = {
      ...DEFAULT_BUDGET_HIERARCHY,
      currentSpendUsd: {
        ...DEFAULT_BUDGET_HIERARCHY.currentSpendUsd,
        agents: { 'documentation-extraction-agent': 0.029 },
      },
    };
    const r = evaluateOperationAgainstBudget(hierarchy, 'documentation-extraction-agent', 0.01);
    expect(r.policyStatus).toBe('denied');
    expect(r.mandateStatus).toBe('budget_exceeded');
  });
});

describe('buildReceipt', () => {
  it('creates a receipt with stamped tenant and synthetic identifiers', () => {
    const r = buildReceipt({
      agent: 'documentation-extraction-agent',
      model: 'gemini-flash',
      costUsd: 0.001,
      inputTokens: 100,
      outputTokens: 50,
      caseId: SYNTHETIC_BH_CASE.caseId,
      lineOfBusiness: 'medicaid_mco',
      tenantId: 'tenant_government_program_payer',
      hierarchy: DEFAULT_BUDGET_HIERARCHY,
    });
    expect(r.receiptId.startsWith('rcpt_SYN_')).toBe(true);
    expect(r.evidenceHash.startsWith('ev_SYN_')).toBe(true);
    expect(r.workflow).toBe('prior_authorization_review');
    expect(r.humanReviewRequired).toBe(true);
    expect(r.policyStatus).toBe('allowed');
  });

  it('passes through Tempo settlement metadata when provided', () => {
    const r = buildReceipt({
      agent: 'documentation-extraction-agent',
      model: 'gemini-flash',
      costUsd: 0.001,
      inputTokens: 100,
      outputTokens: 50,
      caseId: SYNTHETIC_BH_CASE.caseId,
      lineOfBusiness: 'medicaid_mco',
      tenantId: 'tenant_government_program_payer',
      hierarchy: DEFAULT_BUDGET_HIERARCHY,
      settlementTxHash: '0xabc123',
      settlementChainId: 4217,
    });
    expect(r.settlementTxHash).toBe('0xabc123');
    expect(r.settlementChainId).toBe(4217);
  });
});

describe('deriveReceipts from LedgerEvent stream', () => {
  function mockEvent(
    id: string,
    kind: LedgerEvent['eventKind'],
    costUsd: number,
    extras: Partial<LedgerEvent> = {},
  ): LedgerEvent {
    return {
      id,
      sessionId: 'sess-1',
      eventKind: kind,
      costUsd,
      costUsdcE6: Math.round(costUsd * 1_000_000),
      provisional: false,
      createdAt: '2026-05-27T10:15:00Z',
      ...extras,
    };
  }

  it('maps billing events to receipts and attaches session-level tx hash', () => {
    const events: LedgerEvent[] = [
      mockEvent('e1', 'extraction_estimate', 0.0024, { tokensEstimate: 2500 }),
      mockEvent('e2', 'review_estimate', 0.0046, { tokensEstimate: 3700 }),
      mockEvent('e3', 'reconciliation', 0, {
        settlementTxHash: '0xtempo123',
        settlementChainId: 4217,
      }),
    ];
    const { receipts, hierarchy } = deriveReceipts(
      events,
      SYNTHETIC_BH_CASE.caseId,
      'medicaid_mco',
    );
    expect(receipts).toHaveLength(2);
    expect(receipts.every((r) => r.settlementTxHash === '0xtempo123')).toBe(true);
    expect(receipts.every((r) => r.settlementChainId === 4217)).toBe(true);
    expect(hierarchy.currentSpendUsd.case).toBeCloseTo(0.007, 6);
  });

  it('produces deterministic receipt IDs from event IDs', () => {
    const events: LedgerEvent[] = [mockEvent('stable-event-id', 'extraction_estimate', 0.001)];
    const a = deriveReceipts(events, 'SYN-CASE-X', 'medicaid_mco').receipts;
    const b = deriveReceipts(events, 'SYN-CASE-X', 'medicaid_mco').receipts;
    expect(a[0]!.receiptId).toBe(b[0]!.receiptId);
  });

  it('ignores non-billing events (reconciliation, routing_fee, cache_access)', () => {
    const events: LedgerEvent[] = [
      mockEvent('e1', 'routing_fee', 0.0001),
      mockEvent('e2', 'cache_access', 0),
      mockEvent('e3', 'extraction_estimate', 0.002),
    ];
    const { receipts } = deriveReceipts(events, SYNTHETIC_BH_CASE.caseId, 'medicaid_mco');
    expect(receipts).toHaveLength(1);
    expect(receipts[0]!.agent).toBe('documentation-extraction-agent');
  });
});

describe('buildOversightPacket', () => {
  const baseInput = {
    case: SYNTHETIC_BH_CASE,
    profile: MEDICAID_MCO_PROFILE,
    receipts: SYNTHETIC_OPERATION_RECEIPTS,
    hierarchy: aggregateSpend(SYNTHETIC_OPERATION_RECEIPTS),
    criteria: SYNTHETIC_CRITERIA_MAPPING,
    draftReason: SYNTHETIC_DRAFT_RFI_REASON,
    humanDecision: 'request_more_information' as const,
    aiReviewStartedAt: '2026-05-27T09:02:00Z',
    evidenceHash: 'ev_SYN_PACKET_test',
    exportedAt: '2026-05-27T09:05:00Z',
  };

  it('produces a synthetic packet with synthetic identifiers and PHI-free trace', () => {
    const p = buildOversightPacket(baseInput);
    expect(p.packetType).toBe('synthetic_prior_authorization_oversight_packet');
    expect(p.caseId.startsWith('SYN-')).toBe(true);
    expect(p.complianceTrace.realPhiProcessed).toBe(false);
    expect(p.complianceTrace.syntheticDataOnly).toBe(true);
    expect(p.complianceTrace.humanReviewBoundaryPreserved).toBe(true);
    expect(p.humanReviewRequired).toBe(true);
  });

  it('formats expedited decision clock as "72 hours"', () => {
    const p = buildOversightPacket(baseInput);
    expect(p.decisionClock).toBe('72 hours');
  });

  it('formats standard decision clock as "seven calendar days"', () => {
    const p = buildOversightPacket({
      ...baseInput,
      case: { ...baseInput.case, urgency: 'standard' },
    });
    expect(p.decisionClock).toBe('seven calendar days');
  });

  it('marks specificReasonGenerated false when draftReason is empty', () => {
    const p = buildOversightPacket({ ...baseInput, draftReason: '' });
    expect(p.complianceTrace.specificReasonGenerated).toBe(false);
  });

  it('captures the human decision and full receipt list', () => {
    const p = buildOversightPacket(baseInput);
    expect(p.humanDecision).toBe('request_more_information');
    expect(p.aiOperations).toHaveLength(SYNTHETIC_OPERATION_RECEIPTS.length);
  });
});
