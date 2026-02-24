import React, { useState, useEffect } from 'react';
import { simulation } from '../services/simulation';
import { Policy } from '../types';
import { Plus, Trash2, Shield, X } from 'lucide-react';

export default function ConsolePolicies() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<Policy['type']>('budget');

    useEffect(() => {
        setPolicies(simulation.getPolicies());
    }, []);

    const handleCreate = () => {
        if (!newName) return;
        const newPolicy: Policy = {
            id: `pol_${Date.now()}`,
            name: newName,
            scope: 'Tenant',
            type: newType,
            status: 'active',
            lastUpdated: 'Just now'
        };
        simulation.addPolicy(newPolicy);
        setPolicies(simulation.getPolicies());
        setIsCreating(false);
        setNewName('');
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this policy?')) {
            simulation.deletePolicy(id);
            setPolicies(simulation.getPolicies());
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8 p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000]">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-black italic">Active Policies</h2>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">Global security and budget enforcement.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-widest border-2 border-black hover:bg-primary transition-all shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                    <Plus size={16} strokeWidth={3} /> New Policy
                </button>
            </div>

            {isCreating && (
                <div className="mb-10 bg-white border-2 border-black p-8 shadow-[8px_8px_0px_#000] animate-in slide-in-from-top-4 duration-200">
                    <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
                        <h3 className="text-lg font-black uppercase tracking-tighter italic">Define Protocol Policy</h3>
                        <button onClick={() => setIsCreating(false)} className="hover:rotate-90 transition-transform"><X size={24} className="text-black" strokeWidth={3} /></button>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2 block">Policy Identifier</label>
                            <input
                                value={newName} onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. DAILY_SPEND_CAP"
                                className="w-full h-12 px-4 border-2 border-black font-black uppercase text-xs focus:bg-primary/5 transition-colors"
                            />
                        </div>
                        <div className="md:w-1/3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2 block">Policy Class</label>
                            <select
                                value={newType} onChange={e => setNewType(e.target.value as any)}
                                className="w-full h-12 border-2 border-black px-4 font-black uppercase text-xs"
                            >
                                <option value="budget">Budget Cap</option>
                                <option value="allowlist">Allowlist</option>
                                <option value="rate-limit">Rate Limit</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-6 border-t-2 border-black/10">
                        <button onClick={handleCreate} className="btn btn-dark !px-10">
                            Commit Policy
                        </button>
                    </div>
                </div>
            )}

            <div className="grid gap-6">
                {policies.map(policy => (
                    <div key={policy.id} className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_#000] flex items-center justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000] transition-all group">
                        <div className="flex items-center gap-6">
                            <div className="h-12 w-12 bg-neutral-900 border-2 border-black flex items-center justify-center text-primary">
                                <Shield size={24} strokeWidth={3} />
                            </div>
                            <div>
                                <div className="text-lg font-black uppercase tracking-tighter text-black">{policy.name}</div>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Scope: <span className="text-black">{policy.scope}</span></span>
                                    <span className="text-neutral-200">/</span>
                                    <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest italic">{policy.lastUpdated}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <span className="px-3 py-1 bg-neutral-100 text-black border-2 border-black text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
                                {policy.type}
                            </span>
                            <div className={`px-3 py-1 border-2 border-black text-[10px] font-black uppercase tracking-[0.2em] ${policy.status === 'active' ? 'bg-primary text-black' : 'bg-neutral-100 text-neutral-400'}`}>
                                {policy.status}
                            </div>
                            <button onClick={() => handleDelete(policy.id)} className="p-2 border-2 border-black text-black bg-white hover:bg-red-500 hover:text-white transition-all shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                                <Trash2 size={18} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                ))}
                {policies.length === 0 && (
                    <div className="text-center py-16 bg-neutral-50 border-2 border-black border-dashed text-neutral-400 text-xs font-black uppercase tracking-[0.2em] italic">
                        Security shield inactive. No policies detected.
                    </div>
                )}
            </div>
        </div>
    );
}