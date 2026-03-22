'use server';

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { basePublicClient } from '@/lib/blockchain/client';
import { BASE_USDC_ADDRESS } from '@/lib/constants';

const NONCES_ABI = [
    {
        inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
        name: 'nonces',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export interface WalletInitResult {
    success: boolean;
    nonce?: string;
    deadline?: number;
    allowanceAmount?: string;
    error?: string;
}

/**
 * Initializes the wallet subscription flow by fetching the USDC nonce,
 * calculating allowance, and returning the EIP-2612 Permit parameters.
 */
export async function initializeWalletSubscription(
    walletAddress: string
): Promise<WalletInitResult> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' };
        }
        const tenantId = (session.user as any).tenantId as string;
        if (!tenantId) {
            return { success: false, error: 'No tenant context found.' };
        }

        // Check if already subscribed
        const planRes = await db.query(
            `SELECT plan FROM tenants WHERE id = $1`,
            [tenantId]
        );
        if (planRes.rows[0]?.plan === 'pro' || planRes.rows[0]?.plan === 'enterprise') {
            return { success: false, error: 'Already on a paid plan.' };
        }

        // Fetch the EIP-2612 permit nonce from the USDC contract on Base.
        // This is required for the SubscriptionFacilitator permit() call — if the user
        // has previously signed a permit the nonce will be > 0.
        let nonce = '0';
        try {
            const onchainNonce = await basePublicClient.readContract({
                address: BASE_USDC_ADDRESS,
                abi: NONCES_ABI,
                functionName: 'nonces',
                args: [walletAddress as `0x${string}`],
            });
            nonce = onchainNonce.toString();
        } catch (nonceErr) {
            console.warn('[BILLING] Failed to fetch USDC nonce on-chain, falling back to 0:', nonceErr);
        }

        // 12-month allowance: $499 × 12 = $5,988 USDC (6 decimals)
        const allowanceAmount = (5988_000000n).toString();

        // Deadline: 1 hour from now
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        return {
            success: true,
            nonce,
            deadline,
            allowanceAmount,
        };
    } catch (error: any) {
        console.error('[BILLING] initializeWalletSubscription failed:', error);
        return { success: false, error: 'Failed to initialize wallet subscription.' };
    }
}
