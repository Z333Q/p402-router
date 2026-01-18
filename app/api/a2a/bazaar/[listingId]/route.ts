/**
 * P402 A2A Bazaar - Individual Listing
 * =====================================
 * Manage individual marketplace listings.
 * 
 * GET /api/a2a/bazaar/:listingId - Get listing details
 * PATCH /api/a2a/bazaar/:listingId - Update listing
 * DELETE /api/a2a/bazaar/:listingId - Remove listing
 * POST /api/a2a/bazaar/:listingId/call - Call the listed service
 * POST /api/a2a/bazaar/:listingId/review - Submit a review
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';

// =============================================================================
// GET LISTING DETAILS
// =============================================================================

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ listingId: string }> }
) {
    const { listingId } = await params;

    try {
        const result = await pool.query(`
            SELECT * FROM a2a_bazaar_listings WHERE id = $1
        `, [listingId]);

        if (result.rows.length === 0) {
            return NextResponse.json({
                error: { type: 'not_found', message: `Listing ${listingId} not found` }
            }, { status: 404 });
        }

        const row = result.rows[0];

        // Get recent reviews
        const reviewsResult = await pool.query(`
            SELECT * FROM a2a_bazaar_reviews
            WHERE listing_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [listingId]);

        const listing = {
            object: 'bazaar_listing',
            id: row.id,
            type: row.type,
            name: row.name,
            description: row.description,
            short_description: row.short_description,
            provider: {
                id: row.provider_id,
                name: row.provider_name,
                verified: row.provider_verified
            },
            agent_card_url: row.agent_card_url,
            agent_card: row.agent_card,
            capabilities: row.capabilities || [],
            skills: row.skills || [],
            tags: row.tags || [],
            pricing: row.pricing,
            accepted_payments: row.accepted_payments || [],
            wallet_address: row.wallet_address,
            stats: row.stats,
            status: row.status,
            featured: row.featured,
            reviews: reviewsResult.rows.map(r => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                reviewer_id: r.reviewer_id,
                created_at: r.created_at?.toISOString()
            })),
            created_at: row.created_at?.toISOString(),
            updated_at: row.updated_at?.toISOString(),
            published_at: row.published_at?.toISOString()
        };

        // Increment view count
        await pool.query(`
            UPDATE a2a_bazaar_listings
            SET stats = jsonb_set(
                stats,
                '{views}',
                COALESCE((stats->>'views')::int, 0)::text::jsonb + '1'::jsonb
            )
            WHERE id = $1
        `, [listingId]).catch(() => {}); // Non-critical

        return NextResponse.json(listing);

    } catch (error: any) {
        console.error('[Bazaar] Get listing error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// UPDATE LISTING
// =============================================================================

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ listingId: string }> }
) {
    const { listingId } = await params;
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        // Verify ownership
        const checkResult = await pool.query(`
            SELECT id FROM a2a_bazaar_listings 
            WHERE id = $1 AND provider_id = $2
        `, [listingId, tenantId]);

        if (checkResult.rows.length === 0) {
            return NextResponse.json({
                error: { type: 'not_found', message: 'Listing not found or not owned by you' }
            }, { status: 404 });
        }

        const body = await req.json();
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        // Allowed fields to update
        const allowedFields = [
            'name', 'description', 'short_description',
            'capabilities', 'skills', 'tags',
            'pricing', 'accepted_payments', 'wallet_address'
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
                
                if (['pricing'].includes(field)) {
                    updates.push(`${dbField} = $${paramIndex++}`);
                    values.push(JSON.stringify(body[field]));
                } else if (Array.isArray(body[field])) {
                    updates.push(`${dbField} = $${paramIndex++}`);
                    values.push(body[field]);
                } else {
                    updates.push(`${dbField} = $${paramIndex++}`);
                    values.push(body[field]);
                }
            }
        }

        if (updates.length === 0) {
            return NextResponse.json({
                error: { type: 'invalid_request', message: 'No valid fields to update' }
            }, { status: 400 });
        }

        updates.push(`updated_at = NOW()`);
        values.push(listingId);

        await pool.query(`
            UPDATE a2a_bazaar_listings
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
        `, values);

        return NextResponse.json({
            object: 'bazaar_listing',
            id: listingId,
            updated: true,
            fields_updated: Object.keys(body).filter(k => allowedFields.includes(k))
        });

    } catch (error: any) {
        console.error('[Bazaar] Update listing error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// DELETE LISTING
// =============================================================================

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ listingId: string }> }
) {
    const { listingId } = await params;
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const result = await pool.query(`
            UPDATE a2a_bazaar_listings
            SET status = 'archived', updated_at = NOW()
            WHERE id = $1 AND provider_id = $2
            RETURNING id, name
        `, [listingId, tenantId]);

        if (result.rows.length === 0) {
            return NextResponse.json({
                error: { type: 'not_found', message: 'Listing not found or not owned by you' }
            }, { status: 404 });
        }

        return NextResponse.json({
            object: 'bazaar_listing',
            id: listingId,
            archived: true,
            name: result.rows[0].name
        });

    } catch (error: any) {
        console.error('[Bazaar] Delete listing error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// CALL LISTED SERVICE
// =============================================================================

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ listingId: string }> }
) {
    const { listingId } = await params;
    const tenantId = req.headers.get('x-p402-tenant') || 'default';
    const action = req.nextUrl.searchParams.get('action');

    // Handle review submission
    if (action === 'review') {
        return submitReview(req, listingId, tenantId);
    }

    // Default: call the service
    return callService(req, listingId, tenantId);
}

async function callService(
    req: NextRequest,
    listingId: string,
    tenantId: string
): Promise<NextResponse> {
    try {
        // Get listing
        const listingResult = await pool.query(`
            SELECT * FROM a2a_bazaar_listings 
            WHERE id = $1 AND status = 'active'
        `, [listingId]);

        if (listingResult.rows.length === 0) {
            return NextResponse.json({
                error: { type: 'not_found', message: 'Listing not found or not active' }
            }, { status: 404 });
        }

        const listing = listingResult.rows[0];
        const agentCard = listing.agent_card;

        if (!agentCard?.endpoints?.a2a?.jsonrpc && !agentCard?.url) {
            return NextResponse.json({
                error: { type: 'service_unavailable', message: 'No A2A endpoint configured' }
            }, { status: 503 });
        }

        const body = await req.json();
        const { message, configuration } = body;

        if (!message) {
            return NextResponse.json({
                error: { type: 'invalid_request', message: 'message is required' }
            }, { status: 400 });
        }

        // Make the A2A call
        const a2aEndpoint = agentCard.endpoints?.a2a?.jsonrpc || `${agentCard.url}/api/a2a`;
        const callId = `call_${uuidv4()}`;
        const startTime = Date.now();

        const response = await fetch(a2aEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'P402-Bazaar/1.0'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'message/send',
                params: { message, configuration },
                id: callId
            })
        });

        const result = await response.json();
        const latencyMs = Date.now() - startTime;

        // Update listing stats
        const costUsd = result.result?.task?.metadata?.cost_usd || 0;
        await pool.query(`
            UPDATE a2a_bazaar_listings
            SET stats = jsonb_set(
                jsonb_set(
                    jsonb_set(
                        stats,
                        '{totalCalls}',
                        (COALESCE((stats->>'totalCalls')::int, 0) + 1)::text::jsonb
                    ),
                    '{totalRevenue}',
                    (COALESCE((stats->>'totalRevenue')::numeric, 0) + $2)::text::jsonb
                ),
                '{avgLatencyMs}',
                (
                    (COALESCE((stats->>'avgLatencyMs')::int, 0) * COALESCE((stats->>'totalCalls')::int, 0) + $3) /
                    (COALESCE((stats->>'totalCalls')::int, 0) + 1)
                )::text::jsonb
            ),
            updated_at = NOW()
            WHERE id = $1
        `, [listingId, costUsd, latencyMs]);

        // Record the call
        await pool.query(`
            INSERT INTO a2a_bazaar_calls (
                id, listing_id, caller_tenant_id, 
                status, cost_usd, latency_ms, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
            callId,
            listingId,
            tenantId,
            result.error ? 'failed' : 'success',
            costUsd,
            latencyMs
        ]);

        if (result.error) {
            return NextResponse.json({
                error: {
                    type: 'service_error',
                    message: result.error.message,
                    code: result.error.code
                }
            }, { status: 502 });
        }

        return NextResponse.json({
            object: 'bazaar_call',
            call_id: callId,
            listing_id: listingId,
            result: result.result,
            latency_ms: latencyMs
        });

    } catch (error: any) {
        console.error('[Bazaar] Call service error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

async function submitReview(
    req: NextRequest,
    listingId: string,
    tenantId: string
): Promise<NextResponse> {
    try {
        const body = await req.json();
        const { rating, comment } = body;

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({
                error: { type: 'invalid_request', message: 'rating must be between 1 and 5' }
            }, { status: 400 });
        }

        // Check if user has called this service
        const callCheck = await pool.query(`
            SELECT id FROM a2a_bazaar_calls
            WHERE listing_id = $1 AND caller_tenant_id = $2
            LIMIT 1
        `, [listingId, tenantId]);

        if (callCheck.rows.length === 0) {
            return NextResponse.json({
                error: {
                    type: 'review_not_allowed',
                    message: 'You must use the service before reviewing'
                }
            }, { status: 403 });
        }

        // Check for existing review
        const existingReview = await pool.query(`
            SELECT id FROM a2a_bazaar_reviews
            WHERE listing_id = $1 AND reviewer_id = $2
        `, [listingId, tenantId]);

        const reviewId = existingReview.rows[0]?.id || uuidv4();

        if (existingReview.rows.length > 0) {
            // Update existing review
            await pool.query(`
                UPDATE a2a_bazaar_reviews
                SET rating = $2, comment = $3, updated_at = NOW()
                WHERE id = $1
            `, [reviewId, rating, comment || null]);
        } else {
            // Create new review
            await pool.query(`
                INSERT INTO a2a_bazaar_reviews (
                    id, listing_id, reviewer_id, rating, comment, created_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
            `, [reviewId, listingId, tenantId, rating, comment || null]);
        }

        // Update listing average rating
        const ratingResult = await pool.query(`
            SELECT AVG(rating) as avg_rating, COUNT(*) as count
            FROM a2a_bazaar_reviews
            WHERE listing_id = $1
        `, [listingId]);

        const avgRating = parseFloat(ratingResult.rows[0].avg_rating) || 0;
        const reviewCount = parseInt(ratingResult.rows[0].count) || 0;

        await pool.query(`
            UPDATE a2a_bazaar_listings
            SET stats = jsonb_set(
                jsonb_set(stats, '{rating}', $2::text::jsonb),
                '{reviewCount}',
                $3::text::jsonb
            )
            WHERE id = $1
        `, [listingId, avgRating.toFixed(2), reviewCount]);

        return NextResponse.json({
            object: 'bazaar_review',
            id: reviewId,
            listing_id: listingId,
            rating,
            comment,
            created: existingReview.rows.length === 0
        }, { status: existingReview.rows.length > 0 ? 200 : 201 });

    } catch (error: any) {
        console.error('[Bazaar] Submit review error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// OPTIONS (CORS)
// =============================================================================

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-P402-Tenant',
            'Access-Control-Max-Age': '86400'
        }
    });
}
