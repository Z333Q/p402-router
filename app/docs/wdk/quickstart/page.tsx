import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

const steps = [
  {
    title: '1. Request a route quote',
    body: 'Call POST /api/v1/liquidity/quote with invoice details and source assets (USDT0 preferred).'
  },
  {
    title: '2. Prepare + sign intent',
    body: 'Use your WDK signer adapter to sign token-aware typed data returned by P402.'
  },
  {
    title: '3. Submit settlement',
    body: 'POST signed payload to /api/v1/router/settle with quoteId/routeId for deterministic settlement.'
  },
  {
    title: '4. Read receipt + route metadata',
    body: 'Use response receipt to confirm source/destination chain, route class, and final tx hash.'
  }
];

export default function WdkQuickstartPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <TopNav />
      <main className="max-w-4xl mx-auto py-16 px-6">
        <div className="border-b-4 border-black pb-6 mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">WDK Docs</p>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter">Quickstart</h1>
          <p className="mt-3 font-semibold text-neutral-700">
            Integrate WDK + USDT0 settlement with P402 in a production-safe flow.
          </p>
        </div>

        <section className="space-y-4 mb-10">
          {steps.map((step) => (
            <article key={step.title} className="border-2 border-black p-5">
              <h2 className="text-xl font-black uppercase tracking-tight">{step.title}</h2>
              <p className="text-sm font-semibold text-neutral-700 mt-2">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black uppercase italic">TypeScript starter (SDK)</h2>
          <pre className="bg-neutral-950 text-neutral-100 p-4 overflow-x-auto text-xs leading-6 border-4 border-black"><code>{`import { P402Client } from '@p402/sdk';

const client = new P402Client({ apiKey: process.env.P402_API_KEY! });

const quote = await client.quotePayment({
  invoiceId: 'inv_123',
  walletAddress: '0xabc...',
  sourceAssets: ['USDT0', 'USDT', 'USDC'],
  constraints: { maxFeeBps: 75, maxLatencyMs: 12000 }
});

const intent = await client.prepareIntent({
  quoteId: quote.quoteId,
  signer: wdkAdapter
});

const signedIntent = await client.signIntent(intent);
const settled = await client.submitIntent(signedIntent);

console.log('Receipt', settled.receipt);`}</code></pre>
        </section>

        <section className="mt-10 p-5 border-2 border-black bg-yellow-50">
          <h3 className="text-lg font-black uppercase">Production notes</h3>
          <ul className="list-disc pl-6 mt-2 text-sm font-semibold text-neutral-800 space-y-1">
            <li>Always expire quotes aggressively (30-120s) when cross-chain routes are involved.</li>
            <li>Persist quoteId + routeId + nonce for deterministic retries.</li>
            <li>Map SDK errors to user-safe recovery prompts from /docs/wdk/errors.</li>
          </ul>
        </section>



        <section className="mt-10 p-5 border-2 border-black bg-emerald-50">
          <h3 className="text-lg font-black uppercase">Upstream WDK source-alignment checklist (pre-GA)</h3>
          <ul className="list-disc pl-6 mt-2 text-sm font-semibold text-neutral-800 space-y-1">
            <li>Confirm WDK signer API names and typed-data payload format against official docs and repo examples.</li>
            <li>Pin and publish validated WDK version(s) and supported chain matrix.</li>
            <li>Verify terminology for AI-agent wallet flows matches official Tether wording.</li>
            <li>Add explicit date/version stamp for latest upstream verification pass.</li>
          </ul>
        </section>

        <div className="mt-10 flex gap-4 text-sm font-black uppercase">
          <Link href="/docs/wdk/api-reference" className="border-b-2 border-black">API Reference &rarr;</Link>
          <Link href="/docs/wdk/errors" className="border-b-2 border-black">Error Codes &rarr;</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
