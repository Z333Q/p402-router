'use client';

// app/meter/healthcare/_store/useGovernance.ts
// Selector hook: persona → case, profile, derived receipts + hierarchy.

import { useMemo } from 'react';
import { useMeterStore } from './useMeterStore';
import {
  ALL_PROFILES,
  PERSONA_TO_LOB,
  SYNTHETIC_CASES_BY_PERSONA,
  DEFAULT_BUDGET_HIERARCHY,
} from '@/lib/meter/healthcare/mock-data';
import { deriveReceipts } from '@/lib/meter/healthcare/derive-receipts';

export function useGovernance() {
  const persona = useMeterStore((s) => s.persona);
  const ledgerEvents = useMeterStore((s) => s.ledgerEvents);
  const humanDecision = useMeterStore((s) => s.humanDecision);
  const setHumanDecision = useMeterStore((s) => s.setHumanDecision);
  const setPersona = useMeterStore((s) => s.setPersona);

  const lineOfBusiness = PERSONA_TO_LOB[persona];
  const profile = ALL_PROFILES[lineOfBusiness];
  const caseRecord = SYNTHETIC_CASES_BY_PERSONA[persona];

  const { receipts, hierarchy } = useMemo(
    () =>
      deriveReceipts(
        ledgerEvents,
        caseRecord.caseId,
        lineOfBusiness,
        DEFAULT_BUDGET_HIERARCHY,
      ),
    [ledgerEvents, caseRecord.caseId, lineOfBusiness],
  );

  return {
    persona,
    setPersona,
    lineOfBusiness,
    profile,
    case: caseRecord,
    receipts,
    hierarchy,
    humanDecision,
    setHumanDecision,
  };
}
