'use client';

/**
 * Settings screen — reputation, balance summary, routing preferences.
 */

import { useWorldStore } from '@/lib/store';
import { BottomNav } from '../components/BottomNav';
import { StatusBar } from '../components/StatusBar';

export default function SettingsPage() {
    const { walletAddress, humanVerified, creditsRemaining, reputationScore, reset } = useWorldStore();

    const truncateAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <StatusBar />

            <div style={{ flex: 1, padding: '16px 16px 80px', overflowY: 'auto' }}>
                <h1 style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 20 }}>
                    Settings
                </h1>

                {/* Identity */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                        Identity
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--neutral-400)' }}>Wallet</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                            {walletAddress ? truncateAddr(walletAddress) : 'Not connected'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--neutral-400)' }}>World ID</span>
                        {humanVerified
                            ? <span className="badge-verified">Verified</span>
                            : <span style={{ fontSize: 13, color: 'var(--neutral-400)' }}>Not verified</span>
                        }
                    </div>
                    {reputationScore != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: 'var(--neutral-400)' }}>Reputation</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                                {(reputationScore * 100).toFixed(0)}/100
                            </span>
                        </div>
                    )}
                </div>

                {/* Balance */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                        Credits
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 900, color: 'var(--primary)' }}>
                        {creditsRemaining?.toLocaleString() ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--neutral-400)', marginTop: 4 }}>
                        {creditsRemaining != null ? `≈ $${(creditsRemaining / 100).toFixed(2)} USD` : 'Open Credits tab to fund'}
                    </div>
                </div>

                {/* Routing */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
                        Default routing mode
                    </div>
                    {(['cost', 'balanced', 'quality', 'speed'] as const).map(mode => (
                        <div key={mode} style={{
                            padding: '10px 0',
                            borderBottom: '1px solid var(--neutral-700)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <span style={{ textTransform: 'capitalize', fontSize: 14 }}>{mode}</span>
                            {mode === 'cost' && (
                                <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                                    default
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Danger zone */}
                <button
                    onClick={reset}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: '2px solid var(--neutral-700)',
                        color: 'var(--neutral-400)',
                        padding: '12px',
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        marginTop: 8,
                    }}
                >
                    Clear local data
                </button>
            </div>

            <BottomNav active="settings" />
        </div>
    );
}
