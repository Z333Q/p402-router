import { FacilitatorAdapter, FacilitatorProbe } from './index'

export class CoinbaseCDPAdapter implements FacilitatorAdapter {
    id = 'fac_coinbase_01'
    name = 'Coinbase CDP'
    networks = ['eip155:8453', 'eip155:84532'] // Base Mainnet, Base Sepolia

    supports(args: { network: string; scheme: string; asset: string }): boolean {
        // Coinbase CDP mainly supports Base and standard assets
        return this.networks.includes(args.network) && ['USDC', 'USDT', 'ETH'].includes(args.asset)
    }

    async probe(): Promise<FacilitatorProbe> {
        return {
            status: 'healthy',
            p95VerifyMs: 45,
            p95SettleMs: 150,
            successRate: 0.9999,
            lastCheckedAt: new Date().toISOString()
        }
    }

    getEndpoint(): string {
        return 'https://api.cdp.coinbase.com/platform/v1/x402'
    }

    getPaymentConfig(): { treasuryAddress: string } {
        return { treasuryAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' }
    }
}
