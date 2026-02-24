import { signTypedData } from 'wagmi/actions';
import { BASE_USDC_ADDRESS, SUBSCRIPTION_FACILITATOR_ADDRESS } from '@/lib/constants';
import type { Config } from 'wagmi';

export async function signSubscriptionPermit(
    config: Config,
    account: `0x${string}`,
    amount: bigint,
    nonce: bigint,
    deadline: bigint
) {
    // EIP-2612 Domain for USDC on Base
    const domain = {
        name: 'USD Coin',
        version: '2', // Strict requirement for Base USDC
        chainId: 8453,
        verifyingContract: BASE_USDC_ADDRESS as `0x${string}`,
    };

    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    };

    const message = {
        owner: account,
        spender: SUBSCRIPTION_FACILITATOR_ADDRESS as `0x${string}`, // Your new billing contract
        value: amount, // typically a large allowance (e.g., 12 months worth)
        nonce,
        deadline,
    };

    // Wagmi/Viem v2.42+ signature request
    const signature = await signTypedData(config, {
        account,
        domain,
        types,
        primaryType: 'Permit',
        message,
    });

    return signature;
}
