'use client';

/**
 * Chat screen — P402 World Mini App.
 *
 * Audience: builders, vibe coders, agent developers — anyone using LLMs to create.
 * World ID = verified human = free trial credits + access to frontier models.
 * Core value: cost-optimized LLM access via USDC, no credit card needed.
 */

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { MiniKit } from '@worldcoin/minikit-js';
import { useWorldStore } from '@/lib/store';
import { BottomNav } from './components/BottomNav';
import { StatusBar } from './components/StatusBar';

const P402_URL = process.env.NEXT_PUBLIC_P402_URL ?? 'https://p402.io';

// ─── Model options ────────────────────────────────────────────────────────────
// Labelled by use-case, not by model name. Model name is secondary.
const MODES = [
    { id: 'auto',    label: 'AUTO',   sub: 'P402 picks best',     model: null,                          mode: 'balanced', credits: '1–10' },
    { id: 'code',    label: 'CODE',   sub: 'Claude Opus 4.6',     model: 'anthropic/claude-opus-4-6',   mode: null,       credits: '~8'  },
    { id: 'reason',  label: 'REASON', sub: 'ChatGPT 5.4',         model: 'openai/chatgpt-5-4',          mode: null,       credits: '~10' },
    { id: 'fast',    label: 'FAST',   sub: 'Gemini 3.1 Flash',    model: 'google/gemini-3.1-flash',     mode: 'speed',    credits: '~2'  },
    { id: 'cheap',   label: 'CHEAP',  sub: 'DeepSeek R2',         model: 'deepseek/deepseek-r2',        mode: 'cost',     credits: '~1'  },
] as const;

type ModeId = typeof MODES[number]['id'];

// ─── Task templates ───────────────────────────────────────────────────────────
const TASKS = [
    { id: 'code',     label: 'Code',     template: 'Write code that ',                           defaultMode: 'code'   },
    { id: 'debug',    label: 'Debug',    template: 'Debug this error and explain the fix:\n\n',  defaultMode: 'code'   },
    { id: 'agent',    label: 'Agent',    template: 'Help me build an AI agent that ',            defaultMode: 'reason' },
    { id: 'research', label: 'Research', template: 'Research and summarize: ',                   defaultMode: 'fast'   },
    { id: 'write',    label: 'Write',    template: 'Write ',                                     defaultMode: 'auto'   },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface MessageMeta {
    model: string;
    provider: string;
    cost_usd: number;
    credits_spent: number | null;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    meta?: MessageMeta;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatPage() {
    const { creditsRemaining, humanUsageRemaining, setWallet, setCredits, setHumanUsage, setVerified } = useWorldStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [modeId, setModeId] = useState<ModeId>('auto');
    const [showModeSheet, setShowModeSheet] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const activeMode = MODES.find(m => m.id === modeId) ?? MODES[0]!;

    useEffect(() => { initWallet(); }, []);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    async function initWallet() {
        if (!MiniKit.isInstalled()) return;
        try {
            const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
                nonce: crypto.randomUUID(),
                expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                statement: 'Sign in to P402 AI Router',
            });
            if (finalPayload.status !== 'success') return;
            setWallet(finalPayload.address);
            setVerified(true); // World App itself is the sybil gate
            await fetchSession(finalPayload.address, finalPayload.signature, finalPayload.message);
        } catch { /* not in World App */ }
    }

    async function fetchSession(address: string, signature: string, message: string) {
        try {
            const res = await fetch(`${P402_URL}/api/v1/world-mini/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, signature, message }),
            });
            if (res.ok) {
                const d = await res.json() as {
                    api_key?: string;
                    credits_remaining?: number;
                    usage_remaining?: number;
                    human_verified?: boolean;
                };
                if (d.api_key) setApiKey(d.api_key);
                if (d.credits_remaining != null) setCredits(d.credits_remaining);
                if (d.usage_remaining != null) setHumanUsage(d.usage_remaining);
                if (d.human_verified) setVerified(true);
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

            const body: Record<string, unknown> = {
                messages: [...messages, { role: 'user', content: msg }],
                p402: activeMode.model
                    ? { failover: true }
                    : { mode: activeMode.mode ?? 'balanced', failover: true },
            };
            if (activeMode.model) body['model'] = activeMode.model;

            const res = await fetch(`${P402_URL}/api/v2/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            const d = await res.json() as {
                choices?: Array<{ message?: { content?: string } }>;
                model?: string;
                p402_metadata?: {
                    provider?: string;
                    model?: string;
                    cost_usd?: number;
                    credits_spent?: number | null;
                    credits_balance?: number | null;
                    human_usage_remaining?: number | null;
                };
                error?: unknown;
            };

            const reply = d.choices?.[0]?.message?.content ?? 'No response.';
            const meta: MessageMeta | undefined = d.p402_metadata ? {
                model: d.p402_metadata.model ?? d.model ?? activeMode.sub,
                provider: d.p402_metadata.provider ?? '',
                cost_usd: d.p402_metadata.cost_usd ?? 0,
                credits_spent: d.p402_metadata.credits_spent ?? null,
            } : undefined;

            setMessages(prev => [...prev, { role: 'assistant', content: reply, meta }]);

            if (d.p402_metadata?.credits_balance != null) setCredits(d.p402_metadata.credits_balance);
            if (d.p402_metadata?.human_usage_remaining != null) setHumanUsage(d.p402_metadata.human_usage_remaining);

        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Request failed. Check your connection and try again.' }]);
        } finally {
            setLoading(false);
        }
    }

    function applyTask(task: typeof TASKS[number]) {
        setInput(task.template);
        setModeId(task.defaultMode as ModeId);
    }

    const balanceUsd = creditsRemaining != null
        ? `$${(creditsRemaining / 100).toFixed(2)}`
        : humanUsageRemaining != null
            ? `${humanUsageRemaining} free`
            : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', position: 'relative' }}>
            <StatusBar />

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 140px' }}>

                {/* Empty / onboarding state */}
                {messages.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
                        <Image src="/logo.png" alt="P402" width={56} height={56} style={{ marginBottom: 10 }} />
                        <div style={{ fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                            Build with AI.
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--neutral-400)', marginBottom: 4, textAlign: 'center', maxWidth: 270 }}>
                            Claude Opus 4.6, ChatGPT 5.4, Gemini 3.1 and 300+ more.
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--neutral-400)', marginBottom: 20, textAlign: 'center', maxWidth: 270 }}>
                            Pay with USDC. Optimized for agent loops.
                        </div>

                        {balanceUsd && (
                            <div style={{
                                width: '100%',
                                background: 'var(--neutral-800)',
                                border: '2px solid var(--primary)',
                                padding: '10px 14px',
                                marginBottom: 20,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <span style={{ fontSize: 11, color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700 }}>Credit balance</span>
                                <span style={{ fontSize: 15, color: 'var(--primary)', fontWeight: 900, fontFamily: 'monospace' }}>{balanceUsd}</span>
                            </div>
                        )}

                        {/* Task chips */}
                        <div style={{ width: '100%', marginBottom: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, letterSpacing: '0.06em' }}>
                                What are you building?
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                {TASKS.map(task => (
                                    <button
                                        key={task.id}
                                        onClick={() => applyTask(task)}
                                        style={{
                                            background: 'var(--neutral-800)',
                                            border: '2px solid var(--neutral-700)',
                                            color: 'var(--neutral-50)',
                                            padding: '8px 14px',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--neutral-700)')}
                                    >
                                        {task.label}
                                    </button>
                                ))}
                            </div>

                            {/* Suggested prompts */}
                            <div style={{ fontSize: 11, color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, letterSpacing: '0.06em' }}>
                                Or try
                            </div>
                            {[
                                'Review this smart contract for reentrancy vulnerabilities',
                                'Build a Python agent that calls P402 API in a loop',
                                'Compare cost: Claude Opus 4.6 vs Gemini 3.1 for 1M tokens',
                                'Write a system prompt for a DeFi research agent',
                            ].map(prompt => (
                                <button
                                    key={prompt}
                                    onClick={() => setInput(prompt)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'left',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: '1px solid var(--neutral-700)',
                                        color: 'var(--neutral-400)',
                                        padding: '10px 0',
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        lineHeight: 1.4,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--neutral-50)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--neutral-400)')}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message thread */}
                {messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: 2,
                        }}>
                            <div style={{
                                maxWidth: '85%',
                                padding: '10px 14px',
                                background: m.role === 'user' ? 'var(--primary)' : 'var(--neutral-800)',
                                color: m.role === 'user' ? 'var(--neutral-900)' : 'var(--neutral-50)',
                                border: `2px solid ${m.role === 'user' ? 'var(--primary)' : 'var(--neutral-700)'}`,
                                fontSize: 14,
                                lineHeight: 1.55,
                                fontWeight: m.role === 'user' ? 700 : 400,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}>
                                {m.content}
                            </div>
                        </div>
                        {/* Cost strip under assistant messages */}
                        {m.role === 'assistant' && m.meta && (
                            <div style={{
                                fontSize: 11,
                                color: 'var(--neutral-400)',
                                fontFamily: 'monospace',
                                paddingLeft: 2,
                                marginBottom: 10,
                                display: 'flex',
                                gap: 10,
                                flexWrap: 'wrap',
                            }}>
                                <span>{m.meta.model}</span>
                                {m.meta.credits_spent != null && (
                                    <span style={{ color: 'var(--primary)' }}>{m.meta.credits_spent} credit{m.meta.credits_spent !== 1 ? 's' : ''}</span>
                                )}
                                {m.meta.cost_usd > 0 && (
                                    <span>${m.meta.cost_usd.toFixed(4)}</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                        <div style={{
                            padding: '10px 14px',
                            background: 'var(--neutral-800)',
                            border: '2px solid var(--neutral-700)',
                            color: 'var(--neutral-400)',
                            fontSize: 13,
                            fontFamily: 'monospace',
                        }}>
                            {activeMode.sub} thinking…
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Mode selector bottom sheet */}
            {showModeSheet && (
                <>
                    <div
                        onClick={() => setShowModeSheet(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40 }}
                    />
                    <div style={{
                        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                        background: 'var(--neutral-800)',
                        borderTop: '2px solid var(--neutral-700)',
                        padding: '16px 16px 40px',
                    }}>
                        <div style={{ fontSize: 11, color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12 }}>
                            Select model
                        </div>
                        {MODES.map(m => (
                            <button
                                key={m.id}
                                onClick={() => { setModeId(m.id); setShowModeSheet(false); }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '100%',
                                    background: modeId === m.id ? 'var(--neutral-900)' : 'transparent',
                                    border: `2px solid ${modeId === m.id ? 'var(--primary)' : 'transparent'}`,
                                    color: 'var(--neutral-50)',
                                    padding: '12px 14px',
                                    marginBottom: 6,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        {m.label}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--neutral-400)', marginTop: 2 }}>
                                        {m.sub}
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                                    {m.credits} cr
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Input area */}
            <div style={{
                position: 'fixed',
                bottom: 56,
                left: 0,
                right: 0,
                background: 'var(--neutral-900)',
                borderTop: '2px solid var(--neutral-700)',
                zIndex: 30,
            }}>
                {/* Model selector pill */}
                <div style={{ padding: '6px 12px 0' }}>
                    <button
                        onClick={() => setShowModeSheet(true)}
                        style={{
                            background: 'var(--neutral-800)',
                            border: '2px solid var(--neutral-700)',
                            color: 'var(--neutral-50)',
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <span style={{ color: 'var(--primary)' }}>{activeMode.label}</span>
                        <span style={{ color: 'var(--neutral-400)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{activeMode.sub}</span>
                        <span style={{ color: 'var(--neutral-700)' }}>▾</span>
                    </button>
                </div>

                {/* Input row */}
                <div style={{ display: 'flex', padding: '6px 12px 8px', gap: 8 }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Ask anything or pick a task above…"
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
            </div>

            <BottomNav active="chat" />
        </div>
    );
}
