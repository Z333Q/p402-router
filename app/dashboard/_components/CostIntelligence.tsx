'use client';

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { Card, Badge, Button, MetricBox } from './ui';
import { useAnalytics, ProviderSpend, SpendHistory, AnalyticsAlert } from '@/hooks/useAnalytics';
import { clsx } from 'clsx';

// Constants for Functional Brutalism theme
const NEON_GREEN = '#CCFF00';
const PURE_BLACK = '#000000';
const NEUTRAL_900 = '#171717';
const NEUTRAL_100 = '#F5F5F5';

export function CostIntelligence() {
    const { data, alerts, loading, error } = useAnalytics();

    if (loading && !data) return <DashboardLoader />;
    if (error) return <div className="text-error font-mono text-xs p-4 border-2 border-error uppercase">Error: {error}</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Velocity Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricBox
                    label="Today's Spend"
                    value={`$${data?.summary.today.toFixed(2)}`}
                    subtext="Real-time aggregation"
                    helpText="The total cost of all API calls routed in the last 24 hours."
                />
                <MetricBox
                    label="Active Cycle"
                    value={`$${data?.summary.total.toFixed(2)}`}
                    subtext="Current billing cycle"
                    helpText="Your total usage for the current month across all connected providers."
                />
                <MetricBox
                    label="Projected Total"
                    value={`$${data?.summary.projected.toFixed(2)}`}
                    subtext="Intelligence-driven forecast"
                    helpText="Based on your current usage velocity, this is where you'll end the month."
                    accent
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Spend Breakdown Chart */}
                <Card title="Provider Distribution" body="Cost breakdown across upstream facilitators." className="h-[400px]">
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.byProvider}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#666"
                                    fontSize={10}
                                    tickFormatter={(v) => v.replace('fac_', '').toUpperCase()}
                                />
                                <YAxis stroke="#666" fontSize={10} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: PURE_BLACK, border: `2px solid ${NEON_GREEN}`, borderRadius: 0 }}
                                    itemStyle={{ color: NEON_GREEN, fontFamily: 'monospace', fontSize: '10px' }}
                                    labelStyle={{ color: '#FFF', fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <Bar dataKey="value" fill={NEON_GREEN} radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Daily Velocity Chart */}
                <Card title="Spend Velocity" body="Daily expenditure trends over the last 30 days.">
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data?.history}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#666"
                                    fontSize={10}
                                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                />
                                <YAxis stroke="#666" fontSize={10} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: PURE_BLACK, border: `2px solid ${NEON_GREEN}`, borderRadius: 0 }}
                                    itemStyle={{ color: NEON_GREEN, fontFamily: 'monospace', fontSize: '10px' }}
                                    labelStyle={{ color: '#FFF', fontWeight: 'bold' }}
                                />
                                <Line
                                    type="stepAfter"
                                    dataKey="amount"
                                    stroke={NEON_GREEN}
                                    strokeWidth={3}
                                    dot={{ fill: NEON_GREEN, stroke: PURE_BLACK, strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: NEON_GREEN, strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Optimization Alerts */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-neutral-100 italic">
                        Intelligence Alerts
                    </h2>
                    <Badge tone="info" className="animate-pulse">{alerts.length} Active Issues</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.map((alert) => (
                        <AlertBox key={alert.id} alert={alert} />
                    ))}
                </div>
            </div>
        </div>
    );
}


function AlertBox({ alert }: { alert: AnalyticsAlert }) {
    return (
        <div className="bg-neutral-800 border-2 border-black p-5 flex flex-col justify-between gap-4 group hover:border-primary transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/10 animate-scanline opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-2">
                    <div className={clsx(
                        "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(var(--color-tone))] animate-pulse",
                        alert.severity === 'high' ? 'bg-error' : alert.severity === 'medium' ? 'bg-warn' : 'bg-info'
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 group-hover:text-primary transition-colors">
                        {alert.title}
                    </span>
                </div>
                <p className="text-xs font-medium text-neutral-100 leading-relaxed italic border-l-2 border-neutral-700 pl-3 py-1 group-hover:border-primary transition-colors">
                    "{alert.message}"
                </p>
            </div>

            <Button variant="dark" className="w-full text-[10px] font-black uppercase tracking-widest py-2 bg-black border-neutral-700 group-hover:bg-primary group-hover:text-black group-hover:border-primary transition-all">
                {alert.action}
            </Button>
        </div>
    );
}

function DashboardLoader() {
    return (
        <div className="space-y-8 animate-pulse text-neutral-800">
            <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-neutral-800 border-2 border-black" />)}
            </div>
            <div className="grid grid-cols-2 gap-8">
                {[1, 2].map(i => <div key={i} className="h-[400px] bg-neutral-800 border-2 border-black" />)}
            </div>
        </div>
    );
}
