
export default function RouterDocs() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6 font-sans text-zinc-300">
            <h1 className="text-4xl font-bold text-white mb-6">AI Orchestration Router</h1>
            <p className="text-xl mb-12 text-zinc-400">
                Optimize your AI infrastructure with intelligent, policy-driven routing.
            </p>

            <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">How Routing Works</h2>
                <div className="space-y-4">
                    <div className="flex gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <div className="font-mono text-lime-400 font-bold w-24">1. Semantic</div>
                        <div>
                            Requests are embedded and checked against the <strong>Semantic Cache</strong>.
                            If a similar request (similarity &gt; 0.95) was settled recently, the cached response is returned instantly for $0.
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <div className="font-mono text-lime-400 font-bold w-24">2. Rank</div>
                        <div>
                            Providers are ranked based on the requested <strong>mode</strong>:
                            <ul className="list-disc ml-5 mt-2 text-sm text-zinc-400">
                                <li><code className="text-zinc-300">cost</code>: Cheapest model that meets capability requirements.</li>
                                <li><code className="text-zinc-300">speed</code>: Lowest TTFT (Time to First Token) provider.</li>
                                <li><code className="text-zinc-300">quality</code>: Highest ELO benchmark score (e.g., Claude Opus, GPT-4).</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <div className="font-mono text-lime-400 font-bold w-24">3. Execute</div>
                        <div>
                            The router attempts the top-ranked provider. If it fails (rate limit, outage), it automatically
                            <strong>fails over</strong> to the next best option seamlessly.
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">OpenRouter Meta-Provider</h2>
                <p className="text-zinc-400 mb-6">
                    P402 integrates natively with OpenRouter as a primary meta-provider. This enables instant access to over
                    <strong className="text-white"> 300+ specialized models</strong> through a single orchestration layer.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        <h3 className="text-lime-400 font-bold mb-2 uppercase text-xs tracking-widest">Latest Frontier Models</h3>
                        <p className="text-sm">Access GPT-5.2, Claude 4.5, and Gemini 3.0 the moment they drop, with zero manual adapter updates required.</p>
                    </div>
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        <h3 className="text-lime-400 font-bold mb-2 uppercase text-xs tracking-widest">Unified Settlement</h3>
                        <p className="text-sm">Use a single <code className="text-zinc-300">OPENROUTER_API_KEY</code> to settle requests across hundreds of models while maintaining 1% platform fee transparency.</p>
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">Configuration</h2>
                <p className="mb-4">Control routing behavior per-request via the <code className="text-lime-400">configuration</code> object.</p>
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-sm overflow-x-auto">
                    <pre><code className="language-json text-zinc-300">{`{
  "mode": "balanced",
  "maxCost": 0.05,
  "provider": "anthropic", // Force a provider (optional)
  "model": "claude-3-opus-20240229" // Force a model (optional)
}`}</code></pre>
                </div>
            </section>
        </div>
    );
}
