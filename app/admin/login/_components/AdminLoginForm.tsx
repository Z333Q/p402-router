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
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Login failed');
                return;
            }

            if (data.requiresTOTP) {
                setError('TOTP is enabled — contact support to disable or use recovery codes.');
                return;
            }

            router.push(redirect);
            router.refresh();
        } catch {
            setError('Network error — please try again');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                    Email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full h-12 px-4 bg-neutral-900 border-2 border-neutral-700 text-white font-mono text-sm focus:outline-none focus:border-[#FF3B30] transition-colors"
                    placeholder="admin@p402.io"
                />
            </div>

            <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                    Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full h-12 px-4 bg-neutral-900 border-2 border-neutral-700 text-white font-mono text-sm focus:outline-none focus:border-[#FF3B30] transition-colors"
                    placeholder="••••••••••••"
                />
            </div>

            {error && (
                <div className="border-2 border-[#FF3B30] bg-[#FF3B30]/10 px-4 py-3">
                    <p className="text-xs font-mono text-[#FF3B30]">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="h-12 bg-[#FF3B30] text-white font-black text-xs uppercase tracking-widest border-2 border-[#FF3B30] hover:bg-white hover:text-[#FF3B30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Authenticating...' : 'Sign In to Admin'}
            </button>
        </form>
    );
}
