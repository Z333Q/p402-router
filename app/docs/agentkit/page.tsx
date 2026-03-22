import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export const metadata = {
    title: 'Coinbase AgentKit + P402 | Integration Guide',
    description: 'Connect Coinbase AgentKit autonomous wallets to P402 multi-provider AI routing with x402 USDC payment settlement on Base.',
    alternates: { canonical: 'https://p402.io/docs/agentkit' },
    openGraph: {
        title: 'Coinbase AgentKit + P402',
        description: 'Autonomous AI agents with programmable wallets and gasless USDC payments. CDP AgentKit + P402 integration guide.',
        url: 'https://p402.io/docs/agentkit'
    },
};

export default function AgentKitDocs() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />

            <main className="max-w-4xl mx-auto py-24 px-6">
                {/* Header */}
                <div className="mb-12 border-b-4 border-black pb-8">
                    <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">
                        <span className="font-mono">{">_"}</span> P402 Documentation / Coinbase AgentKit
                    </p>
                    <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4">
                        <span className="heading-accent">Coinbase AgentKit.</span>
                    </h1>
                    <p className="text-lg font-bold text-neutral-600 uppercase tracking-tight max-w-2xl">
                        Plug CDP-managed autonomous wallets into P402 multi-provider AI routing.
                        Agents spend USDC automatically — no private keys, no gas management.
                    </p>
                </div>

                {/* Overview */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-6">What This Enables</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {[
                            { title: 'Programmable Wallets', body: 'CDP provisions an MPC wallet per agent. No seed phrase exposure, TEE-grade key management.' },
                            { title: 'Spending Policies', body: 'Set per-agent limits at wallet creation. Policy enforcement is on-chain — P402 can\'t override it.' },
                            { title: 'Gasless Payments', body: 'x402 EIP-3009 transfers. Agent signs; P402 facilitator pays gas. USDC only moves when AI work completes.' },
                        ].map((item) => (
                            <div key={item.title} className="border-2 border-black p-4">
                                <h3 className="font-black uppercase text-sm mb-2">{item.title}</h3>
                                <p className="text-sm text-neutral-600 font-mono">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Install */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-6">Installation</h2>
                    <div className="bg-black p-6 border-4 border-black font-mono text-sm text-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-4">
                        <span className="text-neutral-500"># Install both SDKs</span><br />
                        npm install @coinbase/agentkit @p402/sdk<br />
                        <br />
                        <span className="text-neutral-500"># Required env vars</span><br />
                        CDP_API_KEY_NAME=organizations/…<br />
                        CDP_API_KEY_PRIVATE_KEY=&quot;-----BEGIN EC PRIVATE KEY-----…&quot;<br />
                        P402_API_KEY=p402_live_…
                    </div>
                    <p className="text-sm font-mono text-neutral-600">
                        Get your P402 API key from{' '}
                        <a href="/dashboard/settings" className="underline font-bold">Dashboard → Settings</a>.
                        CDP credentials from{' '}
                        <a href="https://portal.cdp.coinbase.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">portal.cdp.coinbase.com ↗</a>.
                    </p>
                </section>

                {/* Quickstart */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-6">Quickstart</h2>
                    <p className="font-bold text-neutral-600 uppercase tracking-tight mb-4">
                        Provision a wallet, attach a spending policy, and route your first AI call in under 30 lines:
                    </p>
                    <div className="bg-black p-6 border-4 border-black font-mono text-xs text-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
                        <pre>{`import { CdpClient } from '@coinbase/agentkit';
import { P402Client } from '@p402/sdk';

// 1. Provision an agent wallet (runs once per agent)
const cdp = new CdpClient();
const wallet = await cdp.evm.createSmartWallet({ networkId: 'base' });

// 2. Attach a $10/day spending policy
await cdp.policies.createPolicy({
  policy: {
    scope: 'account',
    rules: [{
      action: 'reject',
      operation: 'signEvmTransaction',
      criteria: [{
        type: 'ethValue',
        operator: '>',
        // ~10 USD in ETH at $2500/ETH
        value: '4000000000000000',
      }]
    }]
  }
});

// 3. Route an AI call through P402
const p402 = new P402Client({ apiKey: process.env.P402_API_KEY });

const response = await p402.chat({
  messages: [{ role: 'user', content: 'Summarize the latest Base L2 activity.' }],
  p402: { mode: 'cost', cache: true }
});

console.log(response.choices[0].message.content);
// p402_metadata.cost_usd — actual USDC deducted
console.log(response.p402_metadata?.cost_usd);`}
                        </pre>
                    </div>
                </section>

                {/* Session-Based Budget */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-6">Session-Based Budget Control</h2>
                    <p className="font-bold text-neutral-600 uppercase tracking-tight mb-4">
                        For long-running agents, create a P402 session that tracks spend across multiple calls:
                    </p>
                    <div className="bg-black p-6 border-4 border-black font-mono text-xs text-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
                        <pre>{`// Create a session with a $5 USDC budget, 24h expiry
const session = await p402.createSession({
  budget_usd: 5.0,
  expires_in_hours: 24,
  wallet_address: wallet.address,
});

// Attach session to all calls in this agent run
const p402WithSession = new P402Client({
  apiKey: process.env.P402_API_KEY,
  // Session ID scopes billing to this run
});

// Session stats — check remaining budget any time
const stats = await fetch(
  \`https://p402.io/api/v2/sessions/\${session.id}/stats\`,
  { headers: { 'X-P402-Session': session.session_token } }
).then(r => r.json());

console.log(\`Remaining: $\${stats.budget_remaining_usd}\`);`}
                        </pre>
                    </div>
                </section>

                {/* AP2 Mandates */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-6">AP2 Spending Mandates</h2>
                    <p className="font-bold text-neutral-600 uppercase tracking-tight mb-4">
                        Mandates let a human authorize an agent to spend up to a limit — without handing over wallet keys:
                    </p>
                    <div className="bg-black p-6 border-4 border-black font-mono text-xs text-primary shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
                        <pre>{`// Human issues a mandate to the CDP wallet
const mandate = await fetch('https://p402.io/api/v2/governance/mandates', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${P402_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'payment',
    user_did: 'did:p402:tenant:usr_abc123',
    agent_did: \`did:p402:agent:cdp:\${wallet.address}\`,
    constraints: {
      max_amount_usd: 50,
      allowed_categories: ['ai', 'data'],
      valid_until: new Date(Date.now() + 7 * 86400_000).toISOString(),
    },
  }),
}).then(r => r.json());

console.log(\`Mandate issued: \${mandate.id}\`);
// Mandate enforcement is automatic — P402 checks before every settlement`}
                        </pre>
                    </div>
                </section>

                {/* Error Handling */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-6">Error Handling</h2>
                    <div className="border-2 border-black overflow-hidden">
                        <table className="w-full font-mono text-xs">
                            <thead>
                                <tr className="bg-black text-primary">
                                    <th className="text-left p-3 font-bold uppercase">Error Code</th>
                                    <th className="text-left p-3 font-bold uppercase">HTTP</th>
                                    <th className="text-left p-3 font-bold uppercase">Meaning</th>
                                    <th className="text-left p-3 font-bold uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-black">
                                {[
                                    ['CDP_POLICY_DENIED', '403', 'Wallet spending policy exceeded', 'Increase CDP policy limit or reduce request cost'],
                                    ['MANDATE_BUDGET_EXCEEDED', '403', 'AP2 mandate budget exhausted', 'Issue a new mandate or increase max_amount_usd'],
                                    ['RATE_LIMIT_EXCEEDED', '429', 'P402 rate limit hit', 'Retry after Retry-After header duration'],
                                    ['INSUFFICIENT_FUNDS', '402', 'USDC balance too low', 'Fund wallet via cdp.evm.transfer() or Coinbase'],
                                    ['REPLAY_DETECTED', '400', 'EIP-3009 nonce already used', 'Retry with a fresh nonce (auto-handled by SDK)'],
                                ].map(([code, status, meaning, action]) => (
                                    <tr key={code} className="bg-white hover:bg-neutral-50">
                                        <td className="p-3 font-bold text-primary">{code}</td>
                                        <td className="p-3">{status}</td>
                                        <td className="p-3 text-neutral-600">{meaning}</td>
                                        <td className="p-3 text-neutral-600">{action}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Further Reading */}
                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-6">Further Reading</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { href: '/docs/sdk', label: '@p402/sdk Reference', desc: 'Full SDK API — chat, sessions, mandates, policies.' },
                            { href: '/docs/a2a', label: 'A2A Protocol', desc: 'Agent-to-Agent JSON-RPC 2.0 task orchestration.' },
                            { href: '/docs/mandates', label: 'AP2 Mandates', desc: 'Spending authorization for autonomous agents.' },
                            { href: '/docs/facilitator', label: 'x402 Settlement', desc: 'EIP-3009 gasless USDC settlement internals.' },
                        ].map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="block border-2 border-black p-4 hover:bg-primary transition-colors"
                            >
                                <p className="font-black uppercase text-sm">{link.label} →</p>
                                <p className="text-xs font-mono text-neutral-600 mt-1">{link.desc}</p>
                            </a>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
