'use client';

import React, { useEffect, useState } from 'react';

interface Incident {
    id: string;
    tenant_id: string;
    owner_email: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    status: string;
    trust_score: number | null;
    created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
};

export default function AdminSafetyPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('open');
    const [actionTarget, setActionTarget] = useState<string | null>(null);
    const [actionReason, setActionReason] = useState('');

    const fetchIncidents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/safety/incidents?status=${filter}`);
            const data = await res.json();
            setIncidents(data.incidents || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, [filter]);

    const handleAction = async (incidentId: string, action: string) => {
        try {
            await fetch('/api/admin/safety/incidents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incidentId, action, reason: actionReason }),
            });
            setActionTarget(null);
            setActionReason('');
            await fetchIncidents();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Safety Queue</h1>
                    <p className="mt-1 text-sm text-gray-500">Review, investigate, and act on Safety Pack incidents.</p>
                </div>
                <div className="flex gap-2">
                    {['open', 'investigating', 'resolved', 'false_positive'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            {s.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading incidents...</div>
            ) : incidents.length === 0 ? (
                <div className="text-center py-20 text-gray-400">No incidents found.</div>
            ) : (
                <div className="space-y-4">
                    {incidents.map(inc => (
                        <div key={inc.id} className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${SEVERITY_COLORS[inc.severity] || 'bg-gray-100 text-gray-800'}`}>
                                                {inc.severity}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{inc.category}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 truncate">{inc.description}</p>
                                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                                            <span>Tenant: <span className="font-mono">{inc.owner_email || inc.tenant_id}</span></span>
                                            {inc.trust_score !== null && <span>Trust Score: {inc.trust_score}</span>}
                                            <span>{new Date(inc.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {inc.status === 'open' || inc.status === 'investigating' ? (
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => handleAction(inc.id, 'investigate')}
                                                className="text-xs px-3 py-1.5 rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-medium"
                                            >
                                                Investigate
                                            </button>
                                            <button
                                                onClick={() => setActionTarget(inc.id + ':false_positive')}
                                                className="text-xs px-3 py-1.5 rounded-md bg-green-100 text-green-800 hover:bg-green-200 font-medium"
                                            >
                                                False Positive
                                            </button>
                                            <button
                                                onClick={() => setActionTarget(inc.id + ':ban')}
                                                className="text-xs px-3 py-1.5 rounded-md bg-red-100 text-red-800 hover:bg-red-200 font-medium"
                                            >
                                                Ban
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs shrink-0 px-2 py-1 rounded capitalize bg-gray-100 text-gray-500">{inc.status.replace('_', ' ')}</span>
                                    )}
                                </div>

                                {actionTarget?.startsWith(inc.id) && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <label className="block text-xs text-gray-600 mb-1">Reason (optional)</label>
                                        <input
                                            type="text"
                                            value={actionReason}
                                            onChange={e => setActionReason(e.target.value)}
                                            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="e.g. Confirmed malware injection attempt"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAction(inc.id, actionTarget.split(':')[1]!)}
                                                className="text-xs px-4 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 font-medium"
                                            >
                                                Confirm {actionTarget.split(':')[1]}
                                            </button>
                                            <button
                                                onClick={() => setActionTarget(null)}
                                                className="text-xs px-4 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
