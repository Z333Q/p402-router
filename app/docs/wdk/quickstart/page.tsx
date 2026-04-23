import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { CommandPaletteBar } from '../_components/CommandPaletteBar';
import { CopyBlock } from '../_components/CopyBlock';

export const metadata: Metadata = {
  title: 'WDK Quickstart | P402 Docs',
  description:
    'Integrate WDK + USDT0 settlement with P402 in 15 minutes. Quote a route, sign with your WDK wallet, settle on-chain, and read the receipt.',
  alternates: { canonical: 'https://p402.io/docs/wdk/quickstart' },
};

const curlSettle = `curl -X POST https://p402.io/api/v1/router/settle \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
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
        "validAfter": "1713261600",
        "validBefore": "1713265200",
        "nonce": "0xabc123..."
      },
      "signature": "0x..."
    }
  }'`;

const fetchSettle = `const response = await fetch('https://p402.io/api/v1/router/settle', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.P402_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    quoteId: 'q_123',
    routeId: 'r_fast',
    client: { type: 'wdk', version: '1.0.0' },
    authType: 'eip3009',
    amount: '1.00',
    asset: 'USDT0',
    payment: {
      scheme: 'exact',
      authorization: {
        from: walletAddress,
        to: P402_TREASURY,
        value: '1000000',
        validAfter: String(Math.floor(Date.now() / 1000) - 60),
        validBefore: String(Math.floor(Date.now() / 1000) + 3600),
        nonce: generateNonce(),
      },
      signature: signedAuth,
    },
  }),
});
const receipt = await response.json();`;

export default function WdkQuickstartPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <Link href="/docs/wdk" className="hover:text-black no-underline transition-colors">WDK</Link>
          <span>/</span>
          <span className="text-black">Quickstart</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">{'>_'} WDK / QUICKSTART</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            WDK<br />
            <span className="heading-accent">QUICKSTART.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Integrate WDK + USDT0 settlement with P402 in ~15 minutes.
              You&apos;ll quote a route, sign an authorization with your WDK wallet,
              settle on-chain, and read the receipt.
            </p>
          </div>
        </div>

        <CommandPaletteBar />

        {/* ── PREREQUISITES ── */}
        <div className="mb-16">
          <div className="border-2 border-black p-5 bg-neutral-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Prerequisites</p>
            <ul className="space-y-2 text-sm text-neutral-700">
              {[
                'A P402 API key — create one at p402.io/dashboard',
                'A WDK-compatible wallet (Tether WDK v1.0.0+)',
                'USDT0 balance on Arbitrum One (eip155:42161) or USDC on Base (eip155:8453)',
                'Node.js ≥ 18 or curl for the code examples',
              ].map((pre, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-mono font-bold text-black shrink-0">{i + 1}.</span>
                  <span>{pre}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── WHAT IS WDK ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">What is WDK?</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            <strong>WDK (Wallet Development Kit)</strong> is Tether&apos;s signer abstraction for
            USDT0, the bridged USDT token on EVM chains. Where USDC uses EIP-3009
            (<span className="font-mono">TransferWithAuthorization</span>), USDT0 on supported
            chains uses the same EIP-3009 path — but USDT0&apos;s contract surface varies by
            chain and deployment version. WDK normalizes this.
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            P402 treats WDK as an <span className="font-mono">authType</span> in the settlement
            request. When you set <span className="font-mono">authType: &quot;eip3009&quot;</span>{' '}
            with <span className="font-mono">asset: &quot;USDT0&quot;</span>, P402 routes the
            settlement through the appropriate facilitator for your source chain.
          </p>

          <div className="border-2 border-black p-5 bg-amber-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Token rail decision</p>
            <div className="space-y-3 text-sm text-neutral-700">
              <div className="flex gap-3">
                <span className="font-mono font-bold w-28 shrink-0">USDT0</span>
                <span>Use <span className="font-mono">authType: &quot;eip3009&quot;</span>. Supported on Arbitrum One, Base, and Ethereum (verify contract version per chain before integration).</span>
              </div>
              <div className="flex gap-3">
                <span className="font-mono font-bold w-28 shrink-0">Legacy USDT</span>
                <span>Do <strong>not</strong> use EIP-3009. Legacy USDT does not implement <span className="font-mono">transferWithAuthorization</span>. Use the permit/transfer fallback or bridge to USDT0 first.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-mono font-bold w-28 shrink-0">USDC</span>
                <span>Use <span className="font-mono">authType: &quot;eip3009&quot;</span> with <span className="font-mono">asset: &quot;USDC&quot;</span>. This is the standard baseline — no WDK adapter needed.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── STEP 1: QUOTE ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">1</div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Request a Quote</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Before settling, get a quote. The quote selects the best route for your token, chain,
            and constraints, and returns a <span className="font-mono">quoteId</span> and a list
            of available routes. Quotes expire after 60 seconds.
          </p>
          <CopyBlock
            title="curl"
            code={`curl -X POST https://p402.io/api/v1/liquidity/quote \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "invoiceId": "inv_123",
    "walletAddress": "0xYourWalletAddress",
    "sourceAssets": ["USDT0", "USDT", "USDC"],
    "constraints": {
      "maxFeeBps": 75,
      "maxLatencyMs": 12000
    }
  }'`}
            secondaryTitle="Copy fetch"
            secondaryCode={`const quote = await fetch('https://p402.io/api/v1/liquidity/quote', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.P402_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    invoiceId: 'inv_123',
    walletAddress: walletAddress,
    sourceAssets: ['USDT0', 'USDT', 'USDC'],
    constraints: { maxFeeBps: 75, maxLatencyMs: 12000 },
  }),
}).then(r => r.json());`}
          />
          <div className="mt-4 border-2 border-black bg-[#141414] overflow-x-auto">
            <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
              json — quote response
            </div>
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
{`{
  "quoteId": "q_123",
  "expiresAt": "2026-04-16T12:01:00.000Z",
  "routes": [
    {
      "routeId": "r_fast",
      "sourceAsset": "USDT0",
      "sourceChain": "eip155:42161",      // Arbitrum One
      "destinationChain": "eip155:8453",  // Base
      "authType": "eip3009",
      "estimatedFeeBps": 42,              // 0.42% total fee
      "estimatedLatencyMs": 3200
    }
  ]
}`}
            </pre>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            Select the route you want to use and save both <span className="font-mono">quoteId</span>{' '}
            and <span className="font-mono">routeId</span> for the next step.
          </p>
        </div>

        {/* ── STEP 2: SIGN ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">2</div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Sign with WDK</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Use your WDK signer to create an EIP-712 <span className="font-mono">TransferWithAuthorization</span>.
            The nonce must be a 32-byte hex string that has never been used before for this wallet.
          </p>
          <div className="border-2 border-black bg-[#141414] overflow-x-auto">
            <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
              typescript — sign with WDK adapter
            </div>
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
{`import { WdkSigner } from '@tether/wdk';  // Your WDK signer instance

const USDT0_ADDRESS = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; // Arbitrum
const P402_TREASURY = '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6';

// Amount in atomic units (USDT0 has 6 decimals: 1.00 USDT0 = 1_000_000)
const amount = '1000000';

// Nonce: 32-byte random hex, never reused for this wallet
const nonce = '0x' + crypto.getRandomValues(new Uint8Array(32))
  .reduce((hex, b) => hex + b.toString(16).padStart(2, '0'), '');

const now = Math.floor(Date.now() / 1000);

const authorization = {
  from: walletAddress,
  to: P402_TREASURY,
  value: amount,
  validAfter: String(now - 60),    // Allow 1 minute of clock skew
  validBefore: String(now + 3600), // Expires in 1 hour
  nonce,
};

// WDK signs the EIP-712 typed data for TransferWithAuthorization
const signature = await wdkSigner.signTransferAuthorization({
  token: USDT0_ADDRESS,
  chainId: 42161,  // Arbitrum One
  authorization,
});`}
            </pre>
          </div>
        </div>

        {/* ── STEP 3: SETTLE ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">3</div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Submit Settlement</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Submit the signed authorization to P402. The facilitator verifies the signature,
            executes the on-chain transfer (paying gas), and returns a receipt.
          </p>
          <CopyBlock title="curl" code={curlSettle} secondaryTitle="Copy fetch" secondaryCode={fetchSettle} />
        </div>

        {/* ── STEP 4: RECEIPT ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">4</div>
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Read the Receipt</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            A successful settlement returns a receipt. Save the <span className="font-mono">txHash</span>{' '}
            for audit purposes and the <span className="font-mono">receipt.receipt_id</span> for
            the receipt scheme (reuse a prior payment without re-signing).
          </p>
          <div className="border-2 border-black bg-[#141414] overflow-x-auto">
            <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
              json — settlement response
            </div>
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
{`{
  "settled": true,
  "facilitatorId": "p402-eip3009",
  "receipt": {
    "receipt_id": "rec_abc789",
    "txHash": "0x...",
    "sourceAsset": "USDT0",
    "sourceChain": "eip155:42161",
    "destinationChain": "eip155:8453",
    "amount": "1.00",
    "routeId": "r_fast",
    "settled_at": "2026-04-16T12:00:05.000Z"
  }
}`}
            </pre>
          </div>
          <div className="mt-4 border-2 border-black p-5 bg-neutral-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Receipt scheme (idempotency)</p>
            <p className="text-sm text-neutral-700">
              To reuse a prior payment (e.g. retry on network failure without double-spending),
              pass <span className="font-mono">authType: &quot;receipt&quot;</span> and{' '}
              <span className="font-mono">receipt_id: &quot;rec_abc789&quot;</span> instead of a
              new signature. P402 verifies the receipt is unused and settles once.
            </p>
          </div>
        </div>

        {/* ── KEYBOARD SHORTCUTS ── */}
        <div className="mb-16">
          <div className="border-2 border-black p-5 bg-neutral-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Keyboard shortcuts</p>
            <ul className="space-y-1 text-sm text-neutral-700">
              <li><span className="font-mono font-bold">⌘K</span> — Open docs command palette</li>
              <li><span className="font-mono font-bold">g a</span> — Jump to API reference</li>
              <li><span className="font-mono font-bold">g e</span> — Jump to error codes</li>
            </ul>
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <div className="border-2 border-black p-5 bg-[#E9FFD0]">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">What&apos;s next</p>
            <ul className="space-y-3">
              {[
                { label: 'API Reference — full endpoint contracts for quote, settle, receipt', href: '/docs/wdk/api-reference' },
                { label: 'Error Codes — handling failures and retries', href: '/docs/wdk/errors' },
                { label: 'Migration Guide — move from USDC-only to WDK + USDT0', href: '/docs/wdk/migration' },
                { label: 'Security & Privacy — operational security for production', href: '/docs/wdk/security' },
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
