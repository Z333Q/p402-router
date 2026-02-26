import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Controls | P402',
    description: 'Constrain agent spend with AP2 mandates and policies. Export evidence bundles for compliance and risk review.',
    alternates: { canonical: 'https://p402.io/product/controls' },
};

const DENY_CODES = [
    { code: 'MANDATE_NOT_FOUND', desc: 'Mandate ID does not exist in this account.' },
    { code: 'MANDATE_INACTIVE', desc: 'Mandate status is exhausted, expired, or revoked.' },
    { code: 'MANDATE_EXPIRED', desc: 'valid_until timestamp has passed.' },
    { code: 'MANDATE_BUDGET_EXCEEDED', desc: 'amount_spent_usd + requested > max_amount_usd.' },
    { code: 'MANDATE_CATEGORY_DENIED', desc: 'Requested category not in allowed_categories.' },
    { code: 'MANDATE_SIGNATURE_INVALID', desc: 'Mandate signature does not match public_key.' },
    { code: 'POLICY_SPEND_LIMIT', desc: 'Request would exceed policy max_spend_usd.' },
    { code: 'POLICY_MODEL_DENIED', desc: 'Requested model not in policy allowed_models.' },
] as const;

export default function ControlsPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>

                {/* Header */}
                <section className="border-b-2 border-black py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Product / Controls</div>
                        <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-5">
                            Constrain spend.<br />
                            <span className="bg-primary px-2">Export evidence.</span>
                        </h1>
                        <p className="text-lg font-medium text-neutral-600 max-w-2xl leading-relaxed border-l-4 border-black pl-5">
                            AP2 mandates set cryptographic spend budgets for each agent.
                            Policies apply routing rules across the account.
                            Every decision produces a deny code or an evidence bundle.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link href="/dashboard/mandates" className="inline-flex items-center h-11 px-6 bg-primary text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-black hover:text-primary transition-colors no-underline">
                                Create mandate
                            </Link>
                            <Link href="/docs/mandates" className="inline-flex items-center h-11 px-6 text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-neutral-50 transition-colors no-underline">
                                Mandate reference
                            </Link>
                        </div>
                    </div>
                </section>

                {/* AP2 Mandates */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="lg:w-1/2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">AP2 mandates</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Agent spending authority</h2>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed mb-5">
                                    A mandate is a user-signed authorization granting an agent permission to spend on their behalf — within defined constraints. Budget, categories, and expiry are cryptographically enforced.
                                </p>
                                <div className="space-y-3">
                                    {[
                                        { label: 'max_amount_usd', desc: 'Hard spending ceiling. Exceeded → MANDATE_BUDGET_EXCEEDED.' },
                                        { label: 'allowed_categories', desc: 'Whitelist of spend categories. Others → MANDATE_CATEGORY_DENIED.' },
                                        { label: 'valid_until', desc: 'ISO 8601 expiry. Past → MANDATE_EXPIRED immediately.' },
                                        { label: 'agent_did', desc: 'The specific agent DID this mandate grants. Non-matching agent → MANDATE_NOT_FOUND.' },
                                    ].map(f => (
                                        <div key={f.label} className="p-3 border-2 border-black bg-white">
                                            <code className="font-mono text-[11px] font-black text-black">{f.label}</code>
                                            <p className="text-xs font-medium text-neutral-500 mt-1">{f.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:w-1/2">
                                <div className="border-2 border-black bg-[#0D0D0D] p-5">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">Create mandate</div>
                                    <pre className="font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{`curl -X POST https://p402.io/api/a2a/mandates \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "payment",
    "user_did": "did:key:z6Mk...",
    "agent_did": "did:p402:agent_01...",
    "constraints": {
      "max_amount_usd": 50.00,
      "allowed_categories": [
        "llm-inference",
        "data-retrieval"
      ],
      "valid_until": "2025-02-01T00:00:00Z"
    }
  }'

# Response:
{
  "id": "mnd_01HX...",
  "status": "active",
  "amount_spent_usd": 0,
  "constraints": { ... }
}`}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Policies */}
                <section className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="lg:w-1/2 order-2 lg:order-1">
                                <div className="border-2 border-black bg-[#0D0D0D] p-5">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">Create policy</div>
                                    <pre className="font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{`curl -X POST https://p402.io/api/v2/governance/policies \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production limits",
    "max_spend_usd": 500,
    "allowed_models": [
      "gemini-2.0-flash",
      "gpt-4o-mini",
      "deepseek-v3"
    ],
    "enforce": true
  }'`}</pre>
                                </div>
                            </div>
                            <div className="lg:w-1/2 order-1 lg:order-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Policies</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Account-level routing rules</h2>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed mb-5">
                                    Policies apply to all routing decisions in the account. They run before mandate checks — if a policy denies a request, the mandate is never evaluated.
                                </p>
                                <div className="border-l-4 border-black pl-4 space-y-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Evaluation order</div>
                                    {['1. Policy spend limit check', '2. Policy allowed_models check', '3. Mandate budget check', '4. Mandate category check', '5. Mandate signature check', '6. Route to provider'].map(s => (
                                        <div key={s} className="text-xs font-medium text-neutral-600 font-mono">{s}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Deny codes */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Deny codes</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Full deny code list</h2>
                        <div className="border-2 border-black divide-y divide-neutral-100">
                            {DENY_CODES.map(d => (
                                <div key={d.code} className="flex flex-col md:flex-row gap-3 p-4 bg-white">
                                    <code className="font-mono text-xs font-black text-error md:w-56 shrink-0">{d.code}</code>
                                    <span className="text-xs font-medium text-neutral-600">{d.desc}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] font-medium text-neutral-500 mt-4">
                            All deny responses include a <code className="font-mono">requestId</code>. Denied requests are visible in the Audit log with the reason code attached.
                        </p>
                    </div>
                </section>

                {/* Code audit */}
                <section className="py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12 items-start">
                            <div className="lg:w-1/2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Integration audit</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Evidence for risk review</h2>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed mb-5">
                                    Run an integration audit from the dashboard or API. The audit checks your x402 implementation against known failure patterns and exports a signed evidence bundle for compliance review.
                                </p>
                                <div className="space-y-2 mb-6">
                                    {['Integration correctness checks', 'Security rule validation', 'Mandate and policy consistency', 'Export as JSON evidence bundle', 'Findings table with severity rubric'].map(f => (
                                        <div key={f} className="flex items-start gap-2">
                                            <span className="shrink-0 mt-1 w-1.5 h-1.5 bg-primary inline-block" />
                                            <span className="text-xs font-medium text-neutral-600">{f}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-4">
                                    <Link href="/dashboard/audit" className="inline-flex items-center h-10 px-5 bg-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline">
                                        Run audit
                                    </Link>
                                    <Link href="/trust" className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline">
                                        Trust Center
                                    </Link>
                                </div>
                            </div>
                            <div className="lg:w-1/2 border-2 border-black p-6 bg-neutral-50">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Evidence bundle fields</div>
                                <div className="space-y-1.5">
                                    {['requestId', 'tenantId', 'payer + payTo', 'asset + amount + chainId', 'txHash', 'receiptId, mandateId, policyId', 'denyCode (if rejected)', 'timestamps per event', 'trace events summary', 'audit findings summary'].map(f => (
                                        <div key={f} className="flex items-start gap-2">
                                            <span className="shrink-0 mt-1 w-1.5 h-1.5 bg-black inline-block" />
                                            <code className="font-mono text-[11px] text-neutral-700">{f}</code>
                                        </div>
                                    ))}
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
