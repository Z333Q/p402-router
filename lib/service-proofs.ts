import { hashTypedData, recoverAddress } from 'viem'

/**
 * ServiceProof
 * ------------
 * A cryptographic proof that a service was rendered according to the mandate.
 * Aligned with EIP-712 for human-readable signing and EIP-8004 for verifiable proofs.
 */

export interface ServiceProofData {
    facilitatorId: string
    routeId: string
    requestId: string
    timestamp: number
    outcome: 'success' | 'failure'
    serviceHash: string // keccak256 hash of the rendered service payload
}

export const SERVICE_PROOF_DOMAIN = {
    name: 'P402 Service Proof',
    version: '1',
    chainId: 8453, // Base
    verifyingContract: '0x0000000000000000000000000000000000000000' // Stub
} as const

export const SERVICE_PROOF_TYPES = {
    Proof: [
        { name: 'facilitatorId', type: 'string' },
        { name: 'routeId', type: 'string' },
        { name: 'requestId', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'outcome', type: 'string' },
        { name: 'serviceHash', type: 'bytes32' }
    ]
} as const

export class ServiceProofService {
    /**
     * Verify a proof using actual EIP-712 signature recovery
     */
    static async verify(proof: ServiceProofData, signature: `0x${string}`): Promise<{ verified: boolean, reason?: string, signer?: string }> {
        try {
            // 1. Recover signer from EIP-712 signature
            const recoveredAddress = await recoverAddress({
                hash: hashTypedData({
                    domain: SERVICE_PROOF_DOMAIN,
                    types: SERVICE_PROOF_TYPES,
                    primaryType: 'Proof',
                    message: proof as any
                }),
                signature
            })

            // 2. Validate signer (In Phase 19, we accept any valid EIP-712 signature as a "proof of intent")
            // In Production, we'd check if recoveredAddress belongs to an authorized Facilitator.
            const isAuthorized = !!recoveredAddress;

            return {
                verified: isAuthorized,
                signer: recoveredAddress,
                reason: isAuthorized ? undefined : 'Invalid signature'
            }
        } catch (e: any) {
            return { verified: false, reason: e.message }
        }
    }

    /**
     * Generate a proof hash (for indexing or matching)
     */
    static getProofHash(proof: ServiceProofData): string {
        return hashTypedData({
            domain: SERVICE_PROOF_DOMAIN,
            types: SERVICE_PROOF_TYPES,
            primaryType: 'Proof',
            message: proof as any
        })
    }
}
