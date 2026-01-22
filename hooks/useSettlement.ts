import { useState } from 'react';
import { useSignTypedData, useAccount, useChainId } from 'wagmi';
import { parseUnits } from 'viem';

// Types matched to standard EIP-3009 and Backend
const TYPES = {
    TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
    ]
};

// USDC on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export function useSettlement() {
    const { signTypedDataAsync } = useSignTypedData();
    const { address } = useAccount();
    const chainId = useChainId();
    const [isSettling, setIsSettling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const settle = async (
        params: {
            tenantId: string;
            decisionId: string;
            amount: string; // Human readable amount (e.g. "1.0")
            recipient: string; // Treasury Address
            resourceId: string;
        }
    ) => {
        setIsSettling(true);
        setError(null);

        try {
            if (!address) throw new Error("Wallet not connected");

            // 1. Prepare EIP-3009 Payload
            // Validate timestamps: Valid for 1 hour
            const validAfter = 0n;
            const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);

            // Random nonce
            const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('') as `0x${string}`;

            // Scale Amount (USDC is 6 decimals)
            const value = parseUnits(params.amount, 6);

            const domain = {
                name: 'USD Coin',
                version: '2',
                chainId: chainId || 8453,
                verifyingContract: USDC_ADDRESS as `0x${string}`
            };

            const message = {
                from: address,
                to: params.recipient as `0x${string}`,
                value,
                validAfter,
                validBefore,
                nonce
            };

            // 2. Request Signature
            console.log("Requesting signature...", { domain, message });
            const signature = await signTypedDataAsync({
                domain,
                types: TYPES,
                primaryType: 'TransferWithAuthorization',
                message
            });

            // 3. Parse Signature Components
            // Viem/Wagmi returns hex string 0x... (65 bytes: 32 r, 32 s, 1 v)
            // But we need to be careful about V.
            // slice(0, 2) is '0x'
            // hex is 132 chars long (2 + 130)
            const hex = signature.slice(2);
            const r = `0x${hex.slice(0, 64)}`;
            const s = `0x${hex.slice(64, 128)}`;
            const v = parseInt(hex.slice(128, 130), 16);

            const payload = {
                tenantId: params.tenantId,
                decisionId: params.decisionId,
                asset: 'USDC',
                authorization: {
                    from: address,
                    to: params.recipient,
                    value: value.toString(),
                    validAfter: validAfter.toString(),
                    validBefore: validBefore.toString(),
                    nonce,
                    v,
                    r,
                    s
                }
            };

            // 4. Submit to Facilitator
            const res = await fetch('/api/v1/facilitator/settle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                // Try to extract readable error
                const errMsg = data.error || data.message || "Settlement failed";
                throw new Error(errMsg);
            }

            return {
                success: true,
                txHash: data.receipt?.txHash,
                receipt: data.receipt
            };

        } catch (e: any) {
            console.error("Settlement Error:", e);
            setError(e.message || "Unknown error occurred");
            return { success: false, error: e.message };
        } finally {
            setIsSettling(false);
        }
    };

    return {
        settle,
        isSettling,
        error
    };
}
