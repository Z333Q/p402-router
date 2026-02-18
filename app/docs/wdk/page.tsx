import Link from 'next/link';
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

const sections = [
  {
    href: '/docs/wdk/quickstart',
    emoji: '🚀',
    title: 'Quickstart',
    desc: 'Integrate a WDK signer with P402 in ~15 minutes using quote -> sign -> settle -> receipt.'
  },
  {
    href: '/docs/wdk/api-reference',
    emoji: '🧾',
    title: 'API Reference (Skeleton)',
    desc: 'Implementation-ready endpoint contracts for quote, settle, and receipt flows.'
  },
  {
    href: '/docs/wdk/errors',
    emoji: '⚠️',
    title: 'Error Codes',
    desc: 'Stable error taxonomy for backend, SDK, and UI recovery handling.'
  },
  {
    href: '/docs/wdk/migration',
    emoji: '🔁',
    title: 'Migration Guide',
    desc: 'Move from USDC-only EIP-3009 to WDK + USDT0 routing with minimal breakage.'
  },
  {
    href: '/docs/wdk/security',
    emoji: '🛡️',
    title: 'Privacy & Security Ops',
    desc: 'Operational privacy and security baselines for production WDK integrations.'
  }
];

export default function WdkDocsIndex() {
  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <TopNav />

      <main className="max-w-5xl mx-auto py-20 px-6">
        <div className="mb-12 border-b-4 border-black pb-8">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">P402 Documentation</p>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic">WDK + USDT0 Integration Docs</h1>
          <p className="text-neutral-700 font-semibold mt-3 max-w-3xl">
            Public-facing integration guides for developers building agentic payments with Tether WDK wallets and P402 settlement rails.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group block p-7 border-4 border-black hover:bg-primary transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="text-3xl mb-3">{section.emoji}</div>
              <h2 className="text-2xl font-black uppercase italic mb-2">{section.title}</h2>
              <p className="text-sm font-bold text-neutral-600 uppercase tracking-tight min-h-[60px]">{section.desc}</p>
              <span className="inline-block mt-4 text-xs font-black uppercase tracking-widest border-b-2 border-black">Open Guide &rarr;</span>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
