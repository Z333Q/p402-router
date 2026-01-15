'use client';
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { Badge, Card, CodeBlock, MetricBox, ProgressBar, StatusDot } from '../../dashboard/_components/ui';

export default function MCPDocPage() {
    return (
        <div className="min-h-screen bg-white">
            <TopNav />
            <main className="max-w-[1200px] mx-auto px-6 py-24">

                {/* Hero Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
                    <div>
                        <div className="flex gap-3 mb-6">
                            <Badge variant="primary">v2.0.0 Ready</Badge>
                            <Badge variant="default">Agentic Economy</Badge>
                        </div>
                        <h1 className="text-7xl font-black leading-[0.9] tracking-tighter uppercase italic mb-8">
                            The Economic Layer for AI Agents
                        </h1>
                        <p className="text-xl text-neutral-600 leading-relaxed mb-8">
                            Agents need wallets, not credit cards. <strong>Model Context Protocol (MCP)</strong> on P402 gives Claude, Cursor, and custom agents a secure wallet and an orchestration layer to negotiate, pay, and route data autonomously.
                        </p>
                        <div className="flex gap-4">
                            <a href="#setup" className="bg-black text-white px-8 py-4 font-bold uppercase hover:bg-[#22D3EE] hover:text-black transition-colors border-2 border-black">
                                Get Started
                            </a>
                        </div>
                    </div>
                    <div className="bg-neutral-50 border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Agent Wallet Status</h3>
                            <StatusDot status="healthy" label="Active" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <MetricBox label="Daily Budget" value="$10.00" subtext="84% Remaining" className="!bg-white" />
                            <MetricBox label="Avg. Latency" value="124ms" subtext="-12% vs last week" className="!bg-[#B6FF2E]" />
                        </div>
                        <ProgressBar value={16} label="Budget Consumed (Today)" variant="success" />
                    </div>
                </div>

                {/* The Orchestration Advantage */}
                <section className="mb-32">
                    <h2 className="text-4xl font-black uppercase mb-12 italic">Why P402 for MCP?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card title="Autonomous Payments">
                            <p className="text-sm text-neutral-600 leading-relaxed">
                                Enable your agent to pay for premium tools (weather, market data, high-tier LLMs) without human approval, strictly within pre-defined policies.
                            </p>
                        </Card>
                        <Card title="Protocol Routing">
                            <p className="text-sm text-neutral-600 leading-relaxed">
                                Don't hardcode providers. P402 routes agent requests to the most cost-effective and healthy models in real-time.
                            </p>
                        </Card>
                        <Card title="Semantic Guardrails">
                            <p className="text-sm text-neutral-600 leading-relaxed">
                                Prevent agent "hallucination loops" from draining your wallet with semantic analysis and recursive-call kill switches.
                            </p>
                        </Card>
                    </div>
                </section>

                {/* Setup Guide */}
                <section id="setup" className="mb-32">
                    <h2 className="text-4xl font-black uppercase mb-12 italic">Quick Local Setup</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                        <div className="lg:col-span-2">
                            <div className="space-y-12">
                                <Step num="1" title="Initialize Agent Wallet" desc="Create a dedicated hot wallet for your agent. We recommend keeping <$10 USDC for safety." />
                                <Step num="2" title="Define Policy" desc="Set spending limits (e.g., $1.00/day) and allowed providers via the P402 Dashboard." />
                                <Step num="3" title="Sync MCP Server" desc="Add the P402 MCP server to your client (Claude Desktop or Cursor) to bridge the agent to the web." />
                            </div>
                        </div>
                        <div className="lg:col-span-3">
                            <Card title="claude_desktop_config.json" className="!p-0 border-4">
                                <CodeBlock
                                    language="json"
                                    code={`{
  "mcpServers": {
    "p402": {
      "command": "npx",
      "args": ["-y", "@p402/mcp-server"],
      "env": {
        "P402_API_KEY": "sk_prod_...",
        "AGENT_WALLET_KEY": "0x...",
        "P402_ROUTER_MODE": "cost"
      }
    }
  }
}`}
                                />
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Visual Architecture */}
                <section className="mb-32 bg-black text-white p-16 border-4 border-[#B6FF2E]">
                    <div className="max-w-2xl">
                        <h2 className="text-5xl font-black uppercase mb-8 italic text-[#B6FF2E]">
                            Infinite Scalability
                        </h2>
                        <p className="text-xl text-neutral-400 mb-12 leading-relaxed">
                            As your agent fleet grows, P402 acts as the centralized <strong>Economic Gateway</strong>.
                            100 agents, 1 budget, 0 hardcoded API keys.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="text-center">
                                <div className="text-3xl mb-2">🤖</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#B6FF2E]">Agents</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl mb-2">➡️</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Router</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl mb-2">⚖️</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#B6FF2E]">Policy</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl mb-2">🚀</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Result</div>
                            </div>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}

function Step({ num, title, desc }: { num: string, title: string, desc: string }) {
    return (
        <div className="flex gap-6">
            <div className="min-w-[48px] h-[48px] border-4 border-black bg-[#B6FF2E] flex items-center justify-center font-black text-xl italic">
                {num}
            </div>
            <div>
                <h3 className="text-xl font-black uppercase mb-2">{title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
