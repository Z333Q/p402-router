/**
 * Environment Configuration Validator
 * Ensures all required environment variables and configurations are present and valid
 */

import { P402_CONFIG } from '@/lib/constants';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  environment: 'development' | 'staging' | 'production';
}

interface RequiredEnvVar {
  name: string;
  required: boolean;
  format?: 'address' | 'url' | 'key' | 'number';
  description: string;
}

export class EnvironmentValidator {
  private static readonly REQUIRED_ENV_VARS: RequiredEnvVar[] = [
    {
      name: 'DATABASE_URL',
      required: true,
      format: 'url',
      description: 'PostgreSQL connection string'
    },
    {
      name: 'NEXTAUTH_SECRET',
      required: true,
      format: 'key',
      description: 'NextAuth.js secret for session encryption'
    },
    {
      name: 'NEXTAUTH_URL',
      required: true,
      format: 'url',
      description: 'Base URL for NextAuth.js callbacks'
    },
    {
      name: 'P402_TREASURY_ADDRESS',
      required: true,
      format: 'address',
      description: 'Ethereum address of P402 treasury'
    },
    {
      name: 'BASE_RPC_URL',
      required: true,
      format: 'url',
      description: 'Base network RPC endpoint'
    },
    {
      name: 'FACILITATOR_PRIVATE_KEY',
      required: false, // Only for settlement operations
      format: 'key',
      description: 'Private key for gasless settlement facilitation'
    },
    {
      name: 'REDIS_URL',
      required: false, // Optional for enhanced features
      format: 'url',
      description: 'Redis connection for caching and rate limiting'
    },
    {
      name: 'SENTRY_DSN',
      required: false,
      format: 'url',
      description: 'Sentry error tracking DSN'
    }
  ];

  /**
   * Validate complete environment configuration
   */
  static validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const environment = this.detectEnvironment();

    console.log('🔍 Validating environment configuration...');

    // Validate required environment variables
    for (const envVar of this.REQUIRED_ENV_VARS) {
      const value = process.env[envVar.name];

      if (envVar.required && !value) {
        errors.push(`Missing required environment variable: ${envVar.name} (${envVar.description})`);
        continue;
      }

      if (value && envVar.format) {
        const formatError = this.validateFormat(envVar.name, value, envVar.format);
        if (formatError) {
          errors.push(formatError);
        }
      }
    }

    // Environment-specific validations
    if (environment === 'production') {
      warnings.push(...this.validateProduction());
    } else if (environment === 'staging') {
      warnings.push(...this.validateStaging());
    } else {
      warnings.push(...this.validateDevelopment());
    }

    // Validate P402 configuration consistency
    const configErrors = this.validateP402Configuration();
    errors.push(...configErrors);

    // Security validations
    const securityWarnings = this.validateSecurity();
    warnings.push(...securityWarnings);

    const valid = errors.length === 0;

    if (valid) {
      console.log('✅ Environment validation passed');
      if (warnings.length > 0) {
        console.warn(`⚠️ ${warnings.length} warnings found`);
      }
    } else {
      console.error(`❌ Environment validation failed with ${errors.length} errors`);
    }

    return {
      valid,
      errors,
      warnings,
      environment
    };
  }

  /**
   * Validate environment variable format
   */
  private static validateFormat(name: string, value: string, format: string): string | null {
    switch (format) {
      case 'address':
        if (!value.match(/^0x[a-fA-F0-9]{40}$/)) {
          return `${name} must be a valid Ethereum address (0x... 40 chars)`;
        }
        if (value === '0x0000000000000000000000000000000000000000') {
          return `${name} cannot be the null address`;
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return `${name} must be a valid URL`;
        }
        break;

      case 'key':
        if (value.length < 32) {
          return `${name} must be at least 32 characters for security`;
        }
        if (format === 'key' && name.includes('PRIVATE_KEY')) {
          if (!value.match(/^0x[a-fA-F0-9]{64}$/)) {
            return `${name} must be a valid private key (0x... 64 chars)`;
          }
        }
        break;

      case 'number':
        if (isNaN(Number(value))) {
          return `${name} must be a valid number`;
        }
        break;
    }

    return null;
  }

  /**
   * Detect current environment
   */
  private static detectEnvironment(): 'development' | 'staging' | 'production' {
    const nodeEnv = process.env.NODE_ENV;
    const vercelEnv = process.env.VERCEL_ENV;

    if (nodeEnv === 'production' || vercelEnv === 'production') {
      return 'production';
    } else if (vercelEnv === 'preview' || process.env.ENVIRONMENT === 'staging') {
      return 'staging';
    } else {
      return 'development';
    }
  }

  /**
   * Validate production-specific requirements
   */
  private static validateProduction(): string[] {
    const warnings: string[] = [];

    // Ensure HTTPS in production
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl && !nextAuthUrl.startsWith('https://')) {
      warnings.push('NEXTAUTH_URL should use HTTPS in production');
    }

    // Ensure strong secrets in production
    const secret = process.env.NEXTAUTH_SECRET;
    if (secret && secret.length < 64) {
      warnings.push('NEXTAUTH_SECRET should be longer in production (recommend 64+ chars)');
    }

    // Check for debug flags that should be disabled
    if (process.env.DEBUG) {
      warnings.push('DEBUG flag should not be enabled in production');
    }

    // Verify treasury address matches expected production address
    const treasuryAddress = process.env.P402_TREASURY_ADDRESS;
    if (treasuryAddress && treasuryAddress.toLowerCase() !== P402_CONFIG.TREASURY_ADDRESS.toLowerCase()) {
      warnings.push('Treasury address in environment differs from production configuration');
    }

    return warnings;
  }

  /**
   * Validate staging-specific requirements
   */
  private static validateStaging(): string[] {
    const warnings: string[] = [];

    // Staging should use testnet
    const rpcUrl = process.env.BASE_RPC_URL;
    if (rpcUrl && !rpcUrl.includes('sepolia') && !rpcUrl.includes('testnet')) {
      warnings.push('Staging should use testnet RPC endpoints');
    }

    return warnings;
  }

  /**
   * Validate development-specific requirements
   */
  private static validateDevelopment(): string[] {
    const warnings: string[] = [];

    // Development can be more lenient but should warn about missing optional features
    if (!process.env.REDIS_URL) {
      warnings.push('REDIS_URL not set - advanced caching and rate limiting disabled');
    }

    if (!process.env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set - error tracking disabled');
    }

    return warnings;
  }

  /**
   * Validate P402 configuration consistency
   */
  private static validateP402Configuration(): string[] {
    const errors: string[] = [];

    try {
      // Validate treasury address consistency
      const envTreasury = process.env.P402_TREASURY_ADDRESS;
      const configTreasury = P402_CONFIG.TREASURY_ADDRESS;

      if (envTreasury && envTreasury.toLowerCase() !== configTreasury.toLowerCase()) {
        errors.push('P402_TREASURY_ADDRESS environment variable does not match configuration constant');
      }

      // Validate network configuration
      const rpcUrl = process.env.BASE_RPC_URL;
      if (rpcUrl) {
        if (rpcUrl.includes('sepolia') && P402_CONFIG.CHAIN_ID !== 84532) {
          errors.push('RPC URL indicates testnet but chain ID is for mainnet');
        } else if (!rpcUrl.includes('sepolia') && P402_CONFIG.CHAIN_ID !== 8453) {
          errors.push('RPC URL indicates mainnet but chain ID is for testnet');
        }
      }

    } catch (error) {
      errors.push(`P402 configuration validation failed: ${error}`);
    }

    return errors;
  }

  /**
   * Validate security configuration
   */
  private static validateSecurity(): string[] {
    const warnings: string[] = [];

    // Check for insecure configurations
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      warnings.push('TLS certificate validation is disabled - security risk');
    }

    // Check for development keys in production
    const facilitatorKey = process.env.FACILITATOR_PRIVATE_KEY;
    if (facilitatorKey && facilitatorKey.includes('test') || facilitatorKey?.includes('dev')) {
      warnings.push('Facilitator private key appears to be a test key');
    }

    // Check for weak database passwords
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && (dbUrl.includes(':password@') || dbUrl.includes(':123456@'))) {
      warnings.push('Database URL contains weak password');
    }

    return warnings;
  }

  /**
   * Get environment health summary
   */
  static getHealthSummary(): {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details: ValidationResult;
  } {
    const validation = this.validate();

    if (!validation.valid) {
      return {
        status: 'error',
        message: `Environment validation failed: ${validation.errors.length} errors`,
        details: validation
      };
    }

    if (validation.warnings.length > 0) {
      return {
        status: 'warning',
        message: `Environment validation passed with ${validation.warnings.length} warnings`,
        details: validation
      };
    }

    return {
      status: 'healthy',
      message: 'Environment configuration is valid',
      details: validation
    };
  }
}