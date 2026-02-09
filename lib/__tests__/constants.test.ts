import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { P402_CONFIG, P402_TESTNET_CONFIG, validateP402Config, getP402TreasuryAddress } from '../constants';

describe('P402 Constants', () => {
    describe('P402_CONFIG', () => {
        it('should have the correct treasury address', () => {
            expect(P402_CONFIG.TREASURY_ADDRESS).toBe('0xb23f146251e3816a011e800bcbae704baa5619ec');
        });

        it('should have correct chain ID for Base mainnet', () => {
            expect(P402_CONFIG.CHAIN_ID).toBe(8453);
        });

        it('should have correct USDC address on Base', () => {
            expect(P402_CONFIG.USDC_ADDRESS).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
        });

        it('should have base as network', () => {
            expect(P402_CONFIG.NETWORK).toBe('base');
        });

        it('should have reasonable settlement limits', () => {
            expect(P402_CONFIG.MIN_SETTLEMENT_AMOUNT_USD).toBeLessThan(1);
            expect(P402_CONFIG.MAX_SETTLEMENT_AMOUNT_USD).toBeGreaterThan(100);
        });

        it('should have fee structure in basis points', () => {
            expect(P402_CONFIG.DEFAULT_FEE_BPS).toBeGreaterThan(0);
            expect(P402_CONFIG.DEFAULT_FEE_BPS).toBeLessThanOrEqual(P402_CONFIG.MAX_FEE_BPS);
        });
    });

    describe('P402_TESTNET_CONFIG', () => {
        it('should use base-sepolia network', () => {
            expect(P402_TESTNET_CONFIG.NETWORK).toBe('base-sepolia');
        });

        it('should have sepolia chain ID', () => {
            expect(P402_TESTNET_CONFIG.CHAIN_ID).toBe(84532);
        });

        it('should have a different USDC address than mainnet', () => {
            expect(P402_TESTNET_CONFIG.USDC_ADDRESS).not.toBe(P402_CONFIG.USDC_ADDRESS);
        });
    });

    describe('validateP402Config', () => {
        it('should return true with valid config', () => {
            expect(validateP402Config()).toBe(true);
        });
    });

    describe('getP402TreasuryAddress', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            process.env = originalEnv;
            vi.restoreAllMocks();
        });

        it('should return the config address when env matches', () => {
            process.env.P402_TREASURY_ADDRESS = P402_CONFIG.TREASURY_ADDRESS;
            expect(getP402TreasuryAddress()).toBe(P402_CONFIG.TREASURY_ADDRESS);
        });

        it('should return config address even when env differs (security)', () => {
            process.env.P402_TREASURY_ADDRESS = '0x0000000000000000000000000000000000000001';
            expect(getP402TreasuryAddress()).toBe(P402_CONFIG.TREASURY_ADDRESS);
        });

        it('should return config address when env is not set', () => {
            delete process.env.P402_TREASURY_ADDRESS;
            expect(getP402TreasuryAddress()).toBe(P402_CONFIG.TREASURY_ADDRESS);
        });
    });
});
