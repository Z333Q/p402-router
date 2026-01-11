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
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-neutral-900">Policies</h2>
            <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-50 shadow-sm transition-all"
            >
                <Plus size={16} /> New Policy
            </button>
        </div>

        {isCreating && (
             <div className="mb-6 bg-white border border-neutral-200 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-semibold">Define Policy</h3>
                     <button onClick={() => setIsCreating(false)}><X size={16} className="text-neutral-400" /></button>
                </div>
                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-neutral-500 mb-1 block">Policy Name</label>
                        <input 
                            value={newName} onChange={e => setNewName(e.target.value)}
                            placeholder="e.g. Daily Spend Cap" 
                            className="w-full h-9 px-3 border border-neutral-300 rounded-lg text-sm"
                        />
                    </div>
                    <div className="w-1/3">
                        <label className="text-xs font-medium text-neutral-500 mb-1 block">Type</label>
                        <select 
                            value={newType} onChange={e => setNewType(e.target.value as any)}
                            className="w-full h-9 px-3 border border-neutral-300 rounded-lg text-sm"
                        >
                            <option value="budget">Budget Cap</option>
                            <option value="allowlist">Allowlist</option>
                            <option value="rate-limit">Rate Limit</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button onClick={handleCreate} className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800">
                        Create Policy
                    </button>
                </div>
             </div>
        )}

        <div className="grid gap-4">
            {policies.map(policy => (
                <div key={policy.id} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between hover:border-primary/30 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500">
                            <Shield size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-neutral-900">{policy.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-neutral-500">Scope: <span className="font-medium text-neutral-700">{policy.scope}</span></span>
                                <span className="text-neutral-300">•</span>
                                <span className="text-xs text-neutral-500">Updated {policy.lastUpdated}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                         <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded border border-neutral-200 capitalize">
                            {policy.type}
                        </span>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${policy.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                            {policy.status}
                        </div>
                        <button onClick={() => handleDelete(policy.id)} className="text-neutral-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
             {policies.length === 0 && (
                <div className="text-center py-12 bg-neutral-50 rounded-xl border border-dashed border-neutral-300 text-neutral-500 text-sm">
                    No policies active. Traffic is unrestricted.
                </div>
            )}
        </div>
    </div>
  );
}