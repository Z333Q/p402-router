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

  console.log('P402 configuration validated');
  return true;
}

// ERC-8004 Trustless Agents Configuration
export const ERC8004_CONFIG = {
  IDENTITY_REGISTRY: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const,
  REPUTATION_REGISTRY: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const,
  CHAIN_ID: 8453 as const,
  NETWORK: 'eip155:8453' as const,
  AGENT_REGISTRY_PREFIX: 'eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const,
} as const;

export const ERC8004_TESTNET_CONFIG = {
  ...ERC8004_CONFIG,
  IDENTITY_REGISTRY: '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const,
  REPUTATION_REGISTRY: '0x8004B663056A597Dffe9eCcC1965A193B7388713' as const,
  CHAIN_ID: 84532 as const,
  NETWORK: 'eip155:84532' as const,
  AGENT_REGISTRY_PREFIX: 'eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e' as const,
} as const;

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

export const BASE_USDC_ADDRESS = P402_CONFIG.USDC_ADDRESS;
export const SUBSCRIPTION_FACILITATOR_ADDRESS = process.env.SUBSCRIPTION_FACILITATOR_ADDRESS || '0x0000000000000000000000000000000000000000';
export const P402_SIGNER_ADDRESS = process.env.P402_SIGNER_ADDRESS || '0x0000000000000000000000000000000000000000';