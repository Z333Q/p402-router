'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/app/dashboard/_components/ui';

export const ProductionFeatures = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: 'gasless-payments',
      title: 'Gasless USDC Payments',
      description: 'Users pay zero gas fees with EIP-3009 transferWithAuthorization',
      status: 'Live on Base Mainnet',
      metrics: {
        'Gas Savings': '100%',
        'Settlement Time': '<2 seconds',
        'Fee Rate': '1%'
      },
      demoPath: '/demo/payment-flow'
    },
    {
      id: 'global-facilitator',
      title: 'Global Facilitator Network',
      description: 'Edge deployment across 15 regions with sub-50ms verification',
      status: 'Production on Cloudflare',
      metrics: {
        'Global Regions': '15',
        'P95 Latency': '<50ms',
        'Uptime SLA': '99.9%'
      },
      demoPath: 'https://facilitator.p402.io/health'
    },
    {
      id: 'real-time-analytics',
      title: 'Real-Time Cost Tracking',
      description: 'Live cost monitoring, transaction history, and savings analytics',
      status: 'Dashboard Available',
      metrics: {
        'Update Frequency': '5 seconds',
        'Cost Transparency': '100%',
        'Historical Data': '∞'
      },
      demoPath: '/dashboard/cost-demo'
    },
    {
      id: 'multisig-security',
      title: 'Multisig Treasury Security',
      description: '3-of-5 signature requirement with emergency pause capabilities',
      status: 'Security Hardened',
      metrics: {
        'Required Signatures': '3 of 5',
        'Emergency Controls': 'Active',
        'Audit Trail': 'Complete'
      },
      demoPath: '/docs/facilitator'
    }
  ];

  return (
    <section className="py-32 bg-neutral-50 border-t-2 border-black">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <Badge variant="primary" className="mb-4">Production Ready</Badge>
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-6 leading-none italic">
            Real Infrastructure<br />For Real Payments
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            P402 is live in production with real USDC settlements on Base mainnet.
            No testnets, no simulations - just working payment infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Feature List */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                onClick={() => setActiveFeature(index)}
                className={`
                  p-6 border-2 border-black cursor-pointer transition-all duration-300
                  ${activeFeature === index
                    ? 'bg-primary shadow-[8px_8px_0px_#000] transform -translate-y-1'
                    : 'bg-white shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000]'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    {feature.title}
                  </h3>
                  <Badge
                    variant={activeFeature === index ? "primary" : "default"}
                    className="text-xs"
                  >
                    {feature.status}
                  </Badge>
                </div>

                <p className="text-sm text-neutral-600 font-bold leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {Object.entries(feature.metrics).map(([metric, value]) => (
                    <div key={metric} className="p-2 bg-white/50 border border-black/20">
                      <div className="text-xs font-black text-neutral-900 uppercase tracking-tight">
                        {value}
                      </div>
                      <div className="text-[10px] text-neutral-500 uppercase font-bold">
                        {metric}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Active Feature Demo */}
          <div className="lg:sticky lg:top-8">
            <div className="p-8 bg-black text-white border-2 border-black shadow-[12px_12px_0px_#B6FF2E]">
              <h4 className="text-2xl font-black uppercase mb-4 text-primary">
                {features[activeFeature]!.title}
              </h4>

              <p className="text-neutral-300 mb-6 leading-relaxed">
                {features[activeFeature]!.description}
              </p>

              {/* Feature-specific content */}
              {activeFeature === 0 && (
                <div className="space-y-4">
                  <div className="bg-neutral-900 p-4 border border-neutral-700 font-mono text-xs">
                    <div className="text-primary mb-2">// EIP-3009 Flow</div>
                    <div>1. User signs authorization (no gas)</div>
                    <div>2. P402 verifies signature</div>
                    <div>3. Facilitator executes transfer</div>
                    <div>4. User receives service instantly</div>
                  </div>
                </div>
              )}

              {activeFeature === 1 && (
                <div className="space-y-4">
                  <div className="bg-neutral-900 p-4 border border-neutral-700 font-mono text-xs">
                    <div className="text-primary mb-2">// Global Locations</div>
                    <div>US: IAD, DFW, ORD, ATL, MIA</div>
                    <div>EU: LHR, CDG, FRA, AMS</div>
                    <div>Asia: NRT, ICN, SIN, HKG</div>
                    <div>Oceania: SYD, MEL</div>
                  </div>
                </div>
              )}

              {activeFeature === 2 && (
                <div className="space-y-4">
                  <div className="bg-neutral-900 p-4 border border-neutral-700 font-mono text-xs">
                    <div className="text-primary mb-2">// Live Metrics</div>
                    <div>Balance: $10.00</div>
                    <div>Spent Today: $0.247</div>
                    <div>Saved vs Direct: $0.089</div>
                    <div>Active Sessions: 3</div>
                  </div>
                </div>
              )}

              {activeFeature === 3 && (
                <div className="space-y-4">
                  <div className="bg-neutral-900 p-4 border border-neutral-700 font-mono text-xs">
                    <div className="text-primary mb-2">// Security Controls</div>
                    <div>Treasury: 0xb23f...19ec</div>
                    <div>Signers: 5 authorized</div>
                    <div>Required: 3 signatures</div>
                    <div>Emergency Pause: Available</div>
                  </div>
                </div>
              )}

              <Link
                href={features[activeFeature]!.demoPath}
                className="inline-block mt-6 px-6 py-3 bg-primary text-black font-bold uppercase tracking-wider border-2 border-white hover:bg-white hover:text-black transition-colors"
              >
                {activeFeature === 1 ? 'Check Health' :
                 activeFeature === 3 ? 'View Documentation' :
                 'Try Live Demo'}
              </Link>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-24 text-center">
          <h3 className="text-3xl font-black uppercase mb-12 tracking-tighter">
            Production Infrastructure
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6 bg-white border-2 border-black">
              <div className="text-3xl font-black text-primary mb-2">$0</div>
              <div className="text-sm font-bold uppercase text-neutral-600">Gas Fees for Users</div>
            </div>

            <div className="p-6 bg-white border-2 border-black">
              <div className="text-3xl font-black text-primary mb-2">15</div>
              <div className="text-sm font-bold uppercase text-neutral-600">Global Edge Regions</div>
            </div>

            <div className="p-6 bg-white border-2 border-black">
              <div className="text-3xl font-black text-primary mb-2">99.9%</div>
              <div className="text-sm font-bold uppercase text-neutral-600">Uptime Guarantee</div>
            </div>

            <div className="p-6 bg-white border-2 border-black">
              <div className="text-3xl font-black text-primary mb-2">3/5</div>
              <div className="text-sm font-bold uppercase text-neutral-600">Multisig Security</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};