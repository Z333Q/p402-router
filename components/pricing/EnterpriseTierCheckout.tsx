'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * V5 §17 finance-team purchase checkout button. POSTs `{ productKey }` to
 * /api/v2/billing/checkout; on success redirects to the Stripe Checkout
 * URL, on `CONTACT_SALES` redirects to the configured contact path.
 *
 * Unauthenticated users are sent to /login with a return path so they
 * land back on the same purchase intent.
 */
export function EnterpriseTierCheckout({
    productKey,
    label,
    variant = 'primary',
}: {
    productKey: 'audit' | 'dept_dashboard';
    label: string;
    variant?: 'primary' | 'dark';
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const handleClick = async () => {
        if (status === 'unauthenticated') {
            router.push(`/login?callbackUrl=${encodeURIComponent(`/pricing?intent=${productKey}`)}`);
            return;
        }
        setBusy(true);
        try {
            const res = await fetch('/api/v2/billing/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ productKey }),
            });
            const data = await res.json();
            if (data.code === 'CONTACT_SALES' && data.contactUrl) {
                router.push(data.contactUrl);
                return;
            }
            if (data.url) {
                window.location.href = data.url;
                return;
            }
            alert(`Checkout unavailable. ${data.error ?? 'Please contact sales.'}`);
        } catch {
            alert('Payment system unreachable. Please retry or contact sales.');
        } finally {
            setBusy(false);
        }
    };

    const baseClasses =
        'inline-flex items-center justify-center w-full h-12 px-6 font-black text-[11px] uppercase tracking-widest border-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
    const variantClasses = variant === 'dark'
        ? 'bg-black text-primary border-black hover:bg-white hover:text-black'
        : 'bg-primary text-black border-black hover:bg-black hover:text-primary';

    return (
        <button
            onClick={handleClick}
            disabled={busy}
            aria-label={`${label}: ${productKey === 'audit' ? 'one-time purchase' : 'subscribe monthly'}`}
            className={`${baseClasses} ${variantClasses}`}
        >
            {busy ? 'Redirecting…' : label}
        </button>
    );
}
