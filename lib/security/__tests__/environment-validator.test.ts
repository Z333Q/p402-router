import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnvironmentValidator } from '../environment-validator';

vi.mock('@/lib/constants', () => ({
    P402_CONFIG: {
        TREASURY_ADDRESS: '0xb23f146251e3816a011e800bcbae704baa5619ec',
        USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        CHAIN_ID: 8453,
        NETWORK: 'base'
    }
}));

describe('EnvironmentValidator', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    describe('validate', () => {
        it('should report errors for missing required env vars', () => {
            // Clear all required env vars
            delete process.env.DATABASE_URL;
            delete process.env.NEXTAUTH_SECRET;
            delete process.env.NEXTAUTH_URL;
            delete process.env.P402_TREASURY_ADDRESS;
            delete process.env.BASE_RPC_URL;

            const result = EnvironmentValidator.validate();

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.includes('DATABASE_URL'))).toBe(true);
            expect(result.errors.some(e => e.includes('NEXTAUTH_SECRET'))).toBe(true);
        });

        it('should pass when all required env vars are set with valid values', () => {
            process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
            process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
            process.env.P402_TREASURY_ADDRESS = '0xb23f146251e3816a011e800bcbae704baa5619ec';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';
            process.env.NODE_ENV = 'development';

            const result = EnvironmentValidator.validate();

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect invalid Ethereum address format', () => {
            process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
            process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
            process.env.P402_TREASURY_ADDRESS = 'not-an-address';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';

            const result = EnvironmentValidator.validate();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('P402_TREASURY_ADDRESS'))).toBe(true);
        });

        it('should reject null address', () => {
            process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
            process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
            process.env.P402_TREASURY_ADDRESS = '0x0000000000000000000000000000000000000000';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';

            const result = EnvironmentValidator.validate();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('null address'))).toBe(true);
        });

        it('should detect invalid URL format', () => {
            process.env.DATABASE_URL = 'not-a-url';
            process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
            process.env.P402_TREASURY_ADDRESS = '0xb23f146251e3816a011e800bcbae704baa5619ec';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';

            const result = EnvironmentValidator.validate();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('valid URL'))).toBe(true);
        });

        it('should detect short secret keys', () => {
            process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
            process.env.NEXTAUTH_SECRET = 'tooshort';
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
            process.env.P402_TREASURY_ADDRESS = '0xb23f146251e3816a011e800bcbae704baa5619ec';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';

            const result = EnvironmentValidator.validate();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('32 characters'))).toBe(true);
        });
    });

    describe('detectEnvironment', () => {
        it('should detect production from NODE_ENV', () => {
            process.env.NODE_ENV = 'production';
            // Set required vars to avoid validation errors
            process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
            process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
            process.env.NEXTAUTH_URL = 'https://p402.io';
            process.env.P402_TREASURY_ADDRESS = '0xb23f146251e3816a011e800bcbae704baa5619ec';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';

            const result = EnvironmentValidator.validate();
            expect(result.environment).toBe('production');
        });

        it('should detect development by default', () => {
            process.env.NODE_ENV = 'development';
            delete process.env.VERCEL_ENV;
            process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
            process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
            process.env.P402_TREASURY_ADDRESS = '0xb23f146251e3816a011e800bcbae704baa5619ec';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';

            const result = EnvironmentValidator.validate();
            expect(result.environment).toBe('development');
        });
    });

    describe('getHealthSummary', () => {
        it('should return error status when validation fails', () => {
            delete process.env.DATABASE_URL;
            delete process.env.NEXTAUTH_SECRET;

            const summary = EnvironmentValidator.getHealthSummary();
            expect(summary.status).toBe('error');
        });

        it('should return healthy status when validation passes', () => {
            process.env.NODE_ENV = 'production';
            process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
            process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
            process.env.NEXTAUTH_URL = 'https://p402.io';
            process.env.P402_TREASURY_ADDRESS = '0xb23f146251e3816a011e800bcbae704baa5619ec';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';
            process.env.REDIS_URL = 'redis://localhost:6379';
            process.env.SENTRY_DSN = 'https://sentry.example.com/123';

            const summary = EnvironmentValidator.getHealthSummary();
            expect(['healthy', 'warning']).toContain(summary.status);
        });
    });

    describe('security validations', () => {
        it('should warn about disabled TLS validation', () => {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
            process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
            process.env.P402_TREASURY_ADDRESS = '0xb23f146251e3816a011e800bcbae704baa5619ec';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';

            const result = EnvironmentValidator.validate();
            expect(result.warnings.some(w => w.includes('TLS'))).toBe(true);
        });

        it('should warn about weak database passwords', () => {
            process.env.DATABASE_URL = 'postgresql://user:password@localhost/db';
            process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
            process.env.NEXTAUTH_URL = 'http://localhost:3000';
            process.env.P402_TREASURY_ADDRESS = '0xb23f146251e3816a011e800bcbae704baa5619ec';
            process.env.BASE_RPC_URL = 'https://mainnet.base.org';

            const result = EnvironmentValidator.validate();
            expect(result.warnings.some(w => w.includes('weak password'))).toBe(true);
        });
    });
});
