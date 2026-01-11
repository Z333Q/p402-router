'use client'
import { useState } from 'react'
import { Card, Button, Input, Badge } from '../../_components/ui'
import { useRouter } from 'next/navigation'

export default function NewRoutePage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        routeId: '',
        method: 'POST',
        pathPattern: '',
        title: '',
        description: '',
        tags: ''
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setError('')

        try {
            const res = await fetch('/api/v1/routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    routeId: formData.routeId,
                    method: formData.method,
                    pathPattern: formData.pathPattern,
                    bazaarMetadata: {
                        title: formData.title,
                        description: formData.description,
                        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
                    }
                })
            })

            if (res.ok) {
                router.push('/dashboard')
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to create route')
            }
        } catch (err) {
            setError('Network error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div>
            <div style={{ marginBottom: 32 }}>
                <h1 className="title-1">Publish Route</h1>
                <p style={{ color: '#7A7A7A', marginTop: 8 }}>
                    Register a new paid endpoint for Bazaar discovery
                </p>
            </div>

            <Card title="Route Configuration">
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label className="label">Route ID</label>
                            <input
                                className="input"
                                required
                                value={formData.routeId}
                                onChange={e => setFormData({ ...formData, routeId: e.target.value })}
                                placeholder="my-api-route"
                            />
                        </div>
                        <div>
                            <label className="label">Method</label>
                            <select
                                className="input"
                                value={formData.method}
                                onChange={e => setFormData({ ...formData, method: e.target.value })}
                            >
                                <option>GET</option>
                                <option>POST</option>
                                <option>PUT</option>
                                <option>DELETE</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Path Pattern</label>
                        <input
                            className="input"
                            required
                            value={formData.pathPattern}
                            onChange={e => setFormData({ ...formData, pathPattern: e.target.value })}
                            placeholder="/api/v1/resource"
                        />
                    </div>

                    <div>
                        <label className="label">Title</label>
                        <input
                            className="input"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="My API Service"
                        />
                    </div>

                    <div>
                        <label className="label">Description</label>
                        <textarea
                            className="input"
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what this endpoint does..."
                            style={{ minHeight: 100, resize: 'vertical' }}
                        />
                    </div>

                    <div>
                        <label className="label">Tags (comma-separated)</label>
                        <input
                            className="input"
                            value={formData.tags}
                            onChange={e => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="ai, data, analytics"
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: 16,
                            background: '#FFE6E6',
                            border: '2px solid #EF4444',
                            color: '#EF4444',
                            fontWeight: 700
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 12 }}>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Publishing...' : 'Publish Route'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
