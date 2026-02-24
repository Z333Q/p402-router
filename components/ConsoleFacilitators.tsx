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
            <div className="mb-8 p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000]">
                <h2 className="text-xl font-black uppercase tracking-tight text-black">Connected Facilitators</h2>
                <p className="text-sm font-bold text-neutral-500 mt-1 uppercase tracking-tight">Manage underlying settlement facilitators and route priority.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {facilitators.map(fac => (
                    <div key={fac.id} className="bg-white border-2 border-black shadow-[8px_8px_0px_#000] overflow-hidden flex flex-col">
                        <div className="p-6 border-b-2 border-black bg-neutral-50">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-white border-2 border-black flex items-center justify-center text-black">
                                        <Server size={24} strokeWidth={3} />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="font-black text-lg text-black uppercase tracking-tight leading-none mb-1">{fac.name}</div>
                                        <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{fac.type}</div>
                                    </div>
                                </div>
                                <span className={`
                                px-2 py-1 border-2 border-black text-[10px] font-black uppercase tracking-[0.2em]
                                ${fac.status === 'healthy' ? 'bg-primary text-black' :
                                        fac.status === 'degraded' ? 'bg-[var(--warning)] text-black' :
                                            'bg-red-500 text-white'}
                            `}>
                                    {fac.status}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-2 gap-6 border-b-2 border-black">
                            <div>
                                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Success Rate</div>
                                <div className="text-2xl font-black tabular-nums text-black">{(fac.successRate * 100).toFixed(2)}%</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">p95 Latency</div>
                                <div className="text-2xl font-black tabular-nums text-black">{fac.p95Latency}ms</div>
                            </div>
                        </div>

                        <div className="p-6 bg-white flex-1">
                            <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Settlement Networks</div>
                            <div className="flex flex-wrap gap-2">
                                {fac.supportedNetworks.map(net => (
                                    <span key={net} className="px-2 py-1 bg-neutral-100 border-2 border-black text-[10px] font-bold text-black uppercase tracking-tighter">
                                        {net}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Card */}
                <button className="bg-neutral-50 border-2 border-black border-dashed flex flex-col items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-all min-h-[300px] shadow-[4px_4px_0px_rgba(0,0,0,0.1)] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.1)] group">
                    <div className="h-16 w-16 bg-white border-2 border-black border-dashed flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Server size={32} strokeWidth={2} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-black/50 group-hover:text-black">Add Facilitator</span>
                </button>
            </div>
        </div>
    );
}