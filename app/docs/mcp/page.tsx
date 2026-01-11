import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export default function MCPDocPage() {
    return (
        <div className="min-h-screen">
            <TopNav />
            <main style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>
                <div style={{ marginBottom: 64, borderBottom: '2px solid #000', paddingBottom: 48 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div className="badge badge-primary">Featured Case Study</div>
                        <div className="badge badge-success">Agentic Economy</div>
                    </div>
                    <h1 className="title-1" style={{ fontSize: '3.5rem', marginBottom: 24, lineHeight: 1.1 }}>
                        MCP: The Decision Layer for AI Agents
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#4A4A4A', maxWidth: 700, lineHeight: 1.6 }}>
                        Agents need wallets, not credit cards.
                        <strong> Model Context Protocol (MCP)</strong> on P402 gives Claude and Cursor a secure wallet and a global decision layer to negotiate and pay for data autonomously.
                    </p>
                </div>

                {/* Marketplace Integration */}
                <section style={{ marginBottom: 64 }}>
                    <h2 className="title-2">Featured MCP-Ready Resources</h2>
                    <p style={{ marginBottom: 32, color: '#4A4A4A' }}>
                        The following production-grade tools are already indexed in the P402 Bazaar and ready for MCP integration today.
                    </p>
                    <div className="grid-responsive grid-3" style={{ gap: 20 }}>
                        <MarketItem
                            title="GPT-4o Completion"
                            provider="OpenAI"
                            icon="🤖"
                            cost="0.005 / 1k"
                        />
                        <MarketItem
                            title="Market Intel"
                            provider="Coinbase"
                            icon="📈"
                            cost="Usage Based"
                        />
                        <MarketItem
                            title="Weather Intel"
                            provider="Tomorrow.io"
                            icon="🌤"
                            cost="0.005 / Req"
                        />
                    </div>
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                        <a href="/dashboard/bazaar" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                            Browse Full Bazaar →
                        </a>
                    </div>
                </section>

                {/* Integration Flow */}
                <section style={{ marginBottom: 64 }}>
                    <h2 className="title-2">The Zero-Friction Flow</h2>
                    <div className="card" style={{ background: '#F9FAFB', border: '2px solid #E5E7EB', padding: 48 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                            <Step num="1" title="Agent Discovers Need" desc="Your agent encounters a task requiring premium data or high-tier compute." />
                            <Step num="2" title="Router Policy Check" desc="P402 identifies the request, checks your spend limits, and selects the optimal facilitator." />
                            <Step num="3" title="Atomic Settlement" desc="The x402 protocol handles the challenge-response. Payment is verified on-chain." />
                            <Step num="4" title="Payload Delivery" desc="The agent receives the data and continues the task. No human intervention needed." />
                        </div>
                    </div>
                </section>

                {/* Quick Start Hardware */}
                <section style={{ marginBottom: 64 }}>
                    <h2 className="title-2">Quick Start</h2>

                    <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mb-6 rounded-lg flex gap-3 text-sm text-yellow-800">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <strong>Security Warning:</strong> Use a dedicated "hot wallet" for your agents with limited funds (e.g., $10 USDC). Never use your main treasury keys.
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: 16 }}>1. Configure Claude Desktop</h3>
                        <p style={{ marginBottom: 16, color: '#4A4A4A' }}>Add P402 as a native tool by updating your <code className="code-inline">claude_desktop_config.json</code>:</p>
                        <div className="code-block">
                            <pre style={{ margin: 0 }}>{`{
  "mcpServers": {
    "p402": {
      "command": "npx",
      "args": ["-y", "@p402/mcp-server"],
      "env": {
        "PRIVATE_KEY": "0x...", // Agent Hot Wallet Private Key
        "P402_ROUTER_URL": "https://p402.io"
      }
    }
  }
}`}</pre>
                        </div>
                    </div>
                </section>

                {/* Use Case Scenarios */}
                <section style={{ marginBottom: 64 }}>
                    <h2 className="title-2">Agentic Patterns</h2>
                    <p style={{ marginBottom: 32, color: '#4A4A4A' }}>
                        These patterns demonstrate how P402 empowers agents to overcome traditional API limitations without human intervention.
                    </p>
                    <div className="grid-responsive grid-2" style={{ gap: 24 }}>
                        {/* Pattern 1 */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="badge badge-info" style={{ alignSelf: 'flex-start', marginBottom: 16 }}>Reliability</div>
                            <div style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: 12, color: '#000' }}>Self-Healing Data Pipelines</div>
                            <p style={{ fontSize: '0.9375rem', color: '#4A4A4A', marginBottom: 24, lineHeight: 1.6 }}>
                                Modern agents often fail when free-tier APIs hit rate limits. P402 enables <strong>Automatic Failover</strong>: when a 429 (Rate Limit) occurs, the agent detects the P402 header and settles a payment for premium access instantly.
                            </p>
                            <div className="code-block" style={{ fontSize: '0.75rem', marginTop: 'auto' }}>
                                <pre style={{ margin: 0 }}>{`// Pseudocode for failover logic
try {
  return await freeApi.fetch();
} catch (e) {
  if (e.status === 402) {
    const payment = await p402.settle(e.headers);
    return await premiumApi.fetch(payment);
  }
}`}</pre>
                            </div>
                        </div>

                        {/* Pattern 2 */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="badge badge-primary" style={{ alignSelf: 'flex-start', marginBottom: 16 }}>Intelligence</div>
                            <div style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: 12, color: '#000' }}>Autonomous Research</div>
                            <p style={{ fontSize: '0.9375rem', color: '#4A4A4A', marginBottom: 24, lineHeight: 1.6 }}>
                                High-fidelity news feeds and sentiment analysis often require expensive subscriptions. P402 allows agents to <strong>Buy on Demand</strong>: paying only for the specific data points needed to validate a high-stakes decision (like a trade).
                            </p>
                            <div className="code-block" style={{ fontSize: '0.75rem', marginTop: 'auto' }}>
                                <pre style={{ margin: 0 }}>{`// Pseudocode for research on-demand
if (agent.decisionConfidence < 0.9) {
  const intel = await p402.request(
    "news-intel-v1", 
    { topic: "ETH-ETF-Approval" }
  );
  agent.updateModel(intel.payload);
}`}</pre>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}

function MarketItem({ title, provider, icon, cost }: { title: string, provider: string, icon: string, cost: string }) {
    return (
        <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>{icon}</div>
            <div style={{ fontWeight: 800, color: '#000', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: 16 }}>{provider}</div>
            <div style={{ borderTop: '1px solid #EEE', paddingTop: 12, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#0EA5E9' }}>
                {cost}
            </div>
        </div>
    );
}

function Step({ num, title, desc }: { num: string, title: string, desc: string }) {
    return (
        <div style={{ display: 'flex', gap: 24 }}>
            <div style={{
                minWidth: 40, height: 40, borderRadius: 20, background: '#000', color: '#FFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
            }}>
                {num}
            </div>
            <div>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>{title}</div>
                <div style={{ color: '#4A4A4A', fontSize: '0.9375rem' }}>{desc}</div>
            </div>
        </div>
    );
}
