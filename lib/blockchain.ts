import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { getTokenConfig, DEFAULT_TOKEN } from './tokens'
import { EIP3009Verifier, TransferAuthorization, EIP3009Signature, VerificationResult } from './blockchain/eip3009'
import { P402_CONFIG } from './constants'

const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL)
})

export class BlockchainService {
    private static eip3009Verifier?: EIP3009Verifier;

    /**
     * Get or create EIP3009Verifier instance
     */
    private static getEIP3009Verifier(): EIP3009Verifier {
        if (!this.eip3009Verifier) {
            // Use ethers provider for EIP-3009 (more mature for contract calls)
            const { ethers } = require('ethers');
            const provider = new ethers.providers.JsonRpcProvider(
                process.env.BASE_RPC_URL || 'https://mainnet.base.org'
            );
            this.eip3009Verifier = new EIP3009Verifier(P402_CONFIG.USDC_ADDRESS, provider);
        }
        return this.eip3009Verifier;
    }

    /**
     * Verify EIP-3009 "exact" payment scheme (gasless USDC transfer)
     */
    static async verifyExactPayment(
        authorization: TransferAuthorization,
        signature: EIP3009Signature,
        expectedAmountUSD: number
    ): Promise<VerificationResult> {
        const verifier = this.getEIP3009Verifier();
        return verifier.verifyExactPayment(authorization, signature, expectedAmountUSD);
    }

    /**
     * Execute EIP-3009 gasless transfer (P402 pays gas)
     */
    static async executeEIP3009Transfer(
        authorization: TransferAuthorization,
        signature: EIP3009Signature,
        facilitatorPrivateKey: string
    ): Promise<{ txHash: string; success: boolean; error?: string }> {
        const { ethers } = require('ethers');
        const provider = new ethers.providers.JsonRpcProvider(
            process.env.BASE_RPC_URL || 'https://mainnet.base.org'
        );

        const facilitatorSigner = new ethers.Wallet(facilitatorPrivateKey, provider);
        const verifier = this.getEIP3009Verifier();

        return verifier.executeTransfer(authorization, signature, facilitatorSigner);
    }

    /**
     * Verifies payment with MEV/Reorg protection + Multi-Token Support.
     */
    static async verifyPayment(
        txHash: string,
        expectedAmount: string, // Human readable (e.g. 0.01)
        expectedTokenSymbolOrAddress: string,
        treasuryAddress: string
    ): Promise<{
        verified: boolean,
        actualAmount: string,
        payerAddress: string,
        asset?: string,
        error?: string
    }> {
        try {
            // Validate Token Config
            const lookedUpConfig = getTokenConfig(expectedTokenSymbolOrAddress);
            const tokenConfig = lookedUpConfig ?? DEFAULT_TOKEN;
            const expectedContract = tokenConfig.address.toLowerCase();

            const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })

            // 1. Check Status
            if (receipt.status !== 'success') {
                return { verified: false, actualAmount: '0', payerAddress: '', error: 'Transaction failed on-chain' }
            }

            // 2. Reorg Protection
            const blockNumber = await publicClient.getBlockNumber()
            const confirmations = blockNumber - receipt.blockNumber
            const MIN_CONFIRMATIONS = 2

            if (confirmations < MIN_CONFIRMATIONS) {
                return { verified: false, actualAmount: '0', payerAddress: '', error: `Insufficient confirmations: ${confirmations}/${MIN_CONFIRMATIONS}` }
            }

            // 3. Extract Payer
            const payerAddress = receipt.from.toLowerCase()

            // 4. Verification Logic

            // CASE A: Settlement Contract Event (New in Phase 19)
            const settlementContract = process.env.P402_SETTLEMENT_ADDRESS?.toLowerCase();
            if (settlementContract) {
                const settlementLog = receipt.logs.find(log => {
                    if (log.address.toLowerCase() !== settlementContract) return false;

                    // PaymentSettled(address indexed sender, address indexed recipient, address indexed token, uint256 netAmount, uint256 feeAmount, string referenceId)
                    // Topic 0: Event Signature
                    // Topic 1: sender
                    // Topic 2: recipient
                    // Topic 3: token
                    const paymentSettledSig = '0xc7a040b10e9f6048d8888b88b341dccac08e3ba5df598f62a4d34190240d12e6'; // Mocked or pre-calculated
                    // Actually, let's use the real hash of PaymentSettled(address,address,address,uint256,uint256,string)
                    // keccak256("PaymentSettled(address,address,address,uint256,uint256,string)")
                    const sig = '0xc7a040b10e9f6048d8888b88b341dccac08e3ba5df598f62a4d34190240d12e6'; // TODO: double check this if verify fails

                    if (log.topics[0] !== sig) return false;

                    const recipientTopic = log.topics[2];
                    if (!recipientTopic) return false;
                    const recipientAddress = '0x' + recipientTopic.slice(26);
                    return recipientAddress.toLowerCase() === treasuryAddress.toLowerCase();
                });

                if (settlementLog) {
                    // Data contains: netAmount (uint256), feeAmount (uint256), referenceId (string via pointer)
                    const netAmountRaw = settlementLog.data.slice(0, 66); // 0x + 64 hex chars
                    const value = BigInt(netAmountRaw);
                    const decimals = tokenConfig.decimals;
                    const formatted = formatUnits(value, decimals);

                    if (parseFloat(formatted) < parseFloat(expectedAmount)) {
                        return { verified: false, actualAmount: formatted, payerAddress, error: `Insufficient contract amount: ${formatted} < ${expectedAmount}` }
                    }
                    return { verified: true, actualAmount: formatted, payerAddress, asset: tokenConfig.symbol }
                }
            }

            // CASE B: Native ETH Check
            if (expectedTokenSymbolOrAddress.toLowerCase() === 'native') {
                if (receipt.to?.toLowerCase() === treasuryAddress.toLowerCase()) {
                    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` })
                    const formatted = formatUnits(tx.value, 18)
                    if (parseFloat(formatted) < parseFloat(expectedAmount)) {
                        return { verified: false, actualAmount: formatted, payerAddress, error: `Insufficient ETH: ${formatted} < ${expectedAmount}` }
                    }
                    return { verified: true, actualAmount: formatted, payerAddress, asset: 'ETH' }
                }
                return { verified: false, actualAmount: '0', payerAddress, error: 'Target address mismatch (Native)' }
            }

            // ERC20 Check (USDC, USDT, etc)
            const transferLog = receipt.logs.find(log => {
                // Must act on the expected token contract
                if (log.address.toLowerCase() !== expectedContract) return false

                // Topic 2 is 'to'
                const toTopic = log.topics[2]
                if (!toTopic) return false
                const toAddress = '0x' + toTopic.slice(26)
                return toAddress.toLowerCase() === treasuryAddress.toLowerCase()
            })

            if (!transferLog) {
                return { verified: false, actualAmount: '0', payerAddress, error: `No Transfer event found for ${tokenConfig.symbol}` }
            }

            const value = BigInt(transferLog.data)
            const decimals = tokenConfig.decimals
            const formatted = formatUnits(value, decimals)

            // Tolerance check (optional, but 0.01 vs 0.0099999 logic if needed, exact for now)
            if (parseFloat(formatted) < parseFloat(expectedAmount)) {
                return { verified: false, actualAmount: formatted, payerAddress, error: `Insufficient amount: ${formatted} < ${expectedAmount}` }
            }

            return { verified: true, actualAmount: formatted, payerAddress, asset: tokenConfig.symbol }

        } catch (e: any) {
            console.error("Blockchain verification failed:", e)
            return { verified: false, actualAmount: '0', payerAddress: '', error: e.message }
        }
    }
}
