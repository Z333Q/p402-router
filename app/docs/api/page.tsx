'use client';
import { TopNav } from "@/components/TopNav";
import { Card, CodeBox } from '../../dashboard/_components/ui'

export default function ApiDocsPage() {
    return (
        <div className="min-h-screen">
            <TopNav />
            <main style={{ display: 'grid', gridTemplateColumns: '250px 1fr', height: 'calc(100vh - 64px)' }}>
                {/* Sidebar */}
                <div style={{ borderRight: '2px solid #000', padding: 24, overflowY: 'auto' }}>
                    <div style={{ fontWeight: 800, marginBottom: 16, textTransform: 'uppercase' }}>Resources</div>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ marginBottom: 8 }}><a href="#plan" style={{ color: '#000', textDecoration: 'none', fontWeight: 700 }}>POST /plan</a></li>
                        <li style={{ marginBottom: 8 }}><a href="#settle" style={{ color: '#000', textDecoration: 'none', fontWeight: 700 }}>POST /settle</a></li>
                    </ul>
                </div>

                {/* Content */}
                <div style={{ padding: 48, overflowY: 'auto' }}>
                    <div style={{ maxWidth: 800 }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>Router API Reference</h1>
                        <p style={{ fontSize: '1.125rem', marginBottom: 48, lineHeight: 1.5 }}>
                            The P402 Router API enables you to plan, verify, and settle payments.
                            Uses standard <a href="https://docs.cdp.coinbase.com/x402" style={{ color: '#000', fontWeight: 700 }}>x402</a> flows.
                        </p>

                        <section id="plan" style={{ marginBottom: 64 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <span style={{ background: '#B6FF2E', border: '2px solid #000', padding: '4px 8px', fontWeight: 800 }}>POST</span>
                                <code style={{ fontSize: '1.25rem', fontWeight: 700 }}>/api/v1/router/plan</code>
                            </div>
                            <p style={{ marginBottom: 24 }}>Get a payment decision and candidate facilitators based on policy.</p>

                            <Card title="Request Body">
                                <CodeBox title="JSON Request" value={{
                                    policyId: "pol_def",
                                    routeId: "rt_weather",
                                    payment: {
                                        network: "eip155:8453",
                                        scheme: "exact",
                                        amount: "0.02",
                                        asset: "USDC"
                                    },
                                    buyer: { buyerId: "usr_123" }
                                }} />
                            </Card>

                            <div style={{ height: 24 }} />

                            <Card title="Response (200 OK)">
                                <CodeBox title="JSON Response" value={{
                                    decisionId: "550e8400-...",
                                    allow: true,
                                    policy: {
                                        policyId: "pol_def",
                                        allow: true,
                                        reasons: ["Budget ok"],
                                        schemaVersion: "1.0.0",
                                        decisionTrace: { decisionId: "...", steps: [] }
                                    },
                                    candidates: [
                                        { facilitatorId: "fac_coinbase", score: 100 }
                                    ]
                                }} />
                            </Card>
                        </section>

                        <section id="settle" style={{ marginBottom: 64 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <span style={{ background: '#B6FF2E', border: '2px solid #000', padding: '4px 8px', fontWeight: 800 }}>POST</span>
                                <code style={{ fontSize: '1.25rem', fontWeight: 700 }}>/api/v1/router/settle</code>
                            </div>
                            <p style={{ marginBottom: 24 }}>Verify on-chain settlement and record the event.</p>

                            <Card title="Request Body">
                                <CodeBox title="JSON Request" value={{
                                    txHash: "0x123...",
                                    amount: "0.02",
                                    asset: "USDC",
                                    tenantId: "..."
                                }} />
                            </Card>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    )
}
