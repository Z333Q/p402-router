/**
 * P402 Configuration for Cloudflare Facilitator
 */

export const P402Config = {
  // Network configuration
  CHAIN_ID: 8453, // Base mainnet
  NETWORK: 'base',

  // Token addresses
  USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',

  // RPC endpoints (fallback if env not set)
  DEFAULT_RPC_URLS: [
    'https://mainnet.base.org',
    'https://base-mainnet.g.alchemy.com/v2/demo',
    'https://base.blockpi.network/v1/rpc/public'
  ],

  // Performance limits
  MAX_REQUESTS_PER_MINUTE: 100,
  MAX_AMOUNT_USD: 10000,
  MIN_AMOUNT_USD: 0.01,

  // Fee structure
  FACILITATOR_FEE_BPS: 100, // 1%

  // Timeouts
  RPC_TIMEOUT_MS: 5000,
  VERIFICATION_TIMEOUT_MS: 10000,
  SETTLEMENT_TIMEOUT_MS: 30000,

  // Cache TTLs
  VERIFICATION_CACHE_TTL: 300,     // 5 minutes
  RECEIPT_TTL: 86400,              // 24 hours
  HEALTH_CHECK_TTL: 60,            // 1 minute

  // Error messages
  ERRORS: {
    INVALID_AMOUNT: 'Amount must be between $0.01 and $10,000',
    INVALID_TOKEN: 'Only USDC is supported',
    INVALID_NETWORK: 'Only Base network is supported',
    INSUFFICIENT_BALANCE: 'Insufficient USDC balance',
    EXPIRED_AUTHORIZATION: 'Payment authorization has expired',
    INVALID_SIGNATURE: 'Invalid EIP-3009 signature',
    NONCE_USED: 'Authorization nonce already used',
    RATE_LIMIT: 'Rate limit exceeded',
    VERIFICATION_FAILED: 'Payment verification failed',
    SETTLEMENT_FAILED: 'Settlement execution failed'
  }
} as const;