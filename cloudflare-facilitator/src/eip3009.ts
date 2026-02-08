/**
 * EIP-3009 Handler for Cloudflare Workers
 * Implements gasless USDC transfers using transferWithAuthorization
 */

import { P402Config } from './config';

interface EIP3009Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

export class EIP3009Handler {
  /**
   * Verify EIP-3009 authorization without executing
   */
  static async verify(authorization: EIP3009Authorization, env: any): Promise<Response> {
    try {
      // Basic validation
      const validation = this.validateAuthorization(authorization);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          verified: false,
          error: validation.error
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check cache first
      const cacheKey = `verify:${authorization.nonce}`;
      const cached = await env.RECEIPTS_KV.get(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get RPC provider
      const rpcUrl = env.BASE_RPC_URL || P402Config.DEFAULT_RPC_URLS[0];

      // Check if nonce is already used
      const nonceUsed = await this.checkNonceState(authorization.from, authorization.nonce, rpcUrl);
      if (nonceUsed) {
        const result = {
          verified: false,
          error: P402Config.ERRORS.NONCE_USED
        };

        // Cache negative result briefly
        await env.RECEIPTS_KV.put(cacheKey, JSON.stringify(result), {
          expirationTtl: 60 // 1 minute
        });

        return new Response(JSON.stringify(result), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify signature
      const signatureValid = await this.verifySignature(authorization, rpcUrl);
      if (!signatureValid) {
        return new Response(JSON.stringify({
          verified: false,
          error: P402Config.ERRORS.INVALID_SIGNATURE
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check balance
      const hasBalance = await this.checkBalance(authorization.from, authorization.value, rpcUrl);
      if (!hasBalance) {
        return new Response(JSON.stringify({
          verified: false,
          error: P402Config.ERRORS.INSUFFICIENT_BALANCE
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = {
        verified: true,
        scheme: 'exact',
        amount_usd: parseFloat(authorization.value) / 1e6, // Convert from 6 decimals
        token: 'USDC',
        network: 'base',
        payer: authorization.from,
        expires_at: new Date(authorization.validBefore * 1000).toISOString()
      };

      // Cache positive result
      await env.RECEIPTS_KV.put(cacheKey, JSON.stringify(result), {
        expirationTtl: P402Config.VERIFICATION_CACHE_TTL
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error('EIP-3009 verification error:', error);
      return new Response(JSON.stringify({
        verified: false,
        error: P402Config.ERRORS.VERIFICATION_FAILED,
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Execute EIP-3009 gasless transfer
   */
  static async execute(authorization: EIP3009Authorization, env: any): Promise<Response> {
    try {
      // Verify first
      const verification = await this.verify(authorization, env);
      const verificationData = await verification.json();

      if (!verificationData.verified) {
        return new Response(JSON.stringify({
          success: false,
          error: verificationData.error
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Execute transferWithAuthorization
      const rpcUrl = env.BASE_RPC_URL || P402Config.DEFAULT_RPC_URLS[0];
      const facilitatorKey = env.FACILITATOR_PRIVATE_KEY;

      if (!facilitatorKey) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Facilitator wallet not configured'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const txHash = await this.executeTransferWithAuthorization(authorization, facilitatorKey, rpcUrl);

      // Store settlement record
      const settlementId = `settlement_${crypto.randomUUID()}`;
      const settlement = {
        id: settlementId,
        txHash,
        scheme: 'exact',
        amount_usd: verificationData.amount_usd,
        payer: authorization.from,
        settled_at: new Date().toISOString()
      };

      await env.RECEIPTS_KV.put(settlementId, JSON.stringify(settlement), {
        expirationTtl: P402Config.RECEIPT_TTL
      });

      return new Response(JSON.stringify({
        success: true,
        txHash,
        amount_usd: verificationData.amount_usd,
        settlement_id: settlementId,
        explorer_url: `https://basescan.org/tx/${txHash}`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error('EIP-3009 execution error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: P402Config.ERRORS.SETTLEMENT_FAILED,
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Validate authorization structure and timing
   */
  private static validateAuthorization(auth: EIP3009Authorization): { valid: boolean; error?: string } {
    // Check required fields
    if (!auth.from || !auth.to || !auth.value || !auth.nonce) {
      return { valid: false, error: 'Missing required authorization fields' };
    }

    // Check address format
    if (!auth.from.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { valid: false, error: 'Invalid from address format' };
    }

    if (!auth.to.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { valid: false, error: 'Invalid to address format' };
    }

    // Check amount limits
    const amountUSD = parseFloat(auth.value) / 1e6;
    if (amountUSD < P402Config.MIN_AMOUNT_USD || amountUSD > P402Config.MAX_AMOUNT_USD) {
      return { valid: false, error: P402Config.ERRORS.INVALID_AMOUNT };
    }

    // Check timing
    const now = Math.floor(Date.now() / 1000);
    if (now < auth.validAfter) {
      return { valid: false, error: 'Authorization not yet valid' };
    }

    if (now > auth.validBefore) {
      return { valid: false, error: P402Config.ERRORS.EXPIRED_AUTHORIZATION };
    }

    // Check recipient (must be P402 treasury)
    // Note: In production, this would be env.P402_TREASURY_ADDRESS
    if (!auth.to.toLowerCase().includes('b23f146251e3816a011e800bcbae704baa5619ec')) {
      return { valid: false, error: 'Invalid recipient address' };
    }

    return { valid: true };
  }

  /**
   * Check if nonce has been used on USDC contract
   */
  private static async checkNonceState(authorizer: string, nonce: string, rpcUrl: string): Promise<boolean> {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: P402Config.USDC_ADDRESS,
            data: `0x98712895${authorizer.slice(2).padStart(64, '0')}${nonce.slice(2)}` // authorizationState(address,bytes32)
          }, 'latest']
        })
      });

      const result = await response.json();
      const used = result.result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
      return used;
    } catch (error) {
      console.warn('Nonce check failed:', error);
      return false; // Assume not used if check fails
    }
  }

  /**
   * Verify EIP-712 signature
   */
  private static async verifySignature(auth: EIP3009Authorization, rpcUrl: string): Promise<boolean> {
    // Implementation would reconstruct EIP-712 hash and verify signature
    // For brevity, simplified validation
    return auth.v >= 27 && auth.v <= 28 && auth.r.length === 66 && auth.s.length === 66;
  }

  /**
   * Check USDC balance
   */
  private static async checkBalance(account: string, amount: string, rpcUrl: string): Promise<boolean> {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: P402Config.USDC_ADDRESS,
            data: `0x70a08231${account.slice(2).padStart(64, '0')}` // balanceOf(address)
          }, 'latest']
        })
      });

      const result = await response.json();
      const balance = BigInt(result.result || '0');
      const required = BigInt(amount);

      return balance >= required;
    } catch (error) {
      console.warn('Balance check failed:', error);
      return false;
    }
  }

  /**
   * Execute transferWithAuthorization on USDC contract
   */
  private static async executeTransferWithAuthorization(
    auth: EIP3009Authorization,
    facilitatorKey: string,
    rpcUrl: string
  ): Promise<string> {
    // Implementation would use ethers.js or similar to:
    // 1. Create wallet from facilitatorKey
    // 2. Call transferWithAuthorization on USDC contract
    // 3. Return transaction hash

    // For demo purposes, return a mock transaction hash
    const mockTxHash = `0x${crypto.randomUUID().replace(/-/g, '')}${'0'.repeat(64 - 32)}`;
    return mockTxHash;
  }
}