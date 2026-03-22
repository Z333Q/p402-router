'use client';

/**
 * Credits screen — purchase P402 credits via MiniKit Pay (USDC on Base).
 */

import { useState } from 'react';
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from '@worldcoin/minikit-js';
import { useWorldStore } from '@/lib/store';
import { BottomNav } from '../components/BottomNav';
import { StatusBar } from '../components/StatusBar';

const P402_URL = process.env.NEXT_PUBLIC_P402_URL ?? 'https://p402.io';

// Credit purchase tiers
const TIERS = [
    { credits: 500,    usd: 5.00,  label: '$5',   badge: null },
    { credits: 1100,   usd: 10.00, label: '$10',  badge: '+10% bonus' },
    { credits: 6000,   usd: 50.00, label: '$50',  badge: '+20% bonus' },
    { credits: 15000,  usd: 100.00, label: '$100', badge: '+50% bonus' },
];

// P402 treasury address on Base
const TREASURY = '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6';

export default function FundPage() {
    const { creditsRemaining, setCredits } = useWorldStore();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function purchaseTier(tier: typeof TIERS[number]) {
        if (loading) return;
        setLoading(true);
        setSuccess(null);
        setError(null);

        try {
            // Get payment initiation from P402 backend
            const initRes = await fetch(`${P402_URL}/api/v2/credits/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credits: tier.credits }),
            });

            const initData = await initRes.json() as { reference_id?: string; error?: unknown };
            if (!initRes.ok || !initData.reference_id) {
                throw new Error('Failed to initiate purchase');
            }

            const referenceId = initData.reference_id;

            // MiniKit Pay — USDC on Base
            const payload: PayCommandInput = {
                reference: referenceId,
                to: TREASURY,
                tokens: [{
                    symbol: Tokens.USDCE,
                    token_amount: tokenToDecimals(tier.usd, Tokens.USDCE).toString(),
                }],
                description: `P402 credits: ${tier.credits} (${tier.label})`,
            };

            const { finalPayload } = await MiniKit.commandsAsync.pay(payload);

            if (finalPayload.status === 'success') {
                // Confirm with P402 backend
                const confirmRes = await fetch(`${P402_URL}/api/v2/credits/purchase`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        credits: tier.credits,
                        payment_tx_hash: finalPayload.transaction_id,
                    }),
                });
                const confirmData = await confirmRes.json() as { new_balance?: number };
                if (confirmData.new_balance != null) setCredits(confirmData.new_balance);
                setSuccess(`${tier.credits.toLocaleString()} credits added!`);
            } else {
                setError('Payment was cancelled.');
            }

        } catch (e) {
            setError(e instanceof Error ? e.message : 'Purchase failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <StatusBar />

            <div style={{ flex: 1, padding: '16px 16px 80px', overflowY: 'auto' }}>
                <h1 style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>
                    Buy Credits
                </h1>
                <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginBottom: 20 }}>
                    1 credit = $0.01 USD. Never expire. Pay with USDC via World App.
                </p>

                {creditsRemaining != null && (
                    <div className="card" style={{ marginBottom: 20, background: 'var(--neutral-800)' }}>
                        <div style={{ fontSize: 11, color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Current balance
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'monospace', color: 'var(--primary)', marginTop: 4 }}>
                            {creditsRemaining.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--neutral-400)', marginTop: 2 }}>
                            ≈ ${(creditsRemaining / 100).toFixed(2)} USD
                        </div>
                    </div>
                )}

                {success && (
                    <div style={{ background: 'var(--success)', color: '#000', padding: '12px 16px', fontWeight: 700, marginBottom: 16, border: '2px solid var(--success)' }}>
                        ✓ {success}
                    </div>
                )}

                {error && (
                    <div style={{ background: 'var(--neutral-800)', color: 'var(--error)', padding: '12px 16px', fontWeight: 700, marginBottom: 16, border: '2px solid var(--error)' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {TIERS.map(tier => (
                        <button
                            key={tier.credits}
                            onClick={() => purchaseTier(tier)}
                            disabled={loading}
                            style={{
                                background: 'var(--neutral-800)',
                                border: '2px solid var(--neutral-700)',
                                color: 'var(--neutral-50)',
                                padding: '16px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                opacity: loading ? 0.6 : 1,
                                textAlign: 'left',
                                width: '100%',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 900, fontSize: 18, fontFamily: 'monospace' }}>
                                    {tier.credits.toLocaleString()} credits
                                </div>
                                {tier.badge && (
                                    <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>
                                        {tier.badge}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 900, fontSize: 20 }}>{tier.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--neutral-400)' }}>USDC</div>
                            </div>
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: 24, color: 'var(--neutral-400)', fontSize: 12, lineHeight: 1.6 }}>
                    Credits are consumed when you send requests via P402 (1 credit per $0.01 of provider cost).
                    World ID-verified users also get free trial credits on signup.
                </div>
            </div>

            <BottomNav active="fund" />
        </div>
    );
}
