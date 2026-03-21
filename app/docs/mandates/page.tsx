import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export const metadata = {
    title: 'AP2 Spending Mandates | P402 Router',
    description: 'AP2 mandate protocol: issue signed spending authorizations that allow AI agents to spend USDC on your behalf. Budget caps, category restrictions, expiry, and multi-stage approvals.',
    alternates: { canonical: 'https://p402.io/docs/mandates' },
    openGraph: { title: 'AP2 Spending Mandates — P402 Agent Governance', description: 'Give AI agents bounded spending authority. Signed mandates with budget caps, category filters, and on-chain enforcement.', url: 'https://p402.io/docs/mandates' },
};

export default function MandatesDocs() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main className="max-w-4xl mx-auto py-24 px-6">
                <div className="mb-12 border-b-4 border-black pb-8">
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4"><span className="heading-accent">AP2 Mandates.</span></h1>
                    <p className="text-xl font-bold text-neutral-600 uppercase tracking-tight">
                        Cryptographic spending constraints for agents.
                    </p>
                </div>

                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">Concept</h2>
                    <p className="text-lg font-bold text-neutral-600 mb-8 max-w-2xl leading-relaxed uppercase tracking-tight">
                        Instead of giving an agent your private key, you sign a <strong>Mandate</strong>.
                        This mandate is a policy document enforced by the P402 Router.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <div className="p-8 border-4 border-black bg-neutral-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <h3 className="font-black uppercase italic mb-4">Intent Mandate</h3>
                            <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">"Allow agent X to spend up to $10 on Compute."</p>
                        </div>
                        <div className="p-8 border-4 border-black bg-neutral-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <h3 className="font-black uppercase italic mb-4">Payment Mandate</h3>
                            <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">"Settle this specific invoice for $0.05."</p>
                        </div>
                    </div>
                </section>

                <section className="mb-16">
                    <h2 className="text-3xl font-black uppercase italic mb-8">Auto-Provisioned Mandates (CDP Sessions)</h2>
                    <p className="text-base font-bold text-neutral-600 mb-6 max-w-2xl uppercase tracking-tight">
                        When you create a session with <code className="bg-black text-primary px-1">wallet_source: &quot;cdp&quot;</code> and an <code className="bg-black text-primary px-1">agent_id</code>, P402 automatically issues a <strong>payment</strong> mandate — no separate API call needed.
                    </p>
                    <div className="bg-black p-8 border-4 border-black font-mono text-sm overflow-x-auto text-primary shadow-[12px_12px_0px_0px_rgba(182,255,46,1)] mb-4">
                        <pre><code>{`POST /api/v2/sessions
{
  "wallet_source": "cdp",
  "agent_id": "my-autonomous-agent",
  "budget_usd": 10.00,
  "expires_in_hours": 24
}

// Response includes:
// "policy": { "ap2_mandate_id": "mnd_..." }`}</code></pre>
                    </div>
                    <p className="text-sm font-bold text-neutral-500 uppercase tracking-tight mb-12">
                        All auto-pay calls through this session are enforced against the mandate. Budget overruns return 403 <code className="bg-neutral-100 px-1">MANDATE_BUDGET_EXCEEDED</code>.
                    </p>

                    <h2 className="text-3xl font-black uppercase italic mb-8">Manual Mandate Creation</h2>
                    <p className="text-base font-bold text-neutral-600 mb-6 max-w-2xl uppercase tracking-tight">
                        For non-CDP sessions or custom mandate constraints:
                    </p>
                    <div className="bg-black p-8 border-4 border-black font-mono text-sm overflow-x-auto text-primary shadow-[12px_12px_0px_0px_rgba(182,255,46,1)]">
                        <pre><code>{`POST /api/a2a/mandates
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
            </main>
            <Footer />
        </div>
    );
}
