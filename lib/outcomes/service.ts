import { OutcomeValidationError, validateContext, validateOutcome, type ValidatedContext, type ValidatedOutcome } from './validation';
import type { OutcomeRecord } from './types';

export interface Queryable {
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
}

const SQL_LOOKUP_EVENT = `
    SELECT id::text AS id
    FROM ai_economic_events
    WHERE tenant_id = $1 AND request_id = $2
    LIMIT 1
` as const;

const SQL_UPSERT_OUTCOME = `
    INSERT INTO request_outcomes (
        tenant_id, request_id, status, quality_score, source, metadata,
        outcome_type, reported_by, occurred_at
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
    ON CONFLICT (tenant_id, request_id) DO UPDATE
        SET status         = EXCLUDED.status,
            quality_score  = EXCLUDED.quality_score,
            source         = EXCLUDED.source,
            metadata       = EXCLUDED.metadata,
            outcome_type   = EXCLUDED.outcome_type,
            reported_by    = EXCLUDED.reported_by,
            occurred_at    = EXCLUDED.occurred_at,
            updated_at     = NOW()
    RETURNING
        id::text          AS id,
        tenant_id::text   AS tenant_id,
        request_id,
        status            AS outcome_status,
        quality_score,
        source,
        metadata,
        outcome_type,
        reported_by,
        occurred_at,
        created_at,
        updated_at
` as const;

export interface RecordOutcomeResult {
    outcome: OutcomeRecord;
    economic_event_id: string | null;
    orphan: boolean;
}

export interface RecordOutcomeOptions {
    db: Queryable;
    allowOrphan?: boolean;
    allowUnknownMetadataKeys?: boolean;
    allowFreeformSource?: boolean;
    nowFn?: () => string;
}

function isoOrPassthrough(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    return String(value ?? '');
}

function buildRecord(
    row: Record<string, unknown>,
    validated: ValidatedOutcome,
    context: ValidatedContext,
    occurredAtFallback: string,
): OutcomeRecord {
    const rowOutcomeType = typeof row.outcome_type === 'string' && row.outcome_type.length > 0
        ? (row.outcome_type as OutcomeRecord['outcome_type'])
        : validated.outcome_type;
    const rowReportedBy = typeof row.reported_by === 'string' && row.reported_by.length > 0
        ? row.reported_by
        : context.reported_by;
    const rowOccurredAt = row.occurred_at == null ? occurredAtFallback : isoOrPassthrough(row.occurred_at);
    return {
        id: String(row.id),
        tenant_id: String(row.tenant_id),
        request_id: String(row.request_id),
        outcome_type: rowOutcomeType,
        outcome_status: validated.outcome_status,
        quality_score: row.quality_score == null ? null : Number(row.quality_score),
        source: validated.source,
        metadata: (row.metadata as Record<string, unknown> | null) ?? {},
        reported_by: rowReportedBy,
        occurred_at: rowOccurredAt,
        created_at: isoOrPassthrough(row.created_at),
        updated_at: isoOrPassthrough(row.updated_at),
    };
}

export async function recordOutcome(
    input: unknown,
    contextInput: { tenant_id: unknown; reported_by: unknown },
    options: RecordOutcomeOptions,
): Promise<RecordOutcomeResult> {
    const context = validateContext(contextInput);
    const validated = validateOutcome(input, {
        allowUnknownMetadataKeys: options.allowUnknownMetadataKeys,
        allowFreeformSource: options.allowFreeformSource,
    });
    const allowOrphan = options.allowOrphan ?? false;
    const occurredAt = validated.occurred_at ?? (options.nowFn ? options.nowFn() : new Date().toISOString());

    const eventLookup = await options.db.query(SQL_LOOKUP_EVENT, [context.tenant_id, validated.request_id]);
    const economicEventId = eventLookup.rows[0] ? String(eventLookup.rows[0].id) : null;
    const orphan = economicEventId === null;
    if (orphan && !allowOrphan) {
        throw new OutcomeValidationError(
            'EVENT_LINKAGE_REQUIRED',
            'no ai_economic_events row matches (tenant_id, request_id)',
            'request_id',
        );
    }

    const params = [
        context.tenant_id,
        validated.request_id,
        validated.outcome_status,
        validated.quality_score,
        validated.source,
        JSON.stringify(validated.metadata),
        validated.outcome_type,
        context.reported_by,
        validated.occurred_at ?? occurredAt,
    ];
    const result = await options.db.query(SQL_UPSERT_OUTCOME, params);
    const row = result.rows[0];
    if (!row) {
        throw new OutcomeValidationError('UPSERT_FAILED', 'request_outcomes upsert returned no row');
    }

    return {
        outcome: buildRecord(row, validated, context, occurredAt),
        economic_event_id: economicEventId,
        orphan,
    };
}

export const OUTCOME_SQL = { SQL_LOOKUP_EVENT, SQL_UPSERT_OUTCOME } as const;
