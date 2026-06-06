// Slice 3E — durable denied-event recorder.
//
// Awaited by the route. NEVER throws. Returns a discriminated outcome so
// the caller can log without raising.
//
//   'recorded' — ai_economic_events INSERT succeeded.
//   'deferred' — INSERT failed; writer captured an outbox row. Durable.
//   'failed'   — INSERT failed AND outbox capture failed. Last-resort.
//                Caller logs; the original denial response is unaffected.
//
// Payment-grade contract:
//   - The provider call must remain blocked regardless of outcome.
//   - The original ApiError must reach the client unchanged.
//   - We DO NOT fire-and-forget. The caller awaits this function so the
//     INSERT (or its outbox fallback) has a real chance to complete
//     before the response is sent and the process potentially exits.

import { writeEconomicEvent, EconomicEventDeferredError } from './writer';
import type { EconomicEventInput } from './types';

export type DeniedRecordOutcome = 'recorded' | 'deferred' | 'failed';

export interface DeniedRecordResult {
    outcome: DeniedRecordOutcome;
    /** request_id of the denied event, for log correlation. */
    requestId: string;
    /** Reason text when outcome === 'failed'. */
    reason?: string;
}

export async function recordDeniedEvent(
    tenantId: string,
    input: EconomicEventInput,
): Promise<DeniedRecordResult> {
    try {
        await writeEconomicEvent(tenantId, input);
        return { outcome: 'recorded', requestId: input.request_id };
    } catch (e) {
        if (e instanceof EconomicEventDeferredError) {
            // Writer caught its own INSERT failure and persisted the
            // outbox row. Durability intact.
            return { outcome: 'deferred', requestId: input.request_id };
        }
        // Last resort: both ai_economic_events AND the outbox are down.
        // Log here so the operator sees the incident — never re-throw.
        const reason = e instanceof Error ? `${e.name}:${e.message}` : String(e);
        // eslint-disable-next-line no-console
        console.error('[denied-event] fatal_denied_event_record_failure', {
            tenantId, requestId: input.request_id, denyCode: input.deny_code, reason,
        });
        return { outcome: 'failed', requestId: input.request_id, reason };
    }
}
