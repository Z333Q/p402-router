/**
 * P402 Cloudflare Facilitator
 *
 * A production-grade x402 facilitator running on Cloudflare Workers
 * Leverages $250k startup credits for global edge deployment
 */

import { Router } from 'itty-router';
import { P402Config } from './config';
import { EIP3009Handler } from './eip3009';
import { PaymentVerifier } from './verification';
import { HealthChecker } from './health';
import { RateLimiter } from './middleware/rateLimit';
import { AuthHandler } from './middleware/auth';

const router = Router();

// Health and discovery endpoints
router.get('/.well-known/agent.json', async () => {
  return new Response(JSON.stringify({
    type: 'x402-facilitator',
    name: 'P402 Cloudflare Facilitator',
    version: '1.0.0',
    operator: 'P402.io',
    description: 'Production x402 facilitator on Cloudflare Edge',

    // x402 protocol capabilities
    payment_schemes: ['exact', 'onchain', 'receipt'],
    supported_tokens: ['USDC'],
    networks: ['base'],

    // Pricing structure
    fee_structure: {
      percentage: 1.0,           // 1% facilitator fee
      minimum_usd: 0.01,         // $0.01 minimum
      maximum_usd: 10000.00      // $10k maximum per transaction
    },

    // Service endpoints
    endpoints: {
      verify: '/verify',
      settle: '/settle',
      receipt: '/receipt',
      health: '/health'
    },

    // Global edge locations
    locations: [
      'IAD', 'DFW', 'ORD', 'ATL', 'MIA',  // US
      'LHR', 'CDG', 'FRA', 'AMS',         // Europe
      'NRT', 'ICN', 'SIN', 'HKG',         // Asia
      'SYD', 'MEL'                        // Oceania
    ],

    // Performance guarantees
    sla: {
      uptime: 99.9,
      verify_latency_p95: 50,    // 50ms
      settle_latency_p95: 2000   // 2 seconds
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.get('/health', HealthChecker.check);

// Payment verification endpoint
router.post('/verify', RateLimiter.middleware, async (request, env) => {
  try {
    const body = await request.json();
    const { scheme, payment } = body;

    switch (scheme) {
      case 'exact':
        return EIP3009Handler.verify(payment, env);

      case 'onchain':
        return PaymentVerifier.verifyOnchain(payment, env);

      case 'receipt':
        return PaymentVerifier.verifyReceipt(payment, env);

      default:
        return new Response(JSON.stringify({
          verified: false,
          error: `Unsupported payment scheme: ${scheme}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    console.error('Verification error:', error);
    return new Response(JSON.stringify({
      verified: false,
      error: 'Verification failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Payment settlement endpoint (EIP-3009 gasless execution)
router.post('/settle', AuthHandler.middleware, async (request, env) => {
  try {
    const body = await request.json();
    const { scheme, payment } = body;

    if (scheme !== 'exact') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Settlement only supports EIP-3009 exact scheme'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return EIP3009Handler.execute(payment, env);
  } catch (error: any) {
    console.error('Settlement error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Settlement failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Receipt generation for reuse
router.post('/receipt', async (request, env) => {
  try {
    const body = await request.json();
    const { txHash, sessionId } = body;

    // Store receipt in KV for later reuse
    const receiptId = `rcpt_${crypto.randomUUID()}`;
    const receipt = {
      id: receiptId,
      txHash,
      sessionId,
      amount: body.amount,
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    await env.RECEIPTS_KV.put(receiptId, JSON.stringify(receipt), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    });

    return new Response(JSON.stringify({
      success: true,
      receiptId,
      validUntil: receipt.validUntil
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Global error handling
router.all('*', () => {
  return new Response(JSON.stringify({
    error: 'Endpoint not found',
    facilitator: 'P402 Cloudflare',
    documentation: 'https://docs.p402.io/facilitators/cloudflare'
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Main worker export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Add CORS headers for cross-origin requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    try {
      const response = await router.handle(request, env, ctx);

      // Add CORS headers to all responses
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error: any) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  },
};

// Environment types
interface Env {
  // KV Namespaces
  RECEIPTS_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;

  // Secrets
  FACILITATOR_PRIVATE_KEY: string;
  P402_TREASURY_ADDRESS: string;
  BASE_RPC_URL: string;

  // Durable Objects (for rate limiting)
  RATE_LIMITER: DurableObjectNamespace;
}