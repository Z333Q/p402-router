'use client';

/**
 * 3AZ-2-D — /login refresh.
 *
 * Per docs/internal/3AZ-2-onboarding-refresh-plan.md §4.1:
 *   - Google primary (top, large).
 *   - Email magic-link secondary. Label is "Continue with email";
 *     the CDP component still does the work but is not branded as
 *     a wallet flow on this page.
 *   - Wallet connect tertiary under a "More options" disclosure.
 *   - V5 hero copy. No "self-custody", no "Coinbase", no "USDC", no
 *     "wallet" on the critical path. Wallet vocabulary returns at
 *     M2/M3/M4 surfaces only.
 *   - Funnel emits: funnel.login_view on mount, funnel.signin_started
 *     when the user dispatches a provider call.
 *
 * The CDP component remains the auth method for the email path. Its
 * label is the only thing that changes here.
 */

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

const CDPEmailAuth = dynamic(
    () => import('@/components/auth/CDPEmailAuth').then(m => ({ default: m.CDPEmailAuth })),
    { ssr: false, loading: () => <div className="h-24 animate-pulse bg-neutral-100 border-2 border-neutral-200" /> }
);

const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
    {
        ssr: false,
        loading: () => (
            <button className="btn btn-secondary w-full" disabled>Loading…</button>
        ),
    }
);

type Provider = 'google' | 'email' | 'connect';

function emitFunnel(eventName: string, properties?: Record<string, unknown>): void {
    fetch('/api/v1/funnel/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventName, properties: properties ?? {} }),
    }).catch(() => { /* fire-and-forget */ });
}

function MoreOptionsSection() {
    const { address, isConnected } = useAccount();
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        setConnecting(Boolean(isConnected && address));
    }, [isConnected, address]);

    if (connecting) {
        return (
            <div className="flex items-center gap-3 border-2 border-black bg-neutral-50 px-4 py-3">
                <div className="w-4 h-4 border-2 border-black border-t-primary animate-spin shrink-0" />
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-black">Account connected.</p>
                    <p className="text-[10px] font-medium text-neutral-500">Creating your account&hellip;</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center [&>*]:w-full [&>button]:w-full">
            <ConnectButton label="More options" />
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const [showMore, setShowMore] = useState(false);

    useEffect(() => {
        emitFunnel('funnel.login_view', {
            provider_options: 'google,email,connect',
        });
    }, []);

    const onSigninStarted = (provider: Provider): void => {
        emitFunnel('funnel.signin_started', { provider });
    };

    return (
        <div className="min-h-screen flex flex-col bg-neutral-50">
            <TopNav />

            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-[440px]">

                    {/* Header */}
                    <div className="mb-10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                            AI spend accountability
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">
                            Make your AI spend<br />accountable.
                        </h1>
                        <p className="text-sm text-neutral-500 font-medium">
                            Free Sandbox. No credit card. Upgrade later.
                        </p>
                    </div>

                    {/* Primary: Google */}
                    <button
                        onClick={() => {
                            onSigninStarted('google');
                            void signIn('google', { callbackUrl: '/onboarding/welcome' });
                        }}
                        className="w-full h-14 flex items-center justify-center gap-3 border-4 border-black bg-white font-black text-xs uppercase tracking-widest hover:bg-primary transition-colors shadow-[6px_6px_0px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 mb-5"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://authjs.dev/img/providers/google.svg"
                            width={18}
                            height={18}
                            alt=""
                        />
                        Continue with Google
                    </button>

                    {/* Secondary: Email magic-link */}
                    <div className="border-2 border-black bg-white p-5 mb-5">
                        <div className="text-[11px] font-black uppercase tracking-widest text-black mb-4">
                            Continue with email
                        </div>
                        <CDPEmailAuth
                            onSuccess={() => {
                                onSigninStarted('email');
                                router.push('/onboarding/welcome');
                            }}
                        />
                    </div>

                    {/* Tertiary: collapsed disclosure */}
                    <div className="border border-neutral-200 p-4">
                        <button
                            type="button"
                            onClick={() => setShowMore((v) => !v)}
                            className="w-full flex items-center justify-between text-left"
                            aria-expanded={showMore}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                More options
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                {showMore ? '−' : '+'}
                            </span>
                        </button>
                        {showMore && (
                            <div className="mt-4">
                                <p className="text-[11px] text-neutral-500 font-medium mb-3">
                                    Already have an account elsewhere? Connect with an existing identity.
                                </p>
                                <div onClick={() => onSigninStarted('connect')}>
                                    <MoreOptionsSection />
                                </div>
                            </div>
                        )}
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
