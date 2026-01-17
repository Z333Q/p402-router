import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export default function SDKDocs() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
      <TopNav />

      <main className="max-w-4xl mx-auto py-24 px-6">
        <div className="inline-block bg-black text-primary px-3 py-1 text-sm font-black uppercase mb-6 border-2 border-black">
          SDK REFERENCE
        </div>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 text-black">P402 SDKs</h1>
        <p className="text-xl font-bold mb-12 text-neutral-600 border-l-4 border-black pl-6">
          Accelerate your agent development with our official libraries.
        </p>

        <section className="mb-16">
          <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-6">Installation</h2>
          <div className="bg-black p-6 border-2 border-black font-mono text-sm text-primary">
            npm install @p402/sdk @p402/a2a-sdk
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-6">A2A Client</h2>
          <p className="font-medium mb-6">Interact with any A2A-compliant agent or router.</p>

          <div className="bg-neutral-900 p-6 border-2 border-black text-sm overflow-x-auto text-zinc-300">
            <pre><code className="language-typescript">{`import { A2AClient } from '@p402/a2a-sdk';

const client = new A2AClient({
  baseUrl: 'https://p402.io',
  tenantId: 'your-tenant-id' // Optional
});

// 1. Send a Message
const response = await client.sendMessage({
  message: {
    role: 'user',
    parts: [{ type: 'text', text: 'Analyze market trends for Q3' }]
  },
  configuration: { mode: 'quality' }
});

console.log(response.task.status.message.parts[0].text);

// 2. Stream a Response
for await (const event of client.streamMessage({
  message: { role: 'user', parts: [{ type: 'text', text: 'Write a poem' }] }
})) {
  if (event.type === 'message.delta') {
    process.stdout.write(event.data.delta.text);
  }
}`}</code></pre>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-6">x402 Payment Client</h2>
          <p className="font-medium mb-6">Handle payment negotiation and settlement on the client side.</p>

          <div className="bg-neutral-900 p-6 border-2 border-black text-sm overflow-x-auto text-zinc-300">
            <pre><code className="language-typescript">{`import { P402Client } from '@p402/sdk';

const client = new P402Client('https://p402.io');

// Checkout with wallet (EIP-1193)
const receipt = await client.checkout({
  amount: "5.00",
  asset: "USDC",
  network: "base", // Chain ID 8453
  recipient: "0x..." 
}, window.ethereum);

console.log('Payment Successful:', receipt.txHash);`}</code></pre>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
