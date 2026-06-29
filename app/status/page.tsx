import type { Metadata } from 'next'
import Link from 'next/link'
import { TopNav } from '@/components/TopNav'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
    title: 'System status | P402',
    description: 'Live operational status for P402 Router, Bazaar, facilitators, and dashboard.',
    alternates: { canonical: 'https://p402.io/status' },
}

export default function StatusPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <TopNav />
            <main style={{ flex: 1, padding: 48, maxWidth: 800, margin: '0 auto', width: '100%' }}>
                <div style={{ border: '2px solid #000', background: '#B6FF2E', color: '#000', padding: 16, marginBottom: 24, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>New buyer page</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>See the privacy posture behind the live system.</div>
                    </div>
                    <Link href="/trust" style={{ border: '2px solid #000', background: '#000', color: '#B6FF2E', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 16px', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                        See Trust
                    </Link>
                </div>

                <div style={{ border: '2px solid #000', padding: 24, background: '#E9FFD0', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 16, height: 16, background: '#22C55E', borderRadius: '50%', border: '2px solid #000' }} />
                    <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>All Systems Operational</div>
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                    <StatusItem name="Router API (Global)" status="Operational" latency="45ms" />
                    <StatusItem name="Bazaar Indexer" status="Operational" latency="120ms" />
                    <StatusItem name="Facilitator: Coinbase CDP" status="Operational" latency="150ms" />
                    <StatusItem name="Dashboard" status="Operational" latency="-" />
                </div>
            </main>
            <Footer />
        </div>
    )
}

function StatusItem({ name, status, latency }: { name: string, status: string, latency: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, border: '2px solid #000', background: '#fff' }}>
            <div style={{ fontWeight: 700 }}>{name}</div>
            <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ color: '#7A7A7A' }}>{latency}</div>
                <div style={{ color: '#22C55E', fontWeight: 700, textTransform: 'uppercase' }}>{status}</div>
            </div>
        </div>
    )
}
