export interface TokenConfig {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    chainId: number;
    logo?: string;
}

export const SUPPORTED_TOKENS: Record<string, TokenConfig> = {
    // Base Mainnet
    'USDC': {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
        decimals: 6,
        chainId: 8453,
        logo: '/tokens/usdc.svg'
    }
};

// Quick lookups
export const TOKEN_BY_ADDRESS: Record<string, TokenConfig> = Object.fromEntries(
    Object.values(SUPPORTED_TOKENS).map(t => [t.address.toLowerCase(), t])
);

export const isValidToken = (address: string): boolean => {
    return TOKEN_BY_ADDRESS[address.toLowerCase()] !== undefined;
};

export const getTokenConfig = (addressOrSymbol: string): TokenConfig | undefined => {
    if (!addressOrSymbol) return undefined;

    // Try by symbol first
    if (SUPPORTED_TOKENS[addressOrSymbol.toUpperCase()]) {
        return SUPPORTED_TOKENS[addressOrSymbol.toUpperCase()];
    }
    // Try by address
    return TOKEN_BY_ADDRESS[addressOrSymbol.toLowerCase()];
};

// For noUncheckedIndexedAccess, we need to provide a concrete fallback
const USDC_CONFIG: TokenConfig = {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    chainId: 8453,
    logo: '/tokens/usdc.svg'
};

export const DEFAULT_TOKEN: TokenConfig = SUPPORTED_TOKENS['USDC'] ?? USDC_CONFIG;
