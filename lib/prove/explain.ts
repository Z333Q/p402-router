/**
 * Slice 3H — Plain-language explanation generator.
 *
 * Pure. No DB, no I/O. Takes the economic-event row + derived attribution
 * status and returns a finance-readable narrative built ONLY from metadata
 * fields. Prompts, messages, and responses never enter this function.
 *
 * The output is a list of short sentences so the page can render them as
 * bullet points or join them with spaces — finance teams asked for
 * "explain this row to me" copy that does not require reading SQL.
 */

import type { EventDetailRow } from './event-detail';

export interface EventExplanation {
    /** Headline — what happened, one sentence. */
    headline: string;
    /** Supporting sentences, in display order. */
    details: string[];
    /** Notes that surface attribution or evidence gaps. */
    notes: string[];
}

function fmtUsd(n: number, digits = 4): string {
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}

function providerPhrase(row: EventDetailRow): string {
    const p = row.provider;
    const m = row.model_used;
    if (p && m) return `${p} using ${m}`;
    if (p)     return `${p}`;
    if (m)     return `${m}`;
    return 'the configured provider';
}

export function explainEvent(row: EventDetailRow): EventExplanation {
    const details: string[] = [];
    const notes: string[] = [];
    let headline: string;

    const denied = row.governance_decision === 'denied';
    const cost = Number(row.cost_usd ?? 0);

    if (denied) {
        const rule = row.metadata_deny_rule;
        const code = row.deny_code;
        // Headline mirrors the spec example.
        headline = code
            ? `${code}${rule ? `, rule ${rule}` : ''}. Request blocked before provider call. $0 provider cost.`
            : `Request denied before provider call. $0 provider cost.`;
        details.push('This request was denied before provider execution. No provider call was made.');
        if (rule) details.push(`The deny rule that fired was ${rule}.`);
        if (row.metadata_decision_source) {
            details.push(`Decision source: ${row.metadata_decision_source}.`);
        }
        details.push('Provider cost is $0 because the request never reached the model.');
    } else {
        // Approved / cached / settled / warned / approved-default
        const verdict = row.governance_decision ?? 'completed';
        headline = `This request was ${verdict} and completed through ${providerPhrase(row)}.`
            + (cost > 0 ? ` Total provider cost was ${fmtUsd(cost)}.` : '');
        if (row.input_tokens || row.output_tokens) {
            details.push(`Token usage: ${row.input_tokens} input, ${row.output_tokens} output, ${row.total_tokens} total.`);
        }
        if (row.success === false) {
            details.push('The downstream provider reported the request as not successful.');
        }
    }

    // Attribution notes
    const missingAttribution: string[] = [];
    if (!row.department_id) missingAttribution.push('department');
    if (!row.employee_id)   missingAttribution.push('employee');
    if (!row.workflow_id)   missingAttribution.push('workflow');
    if (!row.customer_id)   missingAttribution.push('customer');
    if (!row.feature_id)    missingAttribution.push('feature');
    if (!row.api_key_id)    missingAttribution.push('api_key');
    if (missingAttribution.length === 6) {
        notes.push('This event is fully unattributed. Finance cannot assign it to a budget owner until at least one of department, employee, workflow, customer, feature, or api_key is set.');
    } else if (missingAttribution.length > 0) {
        notes.push(`This event is missing ${missingAttribution.join(', ')} attribution; the rest of the chain is present.`);
    }

    // Evidence
    if (!row.evidence_bundle_id) {
        notes.push('This event has no evidence bundle attached.');
    }

    // Privacy posture
    if (row.prompt_stored === false) details.push('Prompt content was not stored.');
    if (row.response_stored === false) details.push('Response content was not stored.');
    if (row.redaction_applied === true) details.push('Redaction was applied before any content was stored.');

    return { headline, details, notes };
}
