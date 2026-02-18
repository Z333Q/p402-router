import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

const phases = [
  {
    title: 'Phase 0: Baseline audit',
    points: [
      'Inventory all callers using USDC-only assumptions (asset defaults, decimal math, domain constants).',
      'Record existing success/failure metrics for current settle flow (latency, failed signatures, retries).'
    ]
  },
  {
    title: 'Phase 1: Backward-compatible API expansion',
    points: [
      'Add additive settle fields: quoteId, routeId, client, authType.',
      'Ship /api/v1/liquidity/quote without breaking existing /api/v1/router/settle clients.'
    ]
  },
  {
    title: 'Phase 2: SDK adapter migration',
    points: [
      'Implement signer abstraction (wagmi + wdk) while keeping old SDK methods operational.',
      'Gate WDK mode behind feature flag and collect telemetry from early integrators.'
    ]
  },
  {
    title: 'Phase 3: Route-aware UI rollout',
    points: [
      'Replace token-only selector with token+route cards in payment surfaces.',
      'Expose route and receipt metadata for supportability and trust.'
    ]
  }
];

export default function WdkMigrationGuidePage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <TopNav />
      <main className="max-w-4xl mx-auto py-16 px-6">
        <div className="border-b-4 border-black pb-6 mb-10">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">WDK Docs</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">Migration Guide</h1>
          <p className="mt-3 font-semibold text-neutral-700">
            Migrate from USDC-only EIP-3009 integration to WDK + USDT0 routing with zero downtime.
          </p>
        </div>

        <div className="space-y-6">
          {phases.map((phase) => (
            <section key={phase.title} className="border-2 border-black p-5">
              <h2 className="text-2xl font-black uppercase tracking-tight">{phase.title}</h2>
              <ul className="list-disc pl-6 mt-3 text-sm font-semibold text-neutral-700 space-y-2">
                {phase.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>



        <section className="mt-8 border-2 border-black p-5 bg-emerald-50">
          <h2 className="text-lg font-black uppercase">Upstream lock checklist (release blocker)</h2>
          <ul className="list-disc pl-6 mt-2 text-sm font-semibold text-neutral-700 space-y-1">
            <li>Finalize WDK API mapping doc with links to exact upstream sections used.</li>
            <li>Confirm fallback behavior for AI-agent signer flows matches official guidance.</li>
            <li>Document any divergence between P402 adapter behavior and upstream examples.</li>
            <li>Publish verification date and owner for ongoing maintenance cadence.</li>
          </ul>
        </section>


        <section className="mt-8 border-2 border-black p-5 bg-yellow-50">
          <h2 className="text-lg font-black uppercase">Compatibility contract</h2>
          <ul className="list-disc pl-6 mt-2 text-sm font-semibold text-neutral-700 space-y-1">
            <li>Legacy settle payloads remain valid until an announced deprecation window.</li>
            <li>New fields are optional and additive.</li>
            <li>Clients can progressively adopt quote routing and WDK signing without full rewrite.</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
