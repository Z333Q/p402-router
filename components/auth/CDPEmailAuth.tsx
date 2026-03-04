'use client';

/**
 * CDPEmailAuth
 * ============
 * Primary sign-in component using CDP Embedded Wallet (email OTP + Google).
 *
 * UX flow:
 *   1. User enters email → OTP sent
 *   2. User enters 6-digit OTP → CDP wallet created (<500 ms)
 *   3. 'confirmed' step — wallet acknowledgment card (address + network)
 *   4. "Continue" button: signs a timestamp message → signIn('cdp-wallet') → NextAuth session
 *   5. onSuccess() is called — parent redirects to /dashboard
 *
 * Auth bridge: CDP gives us a wagmi address; signIn('cdp-wallet') converts that
 * into a NextAuth JWT session (required by dashboard/layout.tsx).
 *
 * Design: Neo-Brutalist, matches P402 design system (no rounded corners,
 * 2px black borders, IBM Plex Sans, acid-green accents).
 */

import { useState, useCallback, useEffect } from 'react';
import { useSignInWithEmail, useVerifyEmailOTP } from '@coinbase/cdp-hooks';
import { useAccount, useSignMessage } from 'wagmi';
import { signIn, useSession } from 'next-auth/react';

interface Props {
    onSuccess?: () => void;
}

type Step = 'email' | 'otp' | 'connecting' | 'confirmed';

export function CDPEmailAuth({ onSuccess }: Props) {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [flowId, setFlowId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isNewUser, setIsNewUser] = useState(false);

    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);

    const { signInWithEmail } = useSignInWithEmail();
    const { verifyEmailOTP } = useVerifyEmailOTP();
    const { address } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { status: sessionStatus } = useSession();

    // Once wagmi reports a connected address during 'connecting', move to 'confirmed'
    useEffect(() => {
        if (step === 'connecting' && address) {
            setStep('confirmed');
        }
    }, [step, address]);

    // Fallback: if wagmi doesn't connect within 2s, show confirmed anyway
    useEffect(() => {
        if (step !== 'connecting') return;
        const timer = setTimeout(() => setStep('confirmed'), 2000);
        return () => clearTimeout(timer);
    }, [step]);

    const handleSendOtp = useCallback(async () => {
        setError(null);
        if (!email.includes('@')) {
            setError('Enter a valid email address.');
            return;
        }
        setIsSendingOtp(true);
        try {
            const result = await signInWithEmail({ email });
            setFlowId(result.flowId);
            setStep('otp');
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to send verification code. Try again.'
            );
        } finally {
            setIsSendingOtp(false);
        }
    }, [email, signInWithEmail]);

    const handleVerifyOtp = useCallback(async () => {
        setError(null);
        if (otp.length !== 6) {
            setError('Enter the 6-digit code from your email.');
            return;
        }
        setIsVerifying(true);
        try {
            const result = await verifyEmailOTP({ flowId, otp });
            setIsNewUser(result.isNewUser);
            setStep('connecting');
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Invalid or expired code. Request a new one.'
            );
            setStep('otp');
        } finally {
            setIsVerifying(false);
        }
    }, [email, otp, flowId, verifyEmailOTP]);

    // ── NextAuth session bridge ───────────────────────────────────────────
    // CDP gives us a wagmi address. We need to also create a NextAuth session
    // so the dashboard (which checks useSession()) doesn't redirect to /login.
    const handleContinue = useCallback(async () => {
        // useCdpAuth (in WalletSync) may have already bridged the CDP wallet → NextAuth session.
        // Skip the signing flow to avoid a redundant signature prompt.
        if (sessionStatus === 'authenticated') {
            onSuccess?.();
            return;
        }
        if (!address) {
            // Fallback: no address yet — proceed anyway (dashboard may redirect)
            onSuccess?.();
            return;
        }
        setIsSigningIn(true);
        setError(null);
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const message = `Sign in to P402\nAddress: ${address}\nTimestamp: ${timestamp}`;
            const signature = await signMessageAsync({ message });
            const result = await signIn('cdp-wallet', {
                address,
                signature,
                message,
                redirect: false,
            });
            if (result?.ok) {
                onSuccess?.();
            } else {
                setError('Sign-in failed. Please try again.');
            }
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Signature rejected. Please try again.'
            );
        } finally {
            setIsSigningIn(false);
        }
    }, [address, sessionStatus, signMessageAsync, onSuccess]);

    // ── Email step ────────────────────────────────────────────────────────
    if (step === 'email') {
        return (
            <div className="flex flex-col gap-4">
                <div>
                    <label
                        htmlFor="cdp-email"
                        className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5"
                    >
                        Email address
                    </label>
                    <input
                        id="cdp-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && void handleSendOtp()}
                        className="w-full h-11 px-3 border-2 border-black bg-white text-sm font-medium focus:outline-none focus:border-primary transition-colors"
                        disabled={isSendingOtp}
                    />
                </div>

                {error && (
                    <p className="text-[11px] font-bold text-error border-2 border-error px-3 py-2">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => void handleSendOtp()}
                    disabled={isSendingOtp || !email}
                    className="w-full h-11 bg-primary text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-black hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {isSendingOtp ? 'Sending code…' : 'Continue with Email'}
                </button>

                <p className="text-[10px] text-neutral-400 text-center font-medium">
                    A wallet is created for you automatically — no crypto knowledge required.
                </p>
            </div>
        );
    }

    // ── OTP step ──────────────────────────────────────────────────────────
    if (step === 'otp') {
        return (
            <div className="flex flex-col gap-4">
                <p className="text-[11px] font-bold text-neutral-600 border-2 border-neutral-200 px-3 py-2 bg-neutral-50">
                    Code sent to <span className="text-black">{email}</span>
                </p>

                <div>
                    <label
                        htmlFor="cdp-otp"
                        className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5"
                    >
                        Verification code
                    </label>
                    <input
                        id="cdp-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && void handleVerifyOtp()}
                        className="w-full h-11 px-3 border-2 border-black bg-white text-sm font-mono font-bold tracking-[0.3em] text-center focus:outline-none focus:border-primary transition-colors"
                        disabled={isVerifying}
                    />
                </div>

                {error && (
                    <p className="text-[11px] font-bold text-error border-2 border-error px-3 py-2">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => void handleVerifyOtp()}
                    disabled={isVerifying || otp.length !== 6}
                    className="w-full h-11 bg-primary text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-black hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {isVerifying ? 'Verifying…' : 'Verify Code'}
                </button>

                <button
                    type="button"
                    onClick={() => { setStep('email'); setOtp(''); setFlowId(''); setError(null); }}
                    className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                >
                    ← Change email
                </button>
            </div>
        );
    }

    // ── Connecting step ───────────────────────────────────────────────────
    if (step === 'connecting') {
        return (
            <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-8 h-8 border-4 border-black border-t-primary animate-spin" />
                <p className="text-[11px] font-black uppercase tracking-widest text-neutral-600">
                    Creating your wallet…
                </p>
            </div>
        );
    }

    // ── Confirmed step ────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-4">
            {/* Success header */}
            <div className="flex items-center gap-2 border-2 border-black bg-primary px-3 py-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8l3.5 3.5L13 4.5" stroke="#000" strokeWidth="2.5" strokeLinecap="square"/>
                </svg>
                <span className="text-[11px] font-black uppercase tracking-wider text-black">
                    {isNewUser ? 'Wallet created' : 'Wallet restored'}
                </span>
            </div>

            {/* Wallet card */}
            <div className="border-2 border-black bg-neutral-50 p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Embedded Wallet
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400 border border-neutral-300 px-1.5 py-0.5">
                        Base Network
                    </span>
                </div>

                <div className="font-mono text-sm font-bold text-black break-all">
                    {address
                        ? `${address.slice(0, 6)}…${address.slice(-4)}`
                        : `${email.slice(0, 3)}…  (connecting)`}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                    <span className="text-[10px] text-neutral-500 font-medium">Balance</span>
                    <span className="text-[11px] font-black text-neutral-700">$0.00 USDC</span>
                </div>
            </div>

            <p className="text-[10px] text-neutral-400 font-medium">
                Your wallet is secured by Coinbase. Keys never leave their servers.
            </p>

            {error && (
                <p className="text-[11px] font-bold text-error border-2 border-error px-3 py-2">
                    {error}
                </p>
            )}

            <button
                type="button"
                onClick={() => void handleContinue()}
                disabled={isSigningIn}
                className="w-full h-11 bg-black text-primary font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isSigningIn ? 'Signing in…' : 'Continue to Dashboard →'}
            </button>
        </div>
    );
}
