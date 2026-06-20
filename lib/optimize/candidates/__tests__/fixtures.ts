import type {
  AllowlistEntry,
  EconomicEvent,
  GeneratorInput,
  OutcomeRecord,
  ShadowDecisionRecord,
  WindowBounds,
} from '../types';

export const DEFAULT_WINDOW: WindowBounds = {
  start: '2026-06-01T00:00:00.000Z',
  end: '2026-06-15T00:00:00.000Z',
  days: 14,
};

export interface BuildOpts {
  tenant?: string;
  workflow?: string;
  model?: string;
  provider?: string;
  cost?: number;
}

export function ev(id: number, opts: BuildOpts = {}): EconomicEvent {
  return {
    id: `ev_${id}`,
    tenant_id: opts.tenant ?? 't1',
    workflow_id: opts.workflow ?? 'wf1',
    model_id: opts.model ?? 'gpt-mini',
    provider_id: opts.provider ?? 'openai',
    cost_usd: opts.cost ?? 0.01,
    created_at: '2026-06-05T00:00:00.000Z',
  };
}

export function outcome(id: number, eventId: string, status: OutcomeRecord['status'], tenant = 't1', workflow = 'wf1'): OutcomeRecord {
  return {
    id: `oc_${id}`,
    tenant_id: tenant,
    workflow_id: workflow,
    event_id: eventId,
    status,
    created_at: '2026-06-05T00:00:00.000Z',
  };
}

export function shadow(id: number, eventId: string, tenant = 't1', workflow = 'wf1'): ShadowDecisionRecord {
  return {
    id: `sh_${id}`,
    tenant_id: tenant,
    workflow_id: workflow,
    event_id: eventId,
    would_have_denied: true,
    provider_called: true,
    created_at: '2026-06-05T00:00:00.000Z',
  };
}

export function allow(tenant: string, model: string, addedAt: string, removedAt?: string): AllowlistEntry {
  const entry: AllowlistEntry = { tenant_id: tenant, model_id: model, added_at: addedAt };
  if (removedAt !== undefined) entry.removed_at = removedAt;
  return entry;
}

export function emptyInput(): GeneratorInput {
  return { window: DEFAULT_WINDOW, events: [], outcomes: [], shadow_decisions: [], allowlist: [] };
}
