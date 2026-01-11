import Link from 'next/link'

export const metadata = {
    title: 'Terms of Service | P402',
    description: 'P402 Terms of Service'
}

export default function TermsPage() {
    return (
        <div style={{ minHeight: '100vh' }}>
            <header style={{ borderBottom: '2px solid #000', background: '#fff', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, textTransform: 'uppercase', textDecoration: 'none', color: '#000' }}>
                    <div style={{ width: 16, height: 16, background: '#B6FF2E', border: '2px solid #000' }} />
                    P402
                </Link>
            </header>

            <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
                <h1 className="title-1" style={{ marginBottom: 8 }}>Terms of Service</h1>
                <p className="mono-id" style={{ marginBottom: 48 }}>Last updated: December 2024</p>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">1. Acceptance of Terms</h2>
                    <p style={{ color: '#4A4A4A' }}>
                        By accessing or using P402 (&quot;Service&quot;), you agree to be bound by these Terms of Service.
                    </p>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">2. Description of Service</h2>
                    <p style={{ color: '#4A4A4A' }}>
                        P402 provides payment routing infrastructure for HTTP 402 payments using blockchain-based stablecoins (USDC, USDT).
                    </p>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">3. User Responsibilities</h2>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <li className="card" style={{ padding: 12 }}>You are responsible for securing your wallet and private keys.</li>
                        <li className="card" style={{ padding: 12 }}>You must comply with all applicable laws regarding cryptocurrency transactions.</li>
                        <li className="card" style={{ padding: 12, background: '#FEE2E2' }}>You must not use the Service for illegal activities.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">4. Fees</h2>
                    <div className="card" style={{ background: '#B6FF2E' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>1%</div>
                        <div style={{ fontWeight: 700 }}>Fee on settled transactions</div>
                        <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Fees are deducted automatically during settlement.</p>
                    </div>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">5. Limitation of Liability</h2>
                    <p style={{ color: '#4A4A4A' }}>
                        P402 is provided &quot;as is&quot; without warranties. We are not liable for losses due to blockchain network issues, smart contract bugs, or third-party failures.
                    </p>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 className="title-2">6. Termination</h2>
                    <p style={{ color: '#4A4A4A' }}>
                        We reserve the right to suspend or terminate access to the Service for violations of these Terms.
                    </p>
                </section>

                <section>
                    <h2 className="title-2">7. Contact</h2>
                    <p style={{ color: '#4A4A4A' }}>
                        Questions: <a href="mailto:dev@p402.io" style={{ color: '#000', fontWeight: 700 }}>dev@p402.io</a>
                    </p>
                </section>
            </main>
        </div>
    )
}
