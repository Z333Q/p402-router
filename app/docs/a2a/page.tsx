
export default function A2ADocs() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6 font-sans text-zinc-300">
            <h1 className="text-4xl font-bold text-white mb-6">A2A Protocol</h1>
            <p className="text-xl mb-12 text-zinc-400">
                The universal language for autonomous agents. Discover, negotiate, and execute tasks.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
                    <h3 className="font-bold text-white mb-2">Discovery</h3>
                    <p className="text-sm">Agents broadcast skills via <code className="text-lime-400">.well-known/agent.json</code>.</p>
                </div>
                <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
                    <h3 className="font-bold text-white mb-2">Messaging</h3>
                    <p className="text-sm">JSON-RPC 2.0 transport for structured, context-aware conversations.</p>
                </div>
                <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
                    <h3 className="font-bold text-white mb-2">Stateful</h3>
                    <p className="text-sm">Tasks tracks lifecycle from <code className="text-yellow-400">pending</code> to <code className="text-green-400">completed</code>.</p>
                </div>
            </div>

            <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6">Quick Start: Handshake</h2>
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-sm overflow-x-auto">
                    <pre><code className="language-bash text-zinc-300">{`# 1. Discover Capabilities
curl https://p402.io/.well-known/agent.json

# Response
{
  "name": "P402 Payment Router",
  "capabilities": { "streaming": true },
  "skills": [{ "id": "ai-completion" }]
}`}</code></pre>
                </div>
            </section>

            <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6">JSON-RPC Reference</h2>

                <h3 className="text-lg font-bold text-white mt-8 mb-4">message/send</h3>
                <p className="mb-4">Send a message to an agent to initiate or continue a task.</p>
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-sm overflow-x-auto">
                    <pre><code className="language-json text-zinc-300">{`{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": { "role": "user", "parts": [{ "type": "text", "text": "Hello" }] },
    "configuration": { "mode": "speed" }
  },
  "id": 1
}`}</code></pre>
                </div>

                <h3 className="text-lg font-bold text-white mt-8 mb-4">message/stream</h3>
                <p className="mb-4">Stream response chunks using Server-Sent Events (SSE).</p>
                <div className="bg-zinc-800/50 p-4 rounded-lg text-sm text-zinc-400 italic">
                    POST /api/a2a/stream with same body as above.
                </div>
            </section>
        </div>
    );
}
