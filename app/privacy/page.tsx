import Link from 'next/link'

export const metadata = {
    title: 'Privacy Policy | P402',
    description: 'P402 Privacy Policy - How we handle your data'
}

export default function PrivacyPage() {
    return (
        <div style={{ minHeight: '100vh' }}>
            <header style={{ borderBottom: '2px solid #000', background: '#fff', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, textTransform: 'uppercase', textDecoration: 'none', color: '#000' }}>
                    <div style={{ width: 16, height: 16, background: '#B6FF2E', border: '2px solid #000' }} />
                    P402
                </Link>
            </header>

            <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
                <h1 className="title-1" style={{ marginBottom: 8 }}>Privacy Policy</h1>
                <p className="mono-id" style={{ marginBottom: 48 }}>Last updated: January 21, 2026</p>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">1. Information We Collect</h2>
                    <p style={{ color: '#4A4A4A', marginBottom: 16 }}>P402 collects minimal data necessary to provide payment routing services:</p>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <li className="card" style={{ padding: 12 }}><strong>Transaction Data</strong>: Blockchain transaction hashes, payment amounts, asset types.</li>
                        <li className="card" style={{ padding: 12 }}><strong>Authentication Data</strong>: Email when you sign in via Google OAuth (Dashboard only).</li>
                        <li className="card" style={{ padding: 12, background: '#E9FFD0' }}><strong>No Wallet Tracking</strong>: We do not track wallet balances or activity beyond what you submit.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">2. How We Use Your Data</h2>
                    <ul style={{ color: '#4A4A4A', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <li>To verify and settle payments you submit.</li>
                        <li>To enforce policies (budgets, rate limits) you configure.</li>
                        <li>To provide analytics in your Dashboard.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">3. Data Retention</h2>
                    <p style={{ color: '#4A4A4A' }}>
                        Transaction records are retained for 90 days. Request deletion: <code className="code-inline">dev@p402.io</code>
                    </p>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">4. Your Rights (GDPR)</h2>
                    <div className="card" style={{ background: '#F5F5F5' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            <div className="badge badge-neutral">Access your data</div>
                            <div className="badge badge-neutral">Request correction</div>
                            <div className="badge badge-neutral">Request deletion</div>
                            <div className="badge badge-neutral">Data portability</div>
                        </div>
                        <p style={{ marginTop: 16, fontSize: '0.875rem', color: '#4A4A4A' }}>Contact: <code className="code-inline">dev@p402.io</code></p>
                    </div>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">5. Cookies</h2>
                    <p style={{ color: '#4A4A4A' }}>
                        We use essential cookies only for authentication sessions. No tracking cookies or third-party analytics.
                    </p>
                </section>

                <section>
                    <h2 className="title-2">6. Contact</h2>
                    <p style={{ color: '#4A4A4A' }}>
                        Privacy inquiries: <a href="mailto:dev@p402.io" style={{ color: '#000', fontWeight: 700 }}>dev@p402.io</a>
                    </p>
                </section>
            </main>
        </div>
    )
}
