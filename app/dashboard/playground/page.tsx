"use client";

import { useState } from 'react';
import { P402Client, Session, Policy } from '@p402/sdk';
import { Card, Button } from '../_components/ui';
import { useWallet } from '@/hooks/useWallet';

const client = new P402Client({ routerUrl: '/api' }); // Use local API proxy

export default function PlaygroundPage() {
    const { address, isConnected } = useWallet();
    const [messages, setMessages] = useState<any[]>([
        { role: 'system', content: 'You are a helpful AI assistant.' }
    ]);
    const [chatLoading, setChatLoading] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [policy, setPolicy] = useState<Policy | null>(null);

    // 1. Test Chat Completion
    const handleChat = async () => {
        setChatLoading(true);
        try {
            const userMsg = { role: 'user', content: 'Explain quantum computing in one sentence.' };
            const newHistory = [...messages, userMsg];
            setMessages(newHistory);

            const res = await client.chat({
                messages: newHistory,
                p402: { mode: 'speed', cache: true }
            });

            if (res.choices?.[0]?.message) {
                setMessages([...newHistory, res.choices[0].message]);
            } else {
                throw new Error('No response from AI');
            }
        } catch (err: any) {
            console.error(err);
            alert(`Chat failed: ${err.message}`);
        } finally {
            setChatLoading(false);
        }
    };

    // 2. Test Session Creation
    const handleCreateSession = async () => {
        try {
            const s = await client.createSession({
                budget_usd: 10.0,
                expires_in_hours: 24,
                wallet_address: address || undefined
            });
            setSession(s);
        } catch (err: any) {
            alert(`Session creation failed: ${err.message}`);
        }
    };

    // 3. Test Policy Creation
    const handleCreatePolicy = async () => {
        try {
            const p = await client.createPolicy({
                name: "Playground Policy",
                rules: { allowed_models: ["gpt-4o", "claude-3-haiku"] }
            });
            setPolicy(p);
        } catch (err: any) {
            alert(`Policy creation failed: ${err.message}`);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-black uppercase tracking-tight">SDK Playground</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Chat Card */}
                <Card className="p-6 space-y-4 border-2 border-black shadow-[4px_4px_0_0_#000]">
                    <h2 className="text-lg font-bold uppercase">AI Chat</h2>
                    <div className="h-[300px] overflow-y-auto bg-neutral-100 p-4 border border-black font-mono text-xs space-y-2">
                        {messages.map((m, i) => (
                            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                                <span className={m.role === 'user' ? 'bg-black text-white px-2 py-1' : 'bg-white border border-black px-2 py-1'}>
                                    {m.content}
                                </span>
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleChat} disabled={chatLoading} className="w-full">
                        {chatLoading ? 'Thinking...' : 'Send Message'}
                    </Button>
                </Card>

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
                    <Button onClick={handleCreatePolicy} variant="ghost" className="w-full border-black border-2">
                        Create Policy
                    </Button>
                </Card>
            </div>
        </div>
    );
}
