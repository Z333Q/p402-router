'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AdminLoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const redirect = params.get('redirect') ?? '/admin/overview';

    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res  = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Login failed'); return; }
            if (data.requiresTOTP) { setError('TOTP required — contact support.'); return; }
            router.push(redirect);
            router.refresh();
        } catch {
            setError('Network error — please try again');
        } finally {
            setLoading(false);
        }
    }

    // Input style: white bg + black text — overrides browser autofill on all engines
    const inputStyle: React.CSSProperties = {
        WebkitTextFillColor: '#000000',
        caretColor: '#000000',
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-0">
            {/* Email */}
            <div className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-black mb-2">
                    Email Address
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="zeshan@p402.io"
                    style={inputStyle}
                    className="w-full h-12 px-4 bg-white border-2 border-black text-black font-mono text-sm focus:outline-none focus:ring-0 focus:border-black placeholder:text-neutral-400"
                />
            </div>

            {/* Password */}
            <div className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-black mb-2">
                    Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    style={inputStyle}
                    className="w-full h-12 px-4 bg-white border-2 border-black text-black font-mono text-sm focus:outline-none focus:ring-0 focus:border-black placeholder:text-neutral-400"
                />
            </div>

            {/* Error */}
            {error && (
                <div className="border-2 border-black bg-[#FF3B30] px-4 py-3 mb-6">
                    <p className="text-xs font-black text-white uppercase tracking-wider">{error}</p>
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="h-12 bg-black text-white font-black text-xs uppercase tracking-[0.2em] border-2 border-black hover:bg-[#FF3B30] hover:border-[#FF3B30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Authenticating...' : 'Sign In →'}
            </button>
        </form>
    );
}
