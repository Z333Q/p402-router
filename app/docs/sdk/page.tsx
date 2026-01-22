import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export default function SDKDocs() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
      <TopNav />

      <main className="max-w-4xl mx-auto py-24 px-6">
        <div className="mb-12 border-b-4 border-black pb-8">
          <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">P402 SDKs</h1>
          <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight">
            Accelerate your agent development with official libraries.
          </p>
        </div>

        <section className="mb-16">
          <h2 className="text-3xl font-black uppercase italic mb-8">Installation</h2>
          <div className="bg-black p-8 border-4 border-black font-mono text-sm text-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            npm install @p402/sdk
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-black uppercase italic mb-8">A2A Client</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">Interact with any A2A-compliant agent or router.</p>

          <div className="bg-neutral-900 p-8 border-4 border-black text-xs overflow-x-auto text-zinc-300 shadow-[12px_12px_0px_0px_rgba(182,255,46,1)]">
            <pre><code>{`import { P402A2AClient } from '@p402/sdk';

const client = new P402A2AClient({
  baseUrl: 'https://p402.io',
  tenantId: 'your-tenant-id', // Optional
  apiKey: 'your-api-key'      // Optional
});

// 1. Send a Message (Google A2A Protocol)
const { task } = await client.sendMessage({
  message: {
    role: 'user',
    parts: [{ type: 'text', text: 'Analyze market trends for Q3' }]
  },
  configuration: { mode: 'quality' }
});

console.log(task.status.state);

// 2. Submit Payment (x402 Extension)
const receipt = await client.submitPayment({
  payment_id: 'pay_123...',
  scheme: 'onchain',
  tx_hash: '0x...'
});

console.log('Payment Status:', receipt.status);`}</code></pre>
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-3xl font-black uppercase italic mb-8">x402 Payment Client</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">Unified SDK for simple on-chain payments and protocol coordination.</p>

          <div className="bg-neutral-900 p-8 border-4 border-black text-xs overflow-x-auto text-zinc-300 shadow-[12px_12px_0px_0px_rgba(34,211,238,1)]">
            <pre><code>{`import { P402Client } from '@p402/sdk';

const client = new P402Client({
  routerUrl: 'https://p402.io',
  debug: true
});

// Complete flow: Plan -> Sign -> Settle
const result = await client.checkout(
  {
    amount: "10.00",
    network: "eip155:8453" // Base Mainnet
  },
  // Wallet bridging
  async (to, data, value) => {
    const hash = await wallet.sendTransaction({ to, data, value });
    return hash;
  }
);

if (result.success) {
  console.log('Receipt:', result.receipt);
} else {
  console.error('Error:', result.error.message);
}`}</code></pre>
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-3xl font-black uppercase italic mb-8">Intelligence SDK (v3)</h2>
          <p className="font-bold text-neutral-600 mb-8 uppercase tracking-tight">Access the Protocol Economist and Sentinel for autonomous optimization.</p>

          <div className="bg-neutral-900 p-8 border-4 border-black text-xs overflow-x-auto text-zinc-300 shadow-[12px_12px_0px_0px_rgba(168,85,247,1)]">
            <pre><code>{`import { P402Intelligence } from '@p402/sdk';

const intellect = new P402Intelligence({ apiKey: 'your-api-key' });

// 1. Run Autonomous Optimization Audit
const audit = await intellect.runAudit({ 
  days: 7, 
  execute: true // Enabling autonomous 'Hands'
});

console.log('Total Saved:', audit.totalSavings);

// 2. Stream Real-time Thinking Trace
intellect.streamTrace((step) => {
  console.log('[AGENT THINK]:', step.content);
});

// 3. Security Code Audit
const report = await intellect.auditCode(\`
  function runLoop() {
    while(true) { fetch('openai.com'); }
  }
\`);`}</code></pre>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
