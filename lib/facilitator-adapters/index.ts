export type FacilitatorProbe = {
    status: 'healthy' | 'degraded' | 'down'
    p95VerifyMs: number
    p95SettleMs: number
    successRate: number
    lastCheckedAt: string
    reason?: string
}

// Rail and protocol metadata for a facilitator row.
// These fields are set in the DB by v2_037_tempo_mpp_facilitator migration and must be
// kept in sync with the facilitators table schema.
export type FacilitatorMeta = {
    protocolSupport: ('x402' | 'mpp')[]
    mppMethodId: string | null
    chainId: number | null
    // NULL for bridge/discovery rows that do not settle directly.
    settlementScheme: 'exact' | 'onchain' | 'receipt' | null
    treasuryAddress: string | null
    currencyContract: string | null
    // 'native'     = gas in chain native token
    // 'sponsored'  = facilitator pays gas (EIP-3009 model)
    // 'stablecoin' = user pays gas in stablecoin (Tempo FeeAMM model)
    // 'n/a'        = row does not settle directly (bridge or discovery source)
    gasModel: 'native' | 'sponsored' | 'stablecoin' | 'n/a'
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
