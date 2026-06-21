'use client'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopNav } from '@/components/TopNav'
import { Footer } from '@/components/Footer'
import { getIntentCopy, type IntentCopy } from '@/lib/pricing/intent'

const FALLBACK_USE_CASES = [
    'Production AI workflow',
    'Department AI accountability',
    'Multi-department AI governance',
    'Enterprise AI spend governance',
    'Paid diagnostic engagement',
    'Multi-workflow pilot',
    'Regulated industry pilot',
    'Scoping call',
    'MCP Server Monetization',
    'Protocol Economics Optimization',
    'Forensic Cost Audit',
    'Agent Spend Controls',
    'Internal Chargeback',
    'Other',
] as const;

function GetAccessForm() {
    const searchParams = useSearchParams();
    const rawIntent = searchParams.get('intent');
    const copy: IntentCopy = getIntentCopy(rawIntent);

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [formData, setFormData] = useState({
        email: '',
        company: '',
        useCase: copy.defaultUseCase,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const res = await fetch('/api/v1/access-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    company: formData.company,
                    role: formData.useCase,
                    rpd: 'Unknown',
                    intent: copy.intent,
                    plan_id: copy.planId,
                    offer_id: copy.offerId,
                }),
            });
            if (res.ok) setStatus('success');
            else throw new Error('Submission failed');
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white border-2 border-black p-8 max-w-md w-full shadow-[8px_8px_0px_#000] text-center relative overflow-hidden"
                    data-pricing-intent={copy.intent}
                    data-plan-id={copy.planId ?? ''}
                    data-offer-id={copy.offerId ?? ''}
                >
                    <div className="text-4xl mb-6">🚀</div>
                    <h1 className="text-2xl font-black uppercase mb-4 text-black">Message Received</h1>
                    <p className="text-neutral-600 mb-8 leading-relaxed font-medium">
                        We&apos;ve received your request. Our team responds within 24 hours.
                    </p>
                    <Link href="/" className="btn btn-primary w-full justify-center">Back to Home</Link>
                </div>
            </main>
        );
    }

    const useCaseOptions = Array.from(new Set([copy.defaultUseCase, ...FALLBACK_USE_CASES]));

    return (
        <main className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white border-2 border-black p-8 max-w-2xl w-full shadow-[8px_8px_0px_#000] relative"
                data-pricing-intent={copy.intent}
                data-plan-id={copy.planId ?? ''}
                data-offer-id={copy.offerId ?? ''}
            >
                <h1 className="text-2xl font-black uppercase mb-2 text-black border-b-2 border-black pb-2">
                    <span className="heading-accent">{copy.heading}</span>
                </h1>
                <p className="text-neutral-700 mb-4 text-sm leading-relaxed font-medium">
                    {copy.subheading}
                </p>
                <div className="mb-6 p-3 border-2 border-neutral-200 bg-neutral-50 text-xs font-mono text-neutral-700 leading-relaxed">
                    {copy.handoffBanner}
                </div>
                <ul className="mb-6 space-y-1 text-xs font-mono text-neutral-700">
                    {copy.details.map((d) => (
                        <li key={d} className="flex gap-2"><span aria-hidden>•</span><span>{d}</span></li>
                    ))}
                </ul>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <input type="hidden" name="intent" value={copy.intent} data-testid="hidden-intent" />
                    <div className="space-y-1">
                        <label className="block font-bold text-xs uppercase tracking-wider text-neutral-600">
                            Email <span className="text-error">*</span>
                        </label>
                        <input
                            required
                            type="email"
                            className="w-full p-3 bg-white border-2 border-black text-black focus:outline-none focus:ring-4 focus:ring-primary/50 placeholder:text-neutral-400 font-mono text-sm transition-shadow"
                            placeholder="you@company.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block font-bold text-xs uppercase tracking-wider text-neutral-600">Project / Company</label>
                        <input
                            className="w-full p-3 bg-white border-2 border-black text-black focus:outline-none focus:ring-4 focus:ring-primary/50 placeholder:text-neutral-400 font-mono text-sm transition-shadow"
                            placeholder="Acme Corp"
                            value={formData.company}
                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block font-bold text-xs uppercase tracking-wider text-neutral-600">Use Case</label>
                        <div className="relative">
                            <select
                                className="w-full p-3 bg-white border-2 border-black text-black focus:outline-none focus:ring-4 focus:ring-primary/50 appearance-none font-mono text-sm cursor-pointer"
                                value={formData.useCase}
                                onChange={e => setFormData({ ...formData, useCase: e.target.value })}
                            >
                                {useCaseOptions.map((opt) => <option key={opt}>{opt}</option>)}
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-black text-[10px]">▼</div>
                        </div>
                    </div>

                    {status === 'error' && (
                        <div className="p-3 bg-red-100 border-2 border-red-500 text-red-600 text-xs font-bold text-center uppercase tracking-wider">
                            Transmission Failed. Retry.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {status === 'loading' ? 'Transmitting...' : 'Submit Request'}
                    </button>

                    <div className="text-[10px] text-neutral-500 text-center uppercase tracking-widest font-mono pt-4 border-t-2 border-neutral-200">
                        Response time within 24h. No card required.
                    </div>
                </form>
            </div>
        </main>
    );
}

export default function GetAccessPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-neutral-100 text-black selection:bg-primary selection:text-black">
            <TopNav />
            <Suspense
                fallback={
                    <main className="flex-1 flex items-center justify-center p-6">
                        <div className="bg-white border-2 border-black p-8 max-w-md w-full shadow-[8px_8px_0px_#000]">
                            <h1 className="text-2xl font-black uppercase">Loading…</h1>
                        </div>
                    </main>
                }
            >
                <GetAccessForm />
            </Suspense>
            <Footer />
        </div>
    );
}
