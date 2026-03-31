import { Suspense } from 'react';
import { AdminLoginForm } from './_components/AdminLoginForm';

export const metadata = { title: 'Admin — P402', robots: 'noindex,nofollow' };

export default function AdminLoginPage() {
    return (
        <div className="min-h-screen bg-white flex">
            {/* Left — branding panel */}
            <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-black border-r-2 border-black p-12">
                <div>
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-8 h-8 bg-[#FF3B30] border-2 border-[#FF3B30] flex items-center justify-center">
                            <span className="text-white font-black text-xs">P4</span>
                        </div>
                        <span className="text-white font-black text-[11px] uppercase tracking-[0.3em]">
                            P402.io
                        </span>
                    </div>

                    <h1 className="text-5xl font-black text-white leading-[1] tracking-tight uppercase mb-6">
                        Admin<br />Console
                    </h1>
                    <p className="text-sm text-neutral-500 font-mono leading-relaxed">
                        Platform governance, analytics, and operational control.
                    </p>
                </div>

                <div className="space-y-3">
                    {[
                        'KPI Command Center',
                        'User & Safety Management',
                        'Revenue Analytics',
                        'Full Audit Trail',
                    ].map(item => (
                        <div key={item} className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-[#FF3B30] shrink-0" />
                            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">{item}</span>
                        </div>
                    ))}
                    <div className="pt-6 border-t border-neutral-800">
                        <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest">
                            All actions are logged and audited
                        </p>
                    </div>
                </div>
            </div>

            {/* Right — login form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                {/* Mobile logo */}
                <div className="flex items-center gap-3 mb-10 lg:hidden">
                    <div className="w-8 h-8 bg-black border-2 border-black flex items-center justify-center">
                        <span className="text-white font-black text-xs">P4</span>
                    </div>
                    <span className="font-black text-[11px] uppercase tracking-[0.3em] text-black">
                        Admin Console
                    </span>
                </div>

                <div className="w-full max-w-sm">
                    {/* Heading */}
                    <div className="mb-10">
                        <h2 className="text-2xl font-black text-black uppercase tracking-tight leading-none mb-3">
                            Sign In
                        </h2>
                        <p className="text-xs font-mono text-neutral-500">
                            Restricted access. Unauthorized entry is prohibited.
                        </p>
                    </div>

                    {/* Form card — neo-brutalist: 2px border, no radius, no shadow */}
                    <div className="border-2 border-black bg-white p-8">
                        <Suspense>
                            <AdminLoginForm />
                        </Suspense>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                            zeshan@p402.io
                        </span>
                        <a
                            href="/dashboard"
                            className="text-[10px] font-mono text-neutral-400 hover:text-black transition-colors uppercase tracking-widest"
                        >
                            ← App
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
