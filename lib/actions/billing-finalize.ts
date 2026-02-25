'use server';

import { ethers } from 'ethers';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SUBSCRIPTION_FACILITATOR_ADDRESS } from '@/lib/constants';
import { env } from '@/lib/env';

if (!SUBSCRIPTION_FACILITATOR_ADDRESS) {
    throw new Error('SUBSCRIPTION_FACILITATOR_ADDRESS is not configured');
}

// Ethers v6 strict syntax
const provider = new ethers.JsonRpcProvider(
    process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'
);
// env.P402_FACILITATOR_PRIVATE_KEY is typed string (required in schema)
const facilitatorWallet = new ethers.Wallet(env.P402_FACILITATOR_PRIVATE_KEY, provider);

const SUBSCRIPTION_ABI = [
    "function setupAndCharge(address user, uint256 totalAllowance, uint256 deadline, uint8 v, bytes32 r, bytes32 s, uint256 firstMonthCharge) external"
];

interface FinalizePayload {
    userAddress: string;
    allowanceAmount: string;
    deadline: number;
    signature: string;
}

export async function finalizeWalletSubscription(payload: FinalizePayload) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { success: false, error: 'Unauthorized' };
    }
    const tenantId = (session.user as any).tenantId as string;
    if (!tenantId) {
        return { success: false, error: 'No tenant context found.' };
    }

    try {
        // 1. Ethers v6 Signature Splitting
        const { v, r, s } = ethers.Signature.from(payload.signature);

        // First month charge is exactly $499 USDC (6 decimals)
        const firstMonthCharge = 499_000000n;

        const contract = new ethers.Contract(
            SUBSCRIPTION_FACILITATOR_ADDRESS!, // guarded at module init above
            SUBSCRIPTION_ABI,
            facilitatorWallet
        ) as any;

        // 2. Execute transaction (Facilitator pays the gas)
        const tx = await contract.setupAndCharge(
            payload.userAddress,
            BigInt(payload.allowanceAmount),
            payload.deadline,
            v,
            r,
            s,
            firstMonthCharge
        );

        const receipt = await tx.wait();
        if (!receipt || receipt.status === 0) {
            throw new Error('Transaction reverted on Base.');
        }

        // 3. Update Database to lock in the Pro Subscription
        await db.query(
            `UPDATE tenants 
       SET plan = 'pro', updated_at = NOW() 
       WHERE id = $1`,
            [tenantId]
        );

        // Write the first month's successful ledger entry
        await db.query(
            `INSERT INTO onchain_subscription_payments 
        (tenant_id, subscription_id, billing_period_start, amount_usd_micros, status, tx_hash)
       VALUES ($1, 'wallet_sub_' || $1, NOW(), 499000000, 'settled', $2)`,
            [tenantId, receipt.hash]
        );

        return { success: true, txHash: receipt.hash };
    } catch (error) {
        console.error('[BILLING] Finalize failed:', error);
        return { success: false, error: 'Failed to execute the subscription transaction on-chain.' };
    }
}
