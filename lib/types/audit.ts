/**
 * Audit Funnel — Core Types
 * Strictly union-typed to prevent invalid plan/severity/domain usage at compile time.
 */

export type PlanTier = 'free' | 'pro' | 'enterprise';
export type AuditDomain = 'integration' | 'runtime' | 'trust' | 'governance';
export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
/** Alias used by the background audit engine severity penalty map */
export type Severity = AuditSeverity;
export type AuditGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/** PLG feature gate state — drives AuditGateBanner rendering */
export type GateState = 'allowed' | 'preview' | 'locked';

/** Data for the AuditGateBanner upgrade prompt */
export interface AuditUpgradePrompt {
    headline?: string;
    body?: string;
    target_plan: string;
    cta_label?: string;
    cta_route?: string;
    math?: {
        projected_savings_usd?: number;
        failure_rate_reduction_pct?: number;
    };
}
export type FindingStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'ignored';

export type AuditScopeType =
    | 'tenant'
    | 'route'
    | 'endpoint'
    | 'listing'
    | 'publisher'
    | 'policy_set';

export interface AuditScope {
    type: AuditScopeType;
    id: string;
    label: string;
}

export interface AuditScore {
    score: number;
    grade: AuditGrade;
    delta_7d: number;
    last_computed_at: string;
}

export interface DomainBreakdown {
    domain: AuditDomain;
    score: number;
    grade: AuditGrade;
    finding_count: number;
}

export interface AuditFixAction {
    action_id: string;
    label: string;
    route: string;
    api_hint?: string;
    requires_plan: PlanTier;
    auto_fix_supported: boolean;
}

export interface AuditFinding {
    finding_id: string;
    tenant_id: string;
    scope_type: AuditScopeType;
    scope_id: string;
    code: string;
    domain: AuditDomain;
    severity: AuditSeverity;
    status: FindingStatus;

    title: string;
    summary: string;
    user_impact: string;
    technical_detail: string;
    recommendation: string;

    impact_estimate: {
        cost_savings_usd?: number;
        failure_rate_reduction_pct?: number;
        description?: string;
    };
    plan_visibility: {
        visible: boolean;
        detail_level: 'full' | 'preview' | 'locked';
    };
    docs_slug?: string;

    actions: AuditFixAction[];

    first_seen_at: string;
    last_seen_at: string;
    occurrence_count_24h: number;
    occurrence_count_7d: number;
}

export interface AuditEntitlements {
    plan_tier: PlanTier;
    runs_remaining_this_month: number;
    max_runs_per_month: number;
    scheduled_audits_enabled: boolean;
    regression_detection_enabled: boolean;
    export_enabled: boolean;
    max_domains: AuditDomain[];
}

export interface AuditContractPayload {
    version: string;
    tenant_id: string;
    scope: AuditScope;
    overall_score: AuditScore;
    domain_breakdown: DomainBreakdown[];
    top_findings: AuditFinding[];
    all_finding_ids: string[];
    entitlements: AuditEntitlements;
    run_id?: string;
    run_status?: 'queued' | 'running' | 'success' | 'failed';
}
