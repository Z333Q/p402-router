'use client'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, EmptyState } from '../dashboard/_components/ui'
import Link from 'next/link'

type Summary = {
    totalTenants: number
    totalEvents: number
    settledEvents: number
    totalVolumeUsd: number
    totalFacilitators: number
    successRate: number
}

type Facilitator = {
    facilitator_id: string
    name: string
    endpoint: string
    type: string
    health_status: string
    p95_verify_ms: number
    last_checked_at: string
    tenant_name: string | null
}

export default function AdminPage() {
    const [summary, setSummary] = useState<Summary | null>(null)
    const [facilitators, setFacilitators] = useState<Facilitator[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    async function load(hardRefresh = false) {
        setLoading(hardRefresh ? true : loading)
        setError('')
        try {
            if (hardRefresh) {
                await fetch('/api/admin/refresh', { method: 'POST' })
            }

            const [statsRes, healthRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/health')
            ])


            if (!statsRes.ok || !healthRes.ok) {
                if (statsRes.status === 401) throw new Error("Unauthorized: Admin access required.")
                throw new Error("Failed to fetch admin data")
            }

            const statsData = await statsRes.json()
            const healthData = await healthRes.json()

            setSummary(statsData.summary)
            setFacilitators(healthData.facilitators)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    if (error) {
        return (
            <div style={{ padding: 40 }}>
                <Card title="Access Denied">
                    <p style={{ color: '#EF4444', fontWeight: 700 }}>{error}</p>
                    <div style={{ marginTop: 16 }}>
                        <Link href="/dashboard">
                            <Button variant="secondary">Back to Dashboard</Button>
                        </Link>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div style={{ padding: '24px 40px' }}>
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="title-1">Platform Admin</h1>
                    <p style={{ color: '#7A7A7A', marginTop: 8 }}>Global Visibility & System Governance</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Button onClick={() => load(true)} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Global Refresh'}
                    </Button>

                    <Link href="/dashboard">
                        <Button variant="secondary">Tenant View</Button>
                    </Link>
                </div>
            </div>

            {loading && !summary ? (
                <div className="loading-bar" />
            ) : (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                        <AdminStatCard label="Total Tenants" value={summary?.totalTenants.toString() || '0'} />
                        <AdminStatCard label="Global Volume" value={`$${summary?.totalVolumeUsd.toFixed(2) || '0.00'}`} />
                        <AdminStatCard label="Total Events" value={summary?.totalEvents.toString() || '0'} />
                        <AdminStatCard label="Avg. Success" value={`${(summary?.successRate || 0 * 100).toFixed(1)}%`} status={summary && summary.successRate > 0.9 ? 'success' : 'warn'} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                        <Card title="Global Facilitator Health">
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#F5F5F5', borderBottom: '2px solid #000' }}>
                                        <tr>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Facilitator</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Type</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Tenant</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Health</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Lat (P95)</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Last Check</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {facilitators.map(f => (
                                            <tr key={f.facilitator_id} style={{ borderBottom: '1px solid #E6E6E6' }}>
                                                <td style={{ padding: 12 }}>
                                                    <div style={{ fontWeight: 700 }}>{f.name}</div>
                                                    <div className="mono-id" style={{ fontSize: '0.75rem' }}>{f.endpoint}</div>
                                                </td>
                                                <td style={{ padding: 12 }}>
                                                    <Badge tone="neutral">{f.type.toUpperCase()}</Badge>
                                                </td>
                                                <td style={{ padding: 12 }}>
                                                    {f.tenant_name ? <span style={{ fontWeight: 600 }}>{f.tenant_name}</span> : <Badge tone="neutral">GLOBAL</Badge>}
                                                </td>
                                                <td style={{ padding: 12 }}>
                                                    {f.health_status === 'healthy' && <Badge tone="ok">HEALTHY</Badge>}
                                                    {f.health_status === 'degraded' && <Badge tone="warn">DEGRADED</Badge>}
                                                    {f.health_status === 'down' && <Badge tone="bad">DOWN</Badge>}
                                                    {!f.health_status && <Badge tone="neutral">UNKNOWN</Badge>}
                                                </td>
                                                <td style={{ padding: 12 }} className="mono-id">
                                                    {f.p95_verify_ms > 0 ? `${f.p95_verify_ms}ms` : '-'}
                                                </td>
                                                <td style={{ padding: 12, fontSize: '0.75rem', color: '#7A7A7A' }}>
                                                    {f.last_checked_at ? new Date(f.last_checked_at).toLocaleString() : 'Never'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}

function AdminStatCard({ label, value, status }: { label: string; value: string; status?: 'success' | 'warn' | 'error' }) {
    const bg = status === 'success' ? '#B6FF2E' : status === 'warn' ? '#FFD700' : status === 'error' ? '#FF4500' : '#fff'
    return (
        <div className="card" style={{ background: bg, border: '2px solid #000', padding: 16 }}>
            <div className="label" style={{ color: '#000', marginBottom: 8, opacity: 0.6 }}>{label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{value}</div>
        </div>
    )
}
