// P402 Configuration Constants - Single Source of Truth
// DO NOT hardcode addresses elsewhere - import from this file

export const P402_CONFIG = {
  // Primary treasury address (verified, production)
  TREASURY_ADDRESS: '0xb23f146251e3816a011e800bcbae704baa5619ec' as const,

  // Network configuration
  NETWORK: 'base' as const,
  CHAIN_ID: 8453 as const,

  // USDC contract on Base mainnet
  USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,

  // Settlement configuration
  MIN_SETTLEMENT_AMOUNT_USD: 0.01,
  MAX_SETTLEMENT_AMOUNT_USD: 10000,

  // Fee structure (in basis points)
  DEFAULT_FEE_BPS: 100, // 1%
  MAX_FEE_BPS: 1000,    // 10% cap
} as const;

// Runtime validation
export function validateP402Config() {
  const { TREASURY_ADDRESS, USDC_ADDRESS } = P402_CONFIG;

  // Validate treasury address format
  if (!TREASURY_ADDRESS.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid treasury address format');
  }

  // Validate USDC address format
  if (!USDC_ADDRESS.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid USDC address format');
  }

  // Check for null addresses (common bug)
  if (TREASURY_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Treasury address cannot be null address');
  }

  console.log('✅ P402 configuration validated');
  return true;
}

// Development helpers
export const P402_TESTNET_CONFIG = {
  ...P402_CONFIG,
  NETWORK: 'base-sepolia' as const,
  CHAIN_ID: 84532 as const,
  USDC_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const, // Base Sepolia USDC
};

// Environment variable override check
export function getP402TreasuryAddress(): string {
  const envAddress = process.env.P402_TREASURY_ADDRESS;
  const configAddress = P402_CONFIG.TREASURY_ADDRESS;

  if (envAddress && envAddress.toLowerCase() !== configAddress.toLowerCase()) {
    console.warn('⚠️ Treasury address mismatch:', {
      configured: configAddress,
      environment: envAddress,
    });

    // In production, prefer the config constant over env vars for security
    return configAddress;
  }

  return configAddress;
}