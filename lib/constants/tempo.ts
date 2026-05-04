/**
 * Tempo Mainnet Constants
 * =======================
 * Single source of truth for all Tempo chain identifiers and supported stablecoins.
 *
 * Stablecoin data sourced from https://docs.tempo.xyz/guide/bridge-layerzero
 * All TIP-20 contracts use the precompile address prefix 0x20c0...
 *
 * ✓ viem 2.48.8+ ships `tempo` (chain 4217) with the correct RPC (rpc.tempo.xyz).
 *   We still override the transport with TEMPO_RPC_URL for env-configurability;
 *   the fallback hardcoded below is the canonical mainnet URL.
 */

export const TEMPO_CHAIN_ID = 4217 as const;
export const TEMPO_RPC_URL = process.env.TEMPO_RPC_URL ?? 'https://rpc.tempo.xyz';
export const TEMPO_EXPLORER_URL = 'https://explore.tempo.xyz' as const;

export interface TempoStablecoin {
    symbol: string;
    contract: `0x${string}`;
    decimals: number;
    isDefault: boolean;
    /** true = verified live settlement; false = deployed but transfer path not fully validated */
    verified: boolean;
}

/**
 * All TIP-20 stablecoins live on Tempo mainnet.
 * USDC.e is the default (isDefault: true) — used when no asset is specified.
 * Contracts derived from on-chain precompile addressing (prefix 0x20c0...).
 *
 * To add a new currency: append here, then run migration to sync the DB row.
 * The sync test at lib/__tests__/tempo-currency-sync.test.ts will fail if code
 * and DB drift apart.
 */
export const TEMPO_SUPPORTED_CURRENCIES: readonly TempoStablecoin[] = [
    {
        symbol: 'USDC.e',
        contract: '0x20C000000000000000000000b9537d11c60E8b50',
        decimals: 6,
        isDefault: true,
        verified: true,
    },
    {
        symbol: 'USDT0',
        contract: '0x20c00000000000000000000014f22ca97301eb73',
        decimals: 6,
        isDefault: false,
        verified: true,
    },
    {
        symbol: 'cUSD',
        contract: '0x20c0000000000000000000000520792dcccccccc',
        decimals: 6,
        isDefault: false,
        verified: true,
    },
    {
        symbol: 'EURC.e',
        contract: '0x20c0000000000000000000001621e21F71CF12fb',
        decimals: 6,
        isDefault: false,
        verified: false,
    },
    {
        symbol: 'frxUSD',
        contract: '0x20c0000000000000000000003554d28269e0f3c2',
        decimals: 6,
        isDefault: false,
        verified: false,
    },
    {
        symbol: 'stcUSD',
        contract: '0x20c0000000000000000000008ee4fcff88888888',
        decimals: 6,
        isDefault: false,
        verified: false,
    },
    {
        symbol: 'GUSD',
        contract: '0x20c0000000000000000000005c0bac7cef389a11',
        decimals: 6,
        isDefault: false,
        verified: false,
    },
    {
        symbol: 'rUSD',
        contract: '0x20c0000000000000000000007f7ba549dd0251b9',
        decimals: 6,
        isDefault: false,
        verified: false,
    },
    {
        symbol: 'wsrUSD',
        contract: '0x20c000000000000000000000aeed2ec36a54d0e5',
        decimals: 6,
        isDefault: false,
        verified: false,
    },
    {
        symbol: 'pathUSD',
        contract: '0x20c0000000000000000000000000000000000000',
        decimals: 6,
        isDefault: false,
        verified: false,
    },
] as const;
