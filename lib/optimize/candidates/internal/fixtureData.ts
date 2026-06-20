import type {
  AllowlistEntry,
  EconomicEvent,
  GeneratorInput,
  OutcomeRecord,
  ShadowDecisionRecord,
  WindowBounds,
} from '../types';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000DEM';

function mkEvent(id: number, workflow: string, cost: number, model = 'gpt-mini'): EconomicEvent {
  return {
    id: `demo_ev_${id}`,
    tenant_id: DEMO_TENANT,
    workflow_id: workflow,
    model_id: model,
    provider_id: 'openai',
    cost_usd: cost,
    created_at: '2026-06-05T00:00:00.000Z',
  };
}

function mkOutcome(id: number, eventId: string, workflow: string, status: OutcomeRecord['status']): OutcomeRecord {
  return {
    id: `demo_oc_${id}`,
    tenant_id: DEMO_TENANT,
    workflow_id: workflow,
    event_id: eventId,
    status,
    created_at: '2026-06-05T00:00:00.000Z',
  };
}

function mkShadow(id: number, eventId: string, workflow: string): ShadowDecisionRecord {
  return {
    id: `demo_sh_${id}`,
    tenant_id: DEMO_TENANT,
    workflow_id: workflow,
    event_id: eventId,
    would_have_denied: true,
    provider_called: true,
    created_at: '2026-06-05T00:00:00.000Z',
  };
}

function mkAllow(model: string, addedAt: string): AllowlistEntry {
  return { tenant_id: DEMO_TENANT, model_id: model, added_at: addedAt };
}

function workflowBatch(workflow: string, count: number, costEach: number, acceptedCount: number, idOffset: number): { events: EconomicEvent[]; outcomes: OutcomeRecord[] } {
  const events = Array.from({ length: count }, (_, i) => mkEvent(idOffset + i, workflow, costEach));
  const outcomes = events.slice(0, acceptedCount).map((e, i) => mkOutcome(idOffset + i, e.id, workflow, 'accepted'));
  return { events, outcomes };
}

export function buildDemoFixture(): GeneratorInput {
  const window: WindowBounds = {
    start: '2026-06-01T00:00:00.000Z',
    end: '2026-06-15T00:00:00.000Z',
    days: 14,
  };

  const lowCov = Array.from({ length: 500 }, (_, i) => mkEvent(i, 'workflow-summarizer', 0.012));
  const lowCovOutcomes = lowCov.slice(0, 100).map((e, i) => mkOutcome(i, e.id, 'workflow-summarizer', 'accepted'));
  const lowCovShadows = lowCov.map((e, i) => mkShadow(i, e.id, 'workflow-summarizer'));

  const peerA = workflowBatch('workflow-extract', 600, 0.01, 500, 10_000);
  const peerB = workflowBatch('workflow-classify', 600, 0.01, 500, 11_000);
  const peerC = workflowBatch('workflow-route', 600, 0.01, 500, 12_000);
  const expensive = workflowBatch('workflow-deep-research', 600, 0.05, 500, 20_000);

  const allowlist: AllowlistEntry[] = [
    mkAllow('gpt-mini', '2025-01-01T00:00:00.000Z'),
    mkAllow('legacy-instruct-7b', '2025-01-01T00:00:00.000Z'),
  ];

  return {
    window,
    events: [...lowCov, ...peerA.events, ...peerB.events, ...peerC.events, ...expensive.events],
    outcomes: [...lowCovOutcomes, ...peerA.outcomes, ...peerB.outcomes, ...peerC.outcomes, ...expensive.outcomes],
    shadow_decisions: lowCovShadows,
    allowlist,
  };
}

export const DEMO_FIXTURE_TENANT_ID = DEMO_TENANT;
