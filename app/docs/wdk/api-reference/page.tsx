import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { CommandPaletteBar } from '../_components/CommandPaletteBar';
import { CopyBlock } from '../_components/CopyBlock';

export const metadata: Metadata = {
  title: 'WDK API Reference | P402 Docs',
  description:
    'Complete API reference for WDK + USDT0 settlement flows. Liquidity quote, route settle, and receipt endpoints with full request/response schemas.',
  alternates: { canonical: 'https://p402.io/docs/wdk/api-reference' },
};

const quoteRequest = `{
  "invoiceId": "inv_123",
  "walletAddress": "0xYourWalletAddress",
  "sourceAssets": ["USDT0", "USDT", "USDC"],
  "constraints": {
    "maxFeeBps": 75,
    "maxLatencyMs": 12000
  }
}`;

const quoteResponse = `{
  "quoteId": "q_123",
  "expiresAt": "2026-04-16T12:01:00.000Z",
  "routes": [
    {
      "routeId": "r_fast",
      "sourceAsset": "USDT0",
      "sourceChain": "eip155:42161",
      "destinationChain": "eip155:8453",
      "authType": "eip3009",
      "estimatedFeeBps": 42,
      "estimatedLatencyMs": 3200
    },
    {
      "routeId": "r_usdc",
      "sourceAsset": "USDC",
      "sourceChain": "eip155:8453",
      "destinationChain": "eip155:8453",
      "authType": "eip3009",
      "estimatedFeeBps": 10,
      "estimatedLatencyMs": 1800
    }
  ]
}`;

const settleRequest = `{
  "quoteId": "q_123",
  "routeId": "r_fast",
  "client": { "type": "wdk", "version": "1.0.0" },
  "authType": "eip3009",
  "amount": "1.00",
  "asset": "USDT0",
  "payment": {
    "scheme": "exact",
    "authorization": {
      "from": "0xYourWalletAddress",
      "to": "0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6",
      "value": "1000000",
      "validAfter": "1713261540",
      "validBefore": "1713265140",
      "nonce": "0xabc123..."
    },
    "signature": "0x..."
  }
}`;

const settleResponse = `{
  "settled": true,
  "facilitatorId": "p402-eip3009",
  "receipt": {
    "receipt_id": "rec_abc789",
    "txHash": "0x...",
    "sourceAsset": "USDT0",
    "sourceChain": "eip155:42161",
    "destinationChain": "eip155:8453",
    "amount": "1.00",
    "feeBps": 42,
    "routeId": "r_fast",
    "settled_at": "2026-04-16T12:00:05.000Z"
  }
}`;

const receiptRequest = `{
  "quoteId": "q_456",
  "routeId": "r_fast",
  "client": { "type": "wdk", "version": "1.0.0" },
  "authType": "receipt",
  "receipt_id": "rec_abc789"
}`;

export default function WdkApiReferencePage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <Link href="/docs/wdk" className="hover:text-black no-underline transition-colors">WDK</Link>
          <span>/</span>
          <span className="text-black">API Reference</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">{'>_'} WDK / REFERENCE</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            WDK API<br />
            <span className="heading-accent">REFERENCE.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Complete endpoint contracts for the WDK + USDT0 settlement flow.
              All requests require <span className="font-mono">Authorization: Bearer &lt;api_key&gt;</span>.
              Base URL: <span className="font-mono">https://p402.io</span>.
            </p>
          </div>
        </div>

        <CommandPaletteBar />

        {/* ── ASSET/AUTH MATRIX ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Asset / Auth Capability Matrix</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Which <span className="font-mono">authType</span> to use depends on the token and chain.
            This table shows the supported combinations.
          </p>
          <div className="border-2 border-black overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black text-white text-[10px] uppercase tracking-widest">
                  <th className="text-left px-4 py-3">Asset</th>
                  <th className="text-left px-4 py-3">Chain</th>
                  <th className="text-left px-4 py-3">authType</th>
                  <th className="text-left px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['USDT0', 'Arbitrum One (42161)', 'eip3009', 'Preferred path. Validate contract version — use WDK adapter.'],
                  ['USDT0', 'Base (8453)', 'eip3009', 'Supported. Verify USDT0 contract deployment on Base.'],
                  ['Legacy USDT', 'Any EVM', 'N/A', 'No EIP-3009. Bridge to USDT0 or switch to USDC.'],
                  ['USDC', 'Base (8453)', 'eip3009', 'Baseline. No WDK adapter needed — direct EIP-712 signing.'],
                ].map(([asset, chain, auth, note]) => (
                  <tr key={`${asset}-${chain}`} className="border-t-2 border-black">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{asset}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-neutral-700">{chain}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{auth}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ENDPOINT 1: QUOTE ── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-black text-primary font-mono text-xs px-2 py-1 font-bold border-2 border-black">POST</span>
            <code className="font-mono text-lg font-black">/api/v1/liquidity/quote</code>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Preflight route selection. Returns available routes ranked by the constraints you provide.
            The <span className="font-mono">quoteId</span> is required for the settle call.
            Quotes expire after 60 seconds.
          </p>

          <div className="mb-4 font-black text-[11px] uppercase tracking-widest text-neutral-500">Request body</div>
          <CopyBlock title="Request" code={quoteRequest} secondaryTitle="Copy fetch" secondaryCode={`fetch('/api/v1/liquidity/quote', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' }, body: '${quoteRequest.replace(/\n/g, ' ')}' })`} />

          <div className="mt-6 mb-4 font-black text-[11px] uppercase tracking-widest text-neutral-500">Request field reference</div>
          <div className="border-2 border-black overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Field</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Type</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Required</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['invoiceId', 'string', 'Yes', 'Your internal invoice or payment reference ID. Used for idempotency.'],
                  ['walletAddress', 'string', 'Yes', 'EVM wallet address that will sign the authorization.'],
                  ['sourceAssets', 'string[]', 'Yes', 'Ordered preference: ["USDT0", "USDT", "USDC"]. P402 selects the first available.'],
                  ['constraints.maxFeeBps', 'number', 'No', 'Maximum total fee in basis points. Routes exceeding this are excluded.'],
                  ['constraints.maxLatencyMs', 'number', 'No', 'Maximum estimated settlement latency in ms. Routes slower than this are excluded.'],
                ].map(([field, type, req, desc]) => (
                  <tr key={field} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{field}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">{type}</td>
                    <td className="px-4 py-3 text-sm font-bold">{req}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-4 font-black text-[11px] uppercase tracking-widest text-neutral-500">Response</div>
          <div className="border-2 border-black bg-[#141414] overflow-x-auto">
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
              <code>{quoteResponse}</code>
            </pre>
          </div>
        </div>

        {/* ── ENDPOINT 2: SETTLE ── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-black text-primary font-mono text-xs px-2 py-1 font-bold border-2 border-black">POST</span>
            <code className="font-mono text-lg font-black">/api/v1/router/settle</code>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Submit a signed payment intent for settlement. P402 verifies the EIP-712 signature,
            checks the nonce for replay protection, executes the on-chain transfer (paying gas),
            and returns a receipt.
          </p>

          <div className="mb-4 font-black text-[11px] uppercase tracking-widest text-neutral-500">Request body</div>
          <CopyBlock title="Request" code={settleRequest} secondaryTitle="Copy fetch" secondaryCode={`fetch('/api/v1/router/settle', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' }, body: JSON.stringify(payload) })`} />

          <div className="mt-6 mb-4 font-black text-[11px] uppercase tracking-widest text-neutral-500">Request field reference</div>
          <div className="border-2 border-black overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Field</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Type</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Required</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['quoteId', 'string', 'Yes', 'From the quote response. Must not be expired.'],
                  ['routeId', 'string', 'Yes', 'The specific route from the quote you want to use.'],
                  ['client', 'object', 'Yes', '{"type": "wdk", "version": "1.0.0"} — identifies the signer client.'],
                  ['authType', '"eip3009" | "receipt"', 'Yes', 'eip3009 for new signatures; receipt for reusing a prior settlement.'],
                  ['amount', 'string', 'Yes', 'Settlement amount in human-readable format: "1.00"'],
                  ['asset', '"USDT0" | "USDC"', 'Yes', 'The token being transferred.'],
                  ['payment.scheme', '"exact"', 'Yes', 'Always "exact" for WDK flows.'],
                  ['payment.authorization', 'object', 'Yes (eip3009)', 'The EIP-3009 authorization fields: from, to, value, validAfter, validBefore, nonce.'],
                  ['payment.signature', 'string', 'Yes (eip3009)', 'EIP-712 signature over the authorization, produced by the WDK signer.'],
                  ['receipt_id', 'string', 'Yes (receipt)', 'Required when authType is "receipt". The receipt_id from a prior settlement.'],
                ].map(([field, type, req, desc]) => (
                  <tr key={field} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{field}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">{type}</td>
                    <td className="px-4 py-3 text-sm font-bold">{req}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-4 font-black text-[11px] uppercase tracking-widest text-neutral-500">Response</div>
          <div className="border-2 border-black bg-[#141414] overflow-x-auto">
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
              <code>{settleResponse}</code>
            </pre>
          </div>

          <div className="mt-6 border-2 border-black p-5 bg-amber-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Idempotency</p>
            <p className="text-sm text-neutral-700">
              Settlement uses the <span className="font-mono">nonce</span> in the authorization for
              idempotency. If you retry a request with the same nonce, P402 returns{' '}
              <span className="font-mono">REPLAY_DETECTED</span> (HTTP 409). To retry safely after
              a network failure without risking double-spend, use the receipt scheme with the{' '}
              <span className="font-mono">receipt_id</span> from the first successful settlement.
            </p>
          </div>
        </div>

        {/* ── ENDPOINT 3: RECEIPT ── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-black text-primary font-mono text-xs px-2 py-1 font-bold border-2 border-black">POST</span>
            <code className="font-mono text-lg font-black">/api/v1/router/settle</code>
            <span className="border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">authType: receipt</span>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Reuse a prior settlement receipt. Useful for retrying after a network failure
            without re-signing, or for proving payment to a service that accepts receipts.
            Each receipt can only be consumed once.
          </p>
          <CopyBlock title="Request (receipt scheme)" code={receiptRequest} secondaryTitle="Copy fetch" secondaryCode={`fetch('/api/v1/router/settle', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' }, body: JSON.stringify({ authType: 'receipt', receipt_id: 'rec_abc789', ... }) })`} />
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <div className="border-2 border-black p-5 bg-[#E9FFD0]">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Related</p>
            <ul className="space-y-3">
              {[
                { label: 'Error Codes — all WDK error codes with recovery strategies', href: '/docs/wdk/errors' },
                { label: 'Migration Guide — USDC-only to WDK + USDT0', href: '/docs/wdk/migration' },
                { label: 'Security & Privacy — production security baseline', href: '/docs/wdk/security' },
                { label: 'Fund with USDC — EIP-3009 basics', href: '/docs/guides/fund-usdc' },
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
