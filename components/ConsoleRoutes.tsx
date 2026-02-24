import React, { useState, useEffect } from 'react';
import { simulation } from '../services/simulation';
import { Route } from '../types';
import { Plus, MoreHorizontal, Trash2, X } from 'lucide-react';

export default function ConsoleRoutes() {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // New Route Form State
    const [newPath, setNewPath] = useState('');
    const [newMethod, setNewMethod] = useState<'GET' | 'POST'>('GET');
    const [newPrice, setNewPrice] = useState('fixed');

    useEffect(() => {
        // Load initial routes from simulation DB
        setRoutes(simulation.getRoutes());
    }, []);

    const handleCreate = () => {
        if (!newPath) return;

        const newRoute: Route = {
            id: `r_${Date.now()}`,
            method: newMethod,
            pathPattern: newPath.startsWith('/') ? newPath : `/${newPath}`,
            priceModel: newPrice,
            network: 'base',
            asset: 'USDC',
            status: 'active'
        };

        simulation.addRoute(newRoute);
        setRoutes(simulation.getRoutes()); // Refresh
        setIsCreating(false);
        setNewPath('');
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this route?')) {
            simulation.deleteRoute(id);
            setRoutes(simulation.getRoutes());
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8 p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000]">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-black italic">Route Registry</h2>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">Configure path patterns and pricing models.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-black text-xs font-black uppercase tracking-widest border-2 border-black hover:translate-y-[-2px] active:translate-y-0 transition-all shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000]"
                >
                    <Plus size={16} strokeWidth={3} /> Create Route
                </button>
            </div>

            {/* Create Route Form */}
            {isCreating && (
                <div className="mb-10 bg-neutral-50 border-2 border-black p-8 shadow-[8px_8px_0px_#000] animate-in slide-in-from-top-4 duration-200">
                    <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-black italic">New Route Configuration</h3>
                        <button onClick={() => setIsCreating(false)} className="hover:rotate-90 transition-transform"><X size={24} className="text-black" strokeWidth={3} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2 block">Method</label>
                            <select
                                value={newMethod}
                                onChange={(e) => setNewMethod(e.target.value as any)}
                                className="w-full h-12 border-2 border-black px-4 font-black uppercase text-xs"
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2 block">Path Pattern</label>
                            <input
                                value={newPath}
                                onChange={(e) => setNewPath(e.target.value)}
                                placeholder="/v1/my-api"
                                className="w-full h-12 px-4 border-2 border-black font-mono text-xs focus:bg-primary/5 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2 block">Pricing</label>
                            <select
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                className="w-full h-12 border-2 border-black px-4 font-black uppercase text-xs"
                            >
                                <option value="fixed">Fixed Price</option>
                                <option value="per_token">Per Token</option>
                                <option value="dynamic">Dynamic</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-4 pt-6 border-t-2 border-black/10">
                        <button onClick={() => setIsCreating(false)} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">Cancel</button>
                        <button onClick={handleCreate} className="btn btn-dark !px-8">Save Route</button>
                    </div>
                </div>
            )}

            <div className="bg-white border-2 border-black shadow-[8px_8px_0px_#000] overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-neutral-50 border-b-2 border-black text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        <tr>
                            <th className="py-4 px-6 border-r-2 border-black/5">Method</th>
                            <th className="py-4 px-6 border-r-2 border-black/5">Path Pattern</th>
                            <th className="py-4 px-6 border-r-2 border-black/5">Pricing</th>
                            <th className="py-4 px-6 border-r-2 border-black/5">Network / Asset</th>
                            <th className="py-4 px-6 border-r-2 border-black/5">Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/5">
                        {routes.map(route => (
                            <tr key={route.id} className="hover:bg-primary/5 transition-colors">
                                <td className="py-4 px-6 capitalize">
                                    <span className={`
                                    px-2 py-1 border-2 border-black text-[9px] font-black font-mono
                                    ${route.method === 'GET' ? 'bg-blue-500 text-white' :
                                            route.method === 'POST' ? 'bg-primary text-black' :
                                                'bg-neutral-900 text-white'}
                                `}>
                                        {route.method}
                                    </span>
                                </td>
                                <td className="py-4 px-6 font-mono text-xs font-bold text-black">{route.pathPattern}</td>
                                <td className="py-4 px-6">
                                    <span className="capitalize bg-neutral-100 px-3 py-1 border-2 border-black text-[10px] font-black tracking-tight">{route.priceModel.replace('_', ' ')}</span>
                                </td>
                                <td className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                    {route.network} / {route.asset}
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${route.status === 'active' ? 'text-emerald-600' : 'text-neutral-400'}`}>
                                        <span className={`h-2 w-2 border border-black ${route.status === 'active' ? 'bg-primary' : 'bg-neutral-200'}`}></span>
                                        {route.status}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <button onClick={() => handleDelete(route.id)} className="p-2 border-2 border-black text-black bg-white hover:bg-red-500 hover:text-white transition-all hover:translate-y-[-2px] active:translate-y-0">
                                        <Trash2 size={16} strokeWidth={3} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {routes.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-neutral-400 text-xs font-black uppercase tracking-[0.2em] italic">
                                    No routes in registry. Propagation idle.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}