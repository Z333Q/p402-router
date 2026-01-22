'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GetAccessPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [formData, setFormData] = useState({
        email: '',
        company: '',
        useCase: 'MCP Server Monetization'
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
                    role: formData.useCase, // Mapping useCase to role/rpd as per API expectation or just flexible json
                    rpd: 'Unknown'
                })
            });

            if (res.ok) {
                setStatus('success');
            } else {
                throw new Error('Submission failed');
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen flex flex-col font-sans bg-neutral-100 text-black selection:bg-primary selection:text-black">
                <Header />
                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-white border-2 border-black p-8 max-w-md w-full shadow-[8px_8px_0px_#000] text-center relative overflow-hidden">
                        <div className="text-4xl mb-6">🚀</div>
                        <h1 className="text-2xl font-black uppercase mb-4 text-black">Message Received</h1>
                        <p className="text-neutral-600 mb-8 leading-relaxed font-medium">
                            We've added you to the priority queue. Check your email (including spam) for a challenge packet within 24 hours.
                        </p>
                        <Link href="/" className="btn btn-primary w-full justify-center">Back to Home</Link>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col font-sans bg-neutral-100 text-black selection:bg-primary selection:text-black">
            <Header />
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white border-2 border-black p-8 max-w-md w-full shadow-[8px_8px_0px_#000] relative">
                    <h1 className="text-2xl font-black uppercase mb-4 text-black border-b-2 border-black pb-2">Request Access</h1>
                    <p className="text-neutral-600 mb-8 text-sm leading-relaxed font-medium">
                        Join the router validation network. We are onboarding teams building paid agent workflows.
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="space-y-1">
                            <label className="block font-bold text-xs uppercase tracking-wider text-neutral-600">Email <span className="text-error">*</span></label>
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
                                    <option>MCP Server Monetization</option>
                                    <option>Protocol Economics Optimization</option>
                                    <option>Forensic Cost Audit</option>
                                    <option>Agent Spend Controls</option>
                                    <option>Internal Chargeback</option>
                                    <option>Other</option>
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
                            Response time within 24h
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}

function Header() {
    return (
        <header className="border-b-2 border-black px-6 h-16 flex items-center justify-between bg-white sticky top-0 z-50">
            <Link href="/" className="no-underline text-inherit relative z-10 group flex items-center gap-3">
                <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                    <img src="/favicon.png" alt="P402 Logo" className="w-6 h-6" />
                </div>
                <span className="text-xl font-black no-underline text-black uppercase hover:text-primary-dim transition-colors">
                    P402
                </span>
            </Link>
        </header>
    )
}
