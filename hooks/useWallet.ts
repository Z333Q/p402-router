/**
 * Wallet Hook
 * ===========
 * Shim for wagmi's useAccount to provide consistent wallet state across the dashboard.
 */

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function useWallet() {
    const { address, isConnected, status } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();

    return {
        address,
        isConnected,
        status,
        connect: () => {
            const connector = connectors[0];
            if (connector) connect({ connector });
        },
        disconnect
    };
}
