import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Payments | P402',
    description: 'Verify and settle micropayments via the x402 protocol. Issue receipts for repeat access. Gasless USDC on Base Mainnet.',
    alternates: { canonical: 'https://p402.io/product/payments' },
};

const ERRORS = [
    { code: 'AMOUNT_MISMATCH', cause: 'value in authorization ≠ maxAmountRequired', fix: 'Ensure both fields use atomic USDC units. $1.00 = 1000000.' },
    { code: 'REPLAY_DETECTED', cause: 'Nonce already used in a previous settlement', fix: 'Generate a fresh random bytes32 nonce and re-sign the authorization.' },
    { code: 'AUTHORIZATION_EXPIRED', cause: 'validBefore is in the past', fix: 'Set validBefore to at least 30 seconds in the future at signing time.' },
    { code: 'GAS_PRICE_TOO_HIGH', cause: 'Base network gas > configured limit (50 gwei default)', fix: 'Retry after a few seconds. Gas spikes on Base are typically short.' },
    { code: 'INVALID_SIGNATURE', cause: 'EIP-712 signature does not match from address', fix: 'Verify the EIP-712 domain (chainId: 8453, USDC verifyingContract) and signing wallet.' },
] as const;

export default function PaymentsPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>

                {/* Header */}
                <section className="border-b-2 border-black py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Product / Payments</div>
                        <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-5">
                            Verify. Settle.<br />
                            <span className="bg-primary px-2">Issue receipts.</span>
                        </h1>
                        <p className="text-lg font-medium text-neutral-600 max-w-2xl leading-relaxed border-l-4 border-black pl-5">
                            The x402 payment protocol turns any HTTP endpoint into a paid resource.
                            Users sign once. The facilitator settles on Base. Receipts enable repeat access without re-payment.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link href="/developers/quickstart" className="inline-flex items-center h-11 px-6 bg-primary text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-black hover:text-primary transition-colors no-underline">
                                Run quickstart
                            </Link>
                            <Link href="/docs/facilitator" className="inline-flex items-center h-11 px-6 text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-neutral-50 transition-colors no-underline">
                                API reference
                            </Link>
                        </div>
                    </div>
                </section>

                {/* How x402 works */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">How x402 works</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-10">Three-call settlement</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black border-2 border-black">
                            {[
                                {
                                    step: '01',
                                    title: 'POST /verify',
                                    desc: 'Validate the EIP-3009 authorization. Checks signature, amount match, nonce freshness, expiry, and gas price. Returns valid: true or a structured error code.',
                                    href: '/docs/facilitator',
                                    color: '#B6FF2E',
                                },
                                {
                                    step: '02',
                                    title: 'POST /settle',
                                    desc: 'Execute the on-chain transfer. Facilitator calls transferWithAuthorization on USDC. Returns txHash, payer, and requestId. Gas is paid by the facilitator — not the user.',
                                    href: '/docs/facilitator',
                                    color: '#22D3EE',
                                },
                                {
                                    step: '03',
                                    title: 'Issue receipt',
                                    desc: 'Bind the txHash to a receipt with a TTL. The receipt ID is presented on repeat requests to skip re-settlement. Reduces cost for high-frequency access.',
                                    href: '/docs/api',
                                    color: '#22C55E',
                                },
                            ].map(s => (
                                <div key={s.step} className="bg-white p-8">
                                    <span className="font-black text-4xl leading-none" style={{ color: s.color }}>{s.step}</span>
                                    <h3 className="font-mono text-sm font-black mt-3 mb-3 text-black">{s.title}</h3>
                                    <p className="text-xs font-medium text-neutral-600 leading-relaxed mb-4">{s.desc}</p>
                                    <Link href={s.href} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black no-underline border-b border-neutral-200 hover:border-black transition-colors">
                                        Reference →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Receipt lifecycle */}
                <section className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12 items-start">
                            <div className="lg:w-1/2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Receipt reuse</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Pay once. Access many.</h2>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed mb-6">
                                    After settlement, issue a receipt with a TTL. Present the receipt ID on subsequent requests — the server verifies it without triggering a new settlement.
                                </p>
                                <div className="space-y-3">
                                    {[
                                        { label: 'TTL', desc: 'Set per-receipt. Controls reuse window.' },
                                        { label: 'Reuse count', desc: 'Tracked. Visible in dashboard and on the receipt object.' },
                                        { label: 'Revoke', desc: 'Instant. Revoked receipts return RECEIPT_REVOKED immediately.' },
                                        { label: 'Linked endpoint', desc: 'Receipt is scoped to a specific resource URL. Cannot be used cross-endpoint.' },
                                    ].map(r => (
                                        <div key={r.label} className="flex gap-3 items-start">
                                            <span className="shrink-0 font-black text-[10px] uppercase tracking-wider text-black border-2 border-black px-2 py-0.5 mt-0.5">{r.label}</span>
                                            <span className="text-xs font-medium text-neutral-600">{r.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:w-1/2">
                                <div className="border-2 border-black bg-[#0D0D0D] p-5">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">Receipt verify call</div>
                                    <pre className="font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{`GET /api/v1/receipts/rcpt_01HX.../verify
Authorization: Bearer $P402_API_KEY

# Response (valid):
{
  "valid":      true,
  "reuseCount": 4,
  "expiresAt":  "2025-01-01T01:00:00Z",
  "resource":   "https://your-api.com/endpoint"
}

# Response (expired):
{
  "valid":  false,
  "reason": "RECEIPT_EXPIRED",
  "requestId": "req_..."
}`}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Common errors */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Error recovery</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Common errors and fixes</h2>
                        <div className="border-2 border-black divide-y-2 divide-neutral-100">
                            {ERRORS.map(e => (
                                <div key={e.code} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white">
                                    <code className="font-mono text-xs font-black text-error">{e.code}</code>
                                    <div className="text-xs font-medium text-neutral-500">{e.cause}</div>
                                    <div className="text-xs font-medium text-neutral-700">{e.fix}</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] font-medium text-neutral-500 mt-4">
                            All errors include a <code className="font-mono">requestId</code> field. Include it when contacting support.
                        </p>
                    </div>
                </section>

                {/* SDK */}
                <section className="py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12 items-center">
                            <div className="lg:w-1/2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">SDK</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Drop-in integration</h2>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed mb-6">
                                    The <code className="font-mono text-black">@p402/sdk</code> handles verify, settle, retry, and receipt reuse automatically.
                                    For custom flows, use the REST API directly.
                                </p>
                                <div className="flex gap-4">
                                    <Link href="/docs/sdk" className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline">
                                        SDK docs
                                    </Link>
                                    <Link href="/developers/quickstart" className="inline-flex items-center h-10 px-5 bg-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline">
                                        Run quickstart
                                    </Link>
                                </div>
                            </div>
                            <div className="lg:w-1/2">
                                <div className="border-2 border-black bg-[#0D0D0D] p-5">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">SDK — one line</div>
                                    <pre className="font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{`import { p402Fetch } from '@p402/sdk';

// Drop-in fetch replacement.
// Handles 402 → sign → settle → retry automatically.
const res = await p402Fetch('https://your-api.com/endpoint', {
  wallet: yourWallet,
  maxAmount: 1_000_000n, // $1.00 USDC
});

// res is the successful endpoint response.
// Receipt is stored automatically for reuse.`}</pre>
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
