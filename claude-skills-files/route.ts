/**
 * P402 Skill File Server
 * =======================
 * Serves individual skill markdown files from .claude/skills/p402/
 * so they are accessible over HTTP for MCP servers, agents, and developers.
 *
 * Routes:
 *   GET /skill/SKILL.md
 *   GET /skill/references/api-reference.md
 *   GET /skill/references/routing-guide.md
 *   GET /skill/references/payment-flows.md
 *   GET /skill/references/a2a-protocol.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const SKILL_BASE = resolve(process.cwd(), '.claude', 'skills', 'p402');

// Allowed files whitelist (security: no directory traversal)
const ALLOWED_FILES = new Set([
    'SKILL.md',
    'references/api-reference.md',
    'references/routing-guide.md',
    'references/payment-flows.md',
    'references/a2a-protocol.md',
]);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const relativePath = path.join('/');

    // Security: only serve whitelisted files
    if (!ALLOWED_FILES.has(relativePath)) {
        return NextResponse.json(
            { error: 'Not found', available: Array.from(ALLOWED_FILES) },
            { status: 404 }
        );
    }

    const filePath = join(SKILL_BASE, relativePath);

    // Double-check path is within skill directory
    const resolved = resolve(filePath);
    if (!resolved.startsWith(SKILL_BASE)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!existsSync(resolved)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    try {
        const content = readFileSync(resolved, 'utf-8');

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Cache-Control': 'public, max-age=3600, s-maxage=86400',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        console.error('[Skill Server] Error reading file:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
