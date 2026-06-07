/**
 * Slice 3Q — Vertical Demo Story Alignment.
 *
 * Layered on top of the Slice 3P demo engine. Adds a `scenario` query
 * parameter (?demo=1&scenario=<vertical>) so a sales / investor /
 * onboarding demo can switch between the four canonical P402 verticals
 * without leaving the dashboard:
 *
 *   - healthcare_prior_auth          (uses the /meter/healthcare story)
 *   - legal_mna_due_diligence        (uses the /meter/legal story)
 *   - real_estate_tenant_screening   (uses the /meter/real-estate story)
 *   - enterprise_ai_spend_control    (uses the /meter/enterprise story)
 *
 * Rules we hold to even though the public meter pages have looser
 * marketing copy:
 *
 *   - Synthetic data only. No PHI, no real applicant data, no real
 *     contracts. Every scenario states this in its safety labels.
 *   - Human final decision required wherever the public page says so
 *     (healthcare, legal, real estate). Each scenario's safety_labels
 *     surfaces that fact.
 *   - Optimize recommendations REMAIN BLOCKED inside the app demo,
 *     even when the public marketing page shows "Opt Savings". This
 *     module re-asserts the truth contract for every scenario.
 *   - No prompt or response content in any scenario payload. Tests
 *     pin this for every scenario.
 */

import type { SearchParamsLike } from './accountability-story';

// ─────────────────────────────────────────────────────────────────────────
// Scenario vocabulary
// ─────────────────────────────────────────────────────────────────────────

export const SCENARIOS = [
    'enterprise_ai_spend_control',     // default — the horizontal story
    'healthcare_prior_auth',
    'legal_mna_due_diligence',
    'real_estate_tenant_screening',
] as const;
export type DemoScenario = (typeof SCENARIOS)[number];

/** Default scenario when `?demo=1` is set but no `scenario` value. */
export const DEFAULT_SCENARIO: DemoScenario = 'enterprise_ai_spend_control';

/**
 * Short URL aliases the operator can type into the address bar — these
 * map onto the canonical full names above.
 */
const SCENARIO_ALIASES: Record<string, DemoScenario> = {
    enterprise:                       'enterprise_ai_spend_control',
    enterprise_ai_spend_control:      'enterprise_ai_spend_control',
    healthcare:                       'healthcare_prior_auth',
    healthcare_prior_auth:            'healthcare_prior_auth',
    legal:                            'legal_mna_due_diligence',
    legal_mna_due_diligence:          'legal_mna_due_diligence',
    real_estate:                      'real_estate_tenant_screening',
    real_estate_tenant_screening:     'real_estate_tenant_screening',
    'real-estate':                    'real_estate_tenant_screening',
};

/**
 * Resolve the scenario from the URL. Returns the default when the
 * `scenario` parameter is missing or carries an unknown value.
 *
 * The scenario is ONLY considered when demo mode is active — callers
 * are expected to gate this with `isDemoMode()` first.
 */
export function getDemoScenario(searchParams: SearchParamsLike | null | undefined): DemoScenario {
    if (!searchParams) return DEFAULT_SCENARIO;
    const raw = searchParams.get('scenario');
    if (!raw) return DEFAULT_SCENARIO;
    const key = raw.toLowerCase();
    // Guard against prototype keys (e.g. '__proto__') resolving to Object.prototype.
    if (!Object.hasOwn(SCENARIO_ALIASES, key)) return DEFAULT_SCENARIO;
    return SCENARIO_ALIASES[key] ?? DEFAULT_SCENARIO;
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario metadata
//
// `safety_labels` are surfaced by the DemoPreviewBanner so the operator
// sees the canonical posture (synthetic data, no PHI, human final
// decision required, etc.) BEFORE looking at any numbers.
//
// `framing_disclaimer` is rendered alongside the standard demo disclaimer
// to encode the truth contract: Optimize recommendations remain blocked
// regardless of what the public marketing page says.
// ─────────────────────────────────────────────────────────────────────────

export interface ScenarioMeta {
    id: DemoScenario;
    /** Human-readable name shown in the banner pill. */
    name: string;
    /** One-sentence framing the buyer sees first. */
    framing: string;
    /** Mandatory safety labels — every one rendered as a chip. */
    safety_labels: readonly string[];
    /** Re-asserts the no-savings, no-recommendations contract. */
    framing_disclaimer: string;
    /** Headline metric the demo emphasizes — e.g. cost-per-action. */
    headline_metric_label: string;
    /** Plain-language explainer for that metric. */
    headline_metric_explainer: string;
}

export const SCENARIO_META: Record<DemoScenario, ScenarioMeta> = {
    enterprise_ai_spend_control: {
        id: 'enterprise_ai_spend_control',
        name: 'Enterprise · AI spend control',
        framing:
            'Org → department → project → employee attribution over AI spend, with denied requests, evidence coverage, and outcome readiness for a sample enterprise tenant.',
        safety_labels: ['Synthetic data', 'Not written to your ledger'],
        framing_disclaimer:
            'Optimize recommendations remain blocked in the app. Public marketing copy that mentions "Opt Savings" is a separate artifact — inside this dashboard, P402 measures readiness only and never proposes a model switch or claims savings.',
        headline_metric_label: 'Total AI spend in window',
        headline_metric_explainer:
            'Spend attributed across departments, projects, and employees. No recommendation is implied by any number on this page.',
    },
    healthcare_prior_auth: {
        id: 'healthcare_prior_auth',
        name: 'Healthcare · prior authorization',
        framing:
            'Utilization-management workflow over synthetic prior-authorization requests. AI surfaces evidence and budget guardrails; clinicians make the final decision.',
        safety_labels: [
            'Synthetic data',
            'No PHI',
            'Admin / non-clinical use',
            'Human approval required',
            'URAC-aligned audit posture',
        ],
        framing_disclaimer:
            'P402 does not make medical decisions. Every prior-authorization outcome shown here is illustrative; a licensed clinician must adjudicate the real case.',
        headline_metric_label: 'Cost per adjudicated prior-auth',
        headline_metric_explainer:
            'Per-case provider cost over the demo window. Treated as a baseline measurement, not a target. Recommendations remain blocked.',
    },
    legal_mna_due_diligence: {
        id: 'legal_mna_due_diligence',
        name: 'Legal · M&A due diligence',
        framing:
            'Matter-level cost tracking over a synthetic M&A data room. AI extracts and flags conflicts; counsel makes the final judgment.',
        safety_labels: [
            'Synthetic data room',
            'No real client contracts',
            'Human legal review required',
            'ABA-aligned audit posture',
        ],
        framing_disclaimer:
            'P402 does not provide legal advice or final judgment. Routing observations (Flash vs Pro complexity) are descriptive measurements of the demo run, not recommendations.',
        headline_metric_label: 'Cost per due-diligence document',
        headline_metric_explainer:
            'Per-contract provider cost across the demo matter. Reported as a baseline; no model switch is recommended by this surface.',
    },
    real_estate_tenant_screening: {
        id: 'real_estate_tenant_screening',
        name: 'Real estate · tenant screening',
        framing:
            'Tenant-application screening over synthetic applicant documents. AI extracts and flags inconsistencies; the leasing decision is made by a human reviewer.',
        safety_labels: [
            'Synthetic applicants',
            'No real PII',
            'Human final decision required',
            'HUD fair-housing audit posture',
        ],
        framing_disclaimer:
            'P402 does not approve or deny tenants. The fraud score shown is illustrative; the leasing decision rests with the property manager and follows fair-housing rules.',
        headline_metric_label: 'Cost per application screened',
        headline_metric_explainer:
            'Per-applicant provider cost across the demo run. No tenant decision is implied.',
    },
};

// ─────────────────────────────────────────────────────────────────────────
// Scenario-tailored copy used by the dashboard widgets
//
// The accountability / coverage / search builders in
// lib/demo/accountability-story.ts call into these helpers so the same
// scenario id drives the headline KPI, the cleanup priorities, and the
// banner chips consistently.
// ─────────────────────────────────────────────────────────────────────────

export interface ScenarioCleanupSummary {
    /** Cleanup item suffix the accountability cleanup list appends. */
    workflow_label: string;
    /** Cleanup item suffix for the missing-outcome line. */
    outcome_segment_label: string;
    /** Sample request_id surfaced when the user clicks the segment. */
    sample_request_id: string;
}

const SCENARIO_CLEANUP: Record<DemoScenario, ScenarioCleanupSummary> = {
    enterprise_ai_spend_control: {
        workflow_label: 'workflow=customer_support',
        outcome_segment_label: 'workflow=customer_support',
        sample_request_id: 'demo-req-cs-001',
    },
    healthcare_prior_auth: {
        workflow_label: 'workflow=prior_authorization',
        outcome_segment_label: 'workflow=prior_authorization',
        sample_request_id: 'demo-req-pa-001',
    },
    legal_mna_due_diligence: {
        workflow_label: 'matter=mna_due_diligence',
        outcome_segment_label: 'matter=mna_due_diligence',
        sample_request_id: 'demo-req-ma-001',
    },
    real_estate_tenant_screening: {
        workflow_label: 'workflow=tenant_screening',
        outcome_segment_label: 'workflow=tenant_screening',
        sample_request_id: 'demo-req-ts-001',
    },
};

export function getScenarioCleanup(scenario: DemoScenario): ScenarioCleanupSummary {
    return SCENARIO_CLEANUP[scenario];
}

// ─────────────────────────────────────────────────────────────────────────
// Headline framing for the EmptyLedgerStory and PageHeader copy
// ─────────────────────────────────────────────────────────────────────────

export interface ScenarioBanner {
    /** Chip text shown next to the Demo preview marker. */
    pill: string;
    /** Full body text. */
    body: string;
    /** Safety chips. */
    safety_labels: readonly string[];
    /** Disclaimer re-asserting truth contract. */
    framing_disclaimer: string;
}

export function getScenarioBanner(scenario: DemoScenario): ScenarioBanner {
    const m = SCENARIO_META[scenario];
    return {
        pill: m.name,
        body: m.framing,
        safety_labels: m.safety_labels,
        framing_disclaimer: m.framing_disclaimer,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario continuity helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build the demo query suffix the dashboard pages append to internal
 * links so the scenario carries across navigation.
 *
 *   demoActive=false           -> ''
 *   demoActive=true, default   -> 'demo=1'
 *   demoActive=true, named     -> 'demo=1&scenario=<id>'
 */
export function buildDemoQs(demoActive: boolean, scenario: DemoScenario): string {
    if (!demoActive) return '';
    if (scenario === DEFAULT_SCENARIO) return 'demo=1';
    return `demo=1&scenario=${scenario}`;
}

/**
 * Append the demo query string to a base href in the canonical way.
 * Returns the original href untouched when demo mode is not active.
 */
export function withDemoQs(href: string, demoActive: boolean, scenario: DemoScenario): string {
    if (!demoActive) return href;
    const qs = buildDemoQs(demoActive, scenario);
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}${qs}`;
}
