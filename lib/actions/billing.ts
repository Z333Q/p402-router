'use server';

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

        // TODO: In production, fetch the actual USDC nonce from the on-chain contract
        // via: const nonce = await usdcContract.nonces(walletAddress);
        const nonce = '0';

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
