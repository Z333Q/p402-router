// lib/meter/healthcare/__tests__/persona.test.ts
// Persona / line-of-business switching invariants.

import { describe, it, expect } from 'vitest';
import {
  ALL_PROFILES,
  PERSONA_TO_LOB,
  LOB_TO_PERSONA,
  SYNTHETIC_CASES_BY_PERSONA,
} from '../mock-data';

describe('persona ↔ line-of-business mapping', () => {
  it('round-trips: PERSONA_TO_LOB then LOB_TO_PERSONA is identity', () => {
    for (const p of Object.keys(PERSONA_TO_LOB) as (keyof typeof PERSONA_TO_LOB)[]) {
      expect(LOB_TO_PERSONA[PERSONA_TO_LOB[p]]).toBe(p);
    }
  });

  it('every persona has a synthetic case', () => {
    for (const p of Object.keys(SYNTHETIC_CASES_BY_PERSONA) as (keyof typeof SYNTHETIC_CASES_BY_PERSONA)[]) {
      expect(SYNTHETIC_CASES_BY_PERSONA[p]).toBeDefined();
      expect(SYNTHETIC_CASES_BY_PERSONA[p].caseId.startsWith('SYN-')).toBe(true);
      expect(SYNTHETIC_CASES_BY_PERSONA[p].memberId.startsWith('SYN-MEMBER-')).toBe(true);
    }
  });

  it('every line-of-business has a profile with synthetic source label', () => {
    for (const lob of Object.keys(ALL_PROFILES) as (keyof typeof ALL_PROFILES)[]) {
      const profile = ALL_PROFILES[lob];
      expect(profile.lineOfBusiness).toBe(lob);
      expect(profile.sourceVerified).toBe(false);
      expect(profile.sourceLabel.toLowerCase()).toContain('demo');
    }
  });

  it('Medicaid MCO scenario is behavioral health inpatient extension, expedited', () => {
    const caseRecord = SYNTHETIC_CASES_BY_PERSONA['medicaid-mco'];
    expect(caseRecord.requestType).toBe('Behavioral Health Inpatient Extension');
    expect(caseRecord.urgency).toBe('expedited');
    expect(caseRecord.lineOfBusiness).toBe('medicaid_mco');
  });

  it('D-SNP scenario is post-acute SNF extension', () => {
    const caseRecord = SYNTHETIC_CASES_BY_PERSONA['dual-eligible'];
    expect(caseRecord.requestType).toBe('Post-Acute SNF Extension');
    expect(caseRecord.lineOfBusiness).toBe('medicare_dsnp');
  });

  it('Marketplace scenario is outpatient imaging', () => {
    const caseRecord = SYNTHETIC_CASES_BY_PERSONA['marketplace'];
    expect(caseRecord.requestType).toBe('Outpatient Imaging Prior Authorization');
    expect(caseRecord.lineOfBusiness).toBe('marketplace');
  });

  it('no synthetic case contains real-looking identifiers', () => {
    // Names should be generic ("Synthetic …"); no member ID should look like an SSN/MRN.
    for (const caseRecord of Object.values(SYNTHETIC_CASES_BY_PERSONA)) {
      expect(caseRecord.syntheticProviderName.toLowerCase()).toContain('synthetic');
      expect(/^\d{3}-\d{2}-\d{4}$/.test(caseRecord.memberId)).toBe(false);
    }
  });
});
