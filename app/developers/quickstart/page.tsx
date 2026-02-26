import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Quickstart | P402 Developers',
    description: 'Complete verify, settle, retry, receipt issue, and receipt reuse in one session. Six steps. No prior blockchain experience required.',
    alternates: { canonical: 'https://p402.io/developers/quickstart' },
};

const STEPS = [
    {
        number: '01',
        title: 'Create account and API key',
        purpose: 'Get credentials. The API key is returned exactly once.',
        command: null,
        code: `# 1. Sign up at p402.io/login
# 2. Go to Dashboard → Settings → API Keys
# 3. Click "Generate new key"

# Your key looks like:
P402_API_KEY=p402_live_...

# Save it now — P402 stores only the SHA-256 hash.
# You cannot recover a lost key. Generate a new one if needed.`,
        expectedOutput: null,
        failureMode: 'Key display closes before you copy it.',
        recovery: 'Go to Settings → API Keys → Delete the old key → Generate again. The old hash is invalidated immediately.',
        ref: { label: 'API key docs', href: '/docs/api' },
        accent: '#B6FF2E',
    },
    {
        number: '02',
        title: 'Verify a payment payload',
        purpose: 'Check the EIP-3009 authorization before committing to settlement.',
        command: `curl -X POST https://p402.io/api/v1/facilitator/verify \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "paymentPayload": {
      "x402Version": 2,
      "scheme": "exact",
      "network": "eip155:8453",
      "payload": {
        "signature": "0x<EIP-712-sig>",
        "authorization": {
          "from":        "0x<payer-wallet>",
          "to":          "0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6",
          "value":       "1000000",
          "validAfter":  "0",
          "validBefore": "9999999999",
          "nonce":       "0x<random-bytes32>"
        }
      }
    },
    "paymentRequirements": {
      "scheme":             "exact",
      "network":            "eip155:8453",
      "maxAmountRequired":  "1000000",
      "resource":           "https://your-api.com/endpoint",
      "description":        "Access to premium endpoint",
      "payTo":              "0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6",
      "asset":              "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    }
  }'`,
        expectedOutput: `{
  "valid": true,
  "requestId": "req_01HX4...",
  "scheme": "exact",
  "network": "eip155:8453"
}`,
        failureMode: `{"valid": false, "errorCode": "AMOUNT_MISMATCH", "requestId": "req_..."}`,
        recovery: 'Check that value in authorization equals maxAmountRequired exactly. Both are in atomic USDC units (6 decimals). $1.00 = "1000000".',
        ref: { label: 'Verify reference', href: '/docs/facilitator' },
        accent: '#22D3EE',
    },
    {
        number: '03',
        title: 'Settle the payment',
        purpose: 'Execute the on-chain USDC transfer. Facilitator pays gas.',
        command: `curl -X POST https://p402.io/api/v1/facilitator/settle \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "paymentPayload": { ...same as step 2... },
    "paymentRequirements": { ...same as step 2... }
  }'`,
        expectedOutput: `{
  "success": true,
  "transaction": "0xabc123...",
  "network": "eip155:8453",
  "payer": "0x<payer-wallet>",
  "requestId": "req_01HX5..."
}`,
        failureMode: `{"success": false, "errorCode": "REPLAY_DETECTED", "requestId": "req_..."}`,
        recovery: 'REPLAY_DETECTED means this nonce was already settled. Generate a fresh nonce (random bytes32) and re-sign the authorization. Each nonce is one-time-use.',
        ref: { label: 'Settlement reference', href: '/docs/facilitator' },
        accent: '#22C55E',
    },
    {
        number: '04',
        title: 'Retry the original request with proof',
        purpose: 'Serve the paid resource by including the settlement proof in the retry.',
        command: `# Include the x402-payment header on retry:
curl https://your-api.com/endpoint \\
  -H "x402-payment: $PAYMENT_PAYLOAD_BASE64" \\
  -H "x402-receipt: $TX_HASH"

# Or use the SDK — it handles retry automatically:
import { p402Fetch } from '@p402/sdk';

const response = await p402Fetch('https://your-api.com/endpoint', {
  wallet: yourWallet,
  maxAmount: 1_000_000n, // $1.00 USDC
});`,
        expectedOutput: `HTTP 200 OK
x-p402-settled: true
x-p402-receipt: rcpt_01HX6...

{ ...your endpoint response... }`,
        failureMode: 'Still receiving HTTP 402 after settlement.',
        recovery: 'Confirm settle returned success: true and you have a txHash. Check that you are sending the x402-payment header — not just the Authorization header. The resource server validates the payment header independently.',
        ref: { label: 'SDK reference', href: '/docs/sdk' },
        accent: '#F59E0B',
    },
    {
        number: '05',
        title: 'Issue a receipt',
        purpose: 'Bind the settled payment to a reusable receipt. Avoids re-settling for the same resource.',
        command: `curl -X POST https://p402.io/api/v1/receipts \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "txHash":   "0xabc123...",
    "resource": "https://your-api.com/endpoint",
    "ttl":      3600
  }'`,
        expectedOutput: `{
  "receiptId": "rcpt_01HX6...",
  "resource":  "https://your-api.com/endpoint",
  "ttl":       3600,
  "expiresAt": "2025-01-01T01:00:00Z",
  "reuseCount": 0
}`,
        failureMode: `{"error": "TX_NOT_FOUND", "requestId": "req_..."}`,
        recovery: 'The txHash must match a settled transaction in your account. Wait 2–3 seconds after settlement for chain finality, then retry. Base Mainnet average block time is ~2s.',
        ref: { label: 'Receipts reference', href: '/docs/api' },
        accent: '#EF4444',
    },
    {
        number: '06',
        title: 'Reuse the receipt',
        purpose: 'Access the same resource again without a new payment. Cache economics kick in here.',
        command: `curl https://p402.io/api/v1/receipts/rcpt_01HX6.../verify \\
  -H "Authorization: Bearer $P402_API_KEY"

# If valid — serve without re-settling:
curl https://your-api.com/endpoint \\
  -H "x402-receipt: rcpt_01HX6..."`,
        expectedOutput: `# Receipt verify response:
{
  "valid":      true,
  "reuseCount": 1,
  "expiresAt":  "2025-01-01T01:00:00Z",
  "resource":   "https://your-api.com/endpoint"
}

# Endpoint response:
HTTP 200 OK — served without new settlement`,
        failureMode: `{"valid": false, "reason": "RECEIPT_EXPIRED", "requestId": "req_..."}`,
        recovery: 'Receipt TTL has elapsed. Issue a new receipt (step 5) after your next settlement. Plan receipt TTLs around your usage patterns — longer TTLs reduce settlement costs for high-frequency access.',
        ref: { label: 'Receipt lifecycle', href: '/docs/api' },
        accent: '#B6FF2E',
    },
] as const;

export default function QuickstartPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>

                {/* Header */}
                <section className="border-b-2 border-black py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Developers / Quickstart</div>
                        <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-5">
                            First payment<br />
                            <span className="bg-primary px-2">in one session.</span>
                        </h1>
                        <p className="text-lg font-medium text-neutral-600 max-w-2xl leading-relaxed border-l-4 border-black pl-5">
                            Six steps: verify, settle, retry, issue receipt, reuse receipt.
                            Each step has one command, expected output, and a recovery path.
                        </p>

                        {/* Step progress strip */}
                        <div className="mt-10 flex flex-wrap gap-2">
                            {STEPS.map((s) => (
                                <a
                                    key={s.number}
                                    href={`#step-${s.number}`}
                                    className="flex items-center gap-2 border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                                >
                                    <span style={{ color: s.accent }}>{s.number}</span>
                                    {s.title}
                                </a>
                            ))}
                        </div>

                        {/* Prerequisites */}
                        <div className="mt-8 border-2 border-black p-5 bg-neutral-50">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Prerequisites</div>
                            <div className="space-y-1.5 text-xs font-medium text-neutral-600">
                                <div className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5 w-1.5 h-1.5 bg-primary inline-block" />
                                    <span>A wallet with USDC on Base Mainnet (for signing EIP-3009 authorizations in steps 2–3)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5 w-1.5 h-1.5 bg-primary inline-block" />
                                    <span>curl or any HTTP client. The SDK handles steps 4–6 automatically if preferred.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5 w-1.5 h-1.5 bg-primary inline-block" />
                                    <span>~$0.01 USDC for test settlements. No credit card required for the P402 account itself.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Steps */}
                <div className="divide-y-2 divide-black">
                    {STEPS.map((step, i) => (
                        <section
                            key={step.number}
                            id={`step-${step.number}`}
                            className={`py-16 scroll-mt-20 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}
                        >
                            <div className="container mx-auto px-6 max-w-4xl">

                                {/* Step header */}
                                <div className="flex items-start gap-5 mb-8">
                                    <span
                                        className="font-black text-6xl leading-none shrink-0"
                                        style={{ color: step.accent }}
                                    >
                                        {step.number}
                                    </span>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-1">{step.title}</h2>
                                        <p className="text-sm font-medium text-neutral-500">{step.purpose}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left: command + expected output */}
                                    <div className="space-y-4">
                                        {step.command ? (
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Command</div>
                                                <div className="border-2 border-black bg-[#0D0D0D] p-5 relative group">
                                                    <pre className="font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{step.command}</pre>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Setup</div>
                                                <div className="border-2 border-black bg-[#0D0D0D] p-5">
                                                    <pre className="font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{step.code}</pre>
                                                </div>
                                            </div>
                                        )}

                                        {step.expectedOutput && (
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Expected output</div>
                                                <div className="border-2 border-black p-4" style={{ borderColor: step.accent + '66' }}>
                                                    <pre className="font-mono text-[11px] overflow-x-auto leading-relaxed whitespace-pre" style={{ color: step.accent }}>{step.expectedOutput}</pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: failure mode + recovery + ref */}
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-warning mb-2">Common failure</div>
                                            <div className="border-2 border-warning bg-warning/5 p-4">
                                                <pre className="font-mono text-[11px] text-neutral-700 overflow-x-auto leading-relaxed whitespace-pre-wrap">{step.failureMode}</pre>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Recovery</div>
                                            <div className="border-2 border-black p-4 bg-white">
                                                <p className="text-xs font-medium text-neutral-600 leading-relaxed">{step.recovery}</p>
                                            </div>
                                        </div>

                                        <Link
                                            href={step.ref.href}
                                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-black border-b-2 border-neutral-200 hover:border-black transition-colors no-underline pb-0.5"
                                        >
                                            {step.ref.label} →
                                        </Link>
                                    </div>
                                </div>

                                {/* Progress to next step */}
                                {i < STEPS.length - 1 && (
                                    <div className="mt-10 pt-6 border-t-2 border-neutral-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                            Completed step {step.number}
                                        </span>
                                        <a
                                            href={`#step-${STEPS[i + 1]?.number}`}
                                            className="inline-flex items-center gap-2 border-2 border-black px-4 py-2 font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline"
                                        >
                                            Next: {STEPS[i + 1]?.title}
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                                <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                                            </svg>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Completion CTA */}
                <section className="py-20 bg-primary border-t-2 border-black text-center">
                    <div className="container mx-auto px-6 max-w-2xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-4">
                            All six steps complete
                        </div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">
                            You're settling payments.
                        </h2>
                        <p className="font-medium text-black/70 mb-8 leading-relaxed">
                            Add spend policies to govern agent budgets. Create AP2 mandates for multi-agent workflows. Export evidence bundles for compliance review.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link
                                href="/dashboard"
                                className="btn btn-dark text-base px-8 py-4 h-auto"
                            >
                                Open dashboard
                            </Link>
                            <Link
                                href="/product/controls"
                                className="border-2 border-black bg-transparent text-black font-black uppercase tracking-wider text-base px-8 py-4 h-auto inline-flex items-center justify-center hover:bg-black hover:text-primary transition-colors"
                            >
                                Set spend controls
                            </Link>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}
