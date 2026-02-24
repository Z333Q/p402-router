import React, { useState, useEffect, useRef } from 'react';
import { simulation } from '../services/simulation';
import { EventTrace } from '../types';
import { Filter, X, Play, Pause } from 'lucide-react';

export default function ConsoleLiveTraffic() {
    const [events, setEvents] = useState<EventTrace[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventTrace | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const eventsRef = useRef<EventTrace[]>([]);

    useEffect(() => {
        // Load initial history
        const initial = simulation.getEvents();
        setEvents(initial);
        eventsRef.current = initial;

        // Subscribe to new events
        const unsubscribe = simulation.subscribeToEvents((newEvent) => {
            if (isPaused) return;

            const updated = [newEvent, ...eventsRef.current].slice(0, 100);
            eventsRef.current = updated;
            setEvents(updated);
        });

        return () => unsubscribe();
    }, [isPaused]);

    // Handle Play/Pause of the simulation engine itself to match UI state
    const togglePause = () => {
        const newState = !isPaused;
        setIsPaused(newState);
    };

    return (
        <div className="flex h-[calc(100vh-140px)] gap-8">
            {/* Main Table */}
            <div className="flex-1 bg-white border-2 border-black shadow-[8px_8px_0px_#000] flex flex-col overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b-2 border-black flex items-center justify-between bg-neutral-50">
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black bg-white border-2 border-black hover:bg-primary transition-colors">
                            <Filter size={14} strokeWidth={3} /> Filter Registry
                        </button>
                        <div className="h-8 w-0.5 bg-black/10"></div>
                        <div className="flex items-center gap-2">
                            <div className="relative flex h-3 w-3">
                                <div className={`absolute inline-flex h-full w-full rounded-none opacity-40 ${isPaused ? 'bg-amber-400' : 'bg-primary'}`}></div>
                                <div className={`relative inline-flex h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-primary'} border border-black`}></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-black">{isPaused ? 'Stream Restricted' : 'Live Propagation...'}</span>
                        </div>
                    </div>

                    <button
                        onClick={togglePause}
                        className="p-2 border-2 border-black text-black bg-white hover:bg-primary transition-colors"
                        title={isPaused ? "Resume Stream" : "Pause Stream"}
                    >
                        {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-neutral-50 sticky top-0 z-10 text-[10px] font-black uppercase tracking-widest text-neutral-500 border-b-2 border-black">
                            <tr>
                                <th className="py-4 px-6 border-r-2 border-black/5">Time</th>
                                <th className="py-4 px-6 border-r-2 border-black/5">Status</th>
                                <th className="py-4 px-6 border-r-2 border-black/5">Method</th>
                                <th className="py-4 px-6 border-r-2 border-black/5">Path</th>
                                <th className="py-4 px-6 border-r-2 border-black/5 text-right">Latency</th>
                                <th className="py-4 px-6 border-r-2 border-black/5">Facilitator</th>
                                <th className="py-4 px-6 text-right">Amt (USDC)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black/5 text-sm">
                            {events.map((event) => (
                                <tr
                                    key={event.eventId}
                                    onClick={() => setSelectedEvent(event)}
                                    className={`cursor-pointer transition-all hover:bg-primary/10 ${selectedEvent?.eventId === event.eventId ? 'bg-primary/20 bg-primary/20' : ''}`}
                                >
                                    <td className="py-4 px-6 text-black font-mono text-xs tabular-nums">
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}
                                    </td>
                                    <td className="py-4 px-6">
                                        <StatusBadge status={event.status} />
                                    </td>
                                    <td className="py-4 px-6 font-black text-xs text-black">{event.method}</td>
                                    <td className="py-4 px-6 font-mono text-xs text-neutral-600 truncate max-w-[150px]">{event.path}</td>
                                    <td className="py-4 px-6 text-right tabular-nums font-bold text-neutral-500">{event.latency}ms</td>
                                    <td className="py-4 px-6 text-black text-[10px] font-black uppercase tracking-tight">{event.facilitatorId || '-'}</td>
                                    <td className="py-4 px-6 text-right tabular-nums font-black text-black">{event.amount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inspector Drawer */}
            {selectedEvent && (
                <div className="w-[480px] bg-white border-2 border-black shadow-[16px_16px_0px_#000] flex flex-col relative animate-in slide-in-from-right duration-150">
                    <div className="p-6 border-b-2 border-black flex items-center justify-between bg-black text-white">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Trace Inspection</div>
                            <div className="text-lg font-black uppercase tracking-tighter truncate max-w-[300px]">{selectedEvent.eventId}</div>
                        </div>
                        <button onClick={() => setSelectedEvent(null)} className="text-white hover:text-primary transition-colors">
                            <X size={24} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 selection:bg-primary selection:text-black">
                        {/* Summary Grid */}
                        <div className="grid grid-cols-2 gap-px bg-black border-2 border-black">
                            {[
                                { l: 'Status', v: <StatusBadge status={selectedEvent.status} /> },
                                { l: 'Latency', v: `${selectedEvent.latency}ms` },
                                { l: 'Buyer Hash', v: selectedEvent.buyerIdHash || '-', mono: true },
                                { l: 'Network', v: selectedEvent.network || '-' }
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">{item.l}</div>
                                    <div className={`text-xs font-black uppercase ${item.mono ? 'font-mono lowercase' : ''}`}>{item.v}</div>
                                </div>
                            ))}
                        </div>

                        {/* Timeline */}
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-black mb-8 border-b-2 border-black pb-2">Propagation Logic</h3>
                            <div className="relative pl-4">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-black"></div>
                                <div className="space-y-10">
                                    {selectedEvent.steps.map((step, idx) => (
                                        <div key={idx} className="relative pl-8">
                                            <div className={`
                                        absolute left-[-10px] top-1 h-4 w-4 border-2 border-black rotate-45
                                        ${step.status === 'success' ? 'bg-primary' : 'bg-red-500'}
                                    `}></div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-[11px] font-black uppercase tracking-widest text-black">{step.name}</div>
                                                <div className="text-[10px] text-neutral-400 font-mono font-bold">{step.timestamp}</div>
                                            </div>
                                            <div className="p-4 bg-neutral-50 border-2 border-black text-xs font-bold leading-relaxed">
                                                {step.detail}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Denial Reason (if any) */}
                        {selectedEvent.status === 'denied' && selectedEvent.denialReason && (
                            <div className="bg-red-500 text-white border-2 border-black p-6 shadow-[4px_4px_0px_#000]">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 opacity-80">Security Enforcement</div>
                                <div className="text-sm font-black italic">{selectedEvent.denialReason}</div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t-2 border-black bg-neutral-100">
                        <button className="w-full py-4 bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                            Download JSON Manifest
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        verified: "bg-blue-500 text-white border-black shadow-[2px_2px_0px_#000]",
        settled: "bg-primary text-black border-black shadow-[2px_2px_0px_#000]",
        denied: "bg-neutral-800 text-white border-black shadow-[2px_2px_0px_#000]",
        failed: "bg-red-500 text-white border-black shadow-[2px_2px_0px_#000]",
        planned: "bg-white text-black border-black border-dashed",
    }[status] || "bg-neutral-400 text-black";

    return (
        <span className={`inline-flex items-center px-2 py-1 text-[9px] font-black border-2 uppercase tracking-wide transition-all hover:translate-y-[-1px] ${styles}`}>
            {status}
        </span>
    )
}