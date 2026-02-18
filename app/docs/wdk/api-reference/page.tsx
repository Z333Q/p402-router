import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

const endpoints = [
  {
    method: 'POST',
    path: '/api/v1/liquidity/quote',
    purpose: 'Preflight route selection for USDT0/USDT/USDC settlement.',
    request: `{
  "invoiceId": "inv_123",
  "walletAddress": "0x...",
  "sourceAssets": ["USDT0", "USDT", "USDC"],
  "constraints": { "maxFeeBps": 75, "maxLatencyMs": 12000 }
}`,
    response: `{
  "quoteId": "q_123",
  "expiresAt": "2026-02-18T12:00:00.000Z",
  "routes": [
    {
      "routeId": "r_fast",
      "sourceAsset": "USDT0",
      "sourceChain": "eip155:42161",
      "destinationChain": "eip155:8453",
      "authType": "eip3009",
      "estimatedFeeBps": 42,
      "estimatedLatencyMs": 7400,
      "badges": ["BestPrice"]
    }
  ]
}`
  },
  {
    method: 'POST',
    path: '/api/v1/router/settle',
    purpose: 'Submit signed payment intent for settlement execution.',
    request: `{
  "quoteId": "q_123",
  "routeId": "r_fast",
  "client": { "type": "wdk", "version": "1.0.0" },
  "authType": "eip3009",
  "amount": "1.00",
  "asset": "USDT0",
  "payment": { "scheme": "exact", "authorization": { "from": "0x...", "to": "0x...", "value": "1000000", "validAfter": 0, "validBefore": 1735689600, "nonce": "0x...", "v": 27, "r": "0x...", "s": "0x..." } }
}`,
    response: `{
  "settled": true,
  "facilitatorId": "p402-eip3009",
  "receipt": {
    "txHash": "0x...",
    "sourceAsset": "USDT0",
    "sourceChain": "eip155:42161",
    "destinationChain": "eip155:8453",
    "routeId": "r_fast",
    "routeClass": "bridge-first",
    "totalFeeBps": 44
  }
}`
  },
  {
    method: 'GET',
    path: '/api/v1/facilitator/supported',
    purpose: 'Capability discovery for dynamic client behavior.',
    request: `No body`,
    response: `{
  "kinds": [{ "x402Version": 1, "scheme": "exact", "network": "eip155:8453" }],
  "assets": ["USDC", "USDT", "USDT0"],
  "authTypes": ["eip3009", "permit", "transfer"],
  "signers": { "eip155:*": ["0x..."] }
}`
  }
];

export default function WdkApiReferencePage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <TopNav />
      <main className="max-w-5xl mx-auto py-16 px-6">
        <div className="border-b-4 border-black pb-6 mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">WDK Docs</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">API Reference Skeleton</h1>
          <p className="mt-3 font-semibold text-neutral-700">
            Backward-compatible endpoint contracts for WDK + USDT0 flows.
          </p>
        </div>

        <div className="space-y-8">
          {endpoints.map((ep) => (
            <section key={ep.path} className="border-2 border-black p-5">
              <h2 className="text-2xl font-black uppercase tracking-tight">{ep.method} {ep.path}</h2>
              <p className="text-sm font-semibold text-neutral-700 mt-1">{ep.purpose}</p>

              <h3 className="mt-4 text-xs font-black uppercase tracking-widest">Request</h3>
              <pre className="bg-neutral-950 text-neutral-100 p-3 overflow-x-auto text-xs border-2 border-black mt-2"><code>{ep.request}</code></pre>

              <h3 className="mt-4 text-xs font-black uppercase tracking-widest">Response</h3>
              <pre className="bg-neutral-950 text-neutral-100 p-3 overflow-x-auto text-xs border-2 border-black mt-2"><code>{ep.response}</code></pre>
            </section>
          ))}
        </div>


        <section className="mt-10 border-2 border-black p-5 bg-emerald-50">
          <h2 className="text-lg font-black uppercase">Upstream validation gates (before GA)</h2>
          <ul className="list-disc pl-6 mt-2 text-sm font-semibold text-neutral-700 space-y-1">
            <li>Cross-check all WDK adapter method names and data contracts against <code>tetherto/wdk</code> examples.</li>
            <li>Validate chain and token support claims against official docs for Build with AI workflows.</li>
            <li>Add compatibility table: WDK version -> P402 SDK version -> supported auth types.</li>
            <li>Mark any unsupported upstream features as <code>Not Yet Supported</code> to avoid over-claiming.</li>
          </ul>
        </section>

      </main>
      <Footer />
    </div>
  );
}
