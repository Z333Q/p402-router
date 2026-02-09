import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedRateLimiter } from '../rate-limiter';

describe('EnhancedRateLimiter', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    describe('checkRateLimit', () => {
        it('should allow requests within the rate limit', async () => {
            const result = await EnhancedRateLimiter.checkRateLimit(
                'client_1',
                '/api/v1/router/verify'
            );

            expect(result.allowed).toBe(true);
            expect(result.tier).toBe('payment_verification');
        });

        it('should select correct tier for settlement endpoints', async () => {
            const result = await EnhancedRateLimiter.checkRateLimit(
                'client_1',
                '/api/v1/router/settle'
            );

            expect(result.allowed).toBe(true);
            expect(result.tier).toBe('payment_settlement');
        });

        it('should select correct tier for dashboard endpoints', async () => {
            const result = await EnhancedRateLimiter.checkRateLimit(
                'client_1',
                '/dashboard/analytics'
            );

            expect(result.allowed).toBe(true);
            expect(result.tier).toBe('dashboard_requests');
        });

        it('should use global_default for unknown endpoints', async () => {
            const result = await EnhancedRateLimiter.checkRateLimit(
                'client_1',
                '/api/v1/unknown-endpoint'
            );

            expect(result.allowed).toBe(true);
            expect(result.tier).toBe('global_default');
        });

        it('should include remaining count', async () => {
            const result = await EnhancedRateLimiter.checkRateLimit(
                'client_1',
                '/api/v1/router/verify'
            );

            expect(typeof result.remaining).toBe('number');
            expect(result.remaining).toBeGreaterThanOrEqual(0);
        });

        it('should include reset time', async () => {
            const result = await EnhancedRateLimiter.checkRateLimit(
                'client_1',
                '/api/v1/router/verify'
            );

            expect(typeof result.resetTime).toBe('number');
            expect(result.resetTime).toBeGreaterThan(0);
        });
    });

    describe('getAdaptiveLimit', () => {
        it('should return a number', async () => {
            const limit = await EnhancedRateLimiter.getAdaptiveLimit(100);
            expect(typeof limit).toBe('number');
            expect(limit).toBeGreaterThan(0);
        });

        it('should not exceed base limit under normal load', async () => {
            const baseLimit = 100;
            const adaptiveLimit = await EnhancedRateLimiter.getAdaptiveLimit(baseLimit);
            expect(adaptiveLimit).toBeLessThanOrEqual(baseLimit);
        });
    });
});
