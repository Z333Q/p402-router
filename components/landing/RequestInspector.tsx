'use client';

import React from 'react';

export function RequestInspector() {
    return (
        <section className="py-24 bg-neutral-100 border-t-2 border-black">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="mb-16">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 italic">Request Inspector</h2>
                    <p className="text-xl font-bold text-neutral-600 uppercase tracking-widest">Trace every interaction. Audit every payment.</p>
                </div>

                <div className="pane">
                    {/* Left: Request Builder */}
                    <div className="bg-white border-2 border-black p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black text-xs">01</div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Handshake & Policy</h3>
                        </div>
                        <p className="text-sm font-bold text-neutral-500 uppercase mb-8 leading-relaxed">
                            The SDK negotiates A2A handshakes and verifies EIP-712 mandates before emitting a single token.
                        </p>

                        <div className="bg-neutral-900 p-6 border-2 border-black font-mono text-xs text-neutral-100 mb-8 overflow-x-auto">
                            <pre className="text-primary">{`// 1. Initialize P402 client
const client = new P402Client({ 
  mode: 'balanced',
  policy: 'strict-budget'
});

// 2. Discover & Verify A2A Capability
const target = await client.discover('did:p402:agent-alpha');

// 3. Execute with Automatic 402 handling
const response = await client.request({
  to: target.id,
  task: 'market-analysis-v2',
  mandate: 'eip712:0x4a2...'
});`}</pre>
                        </div>
                        <div className="flex justify-between items-center border-t-2 border-black pt-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 italic">SDK v2.0.4 - READY</span>
                            <button className="text-[10px] font-black uppercase tracking-widest bg-primary px-3 py-1.5 border-2 border-black hover:bg-black hover:text-white transition-colors">
                                View SDK Docs
                            </button>
                        </div>
                    </div>

                    {/* Right: Traces */}
                    <div className="bg-white border-2 border-black p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black text-xs">02</div>
                            <h3 className="text-xl font-black uppercase tracking-tight">The 402 Exchange</h3>
                        </div>

                        <div className="space-y-4">
                            {/* Header Trace */}
                            <div className="border-2 border-black bg-neutral-50 p-4 font-mono text-[10px] space-y-2">
                                <div className="text-neutral-400 font-bold italic uppercase tracking-widest mb-1">Server Response</div>
                                <div className="text-black font-bold">HTTP/1.1 402 PAYMENT REQUIRED</div>
                                <div className="text-neutral-500">X-Payment-Cost: 0.0042 USDC</div>
                                <div className="text-neutral-500">X-Facilitator-Proof: did:p402:facilitator-1</div>
                            </div>

                            {/* Signature Trace */}
                            <div className="border-2 border-black bg-neutral-900 p-4 font-mono text-[10px] space-y-2 text-primary">
                                <div className="text-neutral-500 font-bold italic uppercase tracking-widest mb-1">EIP-712 Signature</div>
                                <div className="break-all whitespace-pre-wrap">
                                    {`{
  "domain": { "name": "P402-Router", "version": "1" },
  "message": { "cost": "4200", "nonce": "..." },
  "signature": "0x82f...a12c"
}`}
                                </div>
                            </div>

                            {/* Settlement Trace */}
                            <div className="border-2 border-black bg-success/10 border-success p-4 font-mono text-[10px] space-y-1">
                                <div className="text-success font-black italic uppercase tracking-widest mb-1">Settlement Confirmed</div>
                                <div className="text-black font-bold">TX: 0x4a1...9b2c</div>
                                <div className="text-neutral-500">Network: Base L2 (Mainnet)</div>
                                <div className="text-neutral-500">Status: Finalized</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
