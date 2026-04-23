/**
 * GET  /api/partner/links  — list partner's links with click counts
 * POST /api/partner/links  — create a new referral link
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerAccess, isAuthError } from '@/lib/partner/auth';
import {
    getPartnerLinks,
    getPartnerById,
    createPartnerLink,
    linkCodeExists,
} from '@/lib/partner/queries';
import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// GET — list links
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
    const auth = await requirePartnerAccess(req);
    if (isAuthError(auth)) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const links = await getPartnerLinks(auth.partnerId);
    return NextResponse.json({ links });
}

// ---------------------------------------------------------------------------
// POST — create link
// ---------------------------------------------------------------------------

interface CreateLinkBody {
    label?: string;
    destination_path?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    default_subid?: string;
    custom_code?: string;  // optional — caller can specify exact code
}

export async function POST(req: NextRequest) {
    const auth = await requirePartnerAccess(req);
    if (isAuthError(auth)) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.permissions.includes('partner.links.write')) {
        return NextResponse.json({ error: 'Forbidden: requires partner.links.write' }, { status: 403 });
    }

    let body: CreateLinkBody;
    try {
        body = await req.json() as CreateLinkBody;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate destination path
    const destination = body.destination_path?.trim() || '/';
    if (!destination.startsWith('/') && !destination.startsWith('http')) {
        return NextResponse.json(
            { error: 'destination_path must start with / or be a full URL' },
            { status: 400 }
        );
    }

    // Build the link code
    let code: string;

    if (body.custom_code?.trim()) {
        // Sanitize: lowercase alphanumeric + hyphens only
        const sanitized = body.custom_code.trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 64);

        if (sanitized.length < 3) {
            return NextResponse.json({ error: 'custom_code too short (min 3 chars)' }, { status: 400 });
        }

        const exists = await linkCodeExists(sanitized);
        if (exists) {
            return NextResponse.json({ error: 'This link code is already taken' }, { status: 409 });
        }
        code = sanitized;
    } else {
        // Auto-generate: {referralCode}-{6-char hex suffix}
        const partner = await getPartnerById(auth.partnerId);
        if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

        const base = partner.referral_code;
        // Attempt up to 5 times to find a unique code (collision extremely unlikely)
        let generated = '';
        for (let i = 0; i < 5; i++) {
            const suffix = randomBytes(3).toString('hex');
            const candidate = `${base}-${suffix}`;
            const taken = await linkCodeExists(candidate);
            if (!taken) { generated = candidate; break; }
        }
        if (!generated) {
            return NextResponse.json({ error: 'Failed to generate unique link code' }, { status: 500 });
        }
        code = generated;
    }

    const link = await createPartnerLink({
        partnerId:       auth.partnerId,
        code,
        destinationPath: destination,
        label:           body.label?.trim() || undefined,
        utmSource:       body.utm_source?.trim() || undefined,
        utmMedium:       body.utm_medium?.trim() || undefined,
        utmCampaign:     body.utm_campaign?.trim() || undefined,
        defaultSubid:    body.default_subid?.trim() || undefined,
    });

    return NextResponse.json({ link: { ...link, url: buildLinkUrl(code) } }, { status: 201 });
}

// ---------------------------------------------------------------------------

function buildLinkUrl(code: string): string {
    const base = process.env.NEXTAUTH_URL ?? 'https://p402.io';
    return `${base}/r/${code}`;
}
