
export default function SDKDocs() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6 font-sans text-zinc-300">
            <h1 className="text-4xl font-bold text-white mb-6">P402 SDKs</h1>
            <p className="text-xl mb-12 text-zinc-400">
                Accelerate your agent development with our official libraries.
            </p>

            <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6">Installation</h2>
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 font-mono text-sm text-lime-400">
                    npm install @p402/sdk @p402/a2a-sdk
                </div>
            </section>

            <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6">A2A Client</h2>
                <p className="mb-6">Interact with any A2A-compliant agent or router.</p>

                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-sm overflow-x-auto">
                    <pre><code className="language-typescript text-zinc-300">{`import { A2AClient } from '@p402/a2a-sdk';

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
                <h2 className="text-2xl font-bold text-white mb-6">x402 Payment Client</h2>
                <p className="mb-6">Handle payment negotiation and settlement on the client side.</p>

                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-sm overflow-x-auto">
                    <pre><code className="language-typescript text-zinc-300">{`import { P402Client } from '@p402/sdk';

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
        </div>
    );
}
