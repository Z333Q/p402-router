export type BazaarResource = {
    resourceId: string
    sourceFacilitatorId: string
    canonicalRouteId: string
    providerBaseUrl: string
    routePath: string
    methods: string[]
    title: string
    description?: string
    tags?: string[]
    pricing?: any
    accepts?: any
    inputSchema?: any
    outputSchema?: any
    updatedAt: string
    rankScore: number
}

export type IngestionResult = {
    added: number
    updated: number
    errors: number
    details: string[]
}
