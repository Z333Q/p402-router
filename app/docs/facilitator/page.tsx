import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { Badge } from "@/app/dashboard/_components/ui";

export default function FacilitatorDocs() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
      <TopNav />

      <main className="max-w-4xl mx-auto py-24 px-6">
        <div className="mb-12 border-b-4 border-black pb-8">
          <Badge variant="primary" className="mb-4">x402 Protocol</Badge>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">Facilitator Discovery</h1>
          <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight">
            Find and connect to P402's production facilitator network.
          </p>
        </div>

        <section className="mb-16">
          <h2 className="text-3xl font-black uppercase italic mb-8">Facilitator Endpoint</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">Production facilitator deployed on Cloudflare Workers</p>

          <div className="bg-black p-8 border-4 border-black font-mono text-sm text-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            https://facilitator.p402.io
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-black uppercase italic mb-8">Discovery Protocol</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">x402 facilitators expose capabilities via /.well-known/agent.json</p>

          <div className="bg-neutral-900 p-8 border-4 border-black text-xs overflow-x-auto text-zinc-300 shadow-[12px_12px_0px_0px_rgba(182,255,46,1)]">
            <pre><code>{`// Discover facilitator capabilities
const response = await fetch('https://facilitator.p402.io/.well-known/agent.json');
const capabilities = await response.json();

console.log('Facilitator:', capabilities.name);
console.log('Payment Schemes:', capabilities.payment_schemes);
console.log('Supported Networks:', capabilities.networks);
console.log('Fee Structure:', capabilities.fee_structure);

// Expected response:
{
  "type": "x402-facilitator",
  "name": "P402 Cloudflare Facilitator",
  "version": "1.0.0",
  "operator": "P402.io",
  "description": "Production x402 facilitator on Cloudflare Edge",

  "payment_schemes": ["exact", "onchain", "receipt"],
  "supported_tokens": ["USDC"],
  "networks": ["base"],

  "fee_structure": {
    "percentage": 1.0,
    "minimum_usd": 0.01,
    "maximum_usd": 10000.00
  },

  "endpoints": {
    "verify": "/verify",
    "settle": "/settle",
    "receipt": "/receipt",
    "health": "/health"
  },

  "locations": [
    "IAD", "DFW", "ORD", "ATL", "MIA",  // US
    "LHR", "CDG", "FRA", "AMS",         // Europe
    "NRT", "ICN", "SIN", "HKG",         // Asia
    "SYD", "MEL"                        // Oceania
  ],

  "sla": {
    "uptime": 99.9,
    "verify_latency_p95": 50,    // 50ms
    "settle_latency_p95": 2000   // 2 seconds
  }
}`}</code></pre>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-black uppercase italic mb-8">Health Monitoring</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">Monitor facilitator status and performance</p>

          <div className="bg-neutral-900 p-8 border-4 border-black text-xs overflow-x-auto text-zinc-300 shadow-[12px_12px_0px_0px_rgba(34,211,238,1)]">
            <pre><code>{`// Check facilitator health
const health = await fetch('https://facilitator.p402.io/health');
const status = await health.json();

console.log('Status:', status.status);
console.log('Uptime:', status.uptime);
console.log('Response Time:', status.checks.response_time.duration_ms);

// Health check response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 1705321800,
  "version": "1.0.0",
  "checks": {
    "kv_storage": {
      "healthy": true,
      "message": "KV storage accessible",
      "latency_ms": 50
    },
    "base_rpc": {
      "healthy": true,
      "message": "Base RPC accessible",
      "chain_id": 8453,
      "latency_ms": 120,
      "endpoint": "https://mainnet.base.org"
    },
    "treasury": {
      "healthy": true,
      "message": "Treasury wallet configured",
      "address": "0xb23f146251e3816a011e800bcbae704baa5619ec"
    },
    "facilitator": {
      "healthy": true,
      "message": "Facilitator wallet configured",
      "key_format": "valid"
    },
    "response_time": {
      "healthy": true,
      "duration_ms": 45,
      "threshold_ms": 1000
    }
  }
}`}</code></pre>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-black uppercase italic mb-8">Network Architecture</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="p-6 border-2 border-black bg-neutral-50">
              <h4 className="font-black text-neutral-900 mb-4 uppercase text-sm">Global Edge Deployment</h4>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li>• 15 regions worldwide</li>
                <li>• Cloudflare Workers runtime</li>
                <li>• Sub-50ms P95 verification latency</li>
                <li>• 99.9% uptime SLA</li>
              </ul>
            </div>

            <div className="p-6 border-2 border-black bg-neutral-50">
              <h4 className="font-black text-neutral-900 mb-4 uppercase text-sm">Security Features</h4>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li>• Rate limiting (100 req/min per IP)</li>
                <li>• API key authentication</li>
                <li>• Treasury address validation</li>
                <li>• Replay protection via nonce checking</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-3xl font-black uppercase italic mb-8">Integration Example</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">Complete payment flow using facilitator discovery</p>

          <div className="bg-neutral-900 p-8 border-4 border-black text-xs overflow-x-auto text-zinc-300 shadow-[12px_12px_0px_0px_rgba(168,85,247,1)]">
            <pre><code>{`// 1. Discover facilitator
const discovery = await fetch('https://facilitator.p402.io/.well-known/agent.json');
const facilitator = await discovery.json();

// 2. Verify payment capability
if (!facilitator.payment_schemes.includes('exact')) {
  throw new Error('Facilitator does not support EIP-3009 exact payments');
}

// 3. Check facilitator health
const health = await fetch('https://facilitator.p402.io/health');
const healthStatus = await health.json();

if (healthStatus.status !== 'healthy') {
  throw new Error('Facilitator is not healthy');
}

// 4. Verify payment
const verification = await fetch('https://facilitator.p402.io/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scheme: 'exact',
    payment: eip3009Authorization
  })
});

const verifyResult = await verification.json();

// 5. Execute settlement if verified
if (verifyResult.verified) {
  const settlement = await fetch('https://facilitator.p402.io/settle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer p402_live_...'
    },
    body: JSON.stringify({
      scheme: 'exact',
      payment: eip3009Authorization
    })
  });

  const settleResult = await settlement.json();
  console.log('Settlement successful:', settleResult.txHash);
}

// 6. Create receipt for reuse
const receipt = await fetch('https://p402.io/api/v1/receipts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txHash: settleResult.txHash,
    sessionId: 'session_123',
    amount: 1.0
  })
});

console.log('Receipt created for future sessions');`}</code></pre>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-black uppercase italic mb-8">Production Configuration</h2>

          <div className="space-y-6">
            <div className="p-6 border-2 border-black bg-white">
              <h4 className="font-black text-neutral-900 mb-2 uppercase text-sm">Base Network (Chain ID: 8453)</h4>
              <p className="text-sm text-neutral-600 mb-3">Ethereum L2 optimized for low-cost transactions</p>
              <div className="font-mono text-xs text-neutral-700">
                RPC: https://mainnet.base.org<br />
                Explorer: https://basescan.org
              </div>
            </div>

            <div className="p-6 border-2 border-black bg-white">
              <h4 className="font-black text-neutral-900 mb-2 uppercase text-sm">USDC Contract</h4>
              <p className="text-sm text-neutral-600 mb-3">Native USDC on Base with EIP-3009 support</p>
              <div className="font-mono text-xs text-neutral-700 break-all">
                Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913<br />
                Decimals: 6
              </div>
            </div>

            <div className="p-6 border-2 border-black bg-white">
              <h4 className="font-black text-neutral-900 mb-2 uppercase text-sm">P402 Treasury</h4>
              <p className="text-sm text-neutral-600 mb-3">Multi-signature treasury with on-chain governance</p>
              <div className="font-mono text-xs text-neutral-700 break-all">
                Address: 0xb23f146251e3816a011e800bcbae704baa5619ec<br />
                Multisig: 3-of-5 signatures required
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}