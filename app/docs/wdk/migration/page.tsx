import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { CommandPaletteBar } from '../_components/CommandPaletteBar';

export const metadata: Metadata = {
  title: 'WDK Migration Guide | P402 Docs',
  description:
    'Migrate from USDC-only EIP-3009 to WDK + USDT0 routing with zero downtime. Step-by-step code changes, backwards compatibility guarantees, and a phased rollout plan.',
  alternates: { canonical: 'https://p402.io/docs/wdk/migration' },
};

export default function WdkMigrationGuidePage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <Link href="/docs/wdk" className="hover:text-black no-underline transition-colors">WDK</Link>
          <span>/</span>
          <span className="text-black">Migration Guide</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">{'>_'} WDK / HOW-TO GUIDE</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            MIGRATION<br />
            <span className="heading-accent">GUIDE.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Move from a USDC-only EIP-3009 integration to WDK + USDT0 routing with
              zero downtime. New fields are additive — existing clients continue to work
              unchanged throughout the migration.
            </p>
          </div>
        </div>

        <CommandPaletteBar />

        {/* ── COMPATIBILITY GUARANTEE ── */}
        <div className="mb-16">
          <div className="border-2 border-black p-5 bg-[#E9FFD0]">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Backwards compatibility guarantee</p>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-black shrink-0">✓</span>
                <span>All existing <span className="font-mono">/api/v1/facilitator/settle</span> requests with USDC continue to work — no changes required.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-black shrink-0">✓</span>
                <span>The new <span className="font-mono">quoteId</span>, <span className="font-mono">routeId</span>, and <span className="font-mono">client</span> fields are optional in the settle endpoint for existing callers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-black shrink-0">✓</span>
                <span>You can migrate incrementally — add USDT0 support while keeping USDC as a fallback.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── WHAT CHANGES ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">What Changes</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The migration adds two things to your settlement flow: a quote step before settlement,
            and WDK signer support for USDT0 tokens. Here is the before/after comparison.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black border-2 border-black">
            <div className="p-5 bg-white">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Before (USDC only)</div>
              <div className="border-2 border-black bg-[#141414] overflow-x-auto">
                <pre className="p-4 text-[#F5F5F5] font-mono text-xs leading-relaxed whitespace-pre">
{`POST /api/v1/facilitator/settle
{
  "paymentPayload": {
    "x402Version": 2,
    "scheme": "exact",
    "network": "eip155:8453",
    "payload": {
      "signature": "0x...",
      "authorization": {
        "from": "0x...",
        "to": "0xTreasury",
        "value": "1000000",
        "validAfter": "...",
        "validBefore": "...",
        "nonce": "0x..."
      }
    }
  },
  "paymentRequirements": { ... }
}`}
                </pre>
              </div>
            </div>
            <div className="p-5 bg-white">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">After (WDK + USDT0)</div>
              <div className="border-2 border-black bg-[#141414] overflow-x-auto">
                <pre className="p-4 text-[#F5F5F5] font-mono text-xs leading-relaxed whitespace-pre">
{`// Step 1: Quote (NEW)
POST /api/v1/liquidity/quote
{ "sourceAssets": ["USDT0", "USDC"], ... }
→ { "quoteId": "q_123", "routes": [...] }

// Step 2: Settle (EXTENDED)
POST /api/v1/router/settle
{
  "quoteId": "q_123",   // NEW
  "routeId": "r_fast",  // NEW
  "client": {           // NEW
    "type": "wdk",
    "version": "1.0.0"
  },
  "authType": "eip3009",
  "amount": "1.00",
  "asset": "USDT0",     // NEW (was USDC)
  "payment": {
    "scheme": "exact",
    "authorization": { ... },
    "signature": "0x..."
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* ── PHASE 0 ── */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">0</div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Baseline Audit</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Before changing any code, inventory what you have. This tells you the scope of work
            and gives you a baseline to measure against after migration.
          </p>
          <div className="border-2 border-black p-5 bg-neutral-50 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Checklist</p>
            <ul className="space-y-2 text-sm text-neutral-700">
              {[
                'Find all callers using /api/v1/facilitator/settle — these are your migration targets.',
                'Check whether any caller hardcodes "asset": "USDC" or USDC decimal math (6 decimals).',
                'Note current success rate, average latency, and failure modes for the existing settle flow.',
                'Identify which chains your users have wallets on (Base, Arbitrum, Ethereum).',
                'Confirm you have a WDK-compatible wallet for USDT0 signing, or a plan to get one.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 border-2 border-black inline-block shrink-0 mt-0.5"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── PHASE 1 ── */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">1</div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Add the Quote Step</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Add the quote call before your settle call. This is additive — your existing settle
            call does not change yet. At this stage, just pass USDC in <span className="font-mono">sourceAssets</span>{' '}
            and use the returned <span className="font-mono">quoteId</span> and{' '}
            <span className="font-mono">routeId</span> in your settle request.
          </p>
          <div className="border-2 border-black bg-[#141414] overflow-x-auto mb-4">
            <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
              typescript — phase 1: add quote call
            </div>
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
{`// BEFORE (no quote step):
async function settle(amount: string, authorization: Authorization, signature: string) {
  return fetch('/api/v1/facilitator/settle', {
    method: 'POST',
    body: JSON.stringify({ paymentPayload: { ... } }),
  });
}

// AFTER PHASE 1 (add quote, keep USDC):
async function settle(amount: string, authorization: Authorization, signature: string) {
  // New: get a quote first
  const quote = await fetch('/api/v1/liquidity/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${API_KEY}\` },
    body: JSON.stringify({
      invoiceId: crypto.randomUUID(),
      walletAddress: authorization.from,
      sourceAssets: ['USDC'],   // Still USDC only for now
    }),
  }).then(r => r.json());

  const route = quote.routes[0];

  // Extended: include quoteId + routeId, keep existing authorization
  return fetch('/api/v1/router/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${API_KEY}\` },
    body: JSON.stringify({
      quoteId: quote.quoteId,    // NEW
      routeId: route.routeId,   // NEW
      client: { type: 'direct', version: '1.0.0' },  // NEW
      authType: 'eip3009',
      amount,
      asset: 'USDC',            // Still USDC
      payment: { scheme: 'exact', authorization, signature },
    }),
  });
}`}
            </pre>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Deploy this, monitor your success rate, and confirm nothing regressed. The route
            selection for USDC should return results immediately — no new failures expected.
          </p>
        </div>

        {/* ── PHASE 2 ── */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">2</div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Add WDK Signer + USDT0</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Add the WDK signer adapter and expand <span className="font-mono">sourceAssets</span>{' '}
            to include USDT0. The quote response selects the best available token — if the user
            has USDT0 on Arbitrum, it&apos;ll be preferred over USDC on Base for most routes.
          </p>
          <div className="border-2 border-black bg-[#141414] overflow-x-auto mb-4">
            <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
              typescript — phase 2: add WDK signer
            </div>
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
{`import { WdkSigner } from '@tether/wdk';

async function settle(amount: string, walletAddress: string, wdkSigner: WdkSigner) {
  // Step 1: Quote with USDT0 preference
  const quote = await fetch('/api/v1/liquidity/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${API_KEY}\` },
    body: JSON.stringify({
      invoiceId: crypto.randomUUID(),
      walletAddress,
      sourceAssets: ['USDT0', 'USDC'],  // USDT0 preferred, USDC fallback
    }),
  }).then(r => r.json());

  const route = quote.routes[0];
  const isWdk = route.sourceAsset === 'USDT0';

  const now = Math.floor(Date.now() / 1000);
  const nonce = '0x' + crypto.getRandomValues(new Uint8Array(32))
    .reduce((hex, b) => hex + b.toString(16).padStart(2, '0'), '');

  const authorization = {
    from: walletAddress,
    to: P402_TREASURY,
    value: String(Math.round(parseFloat(amount) * 1_000_000)),  // 6 decimals
    validAfter: String(now - 60),
    validBefore: String(now + 3600),
    nonce,
  };

  // Sign: WDK for USDT0, standard EIP-712 for USDC
  const signature = isWdk
    ? await wdkSigner.signTransferAuthorization({
        token: USDT0_CONTRACT[route.sourceChain],
        chainId: parseInt(route.sourceChain.split(':')[1]),
        authorization,
      })
    : await standardEip712Sign(authorization);  // Your existing signing logic

  // Step 2: Settle
  return fetch('/api/v1/router/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${API_KEY}\` },
    body: JSON.stringify({
      quoteId: quote.quoteId,
      routeId: route.routeId,
      client: { type: isWdk ? 'wdk' : 'direct', version: '1.0.0' },
      authType: 'eip3009',
      amount,
      asset: route.sourceAsset,
      payment: { scheme: 'exact', authorization, signature },
    }),
  }).then(r => r.json());
}`}
            </pre>
          </div>
        </div>

        {/* ── PHASE 3 ── */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">3</div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Update Your UI</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            If you have a payment UI, update it to show the selected route and token. The quote
            response contains everything you need: selected asset, chain, fee, and estimated latency.
          </p>
          <div className="border-2 border-black p-5 bg-neutral-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">UI changes to make</p>
            <ul className="space-y-2 text-sm text-neutral-700">
              {[
                'Replace a token-only selector (e.g. "Pay with USDC") with a route card showing token + chain + estimated fee.',
                'Show the selected route from the quote before asking the user to sign.',
                'Display the receipt txHash and receipt_id after settlement for user reference.',
                'Handle P402_QUOTE_EXPIRED gracefully: re-fetch the quote and present the new options.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-mono font-bold text-black shrink-0">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── TESTING ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Testing Your Migration</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            After each phase, verify these signals before moving to the next phase:
          </p>
          <div className="border-2 border-black overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Check</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">How</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Settlement success rate unchanged', 'Compare 7-day success rate before and after deploy.'],
                  ['No double-spend incidents', 'Monitor for P402_REPLAY_DETECTED errors — any replay means a nonce bug.'],
                  ['Quote responses include routes', 'Assert quote.routes.length > 0 before attempting settlement.'],
                  ['Signature verification passes', 'P402_AUTH_INVALID errors indicate a signing mismatch — check chainId and contract address.'],
                  ['Receipt_id returned on success', 'Log receipt_id for each settlement; absence means the response schema changed.'],
                ].map(([check, how]) => (
                  <tr key={check} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-bold text-[13px]">{check}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <div className="border-2 border-black p-5 bg-[#E9FFD0]">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Related</p>
            <ul className="space-y-3">
              {[
                { label: 'API Reference — full endpoint contracts', href: '/docs/wdk/api-reference' },
                { label: 'Error Codes — handling failures during migration', href: '/docs/wdk/errors' },
                { label: 'Security & Privacy — production security checklist', href: '/docs/wdk/security' },
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
