import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { randomUUID } from 'crypto';

// GET — List quarantined resources
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'quarantined';
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const res = await pool.query(
            `SELECT q.*, f.name as facilitator_name
             FROM bazaar_quarantine q
             LEFT JOIN facilitators f ON f.facilitator_id = q.source_facilitator_id
             WHERE q.status = $1
             ORDER BY q.created_at DESC
             LIMIT $2 OFFSET $3`,
            [status, limit, offset]
        );

        const countRes = await pool.query(
            'SELECT COUNT(*) FROM bazaar_quarantine WHERE status = $1',
            [status]
        );

        return NextResponse.json({
            quarantined: res.rows,
            total: parseInt(countRes.rows[0]?.count || '0', 10),
            limit,
            offset,
        });
    } catch (err: any) {
        console.error('[Quarantine API] GET error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

const ReviewSchema = z.object({
    quarantineId: z.string().uuid(),
    action: z.enum(['approve', 'reject']),
    reviewedBy: z.string().optional(),
});

// POST — Approve or reject a quarantined resource
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = ReviewSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
        }

        const { quarantineId, action, reviewedBy } = parsed.data;

        // 1. Fetch the quarantined entry
        const qRes = await pool.query(
            'SELECT * FROM bazaar_quarantine WHERE id = $1 AND status = $2',
            [quarantineId, 'quarantined']
        );

        if (qRes.rows.length === 0) {
            return NextResponse.json({ error: 'Quarantine entry not found or already reviewed' }, { status: 404 });
        }

        const entry = qRes.rows[0];

        if (action === 'approve') {
            // Move resource from quarantine to bazaar_resources
            const resourceData = entry.resource_data;
            const scanResult = entry.scan_result;

            await pool.query(
                `INSERT INTO bazaar_resources (
                    resource_id, source_facilitator_id, canonical_route_id, provider_base_url,
                    route_path, methods, title, pricing,
                    safety_score, safety_scanned_at, safety_flags,
                    last_crawled_at, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, NOW(), NOW())
                 ON CONFLICT (source_facilitator_id, canonical_route_id)
                 DO UPDATE SET
                    provider_base_url = EXCLUDED.provider_base_url,
                    title = EXCLUDED.title,
                    pricing = EXCLUDED.pricing,
                    safety_score = EXCLUDED.safety_score,
                    safety_scanned_at = EXCLUDED.safety_scanned_at,
                    safety_flags = EXCLUDED.safety_flags,
                    last_crawled_at = NOW(),
                    updated_at = NOW()`,
                [
                    resourceData.resourceId || randomUUID(),
                    entry.source_facilitator_id,
                    entry.canonical_route_id,
                    resourceData.providerBaseUrl || '',
                    resourceData.routePath || '/',
                    resourceData.methods || ['POST'],
                    resourceData.title || 'Unknown',
                    JSON.stringify(resourceData.pricing || {}),
                    scanResult.riskScore || 0,
                    scanResult.flags || [],
                ]
            );
        }

        // 2. Update quarantine status
        await pool.query(
            `UPDATE bazaar_quarantine
             SET status = $1, reviewed_by = $2, reviewed_at = NOW()
             WHERE id = $3`,
            [action === 'approve' ? 'approved' : 'rejected', reviewedBy || 'admin', quarantineId]
        );

        return NextResponse.json({
            quarantineId,
            action,
            status: action === 'approve' ? 'approved' : 'rejected',
        });
    } catch (err: any) {
        console.error('[Quarantine API] POST error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
