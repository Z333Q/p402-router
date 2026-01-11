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
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Main Table */}
      <div className="flex-1 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100">
                    <Filter size={14} /> Filter
                </button>
                <div className="h-6 w-px bg-neutral-200"></div>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                    </span>
                    <span className="text-xs text-neutral-500">{isPaused ? 'Stream Paused' : 'Live streaming...'}</span>
                </div>
            </div>
            
            <button 
                onClick={togglePause}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                title={isPaused ? "Resume Stream" : "Pause Stream"}
            >
                {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
        </div>

        <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-50 sticky top-0 z-10 text-xs font-semibold text-neutral-500 border-b border-neutral-200">
                    <tr>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Path</th>
                        <th className="py-3 px-4 text-right">Latency</th>
                        <th className="py-3 px-4">Facilitator</th>
                        <th className="py-3 px-4 text-right">Amt (USDC)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-sm">
                    {events.map((event) => (
                        <tr 
                            key={event.eventId} 
                            onClick={() => setSelectedEvent(event)}
                            className={`cursor-pointer transition-colors hover:bg-neutral-50 ${selectedEvent?.eventId === event.eventId ? 'bg-primary-light/10 ring-1 ring-inset ring-primary/20' : ''}`}
                        >
                            <td className="py-3 px-4 text-neutral-500 tabular-nums text-xs whitespace-nowrap">
                                {new Date(event.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-3 px-4">
                                <StatusBadge status={event.status} />
                            </td>
                            <td className="py-3 px-4 font-mono text-xs font-medium text-neutral-700">{event.method}</td>
                            <td className="py-3 px-4 font-mono text-xs text-neutral-600 truncate max-w-[150px]">{event.path}</td>
                            <td className="py-3 px-4 text-right tabular-nums text-neutral-600">{event.latency}ms</td>
                            <td className="py-3 px-4 text-neutral-600 text-xs">{event.facilitatorId || '-'}</td>
                            <td className="py-3 px-4 text-right tabular-nums font-medium text-neutral-900">{event.amount}</td>
                        </tr>
                    ))}
                    {events.length === 0 && (
                        <tr>
                            <td colSpan={7} className="py-12 text-center text-neutral-500 text-sm">
                                Waiting for traffic... <br/>
                                <span className="text-xs opacity-70">(Ensure routes are configured)</span>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Inspector Drawer */}
      {selectedEvent && (
        <div className="w-[420px] bg-white rounded-xl border border-neutral-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 rounded-t-xl">
                <div>
                    <div className="text-sm font-semibold text-neutral-900">Trace Detail</div>
                    <div className="text-xs text-neutral-500 font-mono mt-0.5">{selectedEvent.eventId}</div>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="text-neutral-400 hover:text-neutral-600">
                    <X size={18} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Summary Card */}
                <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <div className="text-neutral-500 mb-1">Status</div>
                            <StatusBadge status={selectedEvent.status} />
                        </div>
                        <div>
                            <div className="text-neutral-500 mb-1">Latency</div>
                            <div className="font-medium text-neutral-900">{selectedEvent.latency}ms</div>
                        </div>
                        <div>
                            <div className="text-neutral-500 mb-1">Buyer Hash</div>
                            <div className="font-mono text-neutral-600 truncate">{selectedEvent.buyerIdHash || '-'}</div>
                        </div>
                         <div>
                            <div className="text-neutral-500 mb-1">Network</div>
                            <div className="font-medium text-neutral-900">{selectedEvent.network || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div>
                    <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-4">Decision Trace</h3>
                    <div className="relative pl-2">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-neutral-200"></div>
                        <div className="space-y-6">
                            {selectedEvent.steps.map((step, idx) => (
                                <div key={idx} className="relative pl-6">
                                    <div className={`
                                        absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-white 
                                        ${step.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}
                                    `}></div>
                                    <div className="flex items-start justify-between">
                                        <div className="text-sm font-medium text-neutral-900">{step.name}</div>
                                        <div className="text-[10px] text-neutral-400 font-mono">{step.timestamp}</div>
                                    </div>
                                    <div className="text-xs text-neutral-500 mt-0.5">{step.detail}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Denial Reason (if any) */}
                {selectedEvent.status === 'denied' && selectedEvent.denialReason && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                        <div className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Denial Reason</div>
                        <div className="text-sm text-red-900 font-mono">{selectedEvent.denialReason}</div>
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
                 <button className="w-full py-2 bg-white border border-neutral-200 text-neutral-700 text-xs font-medium rounded-lg hover:bg-neutral-100 shadow-sm">
                    View Full JSON Log
                 </button>
            </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        verified: "bg-blue-50 text-blue-700 border-blue-200",
        settled: "bg-emerald-50 text-emerald-700 border-emerald-200",
        denied: "bg-neutral-100 text-neutral-600 border-neutral-200",
        failed: "bg-red-50 text-red-700 border-red-200",
        planned: "bg-neutral-50 text-neutral-500 border-neutral-200",
    }[status] || "bg-neutral-100 text-neutral-600";

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${styles}`}>
            {status}
        </span>
    )
}