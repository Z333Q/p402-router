/**
 * Rate Limiting Middleware for Cloudflare Workers
 * Uses KV storage for distributed rate limiting
 */

import { P402Config } from '../config';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  /**
   * Rate limiting middleware
   */
  static async middleware(request: Request, env: any, ctx: ExecutionContext): Promise<Response | null> {
    try {
      // Get client identifier (IP address)
      const clientIP = request.headers.get('CF-Connecting-IP') ||
                      request.headers.get('X-Forwarded-For') ||
                      'unknown';

      // Check rate limit
      const rateLimitResult = await RateLimiter.checkRateLimit(clientIP, env);

      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({
          error: P402Config.ERRORS.RATE_LIMIT,
          remaining: rateLimitResult.remaining,
          reset_time: new Date(rateLimitResult.resetTime).toISOString(),
          retry_after: rateLimitResult.retryAfter
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': P402Config.MAX_REQUESTS_PER_MINUTE.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        });
      }

      // Add rate limit headers to successful requests
      ctx.waitUntil(RateLimiter.updateRateLimit(clientIP, env));

      return null; // Continue to next handler
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      return null; // Allow request on error
    }
  }

  /**
   * Check current rate limit status for client
   */
  private static async checkRateLimit(clientIP: string, env: any): Promise<RateLimitResult> {
    const now = Date.now();
    const window = 60 * 1000; // 1 minute window
    const windowStart = Math.floor(now / window) * window;

    const key = `ratelimit:${clientIP}:${windowStart}`;

    try {
      const current = await env.RATE_LIMIT_KV.get(key);
      const count = current ? parseInt(current) : 0;

      const remaining = Math.max(0, P402Config.MAX_REQUESTS_PER_MINUTE - count);
      const allowed = count < P402Config.MAX_REQUESTS_PER_MINUTE;

      return {
        allowed,
        remaining,
        resetTime: windowStart + window,
        retryAfter: allowed ? undefined : Math.ceil((windowStart + window - now) / 1000)
      };
    } catch (error) {
      // On error, allow the request
      console.warn('Rate limit check failed:', error);
      return {
        allowed: true,
        remaining: P402Config.MAX_REQUESTS_PER_MINUTE,
        resetTime: windowStart + window
      };
    }
  }

  /**
   * Update rate limit counter for client
   */
  private static async updateRateLimit(clientIP: string, env: any): Promise<void> {
    const now = Date.now();
    const window = 60 * 1000; // 1 minute window
    const windowStart = Math.floor(now / window) * window;

    const key = `ratelimit:${clientIP}:${windowStart}`;

    try {
      const current = await env.RATE_LIMIT_KV.get(key);
      const count = current ? parseInt(current) + 1 : 1;

      // Store with TTL slightly longer than window to handle clock skew
      await env.RATE_LIMIT_KV.put(key, count.toString(), {
        expirationTtl: Math.ceil(window / 1000) + 10
      });
    } catch (error) {
      console.warn('Rate limit update failed:', error);
    }
  }

  /**
   * Advanced rate limiting with multiple tiers
   */
  static async checkAdvancedRateLimit(clientIP: string, endpoint: string, env: any): Promise<RateLimitResult> {
    const limits = {
      '/verify': { requests: 60, window: 60 },      // 60/min for verification
      '/settle': { requests: 10, window: 60 },      // 10/min for settlement
      '/receipt': { requests: 100, window: 60 },    // 100/min for receipts
      'default': { requests: 30, window: 60 }       // 30/min default
    };

    const limit = limits[endpoint as keyof typeof limits] || limits.default;
    const now = Date.now();
    const windowStart = Math.floor(now / (limit.window * 1000)) * (limit.window * 1000);

    const key = `ratelimit:${endpoint}:${clientIP}:${windowStart}`;

    try {
      const current = await env.RATE_LIMIT_KV.get(key);
      const count = current ? parseInt(current) : 0;

      const remaining = Math.max(0, limit.requests - count);
      const allowed = count < limit.requests;

      if (allowed) {
        // Increment counter
        await env.RATE_LIMIT_KV.put(key, (count + 1).toString(), {
          expirationTtl: limit.window + 10
        });
      }

      return {
        allowed,
        remaining,
        resetTime: windowStart + (limit.window * 1000),
        retryAfter: allowed ? undefined : Math.ceil((windowStart + (limit.window * 1000) - now) / 1000)
      };
    } catch (error) {
      console.warn('Advanced rate limit check failed:', error);
      return {
        allowed: true,
        remaining: limit.requests,
        resetTime: windowStart + (limit.window * 1000)
      };
    }
  }
}