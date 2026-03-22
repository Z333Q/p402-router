'use client';

/**
 * Chat screen — default home screen of the P402 World Mini App.
 *
 * Users in World App are already verified humans.
 * Zero-friction: open the mini app → chat immediately with free credits.
 */

import { useState, useEffect, useRef } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useWorldStore } from '@/lib/store';
import { BottomNav } from './components/BottomNav';
import { StatusBar } from './components/StatusBar';

const P402_URL = process.env.NEXT_PUBLIC_P402_URL ?? 'https://p402.io';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatPage() {
    const { walletAddress, creditsRemaining, humanUsageRemaining, setWallet, setCredits, setHumanUsage, setVerified } = useWorldStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // On mount: wallet auth + fetch balance
    useEffect(() => {
        initWallet();
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function initWallet() {
        if (!MiniKit.isInstalled()) return;
        try {
            const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
                nonce: crypto.randomUUID(),
                expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                statement: 'Sign in to P402 AI Router',
            });
            if (finalPayload.status === 'success') {
                setWallet(finalPayload.address);
                setVerified(true);
                // Fetch P402 API key for this wallet (via SIWE session)
                await fetchSession(finalPayload.address, finalPayload.signature, finalPayload.message);
            }
        } catch { /* World App not available in browser preview */ }
    }

    async function fetchSession(address: string, signature: string, message: string) {
        try {
            const res = await fetch(`${P402_URL}/api/v1/world-mini/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, signature, message }),
            });
            if (res.ok) {
                const d = await res.json() as { api_key?: string; credits_remaining?: number; usage_remaining?: number };
                if (d.api_key) setApiKey(d.api_key);
                if (d.credits_remaining != null) setCredits(d.credits_remaining);
                if (d.usage_remaining != null) setHumanUsage(d.usage_remaining);
            }
        } catch { /* non-blocking */ }
    }

    async function sendMessage() {
        const msg = input.trim();
        if (!msg || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

            const res = await fetch(`${P402_URL}/api/v2/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: msg }],
                    p402: { mode: 'cost' },
                }),
            });

            const d = await res.json() as {
                choices?: Array<{ message?: { content?: string } }>;
                p402_metadata?: { credits_balance?: number | null; human_usage_remaining?: number | null };
                error?: unknown;
            };

            const reply = d.choices?.[0]?.message?.content ?? 'No response.';
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

            // Update balance from response metadata
            if (d.p402_metadata?.credits_balance != null) setCredits(d.p402_metadata.credits_balance);
            if (d.p402_metadata?.human_usage_remaining != null) setHumanUsage(d.p402_metadata.human_usage_remaining);

        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Request failed. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    }

    const balanceDisplay = creditsRemaining != null
        ? `${creditsRemaining} credits`
        : humanUsageRemaining != null
            ? `${humanUsageRemaining} free uses`
            : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
            <StatusBar />

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 80px' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '20%', color: 'var(--neutral-400)' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                        <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--neutral-50)', textTransform: 'uppercase', marginBottom: 8 }}>
                            P402 AI Router
                        </div>
                        <div style={{ fontSize: 13 }}>
                            Route across 300+ AI models. Free trial included.
                        </div>
                        {balanceDisplay && (
                            <div style={{ marginTop: 12, color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
                                {balanceDisplay} available
                            </div>
                        )}
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} style={{
                        marginBottom: 12,
                        display: 'flex',
                        justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                        <div style={{
                            maxWidth: '80%',
                            padding: '10px 14px',
                            background: m.role === 'user' ? 'var(--primary)' : 'var(--neutral-800)',
                            color: m.role === 'user' ? 'var(--neutral-900)' : 'var(--neutral-50)',
                            border: `2px solid ${m.role === 'user' ? 'var(--primary)' : 'var(--neutral-700)'}`,
                            fontSize: 14,
                            lineHeight: 1.5,
                            fontWeight: m.role === 'user' ? 700 : 400,
                        }}>
                            {m.content}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                        <div className="card" style={{ padding: '10px 14px', color: 'var(--neutral-400)', fontSize: 14 }}>
                            Routing…
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div style={{
                position: 'fixed',
                bottom: 56,
                left: 0,
                right: 0,
                background: 'var(--neutral-900)',
                borderTop: '2px solid var(--neutral-700)',
                display: 'flex',
                padding: '8px 12px',
                gap: 8,
            }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask anything…"
                    disabled={loading}
                    style={{
                        flex: 1,
                        background: 'var(--neutral-800)',
                        border: '2px solid var(--neutral-700)',
                        color: 'var(--neutral-50)',
                        padding: '10px 12px',
                        fontSize: 14,
                        outline: 'none',
                    }}
                />
                <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="btn-primary"
                    style={{ padding: '10px 16px', opacity: loading || !input.trim() ? 0.4 : 1 }}
                >
                    →
                </button>
            </div>

            <BottomNav active="chat" />
        </div>
    );
}
