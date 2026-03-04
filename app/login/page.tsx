'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
// CDP hooks require browser context — disable SSR to prevent prerender crash
const CDPEmailAuth = dynamic(
    () => import('@/components/auth/CDPEmailAuth').then(m => ({ default: m.CDPEmailAuth })),
    { ssr: false, loading: () => <div className="h-24 animate-pulse bg-neutral-100 border-2 border-neutral-200" /> }
);

// Lazy-load heavy wallet components
const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
    {
        ssr: false,
        loading: () => (
            <button className="btn btn-secondary w-full" disabled>Loading wallet…</button>
        ),
    }
);

export default function LoginPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex flex-col bg-neutral-50">
            <TopNav />

            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-[420px]">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-primary border-2 border-black mx-auto mb-4 flex items-center justify-center">
                            <div className="w-4 h-4 bg-black" />
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tight">Sign in to P402</h1>
                        <p className="text-[13px] text-neutral-400 font-medium mt-1">
                            AI Payment Router &amp; Agentic Orchestration
                        </p>
                    </div>

                    {/* Primary: CDP Email (no wallet required) */}
                    <div className="border-2 border-black bg-white p-6 mb-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-primary px-2 py-0.5 border border-black">
                                Recommended
                            </span>
                            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                                Email — No wallet needed
                            </span>
                        </div>

                        <CDPEmailAuth onSuccess={() => router.push('/dashboard')} />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-neutral-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                            Or continue with
                        </span>
                        <div className="flex-1 h-px bg-neutral-300" />
                    </div>

                    {/* Secondary: Google OAuth */}
                    <button
                        onClick={() => void signIn('google', { callbackUrl: '/dashboard' })}
                        className="w-full h-11 flex items-center justify-center gap-3 border-2 border-black bg-white font-black text-[11px] uppercase tracking-wider hover:bg-neutral-100 transition-colors mb-3"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://authjs.dev/img/providers/google.svg"
                            width={18}
                            height={18}
                            alt="Google"
                        />
                        Continue with Google
                    </button>

                    {/* Tertiary: RainbowKit (existing EOA wallets) */}
                    <div className="border-2 border-neutral-300 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                            Use existing wallet
                        </p>
                        <div className="flex justify-center [&>*]:w-full [&>button]:w-full">
                            <ConnectButton label="Connect Wallet" />
                        </div>
                    </div>

                    {/* Legal */}
                    <p className="text-[10px] text-neutral-400 text-center mt-6 font-medium">
                        By continuing you agree to our{' '}
                        <Link href="/terms" className="underline hover:text-black transition-colors">
                            Terms
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="underline hover:text-black transition-colors">
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
