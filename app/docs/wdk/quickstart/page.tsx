import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { CommandPaletteBar } from '../_components/CommandPaletteBar';
import { CopyBlock } from '../_components/CopyBlock';

const curlExample = `curl -X POST https://p402.io/api/v1/router/settle \\
  -H "Content-Type: application/json" \\
  -d '{"quoteId":"q_123","routeId":"r_fast","authType":"eip3009","asset":"USDT0","amount":"1.00","payment":{...}}'`;

const fetchExample = `await fetch('/api/v1/router/settle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ quoteId: 'q_123', routeId: 'r_fast', authType: 'eip3009', asset: 'USDT0', amount: '1.00', payment: {...} })
});`;

export default function WdkQuickstartPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <TopNav />
      <main className="max-w-5xl mx-auto py-16 px-6">
        <div className="border-b-2 border-black pb-6 mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500"><span className="font-mono">{">_"}</span> WDK Docs</p>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter"><span className="heading-accent">Quickstart.</span></h1>
          <p className="mt-3 font-semibold text-neutral-700">Integrate WDK + USDT0 settlement with P402 in a production-safe flow.</p>
        </div>

        <CommandPaletteBar />

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="border-2 border-black p-4">
            <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2">Request Builder</h2>
            <ul className="mt-3 text-sm font-semibold text-neutral-700 space-y-2">
              <li>1) Quote route (`/liquidity/quote`)</li>
              <li>2) Sign intent (WDK adapter)</li>
              <li>3) Submit signed payload (`/router/settle`)</li>
              <li>4) Read receipt and settlement metadata</li>
            </ul>
          </div>
          <div className="border-2 border-black p-4 bg-neutral-100">
            <h2 className="text-lg font-black uppercase border-b-2 border-black pb-2">Inspector</h2>
            <p className="mt-3 text-sm font-semibold">Raw exchange: <span className="font-mono">402 header {'->'} payment signature {'->'} facilitator response</span>.</p>
            <p className="mt-2 text-xs font-black uppercase text-cyan-600">Tabs (mobile): Request / 402 / Payment / Response / Logs</p>
          </div>
        </section>

        <CopyBlock title="Settlement request" code={curlExample} secondaryTitle="Copy fetch" secondaryCode={fetchExample} />

        <section className="mt-8 p-4 border-2 border-black bg-yellow-50">
          <h3 className="text-lg font-black uppercase">Keyboard shortcuts</h3>
          <ul className="mt-2 text-sm font-semibold space-y-1 list-disc pl-6">
            <li><span className="font-mono">⌘K</span> Open docs command nav</li>
            <li><span className="font-mono">g a</span> Jump to API reference</li>
            <li><span className="font-mono">g e</span> Jump to error codes</li>
          </ul>
        </section>



        <section className="mt-8 p-4 border-2 border-black bg-blue-50">
          <h3 className="text-lg font-black uppercase">Token rail rule (important)</h3>
          <ul className="mt-2 text-sm font-semibold space-y-1 list-disc pl-6">
            <li><span className="font-mono">USDT0</span>: use <span className="font-mono">eip3009</span> rail when chain/version supports it.</li>
            <li><span className="font-mono">Legacy USDT</span>: do <strong>not</strong> assume <span className="font-mono">transferWithAuthorization</span>; use permit/transfer fallback or bridge to USDT0 first.</li>
            <li>x402 EVM reference path should be treated as EIP-3009-gated at payment-token level.</li>
          </ul>
        </section>

        <section className="mt-8 p-4 border-2 border-black bg-emerald-50">
          <h3 className="text-lg font-black uppercase">Upstream WDK source-alignment checklist (pre-GA)</h3>
          <ul className="list-disc pl-6 mt-2 text-sm font-semibold text-neutral-800 space-y-1">
            <li>Confirm WDK signer API names and typed-data payload format against official docs and repo examples.</li>
            <li>Pin and publish validated WDK version(s) and supported chain matrix.</li>
            <li>Verify terminology for AI-agent wallet flows matches official Tether wording.</li>
            <li>Add explicit date/version stamp for latest upstream verification pass.</li>
          </ul>
        </section>

        <div className="mt-8 flex gap-4 text-sm font-black uppercase">
          <Link href="/docs/wdk/api-reference" className="border-b-2 border-cyan-500 text-cyan-700">API Reference &rarr;</Link>
          <Link href="/docs/wdk/errors" className="border-b-2 border-cyan-500 text-cyan-700">Error Codes &rarr;</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
