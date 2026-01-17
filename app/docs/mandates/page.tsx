
export default function MandatesDocs() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6 font-sans text-zinc-300">
            <h1 className="text-4xl font-bold text-white mb-6">AP2 Payment Mandates</h1>
            <p className="text-xl mb-12 text-zinc-400">
                Authorize autonomous agents to spend funds on your behalf with cryptographic constraints.
            </p>

            <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6">Concept</h2>
                <p className="mb-4">
                    Instead of giving an agent your private key, you sign a <strong>Mandate</strong>.
                    This mandate is a policy document that the P402 Router enforces.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                        <h3 className="font-bold text-white">Intent Mandate</h3>
                        <p className="text-sm text-zinc-400">"Allow agent X to spend up to $10 on Compute."</p>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                        <h3 className="font-bold text-white">Payment Mandate</h3>
                        <p className="text-sm text-zinc-400">"Settle this specific invoice for $0.05."</p>
                    </div>
                </div>
            </section>

            <section className="mb-16">
                <h2 className="text-2xl font-bold text-white mb-6">Creating a Mandate</h2>
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-sm overflow-x-auto">
                    <pre><code className="language-json text-zinc-300">{`POST /api/a2a/mandates
{
  "mandate": {
    "type": "intent",
    "user_did": "did:key:zUser...",
    "agent_did": "did:key:zAgent...",
    "constraints": {
      "max_amount_usd": 50.00,
      "allowed_categories": ["inference", "search"],
      "valid_until": "2026-12-31T23:59:59Z"
    },
    "signature": "0x..." // EIP-712 Signature
  }
}`}</code></pre>
                </div>
            </section>
        </div>
    );
}
