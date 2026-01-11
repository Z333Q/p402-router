'use client'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Lazy load the heavy wallet component
const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
    {
        ssr: false,
        loading: () => (
            <button className="btn btn-secondary" disabled>Loading wallet...</button>
        )
    }
)

export default function LoginPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5' }}>
            <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 48, height: 48,
                        background: '#B6FF2E',
                        border: '2px solid #000',
                        margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{ width: 16, height: 16, background: '#000' }} />
                    </div>
                    <h1 style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '1.25rem' }}>Sign in to P402</h1>
                    <p style={{ color: '#7A7A7A', fontSize: '0.875rem', marginTop: 4 }}>Enterprise Routing Console</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        <img src="https://authjs.dev/img/providers/google.svg" style={{ width: 20, height: 20 }} alt="Google" />
                        Continue with Google
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
                        <div style={{ flex: 1, height: 2, background: '#E6E6E6' }} />
                        <span style={{ fontSize: '0.75rem', color: '#7A7A7A', textTransform: 'uppercase' }}>Or</span>
                        <div style={{ flex: 1, height: 2, background: '#E6E6E6' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <ConnectButton label="Connect Wallet" />
                    </div>
                </div>

                <div style={{ marginTop: 24, fontSize: '0.75rem', color: '#7A7A7A', textAlign: 'center' }}>
                    By continuing, you agree to our{' '}
                    <Link href="/terms" style={{ textDecoration: 'underline', color: '#7A7A7A' }}>Terms</Link> and{' '}
                    <Link href="/privacy" style={{ textDecoration: 'underline', color: '#7A7A7A' }}>Privacy Policy</Link>.
                </div>
            </div>
        </div>
    )
}
