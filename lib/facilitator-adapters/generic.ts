import { FacilitatorAdapter, FacilitatorProbe } from './index'

export class GenericAdapter implements FacilitatorAdapter {
    id: string
    name: string
    networks: string[]
    endpoint: string
    authConfig: any

    constructor(config: { id: string, name: string, networks: string[], endpoint: string, authConfig?: any }) {
        this.id = config.id
        this.name = config.name
        this.networks = config.networks
        this.endpoint = config.endpoint
        this.authConfig = config.authConfig || {}
    }

    supports(args: { network: string; scheme: string; asset: string }): boolean {
        // Generic adapters typically support any scheme if the network matches
        // In a real impl, we might check an opts/config object for specific asset support
        return this.networks.includes(args.network)
    }

    async probe(): Promise<FacilitatorProbe> {
        const start = Date.now();
        const timeout = this.authConfig?.timeoutMs || 3000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            // Attempt a lightweight probe.
            // If authConfig.healthPath is set, use it.
            const url = this.authConfig?.healthPath
                ? `${this.endpoint.replace(/\/$/, '')}${this.authConfig.healthPath}`
                : this.endpoint;

            const res = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            const latency = Date.now() - start;
            clearTimeout(timer);

            // Per x402 spec, a 401/403 often means the node is UP but requires auth.
            // We treat 2xx and 4xx (auth-related) as 'healthy' in terms of reachability.
            const isReachable = res.ok || res.status === 401 || res.status === 403;
            const isRateLimited = res.status === 429;

            return {
                status: isRateLimited ? 'degraded' : (isReachable ? 'healthy' : 'down'),
                p95VerifyMs: Math.round(latency / 3), // Simulated split
                p95SettleMs: latency,
                successRate: isReachable ? (isRateLimited ? 0.5 : 1.0) : 0.0,
                lastCheckedAt: new Date().toISOString(),
                reason: isRateLimited ? 'Rate Limited' : (isReachable ? undefined : `HTTP ${res.status}`)
            };
        } catch (e: any) {
            clearTimeout(timer);
            return {
                status: 'down',
                p95VerifyMs: 0,
                p95SettleMs: 0,
                successRate: 0.0,
                lastCheckedAt: new Date().toISOString(),
                reason: e.name === 'AbortError' ? 'Timeout' : e.message
            };
        }
    }

    getEndpoint(): string {
        return this.endpoint
    }

    getPaymentConfig(): { treasuryAddress: string } {
        // Attempt to find treasury address in auth_config.payment.treasuryAddress
        // Fallback to a safe nullish value or empty string if not found, 
        // though strictly the seed data guarantees this now.
        return {
            treasuryAddress: this.authConfig?.payment?.treasuryAddress || ''
        }
    }
}
