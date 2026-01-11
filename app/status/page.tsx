export default function StatusPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{ borderBottom: '2px solid #000', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <a href="/" style={{ fontSize: '1.25rem', fontWeight: 800, textDecoration: 'none', color: '#000', textTransform: 'uppercase' }}>
                    P402 Status
                </a>
            </header>
            <main style={{ flex: 1, padding: 48, maxWidth: 800, margin: '0 auto', width: '100%' }}>
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
