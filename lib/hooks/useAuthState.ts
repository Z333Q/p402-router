'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

export type AuthState = 'visitor' | 'identity_only' | 'wallet_linked' | 'payment_ready';

export interface AuthStateResponse {
    state: AuthState;
    walletAddress: string | null;
}

export function useAuthState(): { state: AuthState; walletAddress: string | null; isLoading: boolean } {
    const { status } = useSession();

    const { data, isLoading: queryLoading } = useQuery<AuthStateResponse>({
        queryKey: ['auth-state'],
        queryFn: async () => {
            const res = await fetch('/api/v2/auth/state');
            if (!res.ok) throw new Error('Failed to fetch auth state');
            return res.json() as Promise<AuthStateResponse>;
        },
        enabled: status === 'authenticated',
        staleTime: 60_000,
    });

    if (status === 'loading') return { state: 'visitor', walletAddress: null, isLoading: true };
    if (status === 'unauthenticated') return { state: 'visitor', walletAddress: null, isLoading: false };

    return {
        state: data?.state ?? 'identity_only',
        walletAddress: data?.walletAddress ?? null,
        isLoading: queryLoading,
    };
}
