'use client'
import { useState } from 'react'

export function AccessForm() {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState('')

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData)

        try {
            const res = await fetch('/api/v1/access-request', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            })
            if (res.ok) {
                setDone(true)
            } else {
                setError('Something went wrong. Please try again.')
            }
        } catch (err) {
            setError('Network error.')
        } finally {
            setLoading(false)
        }
    }

    if (done) {
        return (
            <div className="card card-dark" style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: '2rem', marginBottom: 16 }}>🎉</div>
                <h3 className="title-2" style={{ color: '#fff', marginBottom: 12 }}>Request Received</h3>
                <p style={{ color: '#A8A8A8' }}>We'll be in touch shortly with your API keys.</p>
            </div>
        )
    }

    return (
        <div className="card card-dark">
            <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Request Access</div>
            <div style={{ fontSize: '0.875rem', color: '#7A7A7A', marginBottom: 24 }}>One flow. Policies and traces included.</div>

            <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                    <label className="label" style={{ color: '#7A7A7A' }}>Work Email</label>
                    <input name="email" required type="email" className="input" placeholder="name@company.com" style={{ background: '#2B2B2B', color: '#F5F5F5', borderColor: '#4A4A4A' }} />
                </div>
                <div>
                    <label className="label" style={{ color: '#7A7A7A' }}>Company</label>
                    <input name="company" className="input" placeholder="Company" style={{ background: '#2B2B2B', color: '#F5F5F5', borderColor: '#4A4A4A' }} />
                </div>
                <div>
                    <label className="label" style={{ color: '#7A7A7A' }}>Role</label>
                    <input name="role" className="input" placeholder="Engineering, Product" style={{ background: '#2B2B2B', color: '#F5F5F5', borderColor: '#4A4A4A' }} />
                </div>
                <div>
                    <label className="label" style={{ color: '#7A7A7A' }}>RPD</label>
                    <input name="rpd" className="input" placeholder="1000000" style={{ background: '#2B2B2B', color: '#F5F5F5', borderColor: '#4A4A4A' }} />
                </div>

                {error && (
                    <div style={{ gridColumn: 'span 2', color: '#FF4444', fontSize: '0.875rem' }}>{error}</div>
                )}

                <div style={{ gridColumn: 'span 2' }}>
                    <button disabled={loading} type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        {loading ? 'Sending...' : 'Request Access'}
                    </button>
                </div>
            </form>
            <div style={{ fontSize: '0.75rem', color: '#7A7A7A', textAlign: 'center', marginTop: 12 }}>
                We reply with keys, a Playground link, and a first routed request checklist.
            </div>
        </div>
    )
}
