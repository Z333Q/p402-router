
export default function BazaarDocs() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6 font-sans text-zinc-300">
            <h1 className="text-4xl font-bold text-white mb-6">Bazaar Marketplace</h1>
            <p className="text-xl mb-12 text-zinc-400">
                The decentralized registry for x402-enabled services. Discovery + Reputation + Routing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">What is Bazaar?</h2>
                    <p className="mb-4">
                        Bazaar is an on-chain/off-chain hybrid registry where AI agents discover paid API services.
                        It acts as the DNS for the Agentic Web.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                        <li><strong>Service Identity</strong>: Canonical DID-based profiles.</li>
                        <li><strong>Reputation</strong>: Verifiable usage stats and uptime.</li>
                        <li><strong>Metadata</strong>: Pricing, schema, and capabilities.</li>
                    </ul>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-lime-400 mb-2">Bazaar Resource Card</h3>
                    <div className="text-xs font-mono text-zinc-300 whitespace-pre">
                        {`{
  "resource_id": "res_8453_0x...",
  "title": "DeepSeek R1 Inference",
  "pricing": { "input": 0.50, "output": 2.00 },
  "reputation": { "score": 98, "uptime": 0.999 },
  "endpoints": ["https://api.provider.ai/v1"]
}`}
                    </div>
                </div>
            </div>
        </div>
    );
}
