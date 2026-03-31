import { Suspense } from 'react';
import { AdminLoginForm } from './_components/AdminLoginForm';

export const metadata = { title: 'Admin Login — P402', robots: 'noindex,nofollow' };

export default function AdminLoginPage() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            {/* Subtle grid background */}
            <div
                className="fixed inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#FF3B30 1px, transparent 1px), linear-gradient(90deg, #FF3B30 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="relative w-full max-w-sm">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-[#FF3B30] border-2 border-[#FF3B30] flex items-center justify-center">
                            <span className="text-white font-black text-xs">P4</span>
                        </div>
                        <span className="text-white font-black text-xs uppercase tracking-[0.3em]">
                            Admin Console
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-white leading-none tracking-tight">
                        Restricted<br />Access
                    </h1>
                    <p className="mt-3 text-xs text-neutral-500 font-mono">
                        P402 platform administration. Unauthorized access is prohibited.
                    </p>
                </div>

                {/* Login card */}
                <div className="border-2 border-neutral-800 bg-neutral-950 p-8">
                    <Suspense>
                        <AdminLoginForm />
                    </Suspense>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-700 font-mono uppercase tracking-widest">
                        All actions are logged
                    </span>
                    <a
                        href="/dashboard"
                        className="text-[10px] text-neutral-600 hover:text-neutral-400 font-mono transition-colors"
                    >
                        ← Back to app
                    </a>
                </div>
            </div>
        </div>
    );
}
