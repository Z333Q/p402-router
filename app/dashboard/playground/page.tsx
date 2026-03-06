"use client";

import { useState } from 'react';
import { P402Client, Session, Policy } from '@p402/sdk';
import { Card, Button } from '../_components/ui';
import { useWallet } from '@/hooks/useWallet';
import { AuditPanel } from '../_components/audit/AuditPanel';
import { AuditGateBanner } from '../_components/audit/AuditGateBanner';
import { useFundWallet } from '../_components/FundWalletModal';
import type { AuditContractPayload } from '@/lib/types/audit';

const client = new P402Client({ routerUrl: '' });

// Errors that signal the user needs to fund their wallet
const FUNDING_ERROR_CODES = ['INSUFFICIENT_FUNDS', 'BALANCE_TOO_LOW', 'PAYMENT_REQUIRED'];

function isFundingError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    return (
        msg.includes('insufficient') ||
        msg.includes('balance') ||
        msg.includes('fund') ||
        FUNDING_ERROR_CODES.some(code => err.message.includes(code))
    );
}

export default function PlaygroundPage() {
    const initialAuditData: AuditContractPayload | null = null;
    const tenantId: string | undefined = undefined;
    const { address } = useWallet();
    const { openFundModal } = useFundWallet();

    const [messages, setMessages] = useState<any[]>([
        { role: 'system', content: 'You are a helpful AI assistant.' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);

    const [session, setSession] = useState<Session | null>(null);
    const [sessionError, setSessionError] = useState<string | null>(null);

    const [policy, setPolicy] = useState<Policy | null>(null);
    const [policyError, setPolicyError] = useState<string | null>(null);

    const [taskSuccess, setTaskSuccess] = useState(false);

    const handleChat = async () => {
        const text = chatInput.trim();
        if (!text) return;
        setChatLoading(true);
        setChatError(null);
        setChatInput('');
        try {
            const userMsg = { role: 'user', content: text };
            const newHistory = [...messages, userMsg];
            setMessages(newHistory);

            const res = await client.chat({
                messages: newHistory,
                p402: { mode: 'speed', cache: true }
            });

            if (res.choices?.[0]?.message) {
                setMessages([...newHistory, res.choices[0].message]);
                setTaskSuccess(true);
            } else {
                throw new Error('No response from AI');
            }
        } catch (err: any) {
            if (isFundingError(err)) {
                openFundModal();
            } else {
                setChatError(err.message ?? 'Chat request failed.');
            }
        } finally {
            setChatLoading(false);
        }
    };

    const handleCreateSession = async () => {
        setSessionError(null);
        try {
            const s = await client.createSession({
                budget_usd: 10.0,
                expires_in_hours: 24,
                wallet_address: address || undefined
            });
            setSession(s);
        } catch (err: any) {
            if (isFundingError(err)) {
                openFundModal();
            } else {
                setSessionError(err.message ?? 'Session creation failed.');
            }
        }
    };

    const handleCreatePolicy = async () => {
        setPolicyError(null);
        try {
            const p = await client.createPolicy({
                name: "Playground Policy",
                rules: { allowed_models: ["gpt-4o", "claude-3-haiku"] }
            });
            setPolicy(p);
        } catch (err: any) {
            setPolicyError(err.message ?? 'Policy creation failed.');
        }
    };

    const effectiveTenantId = tenantId || 'default';

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-black uppercase tracking-tight">SDK Playground</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Interactive Tools */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Chat Card */}
                    <Card className="p-6 space-y-4 border-2 border-black shadow-[4px_4px_0_0_#000]">
                        <h2 className="text-lg font-bold uppercase">AI Chat</h2>
                        <div className="h-[300px] overflow-y-auto bg-neutral-100 p-4 border border-black font-mono text-xs space-y-2">
                            {messages.filter(m => m.role !== 'system').map((m, i) => (
                                <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                                    <span className={m.role === 'user' ? 'bg-black text-white px-2 py-1' : 'bg-white border border-black px-2 py-1'}>
                                        {m.content}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {chatError && (
                            <p className="text-[11px] font-bold text-error border-2 border-error px-3 py-2">
                                {chatError}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !chatLoading && handleChat()}
                                placeholder="Type a message..."
                                disabled={chatLoading}
                                className="flex-1 border-2 border-black px-3 py-2 font-mono text-xs bg-white focus:outline-none focus:bg-neutral-50 disabled:opacity-50"
                            />
                            <Button onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
                                {chatLoading ? 'Thinking...' : 'Send'}
                            </Button>
                        </div>
                    </Card>

                    {/* Success Panel — PLG Trigger */}
                    {taskSuccess && (
                        <div className="bg-green-100 border-2 border-black p-4 rounded-none">
                            <h3 className="font-bold uppercase text-sm mb-2 text-green-900">✓ Task Completed Successfully</h3>
                            <p className="text-sm text-green-800 font-mono mb-3">
                                A2A receipt generated. Run an audit to verify your integration health.
                            </p>
                            <AuditGateBanner
                                state="preview"
                                featureName="Scheduled Audits"
                                prompt={{
                                    target_plan: 'Pro',
                                    body: 'Pro adds scheduled audits, alerting, and regressions.',
                                    cta_route: '/dashboard/billing',
                                }}
                            />
                        </div>
                    )}

                    {/* Session Manager */}
                    <Card className="p-6 space-y-4 border-2 border-black shadow-[4px_4px_0_0_#000]">
                        <h2 className="text-lg font-bold uppercase">Session Manager</h2>
                        <div className="bg-neutral-100 p-4 border border-black font-mono text-xs min-h-[100px]">
                            {session ? (
                                <pre>{JSON.stringify(session, null, 2)}</pre>
                            ) : (
                                <p className="text-neutral-400 text-center pt-8">No Active Session</p>
                            )}
                        </div>
                        {sessionError && (
                            <p className="text-[11px] font-bold text-error border-2 border-error px-3 py-2">
                                {sessionError}
                            </p>
                        )}
                        <Button onClick={handleCreateSession} variant="secondary" className="w-full">
                            Create $10 Session
                        </Button>
                    </Card>

                    {/* Governance */}
                    <Card className="p-6 space-y-4 border-2 border-black shadow-[4px_4px_0_0_#000]">
                        <h2 className="text-lg font-bold uppercase">Governance Policy</h2>
                        <div className="bg-neutral-100 p-4 border border-black font-mono text-xs min-h-[100px]">
                            {policy ? (
                                <pre>{JSON.stringify(policy, null, 2)}</pre>
                            ) : (
                                <p className="text-neutral-400 text-center pt-8">No Policy Loaded</p>
                            )}
                        </div>
                        {policyError && (
                            <p className="text-[11px] font-bold text-error border-2 border-error px-3 py-2">
                                {policyError}
                            </p>
                        )}
                        <Button onClick={handleCreatePolicy} variant="ghost" className="w-full border-black border-2">
                            Create Policy
                        </Button>
                    </Card>
                </div>

                {/* Right Column: Audit PLG Funnel */}
                <div className="flex flex-col gap-6">
                    <AuditPanel
                        scopeType="tenant"
                        scopeId={effectiveTenantId}
                        initialData={initialAuditData || null}
                    />
                </div>
            </div>
        </div>
    );
}
