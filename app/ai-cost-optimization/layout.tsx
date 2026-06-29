import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Cost Optimization Readiness | P402',
  description:
    'Prepare AI spend for measured savings across models, cache, retries, and context with P402 Optimize. Recommendations are gated until proof is ready.',
  alternates: { canonical: 'https://p402.io/ai-cost-optimization' },
  openGraph: {
    title: 'AI Cost Optimization Readiness | P402',
    description:
      'Prepare AI spend for measured savings across models, cache, retries, and context with P402 Optimize. Recommendations are gated until proof is ready.',
    url: 'https://p402.io/ai-cost-optimization',
  },
};

export default function AiCostOptimizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 font-ui">
      {children}
    </div>
  );
}
