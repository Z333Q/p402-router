import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';

interface WalletSyncStatus {
    isLinking: boolean;
    error: string | null;
    isLinked: boolean;
}

export function useWalletSync(): WalletSyncStatus {
    const { address, isConnected } = useAccount();
    const { data: session, status } = useSession();
    const lastSynced = useRef<string | null>(null);
    const [state, setState] = useState<WalletSyncStatus>({
        isLinking: false,
        error: null,
        isLinked: false
    });

    useEffect(() => {
        // Condition: Wallet Connected AND Authenticated User
        if (isConnected && address && status === 'authenticated' && session?.user?.email) {

            // Prevent duplicate syncs for the same address
            if (lastSynced.current === address) return;

            setState(prev => ({ ...prev, isLinking: true, error: null }));
            console.log(`[useWalletSync] Attempting to link wallet ${address}...`);

            // Ideally this should use a library like TanStack Query for better lifecycle management
            fetch('/api/v1/user/link-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: address }),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.ok) {
                        console.log(`[useWalletSync] Wallet ${address} linked successfully.`);
                        lastSynced.current = address;
                        setState({ isLinking: false, error: null, isLinked: true });
                    } else {
                        console.error('[useWalletSync] Link failed:', data.error);
                        setState(prev => ({ ...prev, isLinking: false, error: data.error }));
                    }
                })
                .catch(err => {
                    console.error('[useWalletSync] Network error:', err);
                    setState(prev => ({ ...prev, isLinking: false, error: err.message || 'Network error' }));
                });
        }
    }, [address, isConnected, status, session]);

    return state;
}
