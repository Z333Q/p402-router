import { ethers } from 'ethers';
import { P402_FACILITATOR_PRIVATE_KEY } from '@/lib/env';

// Ethers v6 strict setup
const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
const facilitatorWallet = new ethers.Wallet(P402_FACILITATOR_PRIVATE_KEY, provider);

// ABI for your new custom Subscription contract
const SUBSCRIPTION_ABI = [
    "function setupAndCharge(address user, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external",
    "function chargeSubscription(address user, uint256 amount) external" // Used for month 2+
];

export async function executeFirstSubscriptionCharge(
    userAddress: string,
    amount: bigint,
    deadline: bigint,
    signature: string
) {
    const contract = new ethers.Contract(
        process.env.SUBSCRIPTION_FACILITATOR_ADDRESS!,
        SUBSCRIPTION_ABI,
        facilitatorWallet
    );

    // Ethers v6 signature splitting
    const { v, r, s } = ethers.Signature.from(signature);

    // Execute the transaction (pays gas, sets allowance, and charges month 1)
    const tx = await (contract.getFunction('setupAndCharge'))(
        userAddress,
        amount,
        deadline,
        v,
        r,
        s
    );

    const receipt = await tx.wait();
    if (!receipt || receipt.status === 0) {
        throw new Error('On-chain subscription setup failed');
    }

    return receipt.hash;
}
