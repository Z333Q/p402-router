import { randomUUID } from 'crypto'

// OTel-compatible Trace Structure
export type TraceStep = {
    t: string;
    name: string; // OTel 'event name'
    status: 'ok' | 'deny' | 'error';
    attributes?: Record<string, unknown> // OTel 'attributes'
}

export type DecisionTrace = {
    schemaVersion: '2.0.0'; // Bump version
    traceId: string;
    spanId: string;
    decisionId: string; // Business ID
    startedAt: string;
    endedAt?: string;
    events: TraceStep[]
}

export function startTrace(decisionId?: string): DecisionTrace {
    const traceId = randomUUID().replace(/-/g, '') // 32-char hex (mock)
    const spanId = randomUUID().replace(/-/g, '').substring(0, 16) // 16-char hex (mock)
    const now = new Date().toISOString()

    return {
        schemaVersion: '2.0.0',
        traceId,
        spanId,
        decisionId: decisionId ?? randomUUID(),
        startedAt: now,
        events: [{ t: now, name: 'trace.started', status: 'ok' }]
    }
}

export function addStep(trace: DecisionTrace, step: { kind: string, status: 'ok' | 'deny' | 'error', meta?: Record<string, unknown> }) {
    // Map legacy 'kind'/'meta' to OTel 'name'/'attributes'
    trace.events.push({
        t: new Date().toISOString(),
        name: step.kind,
        status: step.status,
        attributes: step.meta
    })
}

export function endTrace(trace: DecisionTrace) {
    trace.endedAt = new Date().toISOString()
    trace.events.push({ t: trace.endedAt, name: 'trace.ended', status: 'ok' })
}
