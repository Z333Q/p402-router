import { ethers } from 'ethers';
import { env } from '@/lib/env';

// Ethers v6 strict setup
const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
// env.P402_FACILITATOR_PRIVATE_KEY is typed string (required in schema)
const facilitatorWallet = new ethers.Wallet(env.P402_FACILITATOR_PRIVATE_KEY, provider);

// ABI must match SubscriptionFacilitator.sol exactly.
const SUBSCRIPTION_ABI = [
    "function setupAndCharge(address user, uint256 totalAllowance, uint256 deadline, uint8 v, bytes32 r, bytes32 s, uint256 firstMonthCharge) external",
    "function chargeSubscription(address user, uint256 amount) external"
];

function getContract() {
    const addr = process.env.SUBSCRIPTION_FACILITATOR_ADDRESS;
    if (!addr) throw new Error('SUBSCRIPTION_FACILITATOR_ADDRESS is not configured');
    return new ethers.Contract(addr, SUBSCRIPTION_ABI, facilitatorWallet);
}

/**
 * Month 1: set allowance via EIP-2612 permit and charge the first period.
 * Called from /api/v1/billing/onchain/subscribe and billing-finalize Server Action.
 */
export async function executeFirstSubscriptionCharge(
    userAddress: string,
    totalAllowance: bigint,
    deadline: bigint,
    signature: string
) {
    const { v, r, s } = ethers.Signature.from(signature);
    const firstMonthCharge = 499_000000n; // $499 USDC (6 decimals)

    // ethers v6: use getFunction() to avoid noUncheckedIndexedAccess undefined
    const tx = await getContract().getFunction('setupAndCharge')(
        userAddress,
        totalAllowance,
        deadline,
        v,
        r,
        s,
        firstMonthCharge
    );

    const receipt = await tx.wait();
    if (!receipt || receipt.status === 0) {
        throw new Error('On-chain subscription setup failed');
    }

    return receipt.hash as string;
}

/**
 * Month 2+: pull the renewal charge from the pre-approved allowance.
 * Called by the billing reconcile cron job.
 */
export async function executeRecurringCharge(
    userAddress: string,
    amount: bigint
) {
    const tx = await getContract().getFunction('chargeSubscription')(userAddress, amount);

    const receipt = await tx.wait();
    if (!receipt || receipt.status === 0) {
        throw new Error('On-chain subscription renewal failed');
    }

    return receipt.hash as string;
}
