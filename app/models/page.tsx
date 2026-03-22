'use client';

/**
 * /models — AI Model Comparison + Cost Calculator
 *
 * Live pricing from 300+ models via OpenRouter.
 * Design: Neo-brutalist, aligned to p402-design-system-V2-LATEST.md
 */

import { useState, useEffect, useMemo } from 'react';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

interface Model {
    id: string;
    name: string;
    provider: string;
    description?: string;
    context_window: number;
    max_output_tokens: number;
    pricing: {
        input_per_1k: number;
        output_per_1k: number;
    };
    capabilities: string[];
}

const PROVIDERS = ['All', 'openai', 'anthropic', 'google', 'meta-llama', 'mistralai', 'deepseek', 'groq'];
const CAPABILITIES = ['All', 'code', 'vision', 'reasoning', 'long_context'];
const SORT_OPTIONS: { value: 'cost' | 'context' | 'name'; label: string }[] = [
    { value: 'cost', label: 'Cheapest' },
    { value: 'context', label: 'Largest context' },
    { value: 'name', label: 'Name A–Z' },
];

// 22% average savings from P402 routing + semantic cache
const P402_SAVINGS_PCT = 0.22;

export default function ModelsPage() {
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [provider, setProvider] = useState('All');
    const [capability, setCapability] = useState('All');
    const [sortBy, setSortBy] = useState<'cost' | 'context' | 'name'>('cost');
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);

    // Calculator
    const [inputTokens, setInputTokens] = useState(1000);
    const [outputTokens, setOutputTokens] = useState(500);
    const [requestsPerDay, setRequestsPerDay] = useState(1000);

    useEffect(() => {
        fetch('/api/v2/models')
            .then(r => r.json())
            .then((d: { data?: Model[]; error?: string }) => {
                if (d.error) throw new Error(d.error);
                setModels(d.data ?? []);
            })
            .catch(e => setError(String(e)))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        return models
            .filter(m => {
                if (provider !== 'All' && m.provider !== provider) return false;
                if (capability !== 'All' && !m.capabilities.includes(capability)) return false;
                if (search) {
                    const q = search.toLowerCase();
                    if (!m.id.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q)) return false;
                }
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'cost') return (a.pricing.input_per_1k + a.pricing.output_per_1k) - (b.pricing.input_per_1k + b.pricing.output_per_1k);
                if (sortBy === 'context') return b.context_window - a.context_window;
                return a.name.localeCompare(b.name);
            });
    }, [models, provider, capability, search, sortBy]);

    const calc = useMemo(() => {
        const m = selectedModel ?? filtered[0] ?? null;
        if (!m) return null;
        const dailyCostDirect = ((inputTokens / 1000) * m.pricing.input_per_1k + (outputTokens / 1000) * m.pricing.output_per_1k) * requestsPerDay;
        const dailyCostP402 = dailyCostDirect * (1 - P402_SAVINGS_PCT);
        const monthlySavings = (dailyCostDirect - dailyCostP402) * 30;
        return { model: m, dailyCostDirect, dailyCostP402, monthlySavings };
    }, [selectedModel, filtered, inputTokens, outputTokens, requestsPerDay]);

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <TopNav />

            {/* Hero — black section */}
            <section className="bg-black pt-32 pb-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <span className="text-neutral-500 text-xs font-black uppercase tracking-widest">
                            <span className="font-mono">{'>_'}</span> Product / AI Routing
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-6 leading-tight">
                        300+ models.<br />
                        <span className="heading-accent">one endpoint.</span>
                    </h1>
                    <p className="text-neutral-400 text-lg md:text-xl max-w-2xl font-mono">
                        Live pricing across every major AI provider. P402 routes your requests to the
                        best model automatically — saving 15–40% vs. direct API calls.
                    </p>
                </div>
            </section>

            {/* Stats strip */}
            <section className="bg-black border-t-2 border-neutral-800 border-b-2 border-white py-8 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-3 divide-x-2 divide-neutral-800">
                    <div className="text-center px-4">
                        <div className="text-3xl font-black font-mono text-primary">300+</div>
                        <div className="text-xs font-black uppercase text-neutral-500 mt-1">Models</div>
                    </div>
                    <div className="text-center px-4">
                        <div className="text-3xl font-black font-mono text-primary">22%</div>
                        <div className="text-xs font-black uppercase text-neutral-500 mt-1">Avg Savings</div>
                    </div>
                    <div className="text-center px-4">
                        <div className="text-3xl font-black font-mono text-primary">1%</div>
                        <div className="text-xs font-black uppercase text-neutral-500 mt-1">Platform Fee</div>
                    </div>
                </div>
            </section>

            {/* Cost Calculator — white section */}
            <section className="bg-white border-b-2 border-black py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-black">
                            Cost Calculator
                        </h2>
                        <p className="text-neutral-600 font-mono text-sm mt-1">
                            Select any model below to see your projected costs and savings.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-black uppercase text-black">Input tokens / request</span>
                            <input
                                type="number"
                                value={inputTokens}
                                onChange={e => setInputTokens(Math.max(1, parseInt(e.target.value) || 1))}
                                className="border-2 border-black bg-white text-black px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                            />
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-black uppercase text-black">Output tokens / request</span>
                            <input
                                type="number"
                                value={outputTokens}
                                onChange={e => setOutputTokens(Math.max(1, parseInt(e.target.value) || 1))}
                                className="border-2 border-black bg-white text-black px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                            />
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-black uppercase text-black">Requests / day</span>
                            <input
                                type="number"
                                value={requestsPerDay}
                                onChange={e => setRequestsPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                                className="border-2 border-black bg-white text-black px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                            />
                        </label>
                    </div>

                    {calc && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-2 border-black">
                            <div className="p-5 border-r-2 border-black">
                                <div className="text-xs font-black uppercase text-neutral-500 mb-1">Direct API (daily)</div>
                                <div className="text-2xl font-black font-mono text-black">${calc.dailyCostDirect.toFixed(2)}</div>
                                <div className="text-xs text-neutral-500 mt-1 font-mono truncate">{calc.model.name}</div>
                            </div>
                            <div className="p-5 bg-primary border-r-2 border-black">
                                <div className="text-xs font-black uppercase text-black mb-1">Via P402 (daily)</div>
                                <div className="text-2xl font-black font-mono text-black">${calc.dailyCostP402.toFixed(2)}</div>
                                <div className="text-xs text-black mt-1 font-mono">Routed + cached</div>
                            </div>
                            <div className="p-5 border-r-2 border-black">
                                <div className="text-xs font-black uppercase text-neutral-500 mb-1">Monthly savings</div>
                                <div className="text-2xl font-black font-mono text-black">${calc.monthlySavings.toFixed(0)}</div>
                                <div className="text-xs text-neutral-500 mt-1 font-mono">{Math.round(P402_SAVINGS_PCT * 100)}% avg reduction</div>
                            </div>
                            <div className="p-5 bg-black flex flex-col justify-between">
                                <div className="text-xs font-black uppercase text-neutral-500 mb-2">Start saving</div>
                                <Link href="/onboarding" className="text-sm font-black uppercase text-primary hover:underline">
                                    Get free API key →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Model Table — light grey section */}
            <section className="bg-neutral-100 flex-1 py-16 px-6">
                <div className="max-w-7xl mx-auto">

                    {/* Search + Filter */}
                    <div className="mb-6 flex flex-col gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <input
                                type="text"
                                placeholder="Search models..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="border-2 border-black bg-white text-black placeholder-neutral-500 px-3 py-2 text-sm focus:outline-none focus:border-primary min-w-[200px] font-mono"
                            />
                            <span className="text-xs font-black uppercase text-neutral-500 ml-auto">
                                {loading ? 'Loading…' : `${filtered.length} models`}
                            </span>
                        </div>

                        {/* Provider filter — pill buttons */}
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-black uppercase text-neutral-500 self-center mr-1">Provider</span>
                            {PROVIDERS.map(p => (
                                <button
                                    key={p}
                                    onClick={() => setProvider(p)}
                                    className={`text-xs font-black uppercase px-3 py-1 border-2 transition-colors ${
                                        provider === p
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-black border-black hover:bg-primary hover:border-primary'
                                    }`}
                                >
                                    {p === 'All' ? 'All' : p}
                                </button>
                            ))}
                        </div>

                        {/* Capability filter — pill buttons */}
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-black uppercase text-neutral-500 self-center mr-1">Capability</span>
                            {CAPABILITIES.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setCapability(c)}
                                    className={`text-xs font-black uppercase px-3 py-1 border-2 transition-colors ${
                                        capability === c
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-black border-black hover:bg-primary hover:border-primary'
                                    }`}
                                >
                                    {c === 'All' ? 'All' : c}
                                </button>
                            ))}
                        </div>

                        {/* Sort — pill buttons */}
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-black uppercase text-neutral-500 self-center mr-1">Sort</span>
                            {SORT_OPTIONS.map(s => (
                                <button
                                    key={s.value}
                                    onClick={() => setSortBy(s.value)}
                                    className={`text-xs font-black uppercase px-3 py-1 border-2 transition-colors ${
                                        sortBy === s.value
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-black border-black hover:bg-primary hover:border-primary'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="border-2 border-black bg-white p-8 text-center">
                            <div className="font-mono text-sm text-neutral-500 uppercase font-bold">Loading models…</div>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div className="border-2 border-black bg-white p-8">
                            <div className="text-xs font-black uppercase text-neutral-500 mb-2 font-mono">Error loading live prices</div>
                            <p className="text-sm text-black font-mono">
                                Model pricing is updated hourly from OpenRouter.{' '}
                                <Link href="/docs/api" className="underline font-black">View API docs →</Link>
                            </p>
                        </div>
                    )}

                    {/* Model Table */}
                    {!loading && !error && (
                        <div className="border-2 border-black overflow-x-auto bg-white">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-black bg-black text-white">
                                        <th className="text-left px-4 py-3 font-black uppercase text-xs">Model</th>
                                        <th className="text-left px-4 py-3 font-black uppercase text-xs">Provider</th>
                                        <th className="text-right px-4 py-3 font-black uppercase text-xs">Input / 1K</th>
                                        <th className="text-right px-4 py-3 font-black uppercase text-xs">Output / 1K</th>
                                        <th className="text-right px-4 py-3 font-black uppercase text-xs">Context</th>
                                        <th className="text-left px-4 py-3 font-black uppercase text-xs">Capabilities</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((m) => (
                                        <tr
                                            key={m.id}
                                            className={`border-b border-neutral-200 hover:bg-primary/10 cursor-pointer transition-colors ${
                                                selectedModel?.id === m.id ? 'bg-primary/20 border-l-4 border-l-primary' : ''
                                            }`}
                                            onClick={() => setSelectedModel(m)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-mono font-bold text-xs text-black">{m.name}</div>
                                                <div className="font-mono text-xs text-neutral-500 mt-0.5">{m.id}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-black uppercase bg-black text-white px-2 py-0.5">
                                                    {m.provider}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs text-black">
                                                {m.pricing.input_per_1k === 0
                                                    ? <span className="text-primary font-bold">FREE</span>
                                                    : `$${m.pricing.input_per_1k.toFixed(4)}`}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs text-black">
                                                {m.pricing.output_per_1k === 0
                                                    ? <span className="text-primary font-bold">FREE</span>
                                                    : `$${m.pricing.output_per_1k.toFixed(4)}`}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs text-neutral-500">
                                                {m.context_window > 0 ? `${Math.round(m.context_window / 1000)}K` : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {m.capabilities.filter(c => c !== 'chat').map(c => (
                                                        <span key={c} className="text-xs border border-neutral-300 px-1.5 py-0.5 text-neutral-600 uppercase font-bold">
                                                            {c}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setSelectedModel(m); }}
                                                    className="text-xs font-black uppercase text-black hover:text-primary transition-colors"
                                                >
                                                    Calc →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center">
                                                <div className="text-xs font-black uppercase text-neutral-400 font-mono">No models match your filters</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA — black section */}
            <section className="bg-black border-t-2 border-white py-16 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
                            Route smarter.{' '}
                            <span className="heading-accent">pay less.</span>
                        </h2>
                        <p className="text-neutral-400 font-mono text-sm max-w-xl">
                            P402 routes your AI requests across 300+ models to minimize cost, maximize quality,
                            or hit latency targets — with no lock-in.
                        </p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                        <Link href="/onboarding" className="btn btn-primary px-8 py-3 font-black uppercase text-sm">
                            Get free API key
                        </Link>
                        <Link href="/docs/api" className="btn btn-dark px-8 py-3 font-black uppercase text-sm border-2 border-white text-white hover:bg-white hover:text-black transition-colors">
                            View docs
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
