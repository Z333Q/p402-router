import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Documentation | P402',
  description:
    'Tutorials, guides, reference, and explanations for integrating P402 AI routing and payment infrastructure.',
  alternates: { canonical: 'https://p402.io/docs' },
  openGraph: {
    title: 'P402 Documentation',
    description:
      'Everything you need to integrate P402: tutorials to get started, guides for specific tasks, reference for lookup, and explanations of how it all works.',
    url: 'https://p402.io/docs',
  },
};

// ─── QUADRANT DATA ───────────────────────────────────────────────────────────

interface DocLink {
  label: string;
  href?: string; // undefined = coming soon
}

interface Quadrant {
  id: string;
  title: string;
  subtitle: string;
  links: DocLink[];
}

const QUADRANTS: Quadrant[] = [
  {
    id: 'tutorials',
    title: 'Tutorials',
    subtitle: 'Learn by doing.',
    links: [
      { label: 'Quickstart (5 min)', href: '/docs/quickstart' },
      { label: 'Build a Budget Agent' },
    ],
  },
  {
    id: 'howto',
    title: 'How-To Guides',
    subtitle: 'Solve a specific problem.',
    links: [
      { label: 'Connect an Agent', href: '/docs/guides/agents' },
      { label: 'Set Up MCP Server' },
      { label: 'Manage Sessions' },
      { label: 'Fund with USDC' },
      { label: 'Choose Routing Modes' },
      { label: 'Configure Caching' },
      { label: 'Manage API Keys' },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    subtitle: 'Look up facts.',
    links: [
      { label: 'API Reference', href: '/docs/api' },
      { label: 'SDK Reference', href: '/docs/sdk' },
      { label: 'CLI Reference' },
      { label: 'MCP Tools', href: '/docs/mcp' },
      { label: 'Model Catalog', href: '/models' },
      { label: 'Billing Guard' },
      { label: 'Error Codes' },
    ],
  },
  {
    id: 'explanation',
    title: 'Understanding P402',
    subtitle: 'Learn why it works.',
    links: [
      { label: 'Architecture' },
      { label: 'x402 Protocol', href: '/docs/facilitator' },
      { label: 'Routing Engine', href: '/docs/router' },
      { label: 'Security Model' },
    ],
  },
];

// ─── LINK ITEM ───────────────────────────────────────────────────────────────

function DocLinkItem({ link }: { link: DocLink }) {
  if (link.href) {
    return (
      <li>
        <Link
          href={link.href}
          className="flex items-start gap-2 text-[15px] font-medium text-neutral-800 hover:text-black no-underline group"
        >
          <span className="text-neutral-400 group-hover:text-primary transition-colors shrink-0">
            →
          </span>
          <span className="border-b border-transparent group-hover:border-black transition-colors">
            {link.label}
          </span>
        </Link>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2 text-[15px] font-medium text-neutral-400 cursor-not-allowed">
      <span className="shrink-0">→</span>
      <span>
        {link.label}
        <span className="text-[11px] font-normal ml-2">(coming soon)</span>
      </span>
    </li>
  );
}

// ─── QUADRANT CARD ───────────────────────────────────────────────────────────

function QuadrantCard({ q }: { q: Quadrant }) {
  return (
    <div className="border-2 border-black p-8 bg-white h-full">
      <h2 className="text-[18px] font-black uppercase tracking-tight text-neutral-900 mb-1">
        {q.title}
      </h2>
      <p className="text-[14px] font-medium text-neutral-500 mb-6">{q.subtitle}</p>
      <ul className="space-y-3">
        {q.links.map(link => (
          <DocLinkItem key={link.label} link={link} />
        ))}
      </ul>
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function DocsIndex() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <main className="max-w-[1200px] mx-auto px-6 py-20">

        {/* Heading */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-5">
            {'>_'} DOCS
          </p>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            READ LESS.<br />
            <span className="heading-accent">BUILD MORE.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-2xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Everything you need to integrate P402: tutorials to get started, guides for specific
              tasks, reference for lookup, and explanations of how it all works.
            </p>
          </div>
        </div>

        {/* Four-quadrant grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black border-2 border-black mb-20">
          {QUADRANTS.map(q => (
            <QuadrantCard key={q.id} q={q} />
          ))}
        </div>

        {/* Legacy reference strip — existing in-depth docs */}
        <div className="border-2 border-black p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-5">
            {'>_'} MORE DOCUMENTATION
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'A2A Protocol', href: '/docs/a2a' },
              { label: 'AP2 Mandates', href: '/docs/mandates' },
              { label: 'WDK + USDT0', href: '/docs/wdk' },
              { label: 'Claude Skill', href: '/docs/skill' },
              { label: 'Escrow', href: '/docs/escrow' },
              { label: 'ERC-8004 Trustless Agents', href: '/docs/erc8004' },
              { label: 'Intelligence Layer', href: '/docs/api#intelligence-status' },
              { label: 'V2 API Spec', href: '/docs/v2-spec' },
              { label: 'AgentKit', href: '/docs/agentkit' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-4 py-3 border-2 border-black text-[13px] font-black uppercase tracking-wider text-black hover:bg-primary no-underline transition-colors"
              >
                <span className="text-neutral-400">→</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
