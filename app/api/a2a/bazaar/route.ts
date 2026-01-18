/**
 * P402 A2A Marketplace - Bazaar
 * ==============================
 * Phase 6: Agent discovery marketplace and service listings.
 * 
 * Features:
 * - Public agent/service listings
 * - Search and filtering by capabilities
 * - Pricing and reputation data
 * - Usage statistics
 * - Featured listings
 * 
 * Endpoints:
 * - GET /api/a2a/bazaar - Browse marketplace
 * - GET /api/a2a/bazaar/search - Search listings
 * - POST /api/a2a/bazaar/publish - Publish a listing
 * - GET /api/a2a/bazaar/:listingId - Get listing details
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { AgentCard } from '@/lib/a2a-types';

// =============================================================================
// TYPES
// =============================================================================

export interface BazaarListing {
    id: string;
    type: 'agent' | 'service' | 'skill' | 'workflow';
    name: string;
    description: string;
    shortDescription: string;

    // Provider info
    providerId: string;
    providerName: string;
    providerVerified: boolean;

    // Agent card (for agent listings)
    agentCardUrl?: string;
    agentCard?: AgentCard;

    // Capabilities
    capabilities: string[];
    skills: string[];
    tags: string[];

    // Pricing
    pricing: {
        model: 'per_request' | 'per_token' | 'per_minute' | 'subscription' | 'free';
        currency: string;
        amount?: number;
        details?: string;
    };

    // Payment
    acceptedPayments: string[]; // ['x402', 'ap2', 'stripe']
    walletAddress?: string;

    // Stats
    stats: {
        totalCalls: number;
        totalRevenue: number;
        avgLatencyMs: number;
        successRate: number;
        rating: number;
        reviewCount: number;
    };

    // Status
    status: 'draft' | 'pending' | 'active' | 'suspended' | 'archived';
    featured: boolean;

    // Timestamps
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}

export interface BazaarSearchParams {
    query?: string;
    type?: string;
    capabilities?: string[];
    tags?: string[];
    pricingModel?: string;
    maxPrice?: number;
    minRating?: number;
    verified?: boolean;
    sort?: 'relevance' | 'rating' | 'calls' | 'newest' | 'price_low' | 'price_high';
    limit?: number;
    offset?: number;
}

export interface BazaarCategory {
    id: string;
    name: string;
    description: string;
    listingCount: number;
    icon: string;
}

// =============================================================================
// BROWSE MARKETPLACE
// =============================================================================

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const section = searchParams.get('section');

    // Handle different sections
    if (section === 'featured') {
        return getFeaturedListings();
    }
    if (section === 'categories') {
        return getCategories();
    }
    if (section === 'trending') {
        return getTrendingListings();
    }
    if (section === 'new') {
        return getNewListings();
    }

    // Default: browse all
    return browseListings(req);
}

async function getFeaturedListings(): Promise<NextResponse> {
    try {
        const result = await pool.query(`
            SELECT * FROM a2a_bazaar_listings
            WHERE status = 'active' AND featured = true
            ORDER BY stats->>'totalCalls' DESC
            LIMIT 12
        `);

        return NextResponse.json({
            object: 'list',
            section: 'featured',
            data: result.rows.map(formatListing)
        });
    } catch (error: any) {
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

async function getCategories(): Promise<NextResponse> {
    try {
        // Aggregate categories from tags
        const result = await pool.query(`
            SELECT 
                unnest(tags) as category,
                COUNT(*) as count
            FROM a2a_bazaar_listings
            WHERE status = 'active'
            GROUP BY category
            ORDER BY count DESC
            LIMIT 20
        `);

        const categories: BazaarCategory[] = result.rows.map((row, i) => ({
            id: row.category.toLowerCase().replace(/\s+/g, '-'),
            name: row.category,
            description: `${row.count} listings`,
            listingCount: parseInt(row.count),
            icon: getCategoryIcon(row.category)
        }));

        return NextResponse.json({
            object: 'list',
            section: 'categories',
            data: categories
        });
    } catch (error: any) {
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

async function getTrendingListings(): Promise<NextResponse> {
    try {
        // Get listings with most calls in last 7 days
        const result = await pool.query(`
            SELECT * FROM a2a_bazaar_listings
            WHERE status = 'active'
            ORDER BY (stats->>'totalCalls')::int DESC
            LIMIT 10
        `);

        return NextResponse.json({
            object: 'list',
            section: 'trending',
            data: result.rows.map(formatListing)
        });
    } catch (error: any) {
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

async function getNewListings(): Promise<NextResponse> {
    try {
        const result = await pool.query(`
            SELECT * FROM a2a_bazaar_listings
            WHERE status = 'active'
            ORDER BY published_at DESC NULLS LAST
            LIMIT 10
        `);

        return NextResponse.json({
            object: 'list',
            section: 'new',
            data: result.rows.map(formatListing)
        });
    } catch (error: any) {
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

async function browseListings(req: NextRequest): Promise<NextResponse> {
    const searchParams = req.nextUrl.searchParams;

    const params: BazaarSearchParams = {
        type: searchParams.get('type') || undefined,
        capabilities: searchParams.get('capabilities')?.split(','),
        tags: searchParams.get('tags')?.split(','),
        pricingModel: searchParams.get('pricing_model') || undefined,
        maxPrice: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
        minRating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
        verified: searchParams.get('verified') === 'true',
        sort: (searchParams.get('sort') as any) || 'relevance',
        limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
        offset: parseInt(searchParams.get('offset') || '0')
    };

    try {
        let query = `SELECT * FROM a2a_bazaar_listings WHERE status = 'active'`;
        const values: any[] = [];
        let paramIndex = 1;

        if (params.type) {
            query += ` AND type = $${paramIndex++}`;
            values.push(params.type);
        }

        if (params.capabilities?.length) {
            query += ` AND capabilities && $${paramIndex++}::text[]`;
            values.push(params.capabilities);
        }

        if (params.tags?.length) {
            query += ` AND tags && $${paramIndex++}::text[]`;
            values.push(params.tags);
        }

        if (params.pricingModel) {
            query += ` AND pricing->>'model' = $${paramIndex++}`;
            values.push(params.pricingModel);
        }

        if (params.maxPrice !== undefined) {
            query += ` AND (pricing->>'amount')::numeric <= $${paramIndex++}`;
            values.push(params.maxPrice);
        }

        if (params.minRating !== undefined) {
            query += ` AND (stats->>'rating')::numeric >= $${paramIndex++}`;
            values.push(params.minRating);
        }

        if (params.verified) {
            query += ` AND provider_verified = true`;
        }

        // Count total
        const countResult = await pool.query(
            query.replace('SELECT *', 'SELECT COUNT(*)'),
            values
        );
        const total = parseInt(countResult.rows[0].count);

        // Add sorting
        switch (params.sort) {
            case 'rating':
                query += ` ORDER BY (stats->>'rating')::numeric DESC NULLS LAST`;
                break;
            case 'calls':
                query += ` ORDER BY (stats->>'totalCalls')::int DESC`;
                break;
            case 'newest':
                query += ` ORDER BY published_at DESC NULLS LAST`;
                break;
            case 'price_low':
                query += ` ORDER BY (pricing->>'amount')::numeric ASC NULLS LAST`;
                break;
            case 'price_high':
                query += ` ORDER BY (pricing->>'amount')::numeric DESC NULLS LAST`;
                break;
            default:
                query += ` ORDER BY featured DESC, (stats->>'rating')::numeric DESC NULLS LAST`;
        }

        // Add pagination
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        values.push(params.limit, params.offset);

        const result = await pool.query(query, values);

        return NextResponse.json({
            object: 'list',
            data: result.rows.map(formatListing),
            pagination: {
                total,
                limit: params.limit,
                offset: params.offset,
                has_more: (params.offset! + result.rows.length) < total
            },
            filters_applied: {
                type: params.type,
                capabilities: params.capabilities,
                tags: params.tags,
                pricing_model: params.pricingModel,
                max_price: params.maxPrice,
                min_rating: params.minRating,
                verified: params.verified,
                sort: params.sort
            }
        });

    } catch (error: any) {
        console.error('[Bazaar] Browse error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// PUBLISH LISTING
// =============================================================================

export async function POST(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const body = await req.json();
        const {
            type = 'agent',
            name,
            description,
            short_description,
            agent_card_url,
            capabilities = [],
            skills = [],
            tags = [],
            pricing = { model: 'free', currency: 'USD' },
            accepted_payments = ['x402'],
            wallet_address
        } = body;

        // Validate required fields
        if (!name || !description) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'name and description are required'
                }
            }, { status: 400 });
        }

        // Fetch agent card if URL provided
        let agentCard: AgentCard | undefined;
        if (agent_card_url) {
            try {
                const response = await fetch(agent_card_url, {
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    agentCard = await response.json();
                }
            } catch (e) {
                console.warn(`[Bazaar] Could not fetch agent card: ${e}`);
            }
        }

        const listingId = `lst_${uuidv4()}`;

        await pool.query(`
            INSERT INTO a2a_bazaar_listings (
                id, type, name, description, short_description,
                provider_id, provider_name, provider_verified,
                agent_card_url, agent_card,
                capabilities, skills, tags,
                pricing, accepted_payments, wallet_address,
                stats, status, featured,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, false,
                $8, $9,
                $10, $11, $12,
                $13, $14, $15,
                $16, 'pending', false,
                NOW(), NOW()
            )
        `, [
            listingId,
            type,
            name,
            description,
            short_description || description.slice(0, 150),
            tenantId,
            tenantId, // Will be updated with actual provider name
            agent_card_url,
            agentCard ? JSON.stringify(agentCard) : null,
            capabilities,
            skills,
            tags,
            JSON.stringify(pricing),
            accepted_payments,
            wallet_address,
            JSON.stringify({
                totalCalls: 0,
                totalRevenue: 0,
                avgLatencyMs: 0,
                successRate: 100,
                rating: 0,
                reviewCount: 0
            })
        ]);

        return NextResponse.json({
            object: 'bazaar_listing',
            id: listingId,
            type,
            name,
            description,
            short_description: short_description || description.slice(0, 150),
            capabilities,
            skills,
            tags,
            pricing,
            status: 'pending',
            message: 'Listing submitted for review',
            created_at: new Date().toISOString()
        }, { status: 201 });

    } catch (error: any) {
        console.error('[Bazaar] Publish error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// HELPERS
// =============================================================================

function formatListing(row: any): Partial<BazaarListing> {
    return {
        id: row.id,
        type: row.type,
        name: row.name,
        description: row.description,
        shortDescription: row.short_description,
        providerId: row.provider_id,
        providerName: row.provider_name,
        providerVerified: row.provider_verified,
        agentCardUrl: row.agent_card_url,
        capabilities: row.capabilities || [],
        skills: row.skills || [],
        tags: row.tags || [],
        pricing: row.pricing,
        acceptedPayments: row.accepted_payments || [],
        stats: row.stats || {
            totalCalls: 0,
            totalRevenue: 0,
            avgLatencyMs: 0,
            successRate: 100,
            rating: 0,
            reviewCount: 0
        },
        status: row.status,
        featured: row.featured,
        createdAt: row.created_at?.toISOString(),
        updatedAt: row.updated_at?.toISOString(),
        publishedAt: row.published_at?.toISOString()
    };
}

function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
        'ai': '🤖',
        'llm': '🧠',
        'completion': '💬',
        'embedding': '📊',
        'image': '🖼️',
        'audio': '🎵',
        'video': '🎬',
        'code': '💻',
        'data': '📈',
        'search': '🔍',
        'payment': '💳',
        'finance': '💰',
        'analytics': '📉',
        'automation': '⚙️',
        'default': '📦'
    };

    const lower = category.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
        if (lower.includes(key)) return icon;
    }
    return icons.default!;
}

// =============================================================================
// OPTIONS (CORS)
// =============================================================================

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-P402-Tenant',
            'Access-Control-Max-Age': '86400'
        }
    });
}
