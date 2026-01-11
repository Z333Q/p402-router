import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
});

// Helper to verify a USDC transfer (EIP-3009 or Transfer event)
export async function verifyTransfer(txHash: string, expectedAmount: string, expectedRecipient: string) {
    try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

        // In a real implementation, we would parse logs for ERC-20 Transfer events
        // For now, we verify the transaction was successful
        return receipt.status === 'success';
    } catch (error) {
        console.error("Verification failed", error);
        return false;
    }
}
