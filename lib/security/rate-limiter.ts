/**
 * Enhanced Rate Limiting System
 * Multi-tier rate limiting with adaptive thresholds and abuse detection
 */

interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  burst: number;
  penalty: number; // seconds to wait after violation
}

interface RateLimitTier {
  name: string;
  config: RateLimitConfig;
  triggers: string[];
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  tier: string;
  penalty?: number;
}

export class EnhancedRateLimiter {
  private static readonly RATE_LIMIT_TIERS: RateLimitTier[] = [
    {
      name: 'payment_verification',
      config: { requests: 60, window: 60, burst: 10, penalty: 300 },
      triggers: ['/api/v1/router/verify', '/verify']
    },
    {
      name: 'payment_settlement',
      config: { requests: 10, window: 60, burst: 3, penalty: 600 },
      triggers: ['/api/v1/router/settle', '/settle']
    },
    {
      name: 'session_creation',
      config: { requests: 20, window: 300, burst: 5, penalty: 1800 },
      triggers: ['/api/v1/sessions', '/api/v1/router/session']
    },
    {
      name: 'dashboard_requests',
      config: { requests: 300, window: 60, burst: 50, penalty: 60 },
      triggers: ['/api/v1/dashboard', '/dashboard']
    },
    {
      name: 'global_default',
      config: { requests: 100, window: 60, burst: 20, penalty: 300 },
      triggers: ['*']
    }
  ];

  private static readonly ABUSE_THRESHOLDS = {
    consecutiveViolations: 3,
    violationsInWindow: 10,
    windowMinutes: 30,
    banDuration: 3600 // 1 hour
  };

  /**
   * Check rate limit with multi-tier logic
   */
  static async checkRateLimit(
    clientId: string,
    endpoint: string,
    userAgent?: string,
    isAuthenticated: boolean = false
  ): Promise<RateLimitResult> {

    // Determine appropriate tier
    const tier = this.getTierForEndpoint(endpoint);

    // Check if client is currently banned
    const banStatus = await this.checkBanStatus(clientId);
    if (banStatus.banned) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: banStatus.resetTime,
        tier: 'banned',
        penalty: banStatus.remaining
      };
    }

    // Apply rate limit
    const result = await this.applyRateLimit(clientId, tier, isAuthenticated);

    // Check for abuse patterns
    if (!result.allowed) {
      await this.trackViolation(clientId, endpoint, userAgent);
    }

    return result;
  }

  /**
   * Apply rate limit for specific tier
   */
  private static async applyRateLimit(
    clientId: string,
    tier: RateLimitTier,
    isAuthenticated: boolean
  ): Promise<RateLimitResult> {

    const config = tier.config;
    const now = Date.now();
    const windowStart = Math.floor(now / (config.window * 1000)) * (config.window * 1000);

    // Authenticated users get higher limits
    const multiplier = isAuthenticated ? 2 : 1;
    const limit = config.requests * multiplier;

    const key = `ratelimit:${tier.name}:${clientId}:${windowStart}`;

    try {
      // Use Redis or similar for production
      // For demo, using in-memory store
      const current = await this.getCount(key) || 0;

      if (current >= limit) {
        // Check burst allowance
        const burstKey = `burst:${tier.name}:${clientId}:${Math.floor(now / 10000)}`;
        const burstUsed = await this.getCount(burstKey) || 0;

        if (burstUsed >= config.burst) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: windowStart + (config.window * 1000),
            tier: tier.name,
            penalty: config.penalty
          };
        }

        // Allow burst request
        await this.incrementCount(burstKey, 10); // 10 second window for burst
      }

      // Increment counter
      await this.incrementCount(key, config.window);

      return {
        allowed: true,
        remaining: Math.max(0, limit - current - 1),
        resetTime: windowStart + (config.window * 1000),
        tier: tier.name
      };

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open for availability
      return {
        allowed: true,
        remaining: config.requests,
        resetTime: windowStart + (config.window * 1000),
        tier: tier.name
      };
    }
  }

  /**
   * Track rate limit violations for abuse detection
   */
  private static async trackViolation(
    clientId: string,
    endpoint: string,
    userAgent?: string
  ): Promise<void> {
    const violation = {
      clientId,
      endpoint,
      userAgent,
      timestamp: Date.now()
    };

    // Store violation record
    const violationKey = `violations:${clientId}`;
    await this.addViolation(violationKey, violation);

    // Check for abuse patterns
    const violations = await this.getViolations(violationKey);
    const recentViolations = violations.filter(
      v => v.timestamp > Date.now() - (this.ABUSE_THRESHOLDS.windowMinutes * 60 * 1000)
    );

    if (recentViolations.length >= this.ABUSE_THRESHOLDS.violationsInWindow) {
      await this.banClient(clientId, 'Excessive rate limit violations');
    }

    console.warn('Rate limit violation:', violation);
  }

  /**
   * Ban client for abuse
   */
  private static async banClient(clientId: string, reason: string): Promise<void> {
    const banRecord = {
      clientId,
      reason,
      bannedAt: Date.now(),
      expiresAt: Date.now() + (this.ABUSE_THRESHOLDS.banDuration * 1000)
    };

    const banKey = `banned:${clientId}`;
    await this.setBan(banKey, banRecord);

    console.error('Client banned for abuse:', banRecord);
  }

  /**
   * Check if client is currently banned
   */
  private static async checkBanStatus(clientId: string): Promise<{
    banned: boolean;
    resetTime: number;
    remaining: number;
  }> {
    const banKey = `banned:${clientId}`;
    const banRecord = await this.getBan(banKey);

    if (!banRecord) {
      return { banned: false, resetTime: 0, remaining: 0 };
    }

    const now = Date.now();
    if (now > banRecord.expiresAt) {
      // Ban expired, clean up
      await this.removeBan(banKey);
      return { banned: false, resetTime: 0, remaining: 0 };
    }

    return {
      banned: true,
      resetTime: banRecord.expiresAt,
      remaining: Math.ceil((banRecord.expiresAt - now) / 1000)
    };
  }

  /**
   * Get appropriate rate limit tier for endpoint
   */
  private static getTierForEndpoint(endpoint: string): RateLimitTier {
    for (const tier of this.RATE_LIMIT_TIERS) {
      if (tier.triggers.includes(endpoint) || tier.triggers.some(t => endpoint.includes(t))) {
        return tier;
      }
    }

    // Return global default
    return this.RATE_LIMIT_TIERS[this.RATE_LIMIT_TIERS.length - 1]!;
  }

  /**
   * Adaptive rate limiting based on system load
   */
  static async getAdaptiveLimit(baseLimit: number): Promise<number> {
    // Monitor system metrics
    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = await this.getMemoryUsage();
    const activeConnections = await this.getActiveConnections();

    let multiplier = 1.0;

    // Reduce limits under high load
    if (cpuUsage > 80 || memoryUsage > 85) {
      multiplier *= 0.5;
    } else if (cpuUsage > 60 || memoryUsage > 70) {
      multiplier *= 0.75;
    }

    // Reduce limits with many active connections
    if (activeConnections > 1000) {
      multiplier *= 0.7;
    }

    return Math.floor(baseLimit * multiplier);
  }

  // Storage interface methods (implement with Redis/DB in production)
  private static async getCount(key: string): Promise<number> {
    // Mock implementation - use Redis in production
    return 0;
  }

  private static async incrementCount(key: string, ttl: number): Promise<void> {
    // Mock implementation - use Redis INCR with TTL
  }

  private static async addViolation(key: string, violation: any): Promise<void> {
    // Mock implementation - use Redis LIST
  }

  private static async getViolations(key: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private static async setBan(key: string, banRecord: any): Promise<void> {
    // Mock implementation - use Redis with TTL
  }

  private static async getBan(key: string): Promise<any> {
    // Mock implementation
    return null;
  }

  private static async removeBan(key: string): Promise<void> {
    // Mock implementation
  }

  private static async getCPUUsage(): Promise<number> {
    // Mock implementation - use system monitoring
    return 30;
  }

  private static async getMemoryUsage(): Promise<number> {
    // Mock implementation
    return 45;
  }

  private static async getActiveConnections(): Promise<number> {
    // Mock implementation
    return 250;
  }
}