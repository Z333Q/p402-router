import Link from 'next/link';

type MeterContext = 'hub' | 'healthcare' | 'legal' | 'real-estate' | 'enterprise';

const CONTEXT_LINES: Record<MeterContext, string> = {
  hub: "You've seen the demos. Each one live on Tempo mainnet. Where do you go from here?",
  healthcare: "Prior auth at $0.00035. Your staff currently spends $25–100 per review. What do you do with this?",
  legal: "Under $0.10 per matter. A paralegal costs $200–800 for the same stack. What do you do with this?",
  'real-estate': "$0.02–$0.05 per applicant. Manual screening runs $30–80. What do you do with this?",
  enterprise: "Every token attributed. Every overspend visible before it hits the invoice. What do you do next?",
};

export function MeterFunnelFooter({ context = 'hub' }: { context?: MeterContext }) {
  const contextLine = CONTEXT_LINES[context];

  return (
    <div className="border-t-2 border-neutral-700 mt-8 pt-12 flex flex-col gap-8">

      {/* Headline */}
      <div className="flex flex-col gap-3 max-w-3xl">
        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          {'>'} _ NEXT STEP
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight leading-tight">
          You've seen the meter work.
          <br />
          <span className="text-primary">Now make it yours.</span>
        </h2>
        <p className="text-[13px] font-mono text-neutral-400 leading-relaxed">
          {contextLine}
        </p>
      </div>

      {/* Four audience paths */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

        {/* ENTERPRISE — primary CTA */}
        <div className="border-2 border-primary p-5 flex flex-col gap-3 lg:order-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-primary uppercase tracking-widest">Enterprise Buyer</span>
            <span className="border border-primary text-primary text-[8px] font-mono px-1.5 py-0.5 uppercase">Start Here</span>
          </div>
          <h3 className="text-sm font-bold uppercase tracking-tight text-neutral-50">
            I want this for<br />my company's AI spend
          </h3>
          <p className="text-[11px] font-mono text-neutral-400 leading-relaxed flex-1">
            Connect your teams, see real attribution, enforce budget caps, cut model waste. Free tier available — or talk to sales for a white-glove onboarding.
          </p>
          <Link
            href="/pricing"
            className="btn btn-primary text-xs px-3 py-2 text-center mt-auto"
          >
            See Plans & Pricing →
          </Link>
        </div>

        {/* PARTNER */}
        <div className="border-2 border-neutral-700 hover:border-primary p-5 flex flex-col gap-3 transition-colors group lg:order-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Partner / ISV</span>
            <span className="border border-neutral-700 text-neutral-500 text-[8px] font-mono px-1.5 py-0.5 uppercase group-hover:border-primary group-hover:text-primary transition-colors">Embed</span>
          </div>
          <h3 className="text-sm font-bold uppercase tracking-tight text-neutral-50 group-hover:text-primary transition-colors">
            I build software<br />for this industry
          </h3>
          <p className="text-[11px] font-mono text-neutral-400 leading-relaxed flex-1">
            You own the vertical. P402 provides the metering, settlement, and cost attribution layer underneath it. White-label or embedded.
          </p>
          <a
            href="mailto:partners@p402.io"
            className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider border border-neutral-600 px-3 py-2 text-center hover:border-primary hover:text-primary transition-colors mt-auto"
          >
            Talk to Partnerships →
          </a>
        </div>

        {/* DEVELOPER */}
        <div className="border-2 border-neutral-700 hover:border-neutral-500 p-5 flex flex-col gap-3 transition-colors group lg:order-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Developer</span>
            <span className="border border-neutral-700 text-neutral-500 text-[8px] font-mono px-1.5 py-0.5 uppercase group-hover:border-neutral-400 group-hover:text-neutral-400 transition-colors">Integrate</span>
          </div>
          <h3 className="text-sm font-bold uppercase tracking-tight text-neutral-50 group-hover:text-neutral-200 transition-colors">
            I want to integrate<br />P402 into my stack
          </h3>
          <p className="text-[11px] font-mono text-neutral-400 leading-relaxed flex-1">
            OpenAI-compatible endpoint. Drop-in SDK. Add one header and per-token metering starts. Settlement handled automatically.
          </p>
          <Link
            href="/docs/router"
            className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider border border-neutral-700 px-3 py-2 text-center hover:border-neutral-500 hover:text-neutral-200 transition-colors mt-auto"
          >
            Read the Docs →
          </Link>
        </div>

        {/* UNDERSTAND */}
        <div className="border-2 border-neutral-700 hover:border-neutral-500 p-5 flex flex-col gap-3 transition-colors group lg:order-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Evaluator</span>
            <span className="border border-neutral-700 text-neutral-500 text-[8px] font-mono px-1.5 py-0.5 uppercase group-hover:border-neutral-400 group-hover:text-neutral-400 transition-colors">Research</span>
          </div>
          <h3 className="text-sm font-bold uppercase tracking-tight text-neutral-50 group-hover:text-neutral-200 transition-colors">
            I want the full<br />technical picture
          </h3>
          <p className="text-[11px] font-mono text-neutral-400 leading-relaxed flex-1">
            The economic and technical case for per-token AI settlement on Tempo. Protocol spec, whitepaper, and the full P402 story.
          </p>
          <div className="flex flex-col gap-2 mt-auto">
            <a
              href="/whitepaper.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider border border-neutral-700 px-3 py-2 text-center hover:border-neutral-500 hover:text-neutral-200 transition-colors"
            >
              Whitepaper ↗
            </a>
            <Link
              href="/pricing"
              className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider border border-neutral-700 px-3 py-2 text-center hover:border-neutral-500 hover:text-neutral-300 transition-colors"
            >
              View Pricing →
            </Link>
          </div>
        </div>

      </div>

      {/* Social proof line */}
      <div className="border border-neutral-800 bg-neutral-800 px-5 py-4 flex items-center gap-4 flex-wrap">
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex-shrink-0">Not sure which path?</span>
        <p className="text-[11px] font-mono text-neutral-400">
          Most teams start with the enterprise dashboard using their own tenant ID. If you need a guided walkthrough of your specific workflow, request a custom demo.
        </p>
        <a
          href="mailto:demo@p402.io"
          className="text-[10px] font-mono text-info uppercase tracking-wider border border-info px-3 py-1.5 hover:bg-info hover:text-neutral-900 transition-colors flex-shrink-0"
        >
          Request Custom Demo →
        </a>
      </div>

      {/* Bottom utility bar */}
      <div className="border-t border-neutral-800 pt-5 flex items-center justify-between flex-wrap gap-4 text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>P402 Meter · Tempo Mainnet · MPP</span>
        <div className="flex gap-5 flex-wrap">
          <Link href="/pricing" className="hover:text-neutral-400 transition-colors">Pricing</Link>
          <Link href="/docs/router" className="hover:text-neutral-400 transition-colors">Docs</Link>
          <a href="/whitepaper.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">Whitepaper ↗</a>
          <Link href="/meter/about" className="hover:text-neutral-400 transition-colors">About</Link>
          <a href="https://explore.tempo.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">Tempo Explorer ↗</a>
        </div>
      </div>

    </div>
  );
}
