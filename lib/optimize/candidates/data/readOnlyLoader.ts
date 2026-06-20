import type {
  AllowlistEntry,
  EconomicEvent,
  GeneratorInput,
  OutcomeRecord,
  ShadowDecisionRecord,
  WindowBounds,
} from '../types';

export interface ReadOnlyQueryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export interface LoadOptions {
  tenantId: string;
  windowStart: Date;
  windowEnd: Date;
}

const SQL_EVENTS = `
  SELECT
    id::text AS id,
    request_id,
    tenant_id::text AS tenant_id,
    COALESCE(workflow_id, 'unknown') AS workflow_id,
    COALESCE(model_used, 'unknown') AS model_id,
    COALESCE(provider, 'unknown') AS provider_id,
    cost_usd::float8 AS cost_usd,
    event_time
  FROM ai_economic_events
  WHERE tenant_id = $1
    AND event_time >= $2
    AND event_time < $3
` as const;

const SQL_OUTCOMES = `
  SELECT
    ro.id::text AS id,
    ro.tenant_id::text AS tenant_id,
    COALESCE(aee.workflow_id, 'unknown') AS workflow_id,
    aee.id::text AS event_id,
    ro.status,
    ro.created_at
  FROM request_outcomes ro
  JOIN ai_economic_events aee
    ON aee.tenant_id = ro.tenant_id
   AND aee.request_id = ro.request_id
  WHERE ro.tenant_id = $1
    AND ro.created_at >= $2
    AND ro.created_at < $3
` as const;

const SQL_SHADOW = `
  SELECT
    rcsd.id::text AS id,
    rcsd.tenant_id::text AS tenant_id,
    COALESCE(aee.workflow_id, 'unknown') AS workflow_id,
    aee.id::text AS event_id,
    rcsd.emitted_at
  FROM runtime_control_shadow_decisions rcsd
  LEFT JOIN ai_economic_events aee
    ON aee.tenant_id = rcsd.tenant_id
   AND aee.request_id = rcsd.request_id
  WHERE rcsd.tenant_id = $1
    AND rcsd.emitted_at >= $2
    AND rcsd.emitted_at < $3
` as const;

const SQL_ALLOWLIST = `
  SELECT
    tenant_id::text AS tenant_id,
    allowed_models,
    created_at,
    updated_at
  FROM tenant_control_settings
  WHERE tenant_id = $1
` as const;

function mapStatus(raw: unknown): OutcomeRecord['status'] {
  if (raw === 'accepted') return 'accepted';
  if (raw === 'rejected') return 'rejected';
  return 'unknown';
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  return new Date().toISOString();
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

export async function loadProductionInput(
  db: ReadOnlyQueryable,
  opts: LoadOptions,
): Promise<GeneratorInput> {
  const params = [opts.tenantId, opts.windowStart.toISOString(), opts.windowEnd.toISOString()];

  const [evRes, outRes, shRes, alRes] = await Promise.all([
    db.query(SQL_EVENTS, params),
    db.query(SQL_OUTCOMES, params),
    db.query(SQL_SHADOW, params),
    db.query(SQL_ALLOWLIST, [opts.tenantId]),
  ]);

  const events: EconomicEvent[] = evRes.rows.map((r) => ({
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    workflow_id: String(r.workflow_id),
    model_id: String(r.model_id),
    provider_id: String(r.provider_id),
    cost_usd: Number(r.cost_usd ?? 0),
    created_at: toIso(r.event_time),
  }));

  const outcomes: OutcomeRecord[] = outRes.rows
    .filter((r) => r.event_id)
    .map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      workflow_id: String(r.workflow_id),
      event_id: String(r.event_id),
      status: mapStatus(r.status),
      created_at: toIso(r.created_at),
    }));

  const shadow_decisions: ShadowDecisionRecord[] = shRes.rows
    .filter((r) => r.event_id)
    .map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      workflow_id: String(r.workflow_id),
      event_id: String(r.event_id),
      would_have_denied: true,
      provider_called: true,
      created_at: toIso(r.emitted_at),
    }));

  const allowlist: AllowlistEntry[] = [];
  for (const row of alRes.rows) {
    const addedAt = toIso(row.created_at);
    const models = Array.isArray(row.allowed_models) ? row.allowed_models : [];
    for (const m of models) {
      if (typeof m !== 'string' || m.length === 0) continue;
      allowlist.push({ tenant_id: String(row.tenant_id), model_id: m, added_at: addedAt });
    }
  }

  const window: WindowBounds = {
    start: opts.windowStart.toISOString(),
    end: opts.windowEnd.toISOString(),
    days: daysBetween(opts.windowStart, opts.windowEnd),
  };

  return { window, events, outcomes, shadow_decisions, allowlist };
}

export const READ_ONLY_QUERIES = {
  SQL_EVENTS,
  SQL_OUTCOMES,
  SQL_SHADOW,
  SQL_ALLOWLIST,
} as const;
