'use client';

import { useActionState, useState } from 'react';
import { generateApiKeyAction, revokeApiKeyAction, saveWebhookAction } from '@/lib/actions/settings';
import { Copy, AlertTriangle, Key, Webhook, Zap, Info } from 'lucide-react';
import { usePlanUsage } from '@/hooks/usePlanUsage';
import Link from 'next/link';

interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    created_at: Date;
}

export function ApiKeyManager({ existingKeys }: { existingKeys: ApiKey[] }) {
    const [state, formAction, isPending] = useActionState(generateApiKeyAction, { success: false, error: '' } as any);
    const [copied, setCopied] = useState(false);

    const handleCopy = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card border-2 border-black bg-[var(--neutral-50)] text-black p-6">
            <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-4">
                <Key className="w-6 h-6" />
                <h2 className="text-xl font-bold uppercase tracking-wide">Developer API Keys</h2>
            </div>

            <p className="text-[var(--neutral-600)] mb-6 text-sm">
                Use these keys to authenticate your autonomous agents to the P402 A2A API. Do not share your API keys in publicly accessible areas.
            </p>

            {/* New Key Display (Rendered ONLY immediately after creation) */}
            {state.success && state.rawKey && (
                <div className="bg-[var(--warning)] border-2 border-black p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2 font-bold uppercase text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Copy your key now</span>
                    </div>
                    <p className="text-xs font-mono mb-2">You will not be able to see this key again after you leave this page.</p>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-white border-2 border-black p-2 font-mono text-sm break-all">
                            {state.rawKey}
                        </code>
                        <button
                            onClick={() => handleCopy(state.rawKey!)}
                            className="btn bg-black text-white uppercase font-bold px-4 border-2 border-black"
                        >
                            {copied ? 'Copied' : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Create Key Form */}
            <form action={formAction} className="flex gap-4 mb-8 flex-col sm:flex-row">
                <input
                    type="text"
                    name="name"
                    placeholder="e.g., Production A2A Agent"
                    className="flex-1 border-2 border-black p-3 font-mono text-sm outline-none focus:bg-[var(--primary)] focus:bg-opacity-10 transition-colors"
                    required
                />
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn bg-[var(--primary)] text-black font-bold uppercase border-2 border-black px-6 hover:bg-[var(--primary-hover)] whitespace-nowrap"
                >
                    {isPending ? 'Generating...' : 'Create Key'}
                </button>
            </form>

            {/* Existing Keys Table */}
            <div className="border-2 border-black overflow-x-auto">
                <table className="w-full text-left font-mono text-sm min-w-[500px]">
                    <thead className="bg-[var(--neutral-800)] text-white border-b-2 border-black">
                        <tr>
                            <th className="p-3 uppercase tracking-wider text-xs">Name</th>
                            <th className="p-3 uppercase tracking-wider text-xs">Prefix</th>
                            <th className="p-3 uppercase tracking-wider text-xs hidden sm:table-cell">Created</th>
                            <th className="p-3 uppercase tracking-wider text-xs text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {existingKeys.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-[var(--neutral-400)] italic">No active keys.</td>
                            </tr>
                        ) : (
                            existingKeys.map((key) => (
                                <tr key={key.id} className="border-b-2 border-black last:border-b-0 hover:bg-[var(--neutral-300)] transition-colors">
                                    <td className="p-3 font-bold truncate max-w-[150px] sm:max-w-none">{key.name}</td>
                                    <td className="p-3">{key.key_prefix}...</td>
                                    <td className="p-3 hidden sm:table-cell">{new Date(key.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => revokeApiKeyAction(key.id)}
                                            className="text-[var(--error)] hover:text-red-700 font-bold uppercase text-xs underline"
                                        >
                                            Revoke
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function WebhookManager({ currentWebhook, webhookSecret }: { currentWebhook?: string, webhookSecret?: string }) {
    const [state, formAction, isPending] = useActionState(saveWebhookAction, { success: false, message: '', error: '' } as any);
    const [showSecret, setShowSecret] = useState(false);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const { planId, isLoading } = usePlanUsage();

    const isFree = planId === 'free' && !isLoading;

    const handleUpgrade = async () => {
        setIsUpgrading(true)
        try {
            const res = await fetch('/api/v2/billing/checkout', { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Checkout failed: ' + (data.error || 'Unknown error'));
                setIsUpgrading(false);
            }
        } catch (err) {
            alert('Payment system unreachable');
            setIsUpgrading(false);
        }
    }

    return (
        <div className="card border-2 border-black bg-[var(--neutral-50)] text-black p-6 mt-8">
            <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-4">
                <Webhook className="w-6 h-6" />
                <h2 className="text-xl font-bold uppercase tracking-wide">Webhook Configuration</h2>
            </div>

            <p className="text-[var(--neutral-600)] mb-6 text-sm">
                Configure a webhook endpoint to receive asynchronous callbacks for settlement resolutions, incident alerts, and payment receipts.
            </p>

            {state.success && (
                <div className="bg-[var(--success)] text-white font-bold p-3 mb-4 uppercase text-sm border-2 border-black">
                    {state.message}
                </div>
            )}

            {state.error && (
                <div className="bg-[var(--error)] text-white font-bold p-3 mb-4 uppercase text-sm border-2 border-black">
                    {state.error}
                </div>
            )}

            <form action={formAction} className="flex flex-col gap-4 mb-6 relative">
                {isFree && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center border-2 border-black border-dashed">
                        <div className="bg-black text-white p-4 shadow-[4px_4px_0px_#B6FF2E] flex items-center gap-4">
                            <Zap className={`w-5 h-5 text-primary ${isUpgrading ? 'animate-pulse' : ''}`} />
                            <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-widest">{isUpgrading ? 'Redirecting...' : 'Webhooks require Pro'}</p>
                                <button
                                    type="button"
                                    disabled={isUpgrading}
                                    onClick={handleUpgrade}
                                    className="text-[10px] underline hover:text-primary transition-colors font-bold uppercase disabled:opacity-50"
                                >
                                    Instant Upgrade to Pro
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase mb-2">Endpoint URL</label>
                    <div className="flex gap-2 flex-col sm:flex-row">
                        <input
                            type="url"
                            name="webhookUrl"
                            defaultValue={currentWebhook || ''}
                            placeholder="https://your-domain.com/api/webhooks/p402"
                            disabled={isFree}
                            className="flex-1 border-2 border-black p-3 font-mono text-sm outline-none focus:bg-[var(--primary)] focus:bg-opacity-10 transition-colors disabled:bg-neutral-100 italic"
                        />
                        <button
                            type="submit"
                            disabled={isPending || isFree}
                            className="btn bg-black text-white font-bold uppercase border-2 border-black px-6 hover:bg-[var(--neutral-800)] whitespace-nowrap disabled:opacity-50"
                        >
                            {isPending ? 'Saving...' : 'Save Webhook'}
                        </button>
                    </div>
                </div>
            </form>

            {webhookSecret && (
                <div className={`bg-[var(--neutral-200)] border-2 border-black p-4 ${isFree ? 'opacity-50 grayscale' : ''}`}>
                    <div className="text-xs font-bold uppercase mb-2 text-[var(--neutral-600)]">Signing Secret</div>
                    <div className="flex items-center gap-4">
                        <code className="flex-1 font-mono text-sm break-all">
                            {showSecret ? (isFree ? 'whsec_••••••••••••••••••••••••••••••••' : webhookSecret) : 'whsec_' + '•'.repeat(40)}
                        </code>
                        <button
                            onClick={() => !isFree && setShowSecret(!showSecret)}
                            className={`text-xs font-bold underline uppercase ${isFree ? 'cursor-not-allowed' : ''}`}
                        >
                            {showSecret ? 'Hide' : 'Reveal'}
                        </button>
                    </div>
                    <p className="text-xs text-[var(--neutral-500)] mt-2">
                        Use this secret to verify the `P402-Signature` header in inbound webhook requests.
                    </p>
                </div>
            )}
        </div>
    );
}
