'use client';

import { useWorldStore } from '@/lib/store';

export function StatusBar() {
    const { humanVerified, creditsRemaining, humanUsageRemaining } = useWorldStore();

    const balance = creditsRemaining != null
        ? `${creditsRemaining} credits`
        : humanUsageRemaining != null
            ? `${humanUsageRemaining} free`
            : null;

    return (
        <div style={{
            background: 'var(--neutral-900)',
            borderBottom: '2px solid var(--neutral-700)',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        }}>
            <span style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                P402
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {humanVerified && (
                    <span className="badge-verified">VERIFIED</span>
                )}
                {balance && (
                    <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                        {balance}
                    </span>
                )}
            </div>
        </div>
    );
}
