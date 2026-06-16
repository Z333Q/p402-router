'use client';

// Per-user auth-gated content; never statically cacheable. Marking
// force-dynamic also satisfies Next 15's useSearchParams CSR-bailout
// requirement without an explicit Suspense wrapper.
export const dynamic = 'force-dynamic';

/**
 * Slice 3B — Control foundation dashboard.
 *
 * Read-only governance surface over ai_economic_events + api_keys +
 * departments + employees + ap2_mandates. Eleven panels, one
 * /api/v2/control/overview call, URL-driven filters. Plus a policy simulator
 * panel that calls /api/v2/control/simulator without writing any policy or
 * creating any economic event.
 *
 * No recommendations. No savings claims. No policy proposals. Optimize is
 * untouched.
 */

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import {
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorState,
    MetricBox,
    ProgressBar,
    Skeleton,
} from '../_components/ui';

import {
    EMPTY_FILTERS,
    FilterBar,
    type ControlFilterValues,
    buildControlQs,
} from './_components/FilterBar';
import { SimulatorPanel } from './_components/SimulatorPanel';
import { FlipReadinessPanel } from './_components/FlipReadinessPanel';
import { ShadowDecisionsPanel } from './_components/ShadowDecisionsPanel';
import { DashboardDemoBanner } from '../_components/DashboardDemoBanner';
import type {
    AllowlistStatusRow,
    BudgetBurnRow,
    ControlOverviewResponse,
    DenyCodeBreakdownRow,
    WorkflowBudgetBurnRow,
} from '@/lib/control/types';

function fmtUsd(n: number, digits = 2): string {
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function fmtPct(n: number | null | undefined, digits = 1): string {
    if (n == null || !Number.isFinite(n)) return 'n/a';
    return `${n.toFixed(digits)}%`;
}

function readFilters(params: URLSearchParams): ControlFilterValues {
    const get = (k: string) => params.get(k) ?? '';
    return {
        since: get('since'),
        until: get('until'),
        department_id: get('department_id'),
        employee_id: get('employee_id'),
        workflow_id: get('workflow_id'),
        customer_id: get('customer_id'),
        feature_id: get('feature_id'),
        provider: get('provider'),
        model_used: get('model_used'),
    };
}

function statusTone(status: BudgetBurnRow['status'] | WorkflowBudgetBurnRow['status']): 'success' | 'warning' | 'danger' | 'default' {
    if (status === 'ok') return 'success';
    if (status === 'at_risk') return 'warning';
    if (status === 'over') return 'danger';
    return 'default';
}

function allowlistTone(status: AllowlistStatusRow['status']): 'success' | 'warning' | 'default' {
    if (status === 'ok') return 'success';
    if (status === 'violations') return 'warning';
    return 'default';
}

export default function ControlPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialFilters = React.useMemo(
        () => readFilters(new URLSearchParams(searchParams?.toString() ?? '')),
        [searchParams],
    );
    const [draft, setDraft] = React.useState<ControlFilterValues>(initialFilters);

    React.useEffect(() => {
        setDraft(initialFilters);
    }, [initialFilters]);

    const qs = buildControlQs(initialFilters);

    const { data, isLoading, isFetching, error, refetch } = useQuery<ControlOverviewResponse>({
        queryKey: ['control-overview', qs],
        queryFn: async () => {
            const res = await fetch(`/api/v2/control/overview${qs}`);
            if (!res.ok) throw new Error(`Failed to load Control overview (${res.status})`);
            return res.json();
        },
    });

    const apply = () => router.push(`/dashboard/control${buildControlQs(draft)}`);
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        router.push('/dashboard/control');
    };

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto">
            <DashboardDemoBanner surface="control" />
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b-2 border-black/5 pb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Control</h1>
                        <Badge variant="default">Read-only</Badge>
                        <Badge variant="default">Simulate</Badge>
                    </div>
                    <p className="text-neutral-600 font-medium max-w-[720px]">
                        Governance readiness over your AI economic events. Budget burn,
                        allowlist status, denied spend, human review queue. Plus a policy
                        simulator. No mutations, no enforcement wired into routing.
                    </p>
                    <p className="text-[11px] font-mono text-neutral-500">
                        Control reads metadata fields only. No prompt or response content is used.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/control/configuration"
                        className="inline-flex items-center h-9 px-4 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline"
                    >
                        Configuration
                    </Link>
                    <Button onClick={() => refetch()} variant="secondary" size="sm" loading={isFetching}>
                        Refresh
                    </Button>
                </div>
            </div>

            <FilterBar value={draft} onChange={setDraft} onApply={apply} onReset={reset} isFetching={isFetching} />

            {/* Flip readiness sits above the simulator: operators see the
                payment-grade gate state first, before any "what if" modeling. */}
            <FlipReadinessPanel />

            {/* Simulator panel sits above the dashboard so operators can model
                "what would happen?" without scrolling through every panel. */}
            <SimulatorPanel />

            {/* Persistent shadow-decision evidence (read-only). Renders a
                migration-pending state cleanly when the underlying table
                does not exist, so the dashboard is safe before the v2_056
                migration is applied. */}
            <ShadowDecisionsPanel />

            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                    <Skeleton className="h-48" />
                </div>
            ) : error ? (
                <ErrorState title="Failed to load Control overview" message={String(error)} />
            ) : !data ? null : data.control_coverage.total_events === 0 ? (
                <EmptyState
                    title="No events in this window"
                    body="No ai_economic_events rows match the current filters. Budget burn below still shows configured caps for the current month."
                />
            ) : (
                <>
                    {/* Coverage + denied + human review strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <MetricBox
                            label="Control coverage"
                            value={fmtPct(data.control_coverage.coverage_pct)}
                            subtext={`${data.control_coverage.with_any_control_signal.toLocaleString()} of ${data.control_coverage.total_events.toLocaleString()} events`}
                        />
                        <MetricBox
                            label="Policy-denied spend"
                            value={fmtUsd(data.policy_denied_spend.denied_spend_usd, 4)}
                            subtext={`${data.policy_denied_spend.denied_events.toLocaleString()} events · ${fmtPct(data.policy_denied_spend.denied_event_pct)}`}
                        />
                        <MetricBox
                            label="Open review queue"
                            value={data.human_review.open_review_queue.toLocaleString()}
                            subtext={`required ${data.human_review.required} · pending ${data.human_review.pending}`}
                        />
                        <MetricBox
                            label="Keys with per-request cap"
                            value={`${data.max_cost_per_request.keys_with_cap}/${data.max_cost_per_request.keys_with_cap + data.max_cost_per_request.keys_without_cap}`}
                            subtext={`${data.max_cost_per_request.over_cap_events.toLocaleString()} over-cap events`}
                        />
                    </div>
                </>
            )}

            {data && (
                <>
                    {/* Budget burn — four panels */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <BudgetBurnCard
                            title="Budget burn — API keys"
                            body={`${data.budget_burn.api_keys.length} active keys`}
                            rows={data.budget_burn.api_keys}
                        />
                        <BudgetBurnCard
                            title="Budget burn — departments"
                            body={`${data.budget_burn.departments.length} departments`}
                            rows={data.budget_burn.departments}
                        />
                        <BudgetBurnCard
                            title="Budget burn — employees"
                            body={`${data.budget_burn.employees.length} employees`}
                            rows={data.budget_burn.employees}
                        />
                        <WorkflowBurnCard rows={data.budget_burn.workflows} />
                    </div>

                    {/* Allowlists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <AllowlistCard title="Model allowlist" rows={data.allowlist.models} />
                        <AllowlistCard title="Task category allowlist" rows={data.allowlist.task_types} />
                    </div>

                    {/* Deny code breakdown */}
                    <Card title="Deny code breakdown" body={`${data.policy_denied_spend.denied_events.toLocaleString()} denied events`}>
                        {data.policy_denied_spend.breakdown.length === 0 ? (
                            <p className="text-sm text-neutral-500 py-4">No denied events in this window.</p>
                        ) : (
                            <table className="w-full text-sm font-mono">
                                <thead>
                                    <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                                        <th className="text-left py-2">Code</th>
                                        <th className="text-right py-2">Count</th>
                                        <th className="text-right py-2">Spend</th>
                                        <th className="text-right py-2">% of denied</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.policy_denied_spend.breakdown.map((r: DenyCodeBreakdownRow) => (
                                        <tr key={r.deny_code} className="border-b border-neutral-100">
                                            <td className="py-2 font-bold text-black">{r.deny_code}</td>
                                            <td className="text-right py-2">{r.count.toLocaleString()}</td>
                                            <td className="text-right py-2">{fmtUsd(r.spend_usd, 4)}</td>
                                            <td className="text-right py-2 text-neutral-500">{fmtPct(r.pct_of_denied_events)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>

                    {/* Control coverage matrix */}
                    <Card title="Control coverage by field" body={`${data.control_coverage.total_events.toLocaleString()} events in window`}>
                        <div className="space-y-3">
                            {data.control_coverage.fields.map((f) => (
                                <div key={f.field}>
                                    <div className="flex justify-between text-[11px] font-bold uppercase mb-1">
                                        <span>{f.field}</span>
                                        <span className="font-mono">
                                            {fmtPct(f.present_pct)} · {f.present.toLocaleString()} events
                                        </span>
                                    </div>
                                    <ProgressBar value={f.present_pct} max={100} showValue={false} />
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}

function BudgetBurnCard({ title, body, rows }: { title: string; body: string; rows: BudgetBurnRow[] }) {
    return (
        <Card title={title} body={body}>
            {rows.length === 0 ? (
                <p className="text-sm text-neutral-500 py-4">No rows.</p>
            ) : (
                <table className="w-full text-sm font-mono">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                            <th className="text-left py-2">Key</th>
                            <th className="text-right py-2">Spend</th>
                            <th className="text-right py-2">Budget</th>
                            <th className="text-right py-2">Burn</th>
                            <th className="text-right py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} className="border-b border-neutral-100">
                                <td className="py-2 font-bold text-black">{r.key}</td>
                                <td className="text-right py-2">{fmtUsd(r.spend_usd, 4)}</td>
                                <td className="text-right py-2 text-neutral-700">
                                    {r.budget_usd == null ? 'n/a' : fmtUsd(r.budget_usd, 2)}
                                </td>
                                <td className="text-right py-2 text-neutral-500">
                                    {r.budget_pct == null ? 'n/a' : fmtPct(r.budget_pct)}
                                </td>
                                <td className="text-right py-2">
                                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}

function WorkflowBurnCard({ rows }: { rows: WorkflowBudgetBurnRow[] }) {
    return (
        <Card title="Budget burn — workflows" body={`${rows.length} workflows`}>
            <p className="text-[11px] font-mono text-neutral-500 mb-3">
                Budget shown is the “Configured key budget attached to workflow” —
                the sum of monthly_budget_usd from API keys attached to the workflow.
                Not a true workflow budget.
            </p>
            {rows.length === 0 ? (
                <p className="text-sm text-neutral-500 py-4">No workflows.</p>
            ) : (
                <table className="w-full text-sm font-mono">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                            <th className="text-left py-2">Workflow</th>
                            <th className="text-right py-2">Spend</th>
                            <th className="text-right py-2">Configured</th>
                            <th className="text-right py-2">Burn</th>
                            <th className="text-right py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.workflow_id} className="border-b border-neutral-100">
                                <td className="py-2 font-bold text-black">{r.workflow_id}</td>
                                <td className="text-right py-2">{fmtUsd(r.spend_usd, 4)}</td>
                                <td className="text-right py-2 text-neutral-700">
                                    {r.configured_key_budget_usd == null
                                        ? 'no_configured_budget'
                                        : fmtUsd(r.configured_key_budget_usd, 2)}
                                </td>
                                <td className="text-right py-2 text-neutral-500">
                                    {r.budget_pct == null ? 'n/a' : fmtPct(r.budget_pct)}
                                </td>
                                <td className="text-right py-2">
                                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}

function AllowlistCard({ title, rows }: { title: string; rows: AllowlistStatusRow[] }) {
    return (
        <Card title={title} body={`${rows.length} API keys`}>
            {rows.length === 0 ? (
                <p className="text-sm text-neutral-500 py-4">No active API keys.</p>
            ) : (
                <table className="w-full text-sm font-mono">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b-2 border-black">
                            <th className="text-left py-2">Key</th>
                            <th className="text-right py-2">Allowed</th>
                            <th className="text-right py-2">Outside</th>
                            <th className="text-right py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.api_key_id} className="border-b border-neutral-100">
                                <td className="py-2 font-bold text-black">{r.api_key_name}</td>
                                <td className="text-right py-2 text-neutral-700">
                                    {r.allowed.length === 0 ? 'unrestricted' : r.allowed.length}
                                </td>
                                <td className="text-right py-2 text-neutral-500">
                                    {r.observed_outside_allowlist.length}
                                </td>
                                <td className="text-right py-2">
                                    <Badge tone={allowlistTone(r.status)}>{r.status}</Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}
