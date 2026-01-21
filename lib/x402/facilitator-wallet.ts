import { createWalletClient, createPublicClient, http, type WalletClient, type PublicClient, type Account, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { EIP3009Authorization } from './eip3009';
import { ApiError } from '@/lib/errors';

// Environment configuration
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';
const PRIVATE_KEY = process.env.P402_FACILITATOR_PRIVATE_KEY;
const MAX_GAS_PRICE_GWEI = BigInt(process.env.P402_MAX_GAS_PRICE_GWEI || '50');

export class FacilitatorWallet {
    private walletClient: any;
    private publicClient: any;
    private account: Account;

    constructor() {
        if (!PRIVATE_KEY) {
            throw new Error("P402_FACILITATOR_PRIVATE_KEY is not configured");
        }

        // Initialize account from private key
        // SECURITY: Currently using env var. Future migration to KMS recommended.
        this.account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

        const chain = process.env.NEXT_PUBLIC_CHANGE_ENV === 'testnet' ? baseSepolia : base;

        this.publicClient = createPublicClient({
            chain,
            transport: http(RPC_URL)
        });

        this.walletClient = createWalletClient({
            account: this.account,
            chain,
            transport: http(RPC_URL)
        });
    }

    /**
     * Executes an EIP-3009 transferWithAuthorization call on the token contract.
     * Absorbs gas costs as the facilitator.
     */
    async executeSettlement(
        tokenAddress: string,
        auth: EIP3009Authorization,
        requestId: string
    ): Promise<Hash> {
        try {
            // 1. Gas Price Check
            const gasPrice = await this.publicClient.getGasPrice();
            const maxGas = MAX_GAS_PRICE_GWEI * BigInt(1e9);

            if (gasPrice > maxGas) {
                throw new ApiError({
                    code: 'GAS_PRICE_TOO_HIGH',
                    status: 503,
                    message: `Current gas price ${gasPrice} exceeds limit ${maxGas}`,
                    requestId
                });
            }

            // 2. Prepare Contract Write
            // USDC's transferWithAuthorization signature:
            // function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)
            const { request } = await this.publicClient.simulateContract({
                account: this.account,
                address: tokenAddress as `0x${string}`,
                abi: [{
                    name: 'transferWithAuthorization',
                    type: 'function',
                    stateMutability: 'nonpayable',
                    inputs: [
                        { name: 'from', type: 'address' },
                        { name: 'to', type: 'address' },
                        { name: 'value', type: 'uint256' },
                        { name: 'validAfter', type: 'uint256' },
                        { name: 'validBefore', type: 'uint256' },
                        { name: 'nonce', type: 'bytes32' },
                        { name: 'v', type: 'uint8' },
                        { name: 'r', type: 'bytes32' },
                        { name: 's', type: 'bytes32' }
                    ],
                    outputs: []
                }],
                functionName: 'transferWithAuthorization',
                args: [
                    auth.from,
                    auth.to,
                    BigInt(auth.value),
                    BigInt(auth.validAfter),
                    BigInt(auth.validBefore),
                    auth.nonce,
                    auth.v,
                    auth.r,
                    auth.s
                ]
            });

            // 3. Execute Transaction
            const hash = await this.walletClient.writeContract(request);

            return hash;

        } catch (error: any) {
            console.error("Facilitator execution failed:", error);

            // Map common simulation errors
            if (error.message.includes("authorization is invalid")) {
                throw new ApiError({
                    code: 'INVALID_AUTHORIZATION',
                    status: 400,
                    message: "The signature provided is invalid or has expired.",
                    requestId
                });
            }

            if (error.message.includes("authorization is used")) {
                throw new ApiError({
                    code: 'AUTHORIZATION_USED',
                    status: 409, // Conflict
                    message: "This authorization nonce has already been used.",
                    requestId
                });
            }

            throw error;
        }
    }

    /**
     * Checks if the facilitator has enough ETH to cover gas.
     */
    async checkHealth(): Promise<{ healthy: boolean; balance: string; address: string }> {
        const balance = await this.publicClient.getBalance({ address: this.account.address });
        const threshold = BigInt(1e16); // 0.01 ETH

        return {
            healthy: balance > threshold,
            balance: balance.toString(),
            address: this.account.address
        };
    }
}

// Singleton instance
let walletInstance: FacilitatorWallet | null = null;

export function getFacilitatorWallet(): FacilitatorWallet {
    if (!walletInstance) {
        walletInstance = new FacilitatorWallet();
    }
    return walletInstance;
}
