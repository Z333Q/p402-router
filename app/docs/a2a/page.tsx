import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export default function A2ADocs() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main className="max-w-4xl mx-auto py-24 px-6">
                <div className="mb-12 border-b-4 border-black pb-8">
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">A2A Protocol</h1>
                    <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight">
                        The universal language for autonomous agents.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="p-8 border-4 border-black bg-neutral-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-black uppercase italic mb-4">Discovery</h3>
                        <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">Agents broadcast skills via <code className="bg-black text-primary px-1">.well-known/agent.json</code>.</p>
                    </div>
                    <div className="p-8 border-4 border-black bg-neutral-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-black uppercase italic mb-4">Messaging</h3>
                        <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">JSON-RPC 2.0 transport for structured, context-aware conversations.</p>
                    </div>
                    <div className="p-8 border-4 border-black bg-neutral-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-black uppercase italic mb-4">Stateful</h3>
                        <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">Tasks tracks lifecycle from <code className="text-orange-600 font-bold uppercase">pending</code> to <code className="text-green-600 font-bold uppercase">completed</code>.</p>
                    </div>
                </div>

                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">Quick Start: Handshake</h2>
                    <div className="bg-black p-8 border-4 border-black font-mono text-sm overflow-x-auto text-primary shadow-[8px_8px_0px_0px_rgba(182,255,46,1)]">
                        <pre><code>{`# 1. Discover Capabilities
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
                    <h2 className="text-3xl font-black uppercase italic mb-8">JSON-RPC Reference</h2>

                    <h3 className="text-xl font-black uppercase mb-4">message/send</h3>
                    <p className="font-bold text-neutral-600 mb-6 uppercase tracking-tight">Send a message to an agent to initiate or continue a task.</p>
                    <div className="bg-neutral-900 p-8 border-4 border-black font-mono text-xs overflow-x-auto text-zinc-300 mb-12">
                        <pre><code>{`{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": { "role": "user", "parts": [{ "type": "text", "text": "Hello" }] },
    "configuration": { "mode": "speed" }
  },
  "id": 1
}`}</code></pre>
                    </div>

                    <h3 className="text-xl font-black uppercase mb-4">message/stream</h3>
                    <p className="font-bold text-neutral-600 mb-6 uppercase tracking-tight">Stream response chunks using Server-Sent Events (SSE).</p>
                    <div className="bg-primary/10 p-6 border-l-8 border-black font-bold text-sm text-black italic mb-16">
                        POST /api/a2a/stream with same body as above.
                    </div>

                    <div className="bg-black text-primary p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <h2 className="text-3xl font-black uppercase italic mb-6">A2A x402 Extension</h2>
                        <p className="font-bold mb-8 uppercase tracking-tight">Standardized payment negotiation for agentic services.</p>

                        <div className="space-y-8">
                            <div>
                                <h4 className="text-lg font-black uppercase mb-2">1. payment-required</h4>
                                <p className="text-sm font-medium opacity-80 mb-4">The agent responds with payment terms if the task requires settlement.</p>
                                <div className="bg-neutral-900 p-6 font-mono text-xs text-zinc-400 overflow-x-auto">
                                    <pre>{`"result": {
  "extension_uri": "tag:x402.org,2025:x402-payment",
  "content": {
    "type": "payment-required",
    "data": {
      "payment_id": "pay_123",
      "schemes": [{ "scheme": "exact", "asset": "USDC", "amount": "500000" }]
    }
  }
}`}</pre>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-black uppercase mb-2">2. payment-submitted</h4>
                                <p className="text-sm font-medium opacity-80 mb-4">The client signs and submits the payment proof (EIP-3009 or Tx Hash).</p>
                                <div className="bg-neutral-900 p-6 font-mono text-xs text-zinc-400 overflow-x-auto">
                                    <pre>{`"method": "x402/payment-submitted",
"params": {
  "payment_id": "pay_123",
  "scheme": "exact",
  "signature": "0x..." 
}`}</pre>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-black uppercase mb-2">3. payment-completed</h4>
                                <p className="text-sm font-medium opacity-80 mb-4">The server verifies settlement and issues an x402 receipt.</p>
                                <div className="bg-neutral-900 p-6 font-mono text-xs text-zinc-400 overflow-x-auto">
                                    <pre>{`"result": {
  "status": "completed",
  "receipt": { "receipt_id": "rec_456" }
}`}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
