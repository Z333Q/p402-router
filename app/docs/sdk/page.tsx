import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export const metadata = {
    title: 'SDK Guide | P402 Router',
    description: 'Integrate resilient x402 payments into your application with the P402 TypeScript SDK.'
}

export default function SDKDocsPage() {
    return (
        <div className="min-h-screen">
            <TopNav />
            <main style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>
                {/* Hero Section */}
                <div style={{ borderBottom: '2px solid #000', paddingBottom: 48, marginBottom: 48 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <div className="badge badge-success">v2.0.0 (Core API)</div>
                        <div className="badge badge-primary">v1.1.0 (Legacy SDK)</div>
                    </div>
                    <h1 className="title-1" style={{ fontSize: '3.5rem', marginBottom: 24 }}>SDK & V2 API Guide</h1>
                    <p style={{ fontSize: '1.25rem', color: '#4A4A4A', maxWidth: 700, lineHeight: 1.6 }}>
                        The P402 ecosystem has evolved into a full <strong>AI Orchestration Layer</strong>.
                        Use the V2 API for resilient, cost-optimized routing across 100+ models, or the V1 SDK for legacy x402 payment settlement.
                    </p>
                </div>

                <div className="grid-responsive grid-3" style={{ gap: 24, marginBottom: 64 }}>
                    <FeatureCard
                        icon="🔀"
                        title="Smart Routing"
                        desc="Automatically routes requests to the optimal provider based on cost, quality, and real-time health metrics."
                    />
                    <FeatureCard
                        icon="💰"
                        title="Cost Intelligence"
                        desc="Real-time spend tracking and AI-powered recommendations to save up to 40% on API costs."
                    />
                    <FeatureCard
                        icon="⚡"
                        title="Semantic Cache"
                        desc="Eliminate redundant API calls using embedding-based similarity search, saving both time and money."
                    />
                </div>

                {/* V2 API Quick Start */}
                <section style={{ marginBottom: 64 }}>
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="title-2 m-0">V2 API (Recommended)</h2>
                        <div className="badge badge-success">Latest</div>
                    </div>
                    <p style={{ marginBottom: 24, color: '#4A4A4A' }}>
                        The V2 API is OpenAI-compatible and provides access to the full orchestration layer.
                        Use it to get resilient, multi-provider chat completions with semantic caching.
                    </p>
                    <div className="code-block">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`// Simple Request with Cost Optimization
const response = await fetch('https://p402.io/api/v2/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    model: 'gpt-4o', // Or leave empty to let P402 pick
    messages: [{ role: 'user', content: 'What is the most efficient way to route AI calls?' }],
    p402: {
      mode: 'cost', // Pick the cheapest compatible provider
      cache: true   // Enable semantic caching
    }
  })
});

const data = await response.json();
console.log('Response:', data.choices[0].message.content);
console.log('Saved Content:', data.p402_metadata.cached ? 'Yes' : 'No');`} </pre>
                    </div>
                </section>

                {/* Legacy V1 SDK */}
                <section style={{ marginBottom: 64 }}>
                    <h2 className="title-2">Legacy V1 SDK (Payments)</h2>
                    <p style={{ marginBottom: 24, color: '#4A4A4A' }}>
                        The V1 SDK is primarily used for the legacy <strong>x402 payment flow</strong>.
                        A V2 SDK package with native orchestration support is currently in development.
                    </p>
                    <div className="code-block" style={{ marginBottom: 24 }}>
                        <code>npm install @p402/sdk</code>
                    </div>
                    <div className="code-block">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`import { P402Client } from '@p402/sdk';

const client = new P402Client();
const result = await client.checkout({
  amount: "1.00",
  network: "eip155:8453"
}, async (to, data, value) => {
  return await walletClient.sendTransaction({ to, data, value });
});`} </pre>
                    </div>
                </section>

                {/* React Integration */}
                <section style={{ marginBottom: 64 }}>
                    <h2 className="title-2">React Integration</h2>
                    <div className="badge badge-primary" style={{ marginBottom: 16 }}>Recommended</div>
                    <p style={{ marginBottom: 24, color: '#4A4A4A' }}>
                        For React apps, we recommend wrapping the client in a hook to handle loading states and errors.
                    </p>
                    <div className="code-block">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`export function useP402() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<P402Error | null>(null);

  const pay = async (amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const client = new P402Client();
      const result = await client.checkout({
        amount,
        network: 'eip155:8453'
      }, signerCallback); // Import your signer logic

      if (!result.success && result.error) throw result.error;
      return result;
    } catch (err) {
      setError(err as P402Error);
    } finally {
      setLoading(false);
    }
  };

  return { pay, loading, error };
}`}</pre>
                    </div>
                </section>

                {/* Advanced Configuration */}
                <section style={{ marginBottom: 64 }}>
                    <h2 className="title-2">Advanced Usage</h2>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 32, marginBottom: 16 }}>Custom EIP-3009 Tokens</h3>
                    <p style={{ marginBottom: 24, color: '#4A4A4A' }}>
                        P402 defaults to USDC, but you can configure any EIP-3009 compliant token.
                    </p>
                    <div className="code-block">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`const customToken = {
  address: '0x...',
  decimals: 6,
  symbol: 'USDT',
  eip712: { name: 'Tether USD', version: '1' }
};

await client.checkout({
  amount: "50.00",
  token: customToken
}, signerCallback);`}</pre>
                    </div>
                </section>

                {/* Error Handling */}
                <section style={{ marginBottom: 64 }}>
                    <h2 className="title-2">Error Handling</h2>
                    <p style={{ marginBottom: 24, color: '#4A4A4A' }}>
                        The SDK throws typed <code className="code-inline">P402Error</code> objects.
                    </p>
                    <div className="card" style={{ background: '#FFF5F5', border: '2px solid #F87171' }}>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                            <li style={{ marginBottom: 8 }}><strong>INVALID_INPUT</strong>: Malformed request (e.g. negative amount).</li>
                            <li style={{ marginBottom: 8 }}><strong>POLICY_DENIED</strong>: Router blocked request (e.g. budget exceeded).</li>
                            <li style={{ marginBottom: 8 }}><strong>TRANSACTION_FAILED</strong>: Wallet declined or mining failed.</li>
                            <li style={{ marginBottom: 8 }}><strong>SETTLEMENT_FAILED</strong>: Payments sent but router verification timed out.</li>
                            <li><strong>NETWORK_ERROR</strong>: Router API is unreachable.</li>
                        </ul>
                    </div>
                </section>

                {/* Architecture */}
                <section style={{ marginBottom: 64 }}>
                    <h2 className="title-2">Internal Architecture</h2>
                    <div className="card" style={{ background: '#F9FAFB', border: '2px solid #E5E7EB', padding: 48, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
                            <div className="badge badge-dark">SDK</div>
                            <span style={{ fontWeight: 800 }}>→</span>
                            <div className="badge badge-success">PLAN (POST /plan)</div>
                            <span style={{ fontWeight: 800 }}>→</span>
                            <div className="badge badge-primary">PAY (Signer)</div>
                            <span style={{ fontWeight: 800 }}>→</span>
                            <div className="badge badge-success">SETTLE (POST /settle)</div>
                        </div>
                        <div style={{ marginTop: 24, fontSize: '0.875rem', color: '#7A7A7A' }}>
                            A strictly synchronous-feeling flow that maps to decentralized asynchronous operations.
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>{icon}</div>
            <div style={{ fontWeight: 800, fontSize: '1.125rem', marginBottom: 12, textTransform: 'uppercase' }}>{title}</div>
            <div style={{ fontSize: '0.875rem', color: '#4A4A4A', lineHeight: 1.5 }}>{desc}</div>
        </div>
    )
}
