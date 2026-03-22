'use client';

/**
 * Agents screen — browse and invoke P402 Bazaar agents.
 */

import { useState, useEffect } from 'react';
import { useWorldStore } from '@/lib/store';
import { BottomNav } from '../components/BottomNav';
import { StatusBar } from '../components/StatusBar';

const P402_URL = process.env.NEXT_PUBLIC_P402_URL ?? 'https://p402.io';

interface Agent {
    id: string;
    name: string;
    description: string;
    tags: string[];
    price_usd?: number;
    rating?: number;
}

export default function AgentsPage() {
    const { humanVerified } = useWorldStore();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch(`${P402_URL}/api/a2a/agents`)
            .then(r => r.json())
            .then((d: { agents?: Agent[] }) => setAgents(d.agents ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const filtered = agents.filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <StatusBar />

            <div style={{ flex: 1, padding: '16px 16px 80px', overflowY: 'auto' }}>
                <h1 style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>
                    Agent Bazaar
                </h1>
                <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginBottom: 16 }}>
                    Hire specialized AI agents. Pay per task with credits.
                </p>

                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search agents…"
                    style={{
                        width: '100%',
                        background: 'var(--neutral-800)',
                        border: '2px solid var(--neutral-700)',
                        color: 'var(--neutral-50)',
                        padding: '10px 12px',
                        fontSize: 14,
                        outline: 'none',
                        marginBottom: 16,
                    }}
                />

                {loading && (
                    <div style={{ textAlign: 'center', color: 'var(--neutral-400)', padding: 40 }}>
                        Loading agents…
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--neutral-400)', padding: 40 }}>
                        {search ? 'No agents match your search.' : 'No agents available.'}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(agent => (
                        <div key={agent.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div style={{ fontWeight: 900, fontSize: 15 }}>{agent.name}</div>
                                {agent.price_usd != null && (
                                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>
                                        ${agent.price_usd.toFixed(2)}/task
                                    </div>
                                )}
                            </div>
                            <div style={{ color: 'var(--neutral-400)', fontSize: 13, lineHeight: 1.4, marginBottom: 10 }}>
                                {agent.description}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {agent.tags.slice(0, 4).map(tag => (
                                    <span key={tag} style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        background: 'var(--neutral-700)',
                                        color: 'var(--neutral-300)',
                                        padding: '2px 6px',
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {!humanVerified && !loading && (
                    <div style={{
                        marginTop: 24,
                        background: 'var(--neutral-800)',
                        border: '2px solid var(--primary)',
                        padding: 16,
                    }}>
                        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4, color: 'var(--primary)', textTransform: 'uppercase' }}>
                            Get 500 free credits
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--neutral-400)' }}>
                            Open this Mini App in World App to verify your humanity and receive $5 in free credits.
                        </div>
                    </div>
                )}
            </div>

            <BottomNav active="agents" />
        </div>
    );
}
