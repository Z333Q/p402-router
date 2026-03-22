'use client';

import Image from 'next/image';
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Image src="/logo.png" alt="P402" width={24} height={24} style={{ display: 'block' }} />
                <span style={{ fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    P402
                </span>
            </div>
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
