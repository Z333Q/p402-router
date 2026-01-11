import React, { useState, useEffect } from 'react';
import { simulation } from '../services/simulation';
import { Facilitator } from '../types';
import { Activity, Server } from 'lucide-react';

export default function ConsoleFacilitators() {
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);

  useEffect(() => {
    // Load facilitators from simulation service which manages state
    setFacilitators(simulation.getFacilitators());
  }, []);

  return (
    <div>
        <div className="mb-6">
            <h2 className="text-base font-semibold text-neutral-900">Facilitators</h2>
            <p className="text-sm text-neutral-500 mt-1">Manage underlying settlement providers and route priority.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilitators.map(fac => (
                <div key={fac.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-neutral-100">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center text-primary">
                                    <Server size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm text-neutral-900">{fac.name}</div>
                                    <div className="text-xs text-neutral-500">{fac.type}</div>
                                </div>
                            </div>
                            <span className={`
                                px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                                ${fac.status === 'healthy' ? 'bg-emerald-50 text-emerald-700' : 
                                  fac.status === 'degraded' ? 'bg-amber-50 text-amber-700' : 
                                  'bg-red-50 text-red-700'}
                            `}>
                                {fac.status}
                            </span>
                        </div>
                    </div>
                    
                    <div className="p-5 grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-neutral-500 mb-1">Success Rate</div>
                            <div className="text-lg font-semibold tabular-nums text-neutral-900">{(fac.successRate * 100).toFixed(2)}%</div>
                        </div>
                        <div>
                            <div className="text-xs text-neutral-500 mb-1">p95 Latency</div>
                            <div className="text-lg font-semibold tabular-nums text-neutral-900">{fac.p95Latency}ms</div>
                        </div>
                    </div>

                    <div className="px-5 pb-5">
                         <div className="text-xs text-neutral-500 mb-2">Supported Networks</div>
                         <div className="flex flex-wrap gap-2">
                            {fac.supportedNetworks.map(net => (
                                <span key={net} className="px-2 py-1 bg-neutral-50 border border-neutral-200 rounded text-[10px] text-neutral-600">
                                    {net}
                                </span>
                            ))}
                         </div>
                    </div>
                </div>
            ))}

            {/* Add New Card */}
            <button className="bg-neutral-50 rounded-xl border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:border-neutral-400 transition-all min-h-[240px]">
                <Server size={32} className="mb-3 opacity-50" />
                <span className="text-sm font-medium">Add Facilitator</span>
            </button>
        </div>
    </div>
  );
}