import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export const metadata = {
    title: 'TypeScript SDK | P402 Router',
    description: 'P402 TypeScript SDK — npm install @p402/sdk. Session creation, AP2 mandate helpers, x402 payment utilities, MCP server integration, and OpenAI-compatible chat completions.',
    alternates: { canonical: 'https://p402.io/docs/sdk' },
    openGraph: { title: 'P402 TypeScript SDK', description: 'Drop-in SDK for routing AI calls, managing sessions, and settling USDC payments. OpenAI-compatible.', url: 'https://p402.io/docs/sdk' },
};

export default function SDKDocs() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
      <TopNav />

      <main className="max-w-4xl mx-auto py-24 px-6">
        <div className="mb-12 border-b-4 border-black pb-8">
          <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">Developer Guide</h1>
          <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight">
            Integrate gasless USDC payments with simple HTTP requests.
          </p>
        </div>

        <section className="mb-16">
          <h2 className="text-3xl font-black uppercase italic mb-8">Quick Start</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">P402 works with your existing code. No SDK required - just API calls.</p>
          <div className="bg-black p-8 border-4 border-black font-mono text-sm text-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            # No installation needed - use standard HTTP requests<br />
            # Compatible with fetch(), axios, curl, or any HTTP client
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-black uppercase italic mb-8">Payment Verification</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">Verify EIP-3009 gasless payment authorizations before settling.</p>

          <div className="bg-neutral-900 p-8 border-4 border-black text-xs overflow-x-auto text-zinc-300 shadow-[12px_12px_0px_0px_rgba(182,255,46,1)]">
            <pre><code>{`// 1. Verify Payment Authorization (x402 Wire Format)
const verification = await fetch('https://facilitator.p402.io/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentPayload: {
      x402Version: 2,
      scheme: 'exact',
      network: 'eip155:8453',
      payload: {
        signature: '0x...',   // 65-byte EIP-3009 signature
        authorization: {
          from: '0x...',      // User's wallet
          to: '0xb23f...',    // P402 treasury
          value: '1000000',   // 1 USDC (6 decimals)
          validAfter: '0',
          validBefore: '1735689600',
          nonce: '0x...'
        }
      }
    },
    paymentRequirements: {
      scheme: 'exact',
      network: 'eip155:8453',
      maxAmountRequired: '1000000',
      resource: 'https://example.com/api',
      description: 'AI inference',
      payTo: '0xb23f...',
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    }
  })
});

const result = await verification.json();
console.log('Valid:', result.isValid);   // true
console.log('Payer:', result.payer);     // "0x..."`}</code></pre>
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-3xl font-black uppercase italic mb-8">Gasless Settlement Execution</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">Execute gasless USDC transfers using P402's facilitator network.</p>

          <div className="bg-neutral-900 p-8 border-4 border-black text-xs overflow-x-auto text-zinc-300 shadow-[12px_12px_0px_0px_rgba(34,211,238,1)]">
            <pre><code>{`// 2. Execute Gasless Settlement (x402 Wire Format)
const settlement = await fetch('https://facilitator.p402.io/settle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentPayload: {
      x402Version: 2,
      scheme: 'exact',
      network: 'eip155:8453',
      payload: {
        signature: '0x...',
        authorization: signedAuthorization // From step 1
      }
    },
    paymentRequirements: {
      scheme: 'exact',
      network: 'eip155:8453',
      maxAmountRequired: '1000000',
      resource: 'https://example.com/api',
      description: 'AI inference',
      payTo: '0xb23f...',
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    }
  })
});

const result = await settlement.json();
if (result.success) {
  console.log('Transaction:', result.transaction);  // "0x..."
  console.log('Network:', result.network);           // "eip155:8453"
  console.log('Payer:', result.payer);               // "0x..."
} else {
  console.error('Failed:', result.errorReason);
}`}</code></pre>
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-3xl font-black uppercase italic mb-8">Receipt Management</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">Create and reuse payment receipts for multiple sessions.</p>

          <div className="bg-neutral-900 p-8 border-4 border-black text-xs overflow-x-auto text-zinc-300 shadow-[12px_12px_0px_0px_rgba(168,85,247,1)]">
            <pre><code>{`// 3. Create Reusable Receipt
const receiptResponse = await fetch('https://p402.io/api/v1/receipts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txHash: '0x...',           // From settlement
    sessionId: 'session_123',
    amount: 1.0,
    metadata: {
      payer: '0x...',
      network: 'eip155:8453',
      token: 'USDC'
    }
  })
});

const receipt = await receiptResponse.json();
console.log('Receipt ID:', receipt.receiptId);
console.log('Valid Until:', receipt.validUntil);

// 4. Verify Receipt for Future Use
const receiptVerify = await fetch(\`https://p402.io/api/v1/receipts?receipt_id=\${receipt.receiptId}\`);
const verification = await receiptVerify.json();
console.log('Receipt Valid:', verification.success);`}</code></pre>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
