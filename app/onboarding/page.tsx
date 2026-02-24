import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { completeOnboardingAction } from '@/lib/actions/onboarding';
import { Server, Store, ShieldCheck } from 'lucide-react';

export const metadata = {
    title: 'Welcome | P402'
};

export default async function OnboardingPage() {
    // Ensure they are logged in before showing onboarding
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect('/login');

    return (
        <div className="min-h-screen bg-[var(--neutral-50)] flex flex-col items-center justify-center p-6 selection:bg-[var(--primary)] selection:text-black">

            {/* Neo-brutalist logo/header */}
            <div className="mb-12 border-4 border-black bg-[var(--primary)] px-6 py-2 font-black text-3xl uppercase tracking-tighter text-black shadow-[6px_6px_0px_0px_#000]">
                P402.IO
            </div>

            <div className="max-w-4xl w-full bg-white border-4 border-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <h1 className="text-4xl font-black uppercase tracking-wide mb-2 text-black">Welcome to the network</h1>
                <p className="font-mono text-[var(--neutral-600)] mb-10 text-lg">How do you plan to use P402?</p>

                <form action={completeOnboardingAction} className="flex flex-col gap-10">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Option 1: The Builder */}
                        <label className="cursor-pointer group relative">
                            <input type="radio" name="goal" value="test_routing" className="peer sr-only" required />
                            <div className="h-full border-4 border-black p-6 bg-[var(--neutral-50)] hover:bg-[var(--neutral-200)] peer-checked:bg-[var(--primary)] peer-checked:shadow-[4px_4px_0px_#000] peer-checked:-translate-y-1 transition-all flex flex-col gap-2">
                                <Server className="w-10 h-10 mb-2 text-black" />
                                <h3 className="font-black text-lg uppercase text-black">Build & Route</h3>
                                <p className="text-sm font-medium text-[var(--neutral-700)] peer-checked:text-black leading-relaxed">
                                    I want to route AI tasks, handle x402 payments, and test the A2A endpoint.
                                </p>
                            </div>
                            <input type="hidden" name="role" value="builder" disabled className="peer-checked:block" />
                        </label>

                        {/* Option 2: The Marketplace / Publisher */}
                        <label className="cursor-pointer group relative">
                            <input type="radio" name="goal" value="publish_agent" className="peer sr-only" required />
                            <div className="h-full border-4 border-black p-6 bg-[var(--neutral-50)] hover:bg-[var(--neutral-200)] peer-checked:bg-[var(--info)] peer-checked:shadow-[4px_4px_0px_#000] peer-checked:-translate-y-1 transition-all flex flex-col gap-2">
                                <Store className="w-10 h-10 mb-2 text-black" />
                                <h3 className="font-black text-lg uppercase text-black">Publish Agents</h3>
                                <p className="text-sm font-medium text-[var(--neutral-700)] peer-checked:text-black leading-relaxed">
                                    I want to list agents on the Bazaar, verify my publisher identity, and earn revenue.
                                </p>
                            </div>
                            <input type="hidden" name="role" value="publisher" disabled className="peer-checked:block" />
                        </label>

                        {/* Option 3: The Enterprise */}
                        <label className="cursor-pointer group relative">
                            <input type="radio" name="goal" value="enterprise_trust" className="peer sr-only" required />
                            <div className="h-full border-4 border-black p-6 bg-[var(--neutral-50)] hover:bg-[var(--neutral-200)] peer-checked:bg-[var(--warning)] peer-checked:shadow-[4px_4px_0px_#000] peer-checked:-translate-y-1 transition-all flex flex-col gap-2">
                                <ShieldCheck className="w-10 h-10 mb-2 text-black" />
                                <h3 className="font-black text-lg uppercase text-black">Govern Trust</h3>
                                <p className="text-sm font-medium text-[var(--neutral-700)] peer-checked:text-black leading-relaxed">
                                    I want to enforce trust policies, review audit logs, and manage agent safety.
                                </p>
                            </div>
                            <input type="hidden" name="role" value="enterprise" disabled className="peer-checked:block" />
                        </label>

                    </div>

                    <div className="flex justify-end pt-4 border-t-4 border-black">
                        <button
                            type="submit"
                            className="btn bg-black text-white font-black text-xl uppercase px-12 py-5 border-4 border-black hover:bg-[var(--neutral-800)] hover:shadow-[6px_6px_0px_0px_var(--primary)] transition-all"
                        >
                            Enter Dashboard
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
