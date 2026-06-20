import type { EvidenceSnapshot, WindowBounds } from '../types';

export function nowIso(): string {
  return new Date().toISOString();
}

export function candidateId(type: string, ...parts: string[]): string {
  const stamp = Date.now().toString(36);
  const slug = parts.filter(Boolean).join(':');
  const rand = Math.random().toString(36).slice(2, 8);
  return `cand_${type}_${slug}_${stamp}${rand}`;
}

export function idRange(ids: string[]): { min: string | null; max: string | null; count: number } {
  if (ids.length === 0) return { min: null, max: null, count: 0 };
  const sorted = [...ids].sort();
  return { min: sorted[0] ?? null, max: sorted[sorted.length - 1] ?? null, count: ids.length };
}

export function buildEvidenceSnapshot(args: {
  events: { min: string | null; max: string | null; count: number };
  outcomes: { min: string | null; max: string | null; count: number };
  shadow: { min: string | null; max: string | null; count: number };
  window: WindowBounds;
}): EvidenceSnapshot {
  return {
    event_id_range: args.events,
    outcome_id_range: args.outcomes,
    shadow_decision_id_range: args.shadow,
    window: { start: args.window.start, end: args.window.end, days: args.window.days },
  };
}

export function sliceShareOfTenant(sliceSpend: number, tenantSpend: number): number {
  if (tenantSpend <= 0) return 0;
  return sliceSpend / tenantSpend;
}
