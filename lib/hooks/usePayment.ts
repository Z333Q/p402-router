import { useState, useCallback } from 'react'
import { useAccount, useSignTypedData } from 'wagmi'
import { TokenConfig } from '@/lib/tokens'

interface PaymentOptions {
    token: TokenConfig
    amount: string
    recipient: string
    nonce: string
    deadline: number
}

// EIP-712 Domain for Base
const EIP712_DOMAIN = {
    name: 'P402 Payment',
    version: '2',
    chainId: 8453,
    verifyingContract: '0x0000000000000000000000000000000000000402' as `0x${string}`
} as const

const EIP712_TYPES = {
    Payment: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
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
            // 1. Sign EIP-712 message
            // Note: In a real app we would check allowance here too

            const signature = await signTypedDataAsync({
                domain: EIP712_DOMAIN,
                types: EIP712_TYPES,
                primaryType: 'Payment',
                message: {
                    token: options.token.address as `0x${string}`,
                    amount: BigInt(options.amount),
                    recipient: options.recipient as `0x${string}`,
                    nonce: BigInt(options.nonce),
                    deadline: BigInt(options.deadline)
                }
            })

            // 2. Submit to Router Settle API
            // Since we are checking this on the router, the router acts as the facilitator entry
            const response = await fetch('/api/v1/router/settle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // The API expects: { txHash, amount, asset } for blockchain verification
                    // BUT if we are submitting a SIGNATURE for the *Router* to settle on our behalf (Gasless),
                    // the settle endpoint needs to handle that flow.
                    // 
                    // Re-reading the Router V2 Code:
                    // The current Router V2 `/api/v1/router/settle` calls BlockchainService.verifyPayment(txHash).
                    // It expects the CLIENT to have already broadcast the tx.
                    //
                    // The User's "Part 4: Update Facilitator Settlement" implies the Facilitator (server) pays gas.
                    //
                    // If we want to support this "Gasless / Signature Based" flow, we need to update the Settle API
                    // to accept `signature` instead of just `txHash`.
                    //
                    // However, for the IMMEDIATE frontend integration matching the current Router V2 (which verifies ON CHAIN TX),
                    // this hook should probably Broadcast the TX itself if the API is "verify only".
                    //
                    // Let's assume for this step we are implementing the hook as requested, but we might need
                    // to align the API if we want true "Relayer" functionality.
                    //
                    // Current API: Checks txHash.
                    // Requested Hook: Signs Typed Data.
                    //
                    // I will implement the hook as requested. The integration point likely implies the Settle API
                    // *should* change to support Relaying, OR the client calls a Facilitator Service directly.
                    //
                    // For now, I'll point it to `/api/v1/router/settle` but note that the current Settle API
                    // expects { txHash }. This hook might need to change to perform the writeContract logic
                    // client side if we don't have a relayer backend active.

                    payment: {
                        token: options.token.address,
                        amount: options.amount,
                        recipient: options.recipient,
                        nonce: options.nonce,
                        deadline: options.deadline
                    },
                    signature,
                    payer: address
                })
            })

            // The current API might 400 because it expects `txHash`. 
            // But I will output the file exactly as requested for the toolkit.

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Payment failed')
            }

            return result

        } catch (err: any) {
            setError(err.message || 'Payment failed')
            return null
        } finally {
            setIsLoading(false)
        }
    }, [address, signTypedDataAsync])

    return { pay, isLoading, error }
}
