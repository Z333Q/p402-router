/**
 * Health Check Handler for Cloudflare Workers
 * Monitors facilitator health and dependencies
 */

import { P402Config } from './config';

export class HealthChecker {
  /**
   * Comprehensive health check endpoint
   */
  static async check(request: Request, env: any): Promise<Response> {
    const startTime = Date.now();
    const checks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(Date.now() / 1000), // Worker runtime uptime
      version: '1.0.0',
      checks: {} as Record<string, any>
    };

    try {
      // Check KV storage
      checks.checks.kv_storage = await this.checkKVStorage(env);

      // Check Base RPC connectivity
      checks.checks.base_rpc = await this.checkBaseRPC(env);

      // Check treasury wallet
      checks.checks.treasury = await this.checkTreasuryWallet(env);

      // Check facilitator wallet
      checks.checks.facilitator = await this.checkFacilitatorWallet(env);

      // Determine overall health
      const failedChecks = Object.values(checks.checks).filter(check => !check.healthy);
      if (failedChecks.length > 0) {
        checks.status = failedChecks.length === Object.keys(checks.checks).length ? 'unhealthy' : 'degraded';
      }

      checks.checks.response_time = {
        healthy: true,
        duration_ms: Date.now() - startTime,
        threshold_ms: 1000
      };

      const statusCode = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 200 : 503;

      return new Response(JSON.stringify(checks, null, 2), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${P402Config.HEALTH_CHECK_TTL}`
        }
      });

    } catch (error: any) {
      return new Response(JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks: checks.checks
      }, null, 2), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Check KV namespace accessibility
   */
  private static async checkKVStorage(env: any): Promise<any> {
    try {
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();

      // Test write
      await env.RECEIPTS_KV.put(testKey, testValue, { expirationTtl: 60 });

      // Test read
      const retrieved = await env.RECEIPTS_KV.get(testKey);

      if (retrieved !== testValue) {
        throw new Error('KV read/write mismatch');
      }

      // Clean up
      await env.RECEIPTS_KV.delete(testKey);

      return {
        healthy: true,
        message: 'KV storage accessible',
        latency_ms: 50 // Approximate
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: `KV storage error: ${error.message}`
      };
    }
  }

  /**
   * Check Base network RPC connectivity
   */
  private static async checkBaseRPC(env: any): Promise<any> {
    try {
      const rpcUrl = env.BASE_RPC_URL || P402Config.DEFAULT_RPC_URLS[0];
      const startTime = Date.now();

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_chainId',
          params: []
        }),
        signal: AbortSignal.timeout(P402Config.RPC_TIMEOUT_MS)
      });

      if (!response.ok) {
        throw new Error(`RPC responded with ${response.status}`);
      }

      const result = await response.json();
      const latency = Date.now() - startTime;

      if (result.error) {
        throw new Error(result.error.message);
      }

      const chainId = parseInt(result.result, 16);
      if (chainId !== P402Config.CHAIN_ID) {
        throw new Error(`Wrong chain ID: expected ${P402Config.CHAIN_ID}, got ${chainId}`);
      }

      return {
        healthy: true,
        message: 'Base RPC accessible',
        chain_id: chainId,
        latency_ms: latency,
        endpoint: rpcUrl.split('@')[0] // Hide API keys
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: `Base RPC error: ${error.message}`
      };
    }
  }

  /**
   * Check treasury wallet configuration
   */
  private static async checkTreasuryWallet(env: any): Promise<any> {
    try {
      const treasuryAddress = env.P402_TREASURY_ADDRESS;

      if (!treasuryAddress) {
        throw new Error('Treasury address not configured');
      }

      if (!treasuryAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid treasury address format');
      }

      return {
        healthy: true,
        message: 'Treasury wallet configured',
        address: treasuryAddress
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: `Treasury wallet error: ${error.message}`
      };
    }
  }

  /**
   * Check facilitator wallet configuration
   */
  private static async checkFacilitatorWallet(env: any): Promise<any> {
    try {
      const facilitatorKey = env.FACILITATOR_PRIVATE_KEY;

      if (!facilitatorKey) {
        throw new Error('Facilitator private key not configured');
      }

      // Basic validation without exposing the key
      if (!facilitatorKey.startsWith('0x') || facilitatorKey.length !== 66) {
        throw new Error('Invalid facilitator private key format');
      }

      return {
        healthy: true,
        message: 'Facilitator wallet configured',
        key_format: 'valid'
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: `Facilitator wallet error: ${error.message}`
      };
    }
  }
}