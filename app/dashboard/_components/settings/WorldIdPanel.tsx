'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ShieldCheck, ShieldAlert, Globe, ExternalLink, RefreshCw } from 'lucide-react';

interface AgentkitLookupResult {
    address: string;
    registered: boolean;
    agentkit_enabled: boolean;
    network: string;
    message?: string;
}

interface ReputationResult {
    registered: boolean;
    reputation: {
        score: number;
        components: {
            settlement: number;
            session: number;
            dispute: number;
            sentinel: number;
        };
        activity: {
            settled_count: number;
            session_count: number;
            dispute_count: number;
            anomaly_count: number;
        };
        first_seen_at: string | null;
        last_updated_at: string | null;
    } | null;
}

export function WorldIdPanel() {
    const { address, isConnected } = useAccount();
    const [lookup, setLookup] = useState<AgentkitLookupResult | null>(null);
    const [reputation, setReputation] = useState<ReputationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchStatus(addr: string) {
        setLoading(true);
        setError(null);
        try {
            const [lookupRes, repRes] = await Promise.all([
                fetch(`/api/v1/agentkit/lookup?address=${addr}`),
                fetch(`/api/v2/agents/${addr}/reputation`),
            ]);
            if (lookupRes.ok) setLookup(await lookupRes.json());
            if (repRes.ok) setReputation(await repRes.json());
        } catch {
            setError('Failed to fetch World ID status');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (address) fetchStatus(address);
    }, [address]);

    const isVerified = lookup?.registered === true;
    const score = reputation?.reputation?.score ?? null;

    return (
        <div className="card border-2 border-black bg-[var(--neutral-50)] text-black p-6">
            <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-4">
                <Globe className="w-6 h-6" />
                <h2 className="text-xl font-bold uppercase tracking-wide">World ID Verification</h2>
                {isVerified && (
                    <span className="ml-auto badge badge-primary text-xs font-bold">VERIFIED HUMAN</span>
                )}
            </div>

            {!isConnected ? (
                <p className="text-[var(--neutral-400)] font-mono text-sm">
                    Connect your wallet to check World ID verification status.
                </p>
            ) : loading ? (
                <div className="flex items-center gap-2 text-[var(--neutral-400)] font-mono text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Checking AgentBook...
                </div>
            ) : error ? (
                <p className="text-[var(--error)] font-mono text-sm">{error}</p>
            ) : (
                <div className="space-y-4">
                    {/* Verification Status */}
                    <div className="flex items-start gap-3 p-4 border-2 border-black bg-[var(--neutral-800)]">
                        {isVerified ? (
                            <ShieldCheck className="w-8 h-8 text-[var(--primary)] shrink-0 mt-0.5" />
                        ) : (
                            <ShieldAlert className="w-8 h-8 text-[var(--warning)] shrink-0 mt-0.5" />
                        )}
                        <div>
                            <p className="font-bold text-[var(--neutral-50)] uppercase tracking-wide">
                                {isVerified ? 'Verified Human' : 'Not Verified'}
                            </p>
                            <p className="text-[var(--neutral-400)] font-mono text-sm mt-1">
                                {isVerified
                                    ? `Your wallet is registered in AgentBook on ${lookup?.network ?? 'Base'}.`
                                    : 'Your wallet is not registered in World AgentBook.'}
                            </p>
                            {address && (
                                <p className="text-[var(--neutral-400)] font-mono text-xs mt-1 truncate">
                                    {address}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Benefits */}
                    {isVerified ? (
                        <div className="space-y-2">
                            <p className="font-bold text-sm uppercase tracking-wide">Verified Benefits Active</p>
                            <ul className="space-y-1 text-sm font-mono text-[var(--neutral-700)]">
                                <li className="flex items-center gap-2">
                                    <span className="text-[var(--primary)] font-bold">✓</span>
                                    5 free trial AI completions per endpoint
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-[var(--primary)] font-bold">✓</span>
                                    2,000 req/hr rate limit (vs 1,000 unverified)
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-[var(--primary)] font-bold">✓</span>
                                    Human-anchored reputation score
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-[var(--primary)] font-bold">✓</span>
                                    Mandate violations tracked to your identity
                                </li>
                            </ul>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="font-bold text-sm uppercase tracking-wide">How to Verify</p>
                            <ol className="space-y-1 text-sm font-mono text-[var(--neutral-700)] list-decimal list-inside">
                                <li>Install the World App on your phone</li>
                                <li>Complete World ID verification (Orb or Device)</li>
                                <li>Register your wallet in AgentBook via the P402 CLI:</li>
                            </ol>
                            <pre className="bg-[var(--neutral-800)] text-[var(--primary)] p-3 text-xs font-mono overflow-x-auto">
{`p402 agent register ${address ?? '<your-wallet>'}`}
                            </pre>
                            <a
                                href="https://world.org/world-id"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-mono text-[var(--primary)] hover:underline"
                            >
                                Learn about World ID <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}

                    {/* Reputation Score */}
                    {isVerified && score !== null && (
                        <div className="border-t-2 border-black pt-4">
                            <p className="font-bold text-sm uppercase tracking-wide mb-3">Human Reputation Score</p>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="text-4xl font-bold font-mono">
                                    {(score * 100).toFixed(0)}
                                </div>
                                <div className="text-sm text-[var(--neutral-400)] font-mono">/ 100</div>
                                <div className={`badge text-xs font-bold ml-auto ${
                                    score >= 0.7 ? 'badge-primary' :
                                    score >= 0.5 ? 'bg-[var(--warning)] text-black' :
                                    'bg-[var(--error)] text-white'
                                }`}>
                                    {score >= 0.7 ? 'GOOD' : score >= 0.5 ? 'NEUTRAL' : 'LOW'}
                                </div>
                            </div>

                            {reputation?.reputation?.components && (
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    {Object.entries(reputation.reputation.components).map(([key, val]) => (
                                        <div key={key} className="flex justify-between border border-[var(--neutral-300)] p-2">
                                            <span className="uppercase text-[var(--neutral-400)]">{key}</span>
                                            <span className="font-bold">{(Number(val) * 100).toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {reputation?.reputation?.activity && (
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="text-[var(--neutral-400)]">
                                        Settlements: <span className="text-black font-bold">{reputation.reputation.activity.settled_count}</span>
                                    </div>
                                    <div className="text-[var(--neutral-400)]">
                                        Sessions: <span className="text-black font-bold">{reputation.reputation.activity.session_count}</span>
                                    </div>
                                    <div className="text-[var(--neutral-400)]">
                                        Disputes: <span className="text-black font-bold">{reputation.reputation.activity.dispute_count}</span>
                                    </div>
                                    <div className="text-[var(--neutral-400)]">
                                        Anomalies: <span className="text-black font-bold">{reputation.reputation.activity.anomaly_count}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Refresh */}
                    {address && (
                        <button
                            onClick={() => fetchStatus(address)}
                            className="btn btn-secondary text-xs flex items-center gap-1"
                            disabled={loading}
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Status
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
