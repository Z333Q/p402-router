/**
 * POST /api/partner/apply
 * =======================
 * Public endpoint — no auth required.
 * Accepts partner program applications and writes to partner_applications.
 *
 * Idempotency: duplicate submissions (same email, pending/reviewing/approved)
 * return a 409 with the existing application status — no duplicate rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPartnerApplication, getExistingApplication } from '@/lib/partner/queries';
import { notifyAdminNewApplication } from '@/lib/partner/notifications';

interface ApplyBody {
    name: string;
    email: string;
    website_url?: string;
    channel_type?: string;
    audience_size?: string;
    audience_description?: string;
    partner_type_interest?: string;
    why_p402?: string;
    promotion_plan?: string;
}

export async function POST(req: NextRequest) {
    let body: ApplyBody;

    try {
        body = await req.json() as ApplyBody;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate required fields
    const { name, email } = body;
    if (!name?.trim() || !email?.trim()) {
        return NextResponse.json(
            { error: 'name and email are required' },
            { status: 400 }
        );
    }

    // Basic email format check
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Idempotency — check for existing application
    try {
        const existing = await getExistingApplication(email.trim().toLowerCase());
        if (existing) {
            return NextResponse.json(
                {
                    error: 'An application for this email already exists',
                    status: existing.status,
                    application_id: existing.id,
                },
                { status: 409 }
            );
        }
    } catch {
        // partner_applications may not exist yet — let insert attempt and fail naturally
    }

    try {
        const id = await createPartnerApplication({
            email: email.trim().toLowerCase(),
            name: name.trim(),
            website_url: body.website_url?.trim() || undefined,
            channel_type: body.channel_type || undefined,
            audience_size: body.audience_size || undefined,
            audience_description: body.audience_description?.trim() || undefined,
            partner_type_interest: body.partner_type_interest || 'affiliate',
            why_p402: body.why_p402?.trim() || undefined,
            promotion_plan: body.promotion_plan?.trim() || undefined,
        });

        // Notify admin (non-blocking)
        notifyAdminNewApplication({
            applicantName: name.trim(),
            applicantEmail: email.trim().toLowerCase(),
            partnerType: body.partner_type_interest ?? 'affiliate',
            applicationId: id,
        }).catch(() => {})

        return NextResponse.json({ success: true, application_id: id }, { status: 201 });
    } catch (err) {
        console.error('[partner/apply] insert failed:', err);
        return NextResponse.json(
            { error: 'Application submission failed. Please try again.' },
            { status: 500 }
        );
    }
}
