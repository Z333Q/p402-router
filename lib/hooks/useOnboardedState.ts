'use client';

/**
 * 3AZ-2-B — client hook that mirrors the server-side
 * `getPostSigninDestination` decision for use in the dashboard layout.
 *
 * Returns `{ onboarded, loading }`. Fails OPEN: on fetch error, network
 * error, or non-2xx response, `onboarded` resolves to `true` so the
 * dashboard renders rather than re-looping the user through onboarding.
 */

import { useEffect, useState } from 'react';

export interface OnboardedState {
    onboarded: boolean | null;
    loading: boolean;
}

export function useOnboardedState(): OnboardedState {
    const [onboarded, setOnboarded] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/v1/onboarding/state', {
                    credentials: 'same-origin',
                    // Never cache: the gate must see the freshest
                    // value right after completeOnboardingAction sets
                    // tenants.onboarded_at; a cached `false` was the
                    // root cause of the post-`Got it` redirect loop
                    // observed on ccb25c7.
                    cache: 'no-store',
                });
                if (!res.ok) {
                    if (!cancelled) {
                        setOnboarded(true);
                        setLoading(false);
                    }
                    return;
                }
                const data = (await res.json()) as { onboarded?: unknown };
                if (!cancelled) {
                    setOnboarded(data?.onboarded === true);
                    setLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setOnboarded(true);
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return { onboarded, loading };
}
