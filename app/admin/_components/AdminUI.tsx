'use client';
/**
 * Admin UI component library.
 * Inverted neo-brutalist palette — red accent, dark background.
 * Data viz follows best practices:
 *  - Zero-baseline on bar/area charts
 *  - Colorblind-safe series colors (blue/orange, not red/green)
 *  - Tooltips with exact value + local-timezone timestamp
 *  - Skeleton loaders matching final layout
 *  - Progressive disclosure: sparkline → full chart on click
 */
import React, { useState } from 'react';
import {
    AreaChart, Area, LineChart, Line, BarChart, Bar,
    ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS, type AdminRole } from '@/lib/admin/permissions';

// ---------------------------------------------------------------------------
// Design tokens — scoped to admin theme
// ---------------------------------------------------------------------------
export const ADMIN_COLORS = {
    primary:   '#FF3B30',
    surface:   '#141414',
    border:    '#262626',
    text:      '#FFFFFF',
    muted:     '#6B6B6B',
    // Colorblind-safe chart series (blue/orange/teal — never red/green pairs)
    series: ['#22D3EE', '#FF9500', '#A78BFA', '#34D399', '#F472B6', '#FBBF24'],
};

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function AdminCard({
    title, children, action, className = '',
}: {
    title?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`border-2 border-neutral-800 bg-[#111111] ${className}`}>
            {title && (
                <div className="flex items-center justify-between px-5 py-3 border-b-2 border-neutral-800">
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-300">{title}</span>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-5">{children}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// KPICard — metric + delta + optional sparkline
// ---------------------------------------------------------------------------
interface SparkPoint { date: string; value: number }

interface KPICardProps {
    label: string;
    value: string;
    delta?: number;          // percentage change vs prior period (positive = up)
    deltaLabel?: string;     // e.g. 'vs 30d'
    sublabel?: string;       // secondary stat below main value
    spark?: SparkPoint[];    // 7-14 points for sparkline
    sparkColor?: string;
    loading?: boolean;
}

export function KPICard({ label, value, delta, deltaLabel = 'vs 30d', sublabel, spark, sparkColor, loading }: KPICardProps) {
    if (loading) return <KPICardSkeleton />;

    const positive = delta !== undefined && delta > 0;
    const negative = delta !== undefined && delta < 0;
    const neutral  = delta === undefined || delta === 0;

    return (
        <div className="border-2 border-neutral-800 bg-[#111111] p-5 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{label}</span>

            <div className="flex items-end justify-between gap-2">
                <span className="text-3xl font-black text-white leading-none tracking-tight">{value}</span>

                {delta !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider mb-0.5 ${
                        positive ? 'text-[#34D399]' : negative ? 'text-[#FF3B30]' : 'text-neutral-500'
                    }`}>
                        {positive ? <TrendingUp size={12} /> : negative ? <TrendingDown size={12} /> : <Minus size={12} />}
                        <span>{positive ? '+' : ''}{delta.toFixed(1)}%</span>
                        <span className="text-neutral-600 font-mono normal-case tracking-normal">{deltaLabel}</span>
                    </div>
                )}
            </div>

            {sublabel && (
                <span className="text-[11px] text-neutral-500 font-mono">{sublabel}</span>
            )}

            {spark && spark.length > 0 && (
                <div className="h-12 -mx-1 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={spark} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={sparkColor ?? ADMIN_COLORS.series[0]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={sparkColor ?? ADMIN_COLORS.series[0]} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={sparkColor ?? ADMIN_COLORS.series[0]}
                                strokeWidth={1.5}
                                fill={`url(#spark-${label})`}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function KPICardSkeleton() {
    return (
        <div className="border-2 border-neutral-800 bg-[#111111] p-5 animate-pulse">
            <div className="h-3 w-24 bg-neutral-800 mb-3" />
            <div className="h-8 w-32 bg-neutral-800 mb-3" />
            <div className="h-12 bg-neutral-800/50" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// GrowthChart — multi-series time-series with best-practice defaults
// ---------------------------------------------------------------------------
interface ChartSeries {
    dataKey: string;
    label: string;
    type?: 'line' | 'bar' | 'area';
    color?: string;
    yAxisId?: 'left' | 'right';
}

interface GrowthChartProps {
    data: Record<string, unknown>[];
    series: ChartSeries[];
    dateKey?: string;
    height?: number;
    annotations?: { date: string; label: string }[];
    loading?: boolean;
    formatY?: (v: number) => string;
    formatTooltip?: (v: number, name: string) => string;
}

// Locale-aware date formatter for chart axes
function fmtAxisDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label, formatTooltip }: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
    formatTooltip?: (v: number, name: string) => string;
}) {
    if (!active || !payload?.length) return null;
    const date = label ? new Date(label).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }) : '';

    return (
        <div className="border-2 border-neutral-700 bg-[#0D0D0D] px-3 py-2 min-w-[140px]">
            <p className="text-[10px] font-mono text-neutral-500 mb-2">{date}</p>
            {payload.map(p => (
                <div key={p.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2" style={{ background: p.color }} />
                        <span className="text-[10px] text-neutral-400 font-mono">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-white font-mono">
                        {formatTooltip ? formatTooltip(p.value, p.name) : p.value.toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function GrowthChart({
    data, series, dateKey = 'date', height = 220, annotations = [],
    loading, formatY, formatTooltip,
}: GrowthChartProps) {
    if (loading) {
        return (
            <div className="animate-pulse bg-neutral-800/30 border-2 border-neutral-800" style={{ height }} />
        );
    }
    if (!data.length) {
        return (
            <div
                className="flex items-center justify-center border-2 border-dashed border-neutral-800 text-neutral-600 text-xs font-mono"
                style={{ height }}
            >
                No data for selected period
            </div>
        );
    }

    // Use ComposedChart for all cases — it accepts Line, Bar, and Area children uniformly
    const ChartComponent = ComposedChart;

    return (
        <ResponsiveContainer width="100%" height={height}>
            <ChartComponent data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                <XAxis
                    dataKey={dateKey}
                    tickFormatter={fmtAxisDate}
                    tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: '#6B6B6B' }}
                    axisLine={{ stroke: '#262626' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tickFormatter={formatY ?? (v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                    tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: '#6B6B6B' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                />
                <Tooltip content={<CustomTooltip formatTooltip={formatTooltip} />} />
                <Legend
                    formatter={v => <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{v}</span>}
                />
                {annotations.map(a => (
                    <ReferenceLine
                        key={a.date}
                        x={a.date}
                        stroke="#FF3B30"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        label={{ value: a.label, fontSize: 9, fill: '#FF3B30', position: 'top' }}
                    />
                ))}
                {series.map((s, i) => {
                    const color = s.color ?? ADMIN_COLORS.series[i % ADMIN_COLORS.series.length];
                    if (s.type === 'bar') {
                        return <Bar key={s.dataKey} dataKey={s.dataKey} name={s.label} fill={color} maxBarSize={24} />;
                    }
                    if (s.type === 'area') {
                        return (
                            <Area
                                key={s.dataKey}
                                type="monotone"
                                dataKey={s.dataKey}
                                name={s.label}
                                stroke={color}
                                fill={color}
                                fillOpacity={0.08}
                                strokeWidth={2}
                                dot={false}
                            />
                        );
                    }
                    return (
                        <Line
                            key={s.dataKey}
                            type="monotone"
                            dataKey={s.dataKey}
                            name={s.label}
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    );
                })}
            </ChartComponent>
        </ResponsiveContainer>
    );
}

// ---------------------------------------------------------------------------
// DataTable — sortable, paginated, filterable
// ---------------------------------------------------------------------------
interface Column<T> {
    key: string;
    header: string;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    total?: number;
    page?: number;
    pageSize?: number;
    onPage?: (page: number) => void;
    emptyMessage?: string;
    rowKey?: (row: T) => string;
}

export function DataTable<T extends Record<string, unknown>>({
    columns, data, loading, total = 0, page = 1, pageSize = 50,
    onPage, emptyMessage = 'No records found', rowKey,
}: DataTableProps<T>) {
    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="border-2 border-neutral-800">
            {/* Loading bar */}
            {loading && (
                <div className="h-0.5 bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-[#FF3B30] animate-[loading-bar_1.5s_ease-in-out_infinite] origin-left" />
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b-2 border-neutral-800 bg-[#0D0D0D]">
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    style={{ width: col.width }}
                                    className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-500"
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.length ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-neutral-800/50">
                                    {columns.map(col => (
                                        <td key={col.key} className="px-4 py-3">
                                            <div className="h-4 bg-neutral-800 animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : !data.length ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-neutral-600 font-mono">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((row, idx) => (
                                <tr
                                    key={rowKey ? rowKey(row) : idx}
                                    className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors"
                                >
                                    {columns.map(col => (
                                        <td key={col.key} className="px-4 py-3 text-sm">
                                            {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t-2 border-neutral-800">
                    <span className="text-[10px] text-neutral-500 font-mono">
                        {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPage?.(page - 1)}
                            disabled={page <= 1}
                            className="h-7 px-3 border-2 border-neutral-700 text-[10px] font-black text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ←
                        </button>
                        <span className="h-7 px-3 flex items-center text-[10px] font-mono text-neutral-500">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => onPage?.(page + 1)}
                            disabled={page >= totalPages}
                            className="h-7 px-3 border-2 border-neutral-700 text-[10px] font-black text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// RoleBadge
// ---------------------------------------------------------------------------
export function RoleBadge({ role }: { role: AdminRole }) {
    const color = ROLE_COLORS[role];
    const label = ROLE_LABELS[role];
    return (
        <span
            className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border"
            style={{ borderColor: color, color }}
        >
            {label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// HealthPulse — animated status indicator
// ---------------------------------------------------------------------------
type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

const HEALTH_COLORS: Record<HealthStatus, string> = {
    healthy:  '#34D399',
    degraded: '#FBBF24',
    down:     '#FF3B30',
    unknown:  '#6B6B6B',
};

export function HealthPulse({ status, label }: { status: HealthStatus; label?: string }) {
    const color = HEALTH_COLORS[status];
    const animate = status === 'healthy' || status === 'degraded';
    return (
        <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-3 h-3">
                {animate && (
                    <span
                        className="absolute inline-flex w-full h-full animate-ping opacity-50"
                        style={{ background: color, borderRadius: 0 }}
                    />
                )}
                <span className="relative w-2 h-2" style={{ background: color }} />
            </div>
            {label && (
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>
                    {label}
                </span>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// AdminPageHeader — consistent page title + action area
// ---------------------------------------------------------------------------
export function AdminPageHeader({
    title, subtitle, action,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-neutral-800">
            <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none">{title}</h1>
                {subtitle && <p className="mt-2 text-xs text-neutral-500 font-mono">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// StatusBadge — generic status pill
// ---------------------------------------------------------------------------
const STATUS_STYLES: Record<string, { border: string; color: string }> = {
    active:     { border: '#34D399', color: '#34D399' },
    healthy:    { border: '#34D399', color: '#34D399' },
    ok:         { border: '#34D399', color: '#34D399' },
    degraded:   { border: '#FBBF24', color: '#FBBF24' },
    warning:    { border: '#FBBF24', color: '#FBBF24' },
    down:       { border: '#FF3B30', color: '#FF3B30' },
    error:      { border: '#FF3B30', color: '#FF3B30' },
    banned:     { border: '#FF3B30', color: '#FF3B30' },
    revoked:    { border: '#FF3B30', color: '#FF3B30' },
    inactive:   { border: '#6B6B6B', color: '#6B6B6B' },
    unknown:    { border: '#6B6B6B', color: '#6B6B6B' },
    pending:    { border: '#22D3EE', color: '#22D3EE' },
    open:       { border: '#FF9500', color: '#FF9500' },
    resolved:   { border: '#34D399', color: '#34D399' },
    investigating: { border: '#22D3EE', color: '#22D3EE' },
    false_positive: { border: '#6B6B6B', color: '#6B6B6B' },
};

export function StatusBadge({ status }: { status: string }) {
    const style = STATUS_STYLES[status.toLowerCase()] ?? STATUS_STYLES['unknown']!;
    const borderColor = style?.border ?? '#6B6B6B';
    const textColor   = style?.color  ?? '#6B6B6B';
    return (
        <span
            className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border"
            style={{ borderColor, color: textColor }}
        >
            {status.replace('_', ' ')}
        </span>
    );
}

// ---------------------------------------------------------------------------
// AdminButton
// ---------------------------------------------------------------------------
export function AdminButton({
    children, onClick, variant = 'primary', size = 'md', disabled, type = 'button',
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md';
    disabled?: boolean;
    type?: 'button' | 'submit';
}) {
    const base = 'inline-flex items-center gap-2 font-black uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-2';
    const sizes = { sm: 'h-7 px-3 text-[9px]', md: 'h-9 px-4 text-[10px]' };
    const variants = {
        primary:   'bg-[#FF3B30] border-[#FF3B30] text-white hover:bg-transparent hover:text-[#FF3B30]',
        secondary: 'bg-transparent border-neutral-700 text-neutral-300 hover:border-neutral-400 hover:text-white',
        danger:    'bg-transparent border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white',
        ghost:     'bg-transparent border-transparent text-neutral-500 hover:text-white',
    };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${sizes[size]} ${variants[variant]}`}
        >
            {children}
        </button>
    );
}
