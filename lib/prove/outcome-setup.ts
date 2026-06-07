/**
 * Slice 3L — Outcome Capture Activation Kit (pure data).
 *
 * Everything served by GET /api/v2/outcomes/setup that is NOT a live DB
 * read. Splitting the static content here (a) keeps the route file tiny,
 * (b) lets tests assert that examples never contain content-bearing
 * fields, (c) gives the SDK / docs site a single source for the snippets,
 * and (d) avoids drift between the page and the API.
 *
 * Read-only by design: this slice never writes outcomes.
 */

import {
    CANONICAL_OUTCOME_SOURCES,
    CANONICAL_OUTCOME_STATUSES,
    FORBIDDEN_CONTENT_FIELDS,
    STORED_OUTCOME_STATUSES,
    type CanonicalOutcomeSource,
    type CanonicalOutcomeStatus,
    type StoredOutcomeStatus,
} from './outcome';

// ─────────────────────────────────────────────────────────────────────────
// Integration checklist
// ─────────────────────────────────────────────────────────────────────────

export interface ChecklistItem {
    id: string;
    title: string;
    description: string;
}

export const INTEGRATION_CHECKLIST: ChecklistItem[] = [
    {
        id: 'request-id-propagation',
        title: 'Identify request_id propagation',
        description:
            'Make sure the X-P402-Request-ID returned by /api/v2/chat/completions (or the request_id you set on /api/v2/meter/events) reaches the surface where the user accepts or rejects the AI output. Without a stable request_id, outcomes cannot be joined to economic events.',
    },
    {
        id: 'record-three-status-paths',
        title: 'Record accepted, rejected, and failed outcomes at minimum',
        description:
            'These three statuses cover the dominant decision flows. accepted unblocks cost-per-accepted-output. rejected and failed surface waste. Adding escalated and pending_review later is a one-line extension; the API already supports them.',
    },
    {
        id: 'choose-outcome-source',
        title: 'Choose an outcome source per call site',
        description:
            'Pick from user_feedback, application_callback, human_review, evaluator, sdk, or import. The source tells finance whether an outcome came from a person, an agent, or a backfill job. Non-canonical sources are preserved but tagged as legacy.',
    },
    {
        id: 'add-quality-score',
        title: 'Add quality_score (0..1) where you have one',
        description:
            'quality_score is optional and clamped to [0, 1]. Useful when you already run an evaluator. Leave it null if you do not — accepted/rejected alone is enough for the readiness gate.',
    },
    {
        id: 'metadata-content-free',
        title: 'Keep metadata content-free',
        description:
            'The /api/v2/outcomes writer rejects any payload that carries a content-bearing key at the body or metadata level. Store reasons, queue names, ticket IDs, action codes — never prompts, responses, or transcripts.',
    },
    {
        id: 'test-duplicate-writes',
        title: 'Test duplicate writes',
        description:
            'POST is idempotent on (tenant_id, request_id). Re-recording the same request_id UPSERTs the row and bumps updated_at; the same outcome row is never duplicated. Wire your application to re-send the latest outcome when state changes (e.g. pending_review -> accepted).',
    },
    {
        id: 'verify-event-detail',
        title: 'Verify the event detail page shows the outcome',
        description:
            'Open /dashboard/prove/event/<request_id> after recording. The Outcome card should render the V5 canonical status, legacy_status when applicable, source, and recorded_at. If the card stays empty, the request_id did not match an economic event row.',
    },
    {
        id: 'watch-coverage-dashboard',
        title: 'Watch the coverage dashboard',
        description:
            'Use /dashboard/prove/outcomes to watch outcome coverage climb across departments, workflows, customers, providers, and models. The readiness verdict transitions from blocked to not_ready to observing to ready_for_optimize_analysis as your instrumentation lands.',
    },
];

// ─────────────────────────────────────────────────────────────────────────
// Code examples
//
// All snippets:
//   - Use request_id, status, source, optional quality_score, and a small
//     content-FREE metadata bag.
//   - Are flagged with a `forbidden_examples` field that lists what NOT
//     to put in the body — tested below.
//   - Carry an `language` tag for syntax highlighting on the page.
// ─────────────────────────────────────────────────────────────────────────

export interface CodeExample {
    id: string;
    title: string;
    language: 'typescript' | 'bash' | 'javascript' | 'json';
    description: string;
    code: string;
}

export const SDK_EXAMPLE: CodeExample = {
    id: 'sdk-typescript',
    title: 'SDK — TypeScript',
    language: 'typescript',
    description:
        'Uses the existing @p402/sdk OutcomesClient.record contract. Idempotent on (tenant_id, request_id); a repeat call UPSERTs.',
    code: `import { P402 } from '@p402/sdk';

const client = new P402({
    routerUrl: process.env.P402_ROUTER_URL!,
    apiKey:    process.env.P402_API_KEY!,
});

// Persist the request_id alongside whatever you store about the response.
// When the user accepts (or your evaluator scores) the output, record:
await client.outcomes.record({
    request_id: 'req_abc123',          // from X-P402-Request-ID
    status:     'accepted',             // V5 canonical
    quality_score: 0.91,                // optional, 0..1
    source:     'sdk',
    metadata: {
        user_action:      'accepted',
        workflow_stage:   'approval',
        reviewed_by_type: 'human',
    },
});`,
};

export const REST_EXAMPLE: CodeExample = {
    id: 'rest-curl',
    title: 'REST — curl',
    language: 'bash',
    description:
        'Direct POST when you do not run the SDK. Tenant identity comes from your existing Authorization header or API key the rest of /api/v2 already uses.',
    code: `curl -X POST "$P402_ROUTER_URL/api/v2/outcomes" \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "request_id":    "req_abc123",
    "status":        "rejected",
    "source":        "user_feedback",
    "quality_score": 0.12,
    "metadata": {
      "user_action":       "rejected",
      "score_reason_code": "not_useful"
    }
  }'`,
};

export const CALLBACK_EXAMPLE: CodeExample = {
    id: 'application-callback',
    title: 'Application callback pattern',
    language: 'typescript',
    description:
        'Server-side pattern for product apps. The user accepts or rejects the AI output in the UI; the backend records the outcome by request_id. No content fields cross the wire.',
    code: `// app/api/feedback/route.ts (Express- or Next.js-shaped)
export async function POST(req: Request) {
    const { request_id, choice } = await req.json();
    // choice is your app's user-facing label, mapped to a V5 status.
    const status =
        choice === 'thumbs_up'   ? 'accepted'  :
        choice === 'thumbs_down' ? 'rejected'  :
        choice === 'flag'        ? 'escalated' :
                                   'unknown';

    await fetch(\`\${process.env.P402_ROUTER_URL}/api/v2/outcomes\`, {
        method: 'POST',
        headers: {
            'Authorization': \`Bearer \${process.env.P402_API_KEY}\`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({
            request_id,
            status,
            source: 'application_callback',
            metadata: { user_action: choice },
        }),
    });

    return Response.json({ ok: true });
}`,
};

export const HUMAN_REVIEW_EXAMPLE: CodeExample = {
    id: 'human-review',
    title: 'Human review pattern',
    language: 'typescript',
    description:
        'Multi-step lifecycle: the AI output enters a queue as pending_review, escalates if needed, and resolves as accepted or rejected. POST is idempotent — re-send the latest status on every state change.',
    code: `// Step 1 — enqueue for review
await client.outcomes.record({
    request_id, status: 'pending_review', source: 'human_review',
    metadata: {
        review_queue:        'finance_ops',
        human_review_status: 'pending',
    },
});

// Step 2 — escalate (optional)
await client.outcomes.record({
    request_id, status: 'escalated', source: 'human_review',
    metadata: {
        review_queue:        'finance_ops',
        human_review_status: 'escalated',
        reviewed_by_type:    'manager',
    },
});

// Step 3 — resolve
await client.outcomes.record({
    request_id, status: 'accepted', source: 'human_review',
    metadata: {
        review_queue:        'finance_ops',
        human_review_status: 'approved',
        reviewed_by_type:    'human',
    },
});`,
};

export const EXAMPLES: CodeExample[] = [
    SDK_EXAMPLE, REST_EXAMPLE, CALLBACK_EXAMPLE, HUMAN_REVIEW_EXAMPLE,
];

// ─────────────────────────────────────────────────────────────────────────
// Safe metadata guide
// ─────────────────────────────────────────────────────────────────────────

export interface MetadataExample {
    key: string;
    sample_value: string;
    note: string;
}

export const ALLOWED_METADATA_EXAMPLES: MetadataExample[] = [
    { key: 'user_action',       sample_value: 'accepted',     note: 'The label your UI surfaced to the user.' },
    { key: 'review_queue',      sample_value: 'finance_ops',  note: 'The internal queue or team that owns this outcome.' },
    { key: 'ticket_id',         sample_value: 'abc123',       note: 'Cross-link into your support / ops system.' },
    { key: 'score_reason_code', sample_value: 'useful',       note: 'A short, content-free reason code. Never the actual user comment.' },
    { key: 'workflow_stage',    sample_value: 'approval',     note: 'The lifecycle step the request was in when the outcome landed.' },
    { key: 'reviewed_by_type',  sample_value: 'human',        note: 'Who reviewed the output. Free-text but content-safe.' },
    { key: 'human_review_status', sample_value: 'approved',   note: 'Detailed sub-state when the outcome is part of a review flow.' },
];

/**
 * Allowed top-level body keys for /api/v2/outcomes.
 * Surfaced via the API so client codegen / SDK docs have one source.
 */
export const ALLOWED_OUTCOME_BODY_KEYS = [
    'request_id', 'status', 'quality_score', 'source', 'metadata',
] as const;

/**
 * Common rejection causes. Useful in the "test console" panel so
 * developers know what to expect when they call the writer incorrectly.
 */
export interface ValidationError {
    code: string;
    when: string;
    fix: string;
}

export const COMMON_VALIDATION_ERRORS: ValidationError[] = [
    {
        code: 'INVALID_INPUT',
        when: 'Body is not valid JSON, OR a content-bearing key is present at body or metadata level.',
        fix: 'Send valid JSON. Remove prompt / response / messages / completion / *_body / transcript / raw_trace / stored_content from both the body and metadata.',
    },
    {
        code: 'OUTCOME_REQUEST_ID_REQUIRED',
        when: 'request_id is missing or only whitespace.',
        fix: 'Pass the request_id the router returned via the X-P402-Request-ID response header (or the id you set on /api/v2/meter/events).',
    },
    {
        code: 'INVALID_OUTCOME_STATUS',
        when: 'status is missing or not in the transitional superset.',
        fix: `Use one of: ${STORED_OUTCOME_STATUSES.join(', ')}. Prefer the V5 canonical list.`,
    },
    {
        code: 'INVALID_QUALITY_SCORE',
        when: 'quality_score is not a finite number in [0, 1].',
        fix: 'Omit the field, or send a number between 0 and 1 inclusive.',
    },
];

// ─────────────────────────────────────────────────────────────────────────
// Static SDK endpoint metadata
// ─────────────────────────────────────────────────────────────────────────

export interface SetupApiInfo {
    /** Canonical write URL — does not move in 3L. */
    write_endpoint: string;
    /** Optional read endpoint used by the Prove drill-down. */
    read_endpoint_pattern: string;
    /** Idempotency key — what the writer UPSERTs on. */
    idempotency_key: 'tenant_id + request_id';
    /** Allowed top-level body keys. */
    body_keys: readonly string[];
    /** Status enum the writer physically accepts (V5 canonical + legacy). */
    statuses_stored: readonly StoredOutcomeStatus[];
    /** V5 canonical vocabulary — what Prove and future Optimize read. */
    statuses_canonical: readonly CanonicalOutcomeStatus[];
    /** Canonical source enum. */
    sources_canonical: readonly CanonicalOutcomeSource[];
    /** Body / metadata keys that cause a 400 before any DB write. */
    forbidden_fields: readonly string[];
}

export function buildSetupApiInfo(): SetupApiInfo {
    return {
        write_endpoint:        '/api/v2/outcomes',
        read_endpoint_pattern: '/api/v2/prove/outcomes/<request_id>',
        idempotency_key:       'tenant_id + request_id',
        body_keys:             ALLOWED_OUTCOME_BODY_KEYS,
        statuses_stored:       STORED_OUTCOME_STATUSES,
        statuses_canonical:    CANONICAL_OUTCOME_STATUSES,
        sources_canonical:     CANONICAL_OUTCOME_SOURCES,
        forbidden_fields:      FORBIDDEN_CONTENT_FIELDS,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Plain-language copy
// ─────────────────────────────────────────────────────────────────────────

export const SETUP_INTRO_COPY =
    'Outcome capture records whether an AI output produced a useful business result. P402 uses this later to calculate quality-adjusted cost. This page does not create recommendations.';

export const SETUP_DISCLAIMER_COPY =
    'This is an activation guide, not an Optimize recommendation. Readiness numbers come from /api/v2/outcomes/coverage. Prompts and responses are never stored, displayed, or exported by this surface.';
