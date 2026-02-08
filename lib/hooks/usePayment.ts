import { useState, useCallback } from 'react'
import { useAccount, useSignTypedData } from 'wagmi'
import { TokenConfig } from '@/lib/tokens'
import { P402_CONFIG } from '@/lib/constants'

interface PaymentOptions {
    token: TokenConfig
    amount: string
    recipient?: string  // Optional - defaults to P402 treasury
    validAfter?: number // Optional - defaults to now
    validBefore?: number // Optional - defaults to 1 hour from now
    sessionId?: string   // For tracking
}

// EIP-712 Domain for USDC EIP-3009 on Base
const USDC_DOMAIN = {
    name: 'USD Coin',
    version: '2',
    chainId: P402_CONFIG.CHAIN_ID,
    verifyingContract: P402_CONFIG.USDC_ADDRESS as `0x${string}`
} as const

const EIP3009_TYPES = {
    TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
    ]
} as const

export function usePayment() {
    const { address } = useAccount()
    const { signTypedDataAsync } = useSignTypedData()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const pay = useCallback(async (options: PaymentOptions) => {
        if (!address) {
            setError('Wallet not connected')
            return null
        }

        setIsLoading(true)
        setError(null)

        try {
            // 1. Prepare EIP-3009 authorization parameters
            const now = Math.floor(Date.now() / 1000);
            const recipient = options.recipient || P402_CONFIG.TREASURY_ADDRESS;
            const validAfter = options.validAfter || now;
            const validBefore = options.validBefore || (now + 3600); // 1 hour
            const nonce = '0x' + crypto.randomUUID().replace(/-/g, '').padEnd(64, '0'); // Random bytes32

            // Convert amount to wei (USDC has 6 decimals)
            const amountWei = BigInt(parseFloat(options.amount) * 1e6);

            // 2. Sign EIP-3009 transferWithAuthorization
            const signature = await signTypedDataAsync({
                domain: USDC_DOMAIN,
                types: EIP3009_TYPES,
                primaryType: 'TransferWithAuthorization',
                message: {
                    from: address,
                    to: recipient as `0x${string}`,
                    value: amountWei,
                    validAfter: BigInt(validAfter),
                    validBefore: BigInt(validBefore),
                    nonce: nonce as `0x${string}`
                }
            })

            // 3. Parse signature components
            const sig = signature.slice(2); // Remove 0x
            const v = parseInt(sig.slice(128, 130), 16);
            const r = '0x' + sig.slice(0, 64);
            const s = '0x' + sig.slice(64, 128);

            // 4. Submit to unified Router Settle API
            const response = await fetch('/api/v1/router/settle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: options.amount,
                    asset: 'USDC',
                    decisionId: options.sessionId,
                    payment: {
                        scheme: 'exact',
                        authorization: {
                            from: address,
                            to: recipient,
                            value: amountWei.toString(),
                            validAfter,
                            validBefore,
                            nonce,
                            v,
                            r,
                            s
                        }
                    }
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Payment failed')
            }

            return {
                ...result,
                authorizationNonce: nonce,
                signedAt: new Date().toISOString()
            }

        } catch (err: any) {
            setError(err.message || 'Payment failed')
            return null
        } finally {
            setIsLoading(false)
        }
    }, [address, signTypedDataAsync])

    return { pay, isLoading, error }
}
