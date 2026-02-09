import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClient, getRpcUrl, getChainId } from '../client';

describe('Blockchain Client', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
    });

    describe('getClient', () => {
        it('should return a client for base network', () => {
            const client = getClient('base');
            expect(client).toBeDefined();
            expect(client.chain?.id).toBe(8453);
        });

        it('should return a client for base-sepolia network', () => {
            const client = getClient('base-sepolia');
            expect(client).toBeDefined();
            expect(client.chain?.id).toBe(84532);
        });

        it('should default to base network', () => {
            const client = getClient();
            expect(client.chain?.id).toBe(8453);
        });
    });

    describe('getRpcUrl', () => {
        it('should return default base RPC URL when env not set', () => {
            const url = getRpcUrl('base');
            expect(url).toBe('https://mainnet.base.org');
        });

        it('should return default sepolia RPC URL when env not set', () => {
            const url = getRpcUrl('base-sepolia');
            expect(url).toBe('https://sepolia.base.org');
        });

        it('should use env variable when set', () => {
            vi.stubEnv('BASE_RPC_URL', 'https://custom-rpc.example.com');
            const url = getRpcUrl('base');
            expect(url).toBe('https://custom-rpc.example.com');
        });

        it('should default to base when no network specified', () => {
            const url = getRpcUrl();
            expect(url).toContain('base.org');
        });
    });

    describe('getChainId', () => {
        it('should return 8453 for base', () => {
            expect(getChainId('base')).toBe(8453);
        });

        it('should return 84532 for base-sepolia', () => {
            expect(getChainId('base-sepolia')).toBe(84532);
        });

        it('should default to 8453', () => {
            expect(getChainId()).toBe(8453);
        });
    });
});
