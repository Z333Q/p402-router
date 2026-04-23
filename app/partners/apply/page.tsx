'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { Suspense } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PartnerTypeInterest = 'affiliate' | 'agency' | 'enterprise_referrer'

interface FormData {
    name: string
    email: string
    website_url: string
    channel_type: string
    audience_size: string
    audience_description: string
    partner_type_interest: PartnerTypeInterest
    why_p402: string
    promotion_plan: string
}

// ---------------------------------------------------------------------------
// Field components
// ---------------------------------------------------------------------------

function Field({
    label,
    required,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-600">
                {label}{required && <span className="text-error ml-1">*</span>}
            </label>
            {children}
            {hint && <p className="text-[11px] text-neutral-400">{hint}</p>}
        </div>
    )
}

const inputClass = "w-full px-3 py-2.5 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-white"
const textareaClass = `${inputClass} resize-none`
const selectClass = "w-full px-3 py-2.5 border-2 border-black font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

function SuccessState({ email }: { email: string }) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className="max-w-md w-full border-2 border-black bg-white p-10 text-center">
                <div className="w-14 h-14 bg-primary border-2 border-black flex items-center justify-center mx-auto mb-6">
                    <Check size={24} strokeWidth={3} />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-3">
                    Application Submitted
                </h1>
                <p className="text-sm text-neutral-600 leading-relaxed mb-2">
                    We&apos;ll review your application and follow up at{' '}
                    <span className="font-bold text-black">{email}</span> within 2–5 business days.
                </p>
                <p className="text-xs text-neutral-400 mb-8">
                    Applications are reviewed manually. We evaluate channel quality, audience fit,
                    and alignment with the P402 ICP before approving.
                </p>
                <div className="flex flex-col gap-3">
                    <Link href="/partners" className="btn btn-secondary w-full text-center">
                        ← Back to Partner Program
                    </Link>
                    <Link href="/" className="text-[11px] font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-widest">
                        Go to P402.io
                    </Link>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function ApplyForm() {
    const searchParams = useSearchParams()
    const typeParam = searchParams.get('type') as PartnerTypeInterest | null

    const [form, setForm] = useState<FormData>({
        name: '',
        email: '',
        website_url: '',
        channel_type: '',
        audience_size: '',
        audience_description: '',
        partner_type_interest: typeParam ?? 'affiliate',
        why_p402: '',
        promotion_plan: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const set = (field: keyof FormData) => (value: string) =>
        setForm(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!form.name.trim() || !form.email.trim()) {
            setError('Name and email are required.')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/partner/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    email: form.email.trim().toLowerCase(),
                    name: form.name.trim(),
                }),
            })

            const data = await res.json() as { error?: string; status?: string }

            if (res.status === 409) {
                setError(
                    data.status === 'approved'
                        ? 'An account with this email is already an approved partner. Sign in to access your dashboard.'
                        : 'An application for this email is already under review. We\'ll be in touch soon.'
                )
                return
            }

            if (!res.ok) {
                setError(data.error ?? 'Submission failed. Please try again.')
                return
            }

            setSuccess(true)
        } catch {
            setError('Network error. Please check your connection and try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (success) return <SuccessState email={form.email} />

    return (
        <div className="min-h-screen bg-neutral-50 py-12 px-4">
            <div className="max-w-xl mx-auto">
                {/* Back */}
                <Link
                    href="/partners"
                    className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors mb-8"
                >
                    <ArrowLeft size={12} />
                    Partner Program
                </Link>

                <div className="border-2 border-black bg-white p-8 lg:p-10">
                    <div className="mb-8">
                        <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-primary text-black border border-black mb-4">
                            Apply
                        </span>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-2">
                            Partner Program Application
                        </h1>
                        <p className="text-sm text-neutral-500">
                            Applications are reviewed manually and typically take 2–5 business days.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Partner type */}
                        <Field label="I want to apply as a" required>
                            <select
                                className={selectClass}
                                value={form.partner_type_interest}
                                onChange={e => set('partner_type_interest')(e.target.value)}
                            >
                                <option value="affiliate">Developer Affiliate (Track A)</option>
                                <option value="agency">Integration Partner / Agency (Track B)</option>
                                <option value="enterprise_referrer">Enterprise Referral Partner (Track C)</option>
                            </select>
                        </Field>

                        {/* Name */}
                        <Field label="Your Name" required>
                            <input
                                type="text"
                                className={inputClass}
                                placeholder="Jane Smith"
                                value={form.name}
                                onChange={e => set('name')(e.target.value)}
                                autoComplete="name"
                            />
                        </Field>

                        {/* Email */}
                        <Field label="Email" required hint="We'll use this to create your partner account if approved.">
                            <input
                                type="email"
                                className={inputClass}
                                placeholder="jane@example.com"
                                value={form.email}
                                onChange={e => set('email')(e.target.value)}
                                autoComplete="email"
                            />
                        </Field>

                        {/* Website */}
                        <Field label="Website or Profile URL" hint="Your blog, YouTube channel, agency website, LinkedIn, etc.">
                            <input
                                type="url"
                                className={inputClass}
                                placeholder="https://yourblog.com"
                                value={form.website_url}
                                onChange={e => set('website_url')(e.target.value)}
                            />
                        </Field>

                        {/* Channel type */}
                        <Field label="Primary Channel">
                            <select
                                className={selectClass}
                                value={form.channel_type}
                                onChange={e => set('channel_type')(e.target.value)}
                            >
                                <option value="">Select a channel type</option>
                                <option value="blog">Blog / Newsletter</option>
                                <option value="youtube">YouTube</option>
                                <option value="x_twitter">X / Twitter</option>
                                <option value="podcast">Podcast</option>
                                <option value="agency">Agency</option>
                                <option value="consultant">Consultant</option>
                                <option value="developer_community">Developer Community</option>
                                <option value="other">Other</option>
                            </select>
                        </Field>

                        {/* Audience size */}
                        <Field label="Approximate Audience Size">
                            <select
                                className={selectClass}
                                value={form.audience_size}
                                onChange={e => set('audience_size')(e.target.value)}
                            >
                                <option value="">Select audience size</option>
                                <option value="under_1k">&lt; 1,000</option>
                                <option value="1k_10k">1,000 – 10,000</option>
                                <option value="10k_100k">10,000 – 100,000</option>
                                <option value="100k_plus">100,000+</option>
                            </select>
                        </Field>

                        {/* Audience description */}
                        <Field
                            label="Describe Your Audience"
                            hint="Who follows you? What are they building?"
                        >
                            <textarea
                                className={textareaClass}
                                rows={3}
                                placeholder="Technical AI developers building agents with LLMs. Interested in cost optimization and on-chain payments."
                                value={form.audience_description}
                                onChange={e => set('audience_description')(e.target.value)}
                            />
                        </Field>

                        {/* Why P402 */}
                        <Field label="Why P402?" required>
                            <textarea
                                className={textareaClass}
                                rows={3}
                                placeholder="Tell us why you want to promote P402 and why your audience would benefit from it."
                                value={form.why_p402}
                                onChange={e => set('why_p402')(e.target.value)}
                            />
                        </Field>

                        {/* Promotion plan */}
                        <Field label="How Will You Promote P402?">
                            <textarea
                                className={textareaClass}
                                rows={3}
                                placeholder="Tutorial series, newsletter feature, integration guide, client recommendations, etc."
                                value={form.promotion_plan}
                                onChange={e => set('promotion_plan')(e.target.value)}
                            />
                        </Field>

                        {/* Error */}
                        {error && (
                            <div className="border-2 border-error bg-error/5 px-4 py-3">
                                <p className="text-sm font-bold text-error">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {submitting ? 'Submitting...' : 'Submit Application'}
                                {!submitting && <ArrowRight size={14} />}
                            </button>
                            <p className="text-[11px] text-neutral-400 text-center mt-3">
                                By applying, you agree to the{' '}
                                <Link href="/partners/terms" className="text-black font-bold hover:text-primary transition-colors">
                                    Partner Program Terms
                                </Link>
                                . No commission is earned until activation events occur.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function ApplyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="font-mono text-xs text-neutral-400 uppercase tracking-widest">Loading...</div></div>}>
            <ApplyForm />
        </Suspense>
    )
}
