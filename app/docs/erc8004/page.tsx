import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export const metadata = {
    title: 'ERC-8004 Trustless Agents | P402 Router',
    description: 'ERC-8004 on-chain agent identity and reputation on Base. Register AI agents, accumulate reputation scores via payment-backed feedback, and validate agents in real time.',
    alternates: { canonical: 'https://p402.io/docs/erc8004' },
    openGraph: { title: 'ERC-8004 Trustless Agent Identity — P402', description: 'On-chain AI agent identity and reputation. No centralized authority — reputation backed by real payments on Base.', url: 'https://p402.io/docs/erc8004' },
};

export default function ERC8004Docs() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main className="max-w-4xl mx-auto py-24 px-6">
                <div className="mb-12 border-b-4 border-black pb-8">
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4"><span className="heading-accent">ERC-8004.</span></h1>
                    <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight">
                        Trustless Agents — On-chain identity, reputation, and validation for the agentic economy.
                    </p>
                </div>

                {/* Three Registries Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="p-8 border-4 border-black bg-emerald-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-black uppercase italic mb-4">Identity</h3>
                        <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">
                            ERC-721 NFT-based agent registration. Each agent gets a unique on-chain identity with metadata and wallet binding.
                        </p>
                    </div>
                    <div className="p-8 border-4 border-black bg-emerald-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-black uppercase italic mb-4">Reputation</h3>
                        <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">
                            On-chain feedback system (0-100 scores). Payment-backed reviews ensure only verified users contribute trust signals.
                        </p>
                    </div>
                    <div className="p-8 border-4 border-black bg-emerald-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-black uppercase italic mb-4">Validation</h3>
                        <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">
                            High-value transaction verification. Third-party validators can approve or reject requests before settlement.
                        </p>
                    </div>
                </div>

                {/* What is ERC-8004? */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">What is ERC-8004?</h2>
                    <div className="space-y-4 text-sm font-bold text-neutral-700 uppercase tracking-tight leading-relaxed">
                        <p>
                            ERC-8004 is the Ethereum standard for Trustless AI Agents. It provides three on-chain registries
                            that enable agents to discover, authenticate, and build trust without centralized intermediaries.
                        </p>
                        <p>
                            Unlike traditional API keys or OAuth, ERC-8004 identity is self-sovereign. Agents own their
                            identity as an NFT, accumulate reputation through verified interactions, and can request third-party
                            validation for high-stakes operations.
                        </p>
                        <p>
                            P402 implements ERC-8004 on Base L2, where the Identity and Reputation registries are deployed
                            at production-ready contract addresses.
                        </p>
                    </div>
                </section>

                {/* Contract Addresses */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">Contract Addresses</h2>
                    <div className="space-y-4">
                        <div className="bg-black p-6 border-4 border-black font-mono text-sm text-primary">
                            <div className="mb-4">
                                <span className="text-neutral-500"># Base Mainnet (Chain ID: 8453)</span>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-neutral-400">Identity Registry: </span>
                                    <span className="text-primary">0x8004A169FB4a3325136EB29fA0ceB6D2e539a432</span>
                                </div>
                                <div>
                                    <span className="text-neutral-400">Reputation Registry: </span>
                                    <span className="text-primary">0x8004BAa17C55a88189AE136b182e5fdA19dE9b63</span>
                                </div>
                            </div>
                            <div className="mt-6 mb-4">
                                <span className="text-neutral-500"># Base Sepolia Testnet</span>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-neutral-400">Identity Registry: </span>
                                    <span className="text-zinc-300">0x8004A818BFB912233c491871b3d84c89A494BD9e</span>
                                </div>
                                <div>
                                    <span className="text-neutral-400">Reputation Registry: </span>
                                    <span className="text-zinc-300">0x8004B663056A597Dffe9eCcC1965A193B7388713</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How P402 Uses ERC-8004 */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">How P402 Uses ERC-8004</h2>

                    <div className="space-y-8">
                        <div className="border-l-8 border-black pl-6">
                            <h3 className="text-xl font-black uppercase mb-2">Agent Registration File</h3>
                            <p className="text-sm font-bold text-neutral-600 uppercase tracking-tight mb-4">
                                P402 serves an ERC-8004 Agent Registration File at <code className="bg-black text-primary px-1">/.well-known/erc8004.json</code> that
                                describes its identity, services, and supported trust models.
                            </p>
                            <div className="bg-neutral-900 p-6 font-mono text-xs text-zinc-300 overflow-x-auto border-2 border-black">
                                <pre>{`{
  "type": "erc8004-agent-v1",
  "agentId": "<ERC8004_AGENT_ID>",
  "services": ["payment-routing", "ai-settlement"],
  "registrations": [{
    "chain": "base",
    "registry": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
  }],
  "supportedTrust": ["reputation", "validation"]
}`}</pre>
                            </div>
                        </div>

                        <div className="border-l-8 border-black pl-6">
                            <h3 className="text-xl font-black uppercase mb-2">Reputation-Aware Routing</h3>
                            <p className="text-sm font-bold text-neutral-600 uppercase tracking-tight">
                                The routing engine factors on-chain reputation into facilitator scoring. Verified agents receive a +25 point bonus,
                                and reputation scores (0-100) add up to +/-25 points to the routing decision. Scores are cached locally with a 5-minute TTL
                                to avoid per-request RPC calls.
                            </p>
                        </div>

                        <div className="border-l-8 border-black pl-6">
                            <h3 className="text-xl font-black uppercase mb-2">Payment-Backed Feedback</h3>
                            <p className="text-sm font-bold text-neutral-600 uppercase tracking-tight">
                                After every successful x402 settlement, P402 automatically queues on-chain reputation feedback. Only verified payers can
                                contribute trust signals — the settlement txHash serves as proof of interaction. Feedback is batch-submitted to reduce gas costs.
                            </p>
                        </div>

                        <div className="border-l-8 border-black pl-6">
                            <h3 className="text-xl font-black uppercase mb-2">Validation Guards</h3>
                            <p className="text-sm font-bold text-neutral-600 uppercase tracking-tight">
                                High-value transactions (default threshold: $100) trigger the Validation Registry. Third-party validators can
                                approve or reject requests before settlement proceeds, adding an extra layer of trust for large transfers.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Protocol Integration Diagram */}
                <section className="mb-16">
                    <div className="bg-black text-primary p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <h2 className="text-3xl font-black uppercase italic mb-6">x402 + A2A + ERC-8004</h2>
                        <p className="font-bold mb-8 uppercase tracking-tight">Three protocols, one user journey.</p>

                        <div className="space-y-6">
                            {[
                                { step: '01', protocol: 'A2A', action: 'Discovery', desc: 'Agent publishes agent.json + erc8004.json. Peers discover capabilities and trust level.' },
                                { step: '02', protocol: 'ERC-8004', action: 'Identity Check', desc: 'Router verifies facilitator\'s on-chain identity and reputation before selection.' },
                                { step: '03', protocol: 'x402', action: 'Settlement', desc: 'EIP-3009 gasless USDC transfer executes. Payment proof generated on-chain.' },
                                { step: '04', protocol: 'ERC-8004', action: 'Feedback', desc: 'Settlement proof triggers reputation feedback. Only verified payers build trust.' },
                                { step: '05', protocol: 'ERC-8004', action: 'Validation', desc: 'High-value txs go through Validation Registry before settlement (optional).' },
                            ].map((item) => (
                                <div key={item.step} className="flex gap-4 items-start">
                                    <div className="text-2xl font-black text-primary/40 w-12 flex-shrink-0">{item.step}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black bg-primary text-black px-2 py-0.5 uppercase">{item.protocol}</span>
                                            <span className="text-sm font-black uppercase">{item.action}</span>
                                        </div>
                                        <p className="text-xs font-medium text-neutral-400 uppercase tracking-tight">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* API Reference */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">API Reference</h2>

                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-black uppercase mb-4">GET /api/v1/erc8004/reputation</h3>
                            <p className="font-bold text-neutral-600 mb-4 uppercase tracking-tight text-sm">
                                Returns ERC-8004 reputation data for all registered facilitators.
                            </p>
                            <div className="bg-neutral-900 p-6 font-mono text-xs text-zinc-300 overflow-x-auto border-2 border-black">
                                <pre>{`// Response
{
  "facilitators": [
    {
      "facilitator_id": "abc-123",
      "name": "Acme Settlement",
      "erc8004_agent_id": "42",
      "erc8004_verified": true,
      "erc8004_reputation_cached": 87
    }
  ]
}`}</pre>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-black uppercase mb-4">GET /api/v1/erc8004/feedback</h3>
                            <p className="font-bold text-neutral-600 mb-4 uppercase tracking-tight text-sm">
                                Returns feedback history, optionally filtered by facilitator.
                            </p>
                            <div className="bg-neutral-900 p-6 font-mono text-xs text-zinc-300 overflow-x-auto border-2 border-black">
                                <pre>{`// GET /api/v1/erc8004/feedback?facilitatorId=abc-123
{
  "feedback": [
    {
      "id": 1,
      "facilitator_id": "abc-123",
      "value": 85,
      "status": "submitted",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}`}</pre>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-black uppercase mb-4">POST /api/v1/erc8004/validate</h3>
                            <p className="font-bold text-neutral-600 mb-4 uppercase tracking-tight text-sm">
                                Submit a validation response for a pending high-value transaction.
                            </p>
                            <div className="bg-neutral-900 p-6 font-mono text-xs text-zinc-300 overflow-x-auto border-2 border-black">
                                <pre>{`// Request
{
  "requestHash": "0xabc...",
  "response": true,
  "responseUri": "https://validator.example.com/proof/123",
  "tag": "approved"
}

// Response
{
  "success": true,
  "requestHash": "0xabc...",
  "status": "validated"
}`}</pre>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Configuration */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">Configuration</h2>
                    <div className="bg-black p-8 border-4 border-black font-mono text-sm text-primary shadow-[8px_8px_0px_0px_rgba(182,255,46,1)]">
                        <pre><code>{`# .env configuration

# Your agent's registered ID (from registration script)
ERC8004_AGENT_ID=42

# Agent metadata URI
ERC8004_AGENT_URI=https://p402.io/.well-known/erc8004.json

# Use Base Sepolia testnet instead of mainnet
ERC8004_TESTNET=false

# Enable reputation-aware routing and feedback
ERC8004_ENABLE_REPUTATION=true

# Enable validation guards for high-value txs
ERC8004_ENABLE_VALIDATION=true

# Validation threshold in USD (default: 100)
ERC8004_VALIDATION_THRESHOLD_USD=100`}</code></pre>
                    </div>
                </section>

                {/* Links */}
                <div className="p-12 border-4 border-black bg-emerald-50 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase italic mb-8">Resources</h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <li>
                                <a href="https://eips.ethereum.org/EIPS/eip-8004" target="_blank" rel="noopener noreferrer"
                                   className="text-sm font-bold uppercase hover:text-primary flex items-center gap-2">
                                    EIP-8004 Specification
                                </a>
                            </li>
                            <li>
                                <a href="https://basescan.org/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" target="_blank" rel="noopener noreferrer"
                                   className="text-sm font-bold uppercase hover:text-primary flex items-center gap-2">
                                    Identity Registry on BaseScan
                                </a>
                            </li>
                            <li>
                                <a href="https://basescan.org/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" target="_blank" rel="noopener noreferrer"
                                   className="text-sm font-bold uppercase hover:text-primary flex items-center gap-2">
                                    Reputation Registry on BaseScan
                                </a>
                            </li>
                            <li>
                                <a href="/docs/a2a" className="text-sm font-bold uppercase hover:text-primary flex items-center gap-2 text-primary">
                                    A2A Protocol Guide
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-8xl italic pointer-events-none select-none">
                        8004
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
