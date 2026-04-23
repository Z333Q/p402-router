import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { CommandPaletteBar } from '../_components/CommandPaletteBar';

export const metadata: Metadata = {
  title: 'WDK Error Codes | P402 Docs',
  description:
    'Complete WDK error code reference. Machine-readable codes, HTTP mappings, example error payloads, and recovery strategies for every failure mode.',
  alternates: { canonical: 'https://p402.io/docs/wdk/errors' },
};

const errors = [
  {
    code: 'P402_QUOTE_EXPIRED',
    http: '410',
    trigger: 'The quote TTL (60 seconds) elapsed before the settlement was submitted.',
    recovery: 'Re-request the quote (/api/v1/liquidity/quote) and prompt the user to sign within the TTL. Do not retry the settle call with the expired quoteId.',
  },
  {
    code: 'P402_ROUTE_UNAVAILABLE',
    http: '503',
    trigger: 'No viable route exists for the requested asset and constraints at this time.',
    recovery: 'Relax constraints (increase maxFeeBps or maxLatencyMs), or change the sourceAssets order. Retry with exponential backoff. If persistent, fall back to USDC.',
  },
  {
    code: 'P402_POLICY_BLOCKED_ROUTE',
    http: '422',
    trigger: 'The policy engine denied the selected route (e.g. route is on a blocked jurisdiction).',
    recovery: 'Select a different route from the quote options that is compliant with your account policy. Do not retry the same routeId.',
  },
  {
    code: 'P402_SIGNATURE_REJECTED',
    http: '401',
    trigger: 'The EIP-712 signature failed verification. Common causes: wrong chainId, wrong contract address, wrong nonce, or malformed signature bytes.',
    recovery: 'Rebuild the authorization object from scratch. Verify chainId matches the token\'s deployment chain. Re-sign with the WDK adapter and resubmit.',
  },
  {
    code: 'P402_AUTH_INVALID',
    http: '400',
    trigger: 'The authorization payload is structurally malformed (missing fields, wrong types, invalid address format).',
    recovery: 'Check all required fields: from, to, value, validAfter, validBefore, nonce. Ensure nonce is a 0x-prefixed 32-byte hex string.',
  },
  {
    code: 'P402_INSUFFICIENT_BALANCE',
    http: '402',
    trigger: 'The wallet does not hold enough of the source asset to cover amount + fees.',
    recovery: 'Check the wallet balance before submitting. Offer a fallback route with a cheaper asset (e.g. try USDC if USDT0 balance is insufficient).',
  },
  {
    code: 'P402_SETTLEMENT_TIMEOUT',
    http: '504',
    trigger: 'The on-chain transaction was submitted but not finalized within the SLA window (30 seconds on Base).',
    recovery: 'Poll GET /api/v1/receipts/{receipt_id} with exponential backoff. The transaction may still finalize. If receipt shows settled: true, the payment succeeded.',
  },
  {
    code: 'P402_RECEIPT_UNAVAILABLE',
    http: '503',
    trigger: 'Receipt generation is delayed — the transaction settled on-chain but the receipt record is not yet written.',
    recovery: 'Retry GET /api/v1/receipts/{receipt_id} with 2-second intervals for up to 60 seconds. Keep the txHash visible in your UI so users can verify on a block explorer.',
  },
  {
    code: 'P402_REPLAY_DETECTED',
    http: '409',
    trigger: 'The nonce in the authorization has already been used in a prior settlement for this wallet.',
    recovery: 'Generate a new nonce (32 random bytes) and re-sign. Never reuse nonces. Use the receipt scheme instead if you need idempotent retries.',
  },
];

export default function WdkErrorCodesPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <Link href="/docs/wdk" className="hover:text-black no-underline transition-colors">WDK</Link>
          <span>/</span>
          <span className="text-black">Error Codes</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">{'>_'} WDK / REFERENCE</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            ERROR<br />
            <span className="heading-accent">CODES.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Stable, machine-readable error codes for every WDK + USDT0 failure mode.
              Each code tells you exactly what happened and what to do about it.
            </p>
          </div>
        </div>

        <CommandPaletteBar />

        {/* ── ERROR PAYLOAD FORMAT ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Error Payload Format</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            All error responses use this JSON structure. The <span className="font-mono">code</span>{' '}
            field is machine-readable and stable across API versions. The{' '}
            <span className="font-mono">message</span> is human-readable and may change.
          </p>
          <div className="border-2 border-black bg-[#141414] overflow-x-auto">
            <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
              json — error response envelope
            </div>
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
{`HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": {
    "code": "P402_QUOTE_EXPIRED",
    "message": "The quote q_123 expired at 2026-04-16T12:01:00.000Z.",
    "details": {
      "quoteId": "q_123",
      "expiredAt": "2026-04-16T12:01:00.000Z"
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* ── HTTP MAPPING ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">HTTP Status Mapping</h2>
          <div className="border-2 border-black overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black text-white text-[10px] uppercase tracking-widest">
                  <th className="text-left px-4 py-3">HTTP Status</th>
                  <th className="text-left px-4 py-3">Meaning</th>
                  <th className="text-left px-4 py-3">Retry?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['400 Bad Request', 'Malformed payload. Your code is wrong.', 'No — fix the request first.'],
                  ['401 Unauthorized', 'Signature or authentication failure.', 'No — re-sign with correct parameters.'],
                  ['402 Payment Required', 'Insufficient balance.', 'No — top up the wallet first.'],
                  ['409 Conflict', 'Replay detected — nonce already used.', 'No — generate a new nonce.'],
                  ['410 Gone', 'Quote expired.', 'Yes — re-quote and resubmit.'],
                  ['422 Unprocessable', 'Policy denied the route.', 'Yes — with a different route.'],
                  ['503 Service Unavailable', 'No route available or receipt delayed.', 'Yes — with backoff.'],
                  ['504 Gateway Timeout', 'Settlement not finalized in SLA.', 'Poll receipt endpoint; do not retry settle.'],
                ].map(([status, meaning, retry]) => (
                  <tr key={status} className="border-t-2 border-black">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{status}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{meaning}</td>
                    <td className="px-4 py-3 text-sm font-bold">{retry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FULL ERROR REFERENCE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-6">Full Error Reference</h2>
          <div className="space-y-0 border-2 border-black">
            {errors.map((err, i) => (
              <div key={err.code} className={`p-6 ${i < errors.length - 1 ? 'border-b-2 border-black' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <code className="font-mono text-[13px] font-black">{err.code}</code>
                  <span className="border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-neutral-100">
                    HTTP {err.http}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Trigger</div>
                    <p className="text-neutral-600 leading-relaxed">{err.trigger}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Recovery</div>
                    <p className="text-neutral-600 leading-relaxed">{err.recovery}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RETRY STRATEGY ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Recommended Retry Strategy</h2>
          <div className="border-2 border-black bg-[#141414] overflow-x-auto">
            <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
              typescript — retry with exponential backoff
            </div>
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
{`const RETRYABLE_CODES = new Set([
  'P402_QUOTE_EXPIRED',
  'P402_ROUTE_UNAVAILABLE',
  'P402_POLICY_BLOCKED_ROUTE',
  'P402_SETTLEMENT_TIMEOUT',
  'P402_RECEIPT_UNAVAILABLE',
]);

async function settleWithRetry(payload: SettlePayload, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch('/api/v1/router/settle', {
      method: 'POST',
      headers: { 'Authorization': \`Bearer \${API_KEY}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) return response.json();

    const error = await response.json();
    const code = error.error?.code;

    if (!RETRYABLE_CODES.has(code) || attempt === maxAttempts) {
      throw new Error(\`Settlement failed: \${code}\`);
    }

    // For expired quotes: re-quote before retrying
    if (code === 'P402_QUOTE_EXPIRED') {
      const newQuote = await requestQuote(payload);
      payload = { ...payload, quoteId: newQuote.quoteId, routeId: newQuote.routes[0].routeId };
    }

    // Exponential backoff: 1s, 2s, 4s
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
  }
}`}
            </pre>
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <div className="border-2 border-black p-5 bg-[#E9FFD0]">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Related</p>
            <ul className="space-y-3">
              {[
                { label: 'API Reference — full endpoint contracts', href: '/docs/wdk/api-reference' },
                { label: 'Migration Guide — USDC-only to WDK + USDT0', href: '/docs/wdk/migration' },
                { label: 'Security & Privacy — production security baseline', href: '/docs/wdk/security' },
                { label: 'Global error codes — all P402 error codes', href: '/docs/reference/error-codes' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="flex items-start gap-2 text-[15px] font-bold text-black no-underline group">
                    <span className="text-neutral-600 group-hover:text-black transition-colors shrink-0">→</span>
                    <span className="border-b-2 border-black group-hover:border-primary transition-colors">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
