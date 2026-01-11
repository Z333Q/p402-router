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
        const latencies = events.map(e => e.latency).sort((a,b) => a-b);
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
      { label: 'Settled', value: stats.settled.toString(), delta: `${((stats.settled/stats.total || 0)*100).toFixed(0)}%`, deltaType: 'positive' },
      { label: 'Denied', value: stats.denied.toString(), delta: `${((stats.denied/stats.total || 0)*100).toFixed(0)}%`, deltaType: stats.denied > 5 ? 'negative' : 'positive' },
      { label: 'p95 Latency', value: `${stats.p95}ms`, delta: '<100ms Target', deltaType: stats.p95 < 100 ? 'positive' : 'negative' },
      { label: 'Facilitator Health', value: '100%', delta: 'All Systems Go', deltaType: 'neutral' }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
            <div className="text-xs text-neutral-500 font-medium truncate">{kpi.label}</div>
            <div className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-neutral-900">{kpi.value}</div>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
                {kpi.deltaType === 'positive' && <ArrowUp size={12} className="text-emerald-600" />}
                {kpi.deltaType === 'negative' && <ArrowDown size={12} className="text-red-600" />}
                {kpi.deltaType === 'neutral' && <Minus size={12} className="text-neutral-400" />}
                <span className={
                    kpi.deltaType === 'positive' ? 'text-emerald-600' : 
                    kpi.deltaType === 'negative' ? 'text-red-600' : 'text-neutral-500'
                }>{kpi.delta}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-neutral-900">Request Volume (24h)</h2>
                <select className="text-xs border-neutral-200 rounded-lg text-neutral-600">
                    <option>Last 24h</option>
                    <option>Last 7d</option>
                </select>
            </div>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CHART_DATA}>
                        <defs>
                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0EA5A4" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#0EA5A4" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}
                            itemStyle={{color: '#0F172A', fontSize: '12px', fontWeight: 600}}
                        />
                        <Area type="monotone" dataKey="volume" stroke="#0EA5A4" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Top Routes */}
        <div className="col-span-12 lg:col-span-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">Top Routes</h2>
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-neutral-500 font-medium bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="py-2 pl-2">Path</th>
                            <th className="py-2 text-right pr-2">Vol</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        <tr>
                            <td className="py-3 pl-2 font-mono text-xs text-neutral-700">/v1/chat/completions</td>
                            <td className="py-3 text-right pr-2 tabular-nums">452k</td>
                        </tr>
                        <tr>
                            <td className="py-3 pl-2 font-mono text-xs text-neutral-700">/v1/search</td>
                            <td className="py-3 text-right pr-2 tabular-nums">128k</td>
                        </tr>
                        <tr>
                            <td className="py-3 pl-2 font-mono text-xs text-neutral-700">/v2/image/gen</td>
                            <td className="py-3 text-right pr-2 tabular-nums">84k</td>
                        </tr>
                        <tr>
                            <td className="py-3 pl-2 font-mono text-xs text-neutral-700">/v1/market/data</td>
                            <td className="py-3 text-right pr-2 tabular-nums">12k</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <button className="mt-4 w-full py-2 text-xs font-medium text-neutral-600 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                View All Routes
            </button>
        </div>
      </div>
    </div>
  );
}