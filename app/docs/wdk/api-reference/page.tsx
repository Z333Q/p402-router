import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { CommandPaletteBar } from '../_components/CommandPaletteBar';
import { CopyBlock } from '../_components/CopyBlock';

const endpoints = [
  {
    method: 'POST',
    path: '/api/v1/liquidity/quote',
    purpose: 'Preflight route selection for USDT0/USDT/USDC settlement.',
    request: `{"invoiceId":"inv_123","walletAddress":"0x...","sourceAssets":["USDT0","USDT","USDC"],"constraints":{"maxFeeBps":75,"maxLatencyMs":12000}}`,
    response: `{"quoteId":"q_123","expiresAt":"2026-02-18T12:00:00.000Z","routes":[{"routeId":"r_fast","sourceAsset":"USDT0","sourceChain":"eip155:42161","destinationChain":"eip155:8453","authType":"eip3009","estimatedFeeBps":42}]}`
  },
  {
    method: 'POST',
    path: '/api/v1/router/settle',
    purpose: 'Submit signed payment intent for settlement execution.',
    request: `{"quoteId":"q_123","routeId":"r_fast","client":{"type":"wdk","version":"1.0.0"},"authType":"eip3009","amount":"1.00","asset":"USDT0","payment":{"scheme":"exact","authorization":{"from":"0x...","to":"0x..."}}}`,
    response: `{"settled":true,"facilitatorId":"p402-eip3009","receipt":{"txHash":"0x...","sourceAsset":"USDT0","sourceChain":"eip155:42161","destinationChain":"eip155:8453","routeId":"r_fast"}}`
  }
];

export default function WdkApiReferencePage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <TopNav />
      <main className="max-w-6xl mx-auto py-16 px-6">
        <div className="border-b-2 border-black pb-6 mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">WDK Docs</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">API Reference Skeleton</h1>
          <p className="mt-3 font-semibold text-neutral-700">Backward-compatible endpoint contracts for WDK + USDT0 flows.</p>
        </div>

        <CommandPaletteBar />

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="border-2 border-black p-4">
            <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2">Call Endpoint Playground</h2>
            <p className="text-sm font-semibold mt-3">Left pane configures request parameters and signing mode.</p>
          </div>
          <div className="border-2 border-black p-4 bg-neutral-100">
            <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2">Split-pane Inspector</h2>
            <p className="text-sm font-semibold mt-3">Shows raw headers, <span className="font-mono">PAYMENT-REQUIRED</span>, computed signature, and facilitator response.</p>
          </div>
        </section>

        <div className="space-y-6">
          {endpoints.map((ep) => (
            <section key={ep.path} className="border-2 border-black p-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">{ep.method} {ep.path}</h2>
              <p className="text-sm font-semibold text-neutral-700 mt-1">{ep.purpose}</p>
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CopyBlock title="Request payload" code={ep.request} secondaryTitle="Copy fetch" secondaryCode={`fetch('${ep.path}', { method: '${ep.method}', headers: { 'Content-Type': 'application/json' }, body: '${ep.request}' })`} />
                <CopyBlock title="Response payload" code={ep.response} />
              </div>
            </section>
          ))}
        </div>

        <section className="mt-8 border-2 border-black p-4 bg-emerald-50">
          <h2 className="text-lg font-black uppercase">Upstream validation gates (before GA)</h2>
          <ul className="list-disc pl-6 mt-2 text-sm font-semibold text-neutral-700 space-y-1">
            <li>Cross-check all WDK adapter method names and data contracts against <code>tetherto/wdk</code> examples.</li>
            <li>Validate chain and token support claims against official docs for Build with AI workflows.</li>
            <li>Add compatibility table: WDK version -&gt; P402 SDK version -&gt; supported auth types.</li>
          </ul>
        </section>

        <section className="mt-8 border-2 border-black p-4 bg-blue-50">
          <h2 className="text-lg font-black uppercase">WDK API conformance table (fill before GA)</h2>
          <div className="overflow-x-auto mt-3 border-2 border-black">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black text-white text-xs uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-2">Upstream Surface</th><th className="px-3 py-2">Exact Type Signature</th><th className="px-3 py-2">P402 Wrapper</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Source Link</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t-2 border-black">
                  <td className="px-3 py-2 font-mono">&lt;methodName&gt;</td><td className="px-3 py-2 font-mono">&lt;type&gt;</td><td className="px-3 py-2 font-mono">&lt;adapter&gt;</td><td className="px-3 py-2">planned</td><td className="px-3 py-2 font-mono">&lt;source&gt;</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
