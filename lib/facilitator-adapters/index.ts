export type FacilitatorProbe = {
    status: 'healthy' | 'degraded' | 'down'
    p95VerifyMs: number
    p95SettleMs: number
    successRate: number
    lastCheckedAt: string
    reason?: string
}

export interface FacilitatorAdapter {
    id: string
    name: string
    networks: string[] // CAIP-2 identifiers

    // Check if this adapter supports the requested payment params
    supports(args: { network: string; scheme: string; asset: string }): boolean

    // Real-time health check
    probe(): Promise<FacilitatorProbe>

    // Return the settlement endpoint (if applicable for rerouting)
    getEndpoint(): string

    // Return payment configuration (treasury address)
    getPaymentConfig?(): { treasuryAddress: string }
}
