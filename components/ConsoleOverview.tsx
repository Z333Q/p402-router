import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { simulation } from '../services/simulation';
import { EventTrace } from '../types';

// Mock chart data for visualization (hard to derive perfect time-series from just 100 events in a demo)
const CHART_DATA = [
    { time: '00:00', volume: 400 },
    { time: '04:00', volume: 300 },
    { time: '08:00', volume: 850 },
    { time: '12:00', volume: 1400 },
    { time: '16:00', volume: 1200 },
    { time: '20:00', volume: 900 },
    { time: '24:00', volume: 600 },
];

export default function ConsoleOverview() {
    const [stats, setStats] = useState({
        total: 0,
        settled: 0,
        denied: 0,
        p95: 0
    });

    useEffect(() => {
        // Poll for stats update every 2 seconds
        const interval = setInterval(() => {
            const events = simulation.getEvents();
            const settled = events.filter(e => e.status === 'settled').length;
            const denied = events.filter(e => e.status === 'denied').length;

            // Calculate rough p95
            const latencies = events.map(e => e.latency).sort((a, b) => a - b);
            const p95Index = Math.floor(latencies.length * 0.95);
            const p95 = latencies[p95Index] || 0;

            setStats({
                total: events.length,
                settled,
                denied,
                p95
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const kpis = [
        { label: 'Events in Buffer', value: stats.total.toString(), delta: 'Live', deltaType: 'neutral' },
        { label: 'Settled', value: stats.settled.toString(), delta: `${((stats.settled / stats.total || 0) * 100).toFixed(0)}%`, deltaType: 'positive' },
        { label: 'Denied', value: stats.denied.toString(), delta: `${((stats.denied / stats.total || 0) * 100).toFixed(0)}%`, deltaType: stats.denied > 5 ? 'negative' : 'positive' },
        { label: 'p95 Latency', value: `${stats.p95}ms`, delta: '<100ms Target', deltaType: stats.p95 < 100 ? 'positive' : 'negative' },
        { label: 'Facilitator Health', value: '100%', delta: 'All Systems Go', deltaType: 'neutral' }
    ];

    return (
        <div className="space-y-8">
            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_#000]">
                        <div className="text-[10px] text-neutral-500 font-black uppercase tracking-widest truncate">{kpi.label}</div>
                        <div className="mt-2 text-3xl font-black tracking-tighter tabular-nums text-black">{kpi.value}</div>
                        <div className="mt-3 flex items-center gap-1 text-[11px] font-black uppercase">
                            {kpi.deltaType === 'positive' && <ArrowUp size={12} className="text-emerald-600 stroke-[3]" />}
                            {kpi.deltaType === 'negative' && <ArrowDown size={12} className="text-red-600 stroke-[3]" />}
                            {kpi.deltaType === 'neutral' && <Minus size={12} className="text-neutral-400 stroke-[3]" />}
                            <span className={
                                kpi.deltaType === 'positive' ? 'text-emerald-600' :
                                    kpi.deltaType === 'negative' ? 'text-red-600' : 'text-neutral-500'
                            }>{kpi.delta}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Main Chart */}
                <div className="col-span-12 lg:col-span-8 bg-white p-8 border-2 border-black shadow-[8px_8px_0px_#000]">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black uppercase tracking-tight text-black italic">Request Volume (24h)</h2>
                        <select className="text-xs border-2 border-black px-2 py-1 font-bold uppercase">
                            <option>Last 24h</option>
                            <option>Last 7d</option>
                        </select>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={CHART_DATA}>
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#B6FF2E" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#B6FF2E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#000" strokeWidth={1} strokeOpacity={0.1} />
                                <XAxis
                                    dataKey="time"
                                    axisLine={{ stroke: '#000', strokeWidth: 2 }}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#000', fontWeight: 800 }}
                                />
                                <YAxis
                                    axisLine={{ stroke: '#000', strokeWidth: 2 }}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#000', fontWeight: 800 }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '0', boxShadow: '4px 4px 0px #000' }}
                                    itemStyle={{ color: '#000', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}
                                    labelStyle={{ fontWeight: 900, marginBottom: '4px' }}
                                />
                                <Area type="stepAfter" dataKey="volume" stroke="#000" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Routes */}
                <div className="col-span-12 lg:col-span-4 bg-white p-8 border-2 border-black shadow-[8px_8px_0px_#000] flex flex-col">
                    <h2 className="text-xl font-black uppercase tracking-tight text-black mb-6">Top Routes</h2>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] text-neutral-500 font-black uppercase tracking-widest bg-neutral-50 border-b-2 border-black">
                                <tr>
                                    <th className="py-3 pl-2">Path</th>
                                    <th className="py-3 text-right pr-2">Vol</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-black/5">
                                {[
                                    { path: '/v1/chat/completions', vol: '452k' },
                                    { path: '/v1/search', vol: '128k' },
                                    { path: '/v2/image/gen', vol: '84k' },
                                    { path: '/v1/market/data', vol: '12k' }
                                ].map((row, i) => (
                                    <tr key={i} className="hover:bg-primary/5">
                                        <td className="py-3 pl-2 font-mono text-xs font-bold text-black">{row.path}</td>
                                        <td className="py-3 text-right pr-2 tabular-nums font-black">{row.vol}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button className="mt-6 w-full py-3 text-xs font-black uppercase tracking-widest bg-neutral-100 border-2 border-black hover:bg-primary transition-colors">
                        View All Routes
                    </button>
                </div>
            </div>
        </div>
    );
}