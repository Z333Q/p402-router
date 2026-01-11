import React, { useState, useEffect } from 'react';
import { simulation } from '../services/simulation';
import { Route } from '../types';
import { Plus, MoreHorizontal, Trash2, X } from 'lucide-react';

export default function ConsoleRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Route Form State
  const [newPath, setNewPath] = useState('');
  const [newMethod, setNewMethod] = useState<'GET'|'POST'>('GET');
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
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-neutral-900">Routes</h2>
            <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover shadow-sm transition-all"
            >
                <Plus size={16} /> Create Route
            </button>
        </div>

        {/* Create Route Form */}
        {isCreating && (
            <div className="mb-6 bg-neutral-50 border border-neutral-200 rounded-xl p-4 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-neutral-900">New Route Configuration</h3>
                    <button onClick={() => setIsCreating(false)}><X size={16} className="text-neutral-500" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-medium text-neutral-500 mb-1 block">Method</label>
                        <select 
                            value={newMethod} 
                            onChange={(e) => setNewMethod(e.target.value as any)}
                            className="w-full h-9 rounded-lg border-neutral-300 text-sm"
                        >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-neutral-500 mb-1 block">Path Pattern</label>
                        <input 
                            value={newPath}
                            onChange={(e) => setNewPath(e.target.value)}
                            placeholder="/v1/my-api" 
                            className="w-full h-9 px-3 rounded-lg border border-neutral-300 text-sm"
                        />
                    </div>
                    <div>
                         <label className="text-xs font-medium text-neutral-500 mb-1 block">Pricing</label>
                         <select 
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="w-full h-9 rounded-lg border-neutral-300 text-sm"
                        >
                            <option value="fixed">Fixed Price</option>
                            <option value="per_token">Per Token</option>
                            <option value="dynamic">Dynamic</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded-lg">Cancel</button>
                    <button onClick={handleCreate} className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800">Save Route</button>
                </div>
            </div>
        )}

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500">
                    <tr>
                        <th className="py-3 px-6 w-16">Method</th>
                        <th className="py-3 px-6">Path Pattern</th>
                        <th className="py-3 px-6">Pricing</th>
                        <th className="py-3 px-6">Network / Asset</th>
                        <th className="py-3 px-6">Status</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {routes.map(route => (
                        <tr key={route.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="py-4 px-6">
                                <span className={`
                                    px-2 py-1 rounded text-[10px] font-bold font-mono
                                    ${route.method === 'GET' ? 'bg-blue-100 text-blue-700' : 
                                      route.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                                      'bg-neutral-100 text-neutral-700'}
                                `}>
                                    {route.method}
                                </span>
                            </td>
                            <td className="py-4 px-6 font-mono text-neutral-700">{route.pathPattern}</td>
                            <td className="py-4 px-6 text-neutral-600">
                                <span className="capitalize bg-neutral-100 px-2 py-0.5 rounded text-xs border border-neutral-200">{route.priceModel.replace('_', ' ')}</span>
                            </td>
                            <td className="py-4 px-6 text-neutral-600 text-xs">
                                {route.network} / {route.asset}
                            </td>
                            <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${route.status === 'active' ? 'text-emerald-700' : 'text-neutral-500'}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${route.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                                    {route.status}
                                </span>
                            </td>
                             <td className="py-4 px-6 text-right">
                                <button onClick={() => handleDelete(route.id)} className="text-neutral-400 hover:text-red-600 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {routes.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-8 text-center text-neutral-500 text-sm">
                                No routes configured. Create one to start accepting payments.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
}