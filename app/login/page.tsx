'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
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
            <button className="btn btn-secondary w-full" disabled>Loading…</button>
        ),
    }
);

// Shows a "connecting" state while useCdpAuth bridges the wallet → NextAuth session
function WalletSection() {
    const { address, isConnected } = useAccount();
    const [connecting, setConnecting] = useState(false);

    // Detect wallet connection and show bridging state
    useEffect(() => {
        if (isConnected && address) {
            setConnecting(true);
        } else {
            setConnecting(false);
        }
    }, [isConnected, address]);

    if (connecting) {
        return (
            <div className="flex items-center gap-3 border-2 border-black bg-neutral-50 px-4 py-3">
                <div className="w-4 h-4 border-2 border-black border-t-primary animate-spin shrink-0" />
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-black">Wallet connected.</p>
                    <p className="text-[10px] font-medium text-neutral-500">Creating your account…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center [&>*]:w-full [&>button]:w-full">
            <ConnectButton label="Connect Wallet" />
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex flex-col bg-neutral-50">
            <TopNav />

            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-[440px]">

                    {/* Header */}
                    <div className="mb-10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                            AI Payment Router
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">
                            Get your API key.<br />Start routing.
                        </h1>
                        <p className="text-sm text-neutral-500 font-medium">
                            No wallet required. No credit card. Free to start.
                        </p>
                    </div>

                    {/* Primary: Email (CDP Embedded Wallet) */}
                    <div className="border-4 border-black bg-white p-7 mb-6 shadow-[6px_6px_0px_0px_#000]">
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-[11px] font-black uppercase tracking-widest text-black">
                                Sign in with Email
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-primary border border-black px-2 py-0.5">
                                Recommended
                            </span>
                        </div>

                        <CDPEmailAuth onSuccess={() => router.push('/onboarding')} />

                        <p className="text-[10px] text-neutral-400 font-medium mt-4">
                            A self-custody wallet is created for you automatically — secured by Coinbase.
                        </p>
                    </div>

                    {/* Secondary: Google */}
                    <button
                        onClick={() => void signIn('google', { callbackUrl: '/onboarding' })}
                        className="w-full h-12 flex items-center justify-center gap-3 border-2 border-black bg-white font-black text-[11px] uppercase tracking-wider hover:bg-neutral-100 transition-colors mb-1"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://authjs.dev/img/providers/google.svg"
                            width={16}
                            height={16}
                            alt=""
                        />
                        Continue with Google
                    </button>
                    <p className="text-[10px] text-neutral-400 text-center mb-6 font-medium">
                        Google login creates a dashboard account. Add a wallet in onboarding to enable payments.
                    </p>

                    {/* Tertiary: Existing wallet — collapsed/de-emphasized */}
                    <div className="border border-neutral-200 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                            Already have a wallet?
                        </p>
                        <p className="text-[11px] text-neutral-500 font-medium mb-3">
                            Connect MetaMask, Coinbase Wallet, or any WalletConnect-compatible wallet.
                        </p>
                        <WalletSection />
                    </div>

                    {/* Legal */}
                    <p className="text-[10px] text-neutral-400 text-center mt-6 font-medium">
                        By continuing you agree to our{' '}
                        <Link href="/terms" className="underline hover:text-black transition-colors">Terms</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="underline hover:text-black transition-colors">Privacy Policy</Link>.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
