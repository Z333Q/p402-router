/**
 * P402 V2 Models Endpoint
 * =======================
 * Returns live model listing from OpenRouter.
 * Cached for 1 hour to reduce API calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

const CACHE_KEY = 'p402:models:openrouter';
const CACHE_TTL = 3600; // 1 hour

interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    pricing: {
        prompt: string;
        completion: string;
    };
    context_length: number;
    architecture?: {
        modality?: string;
        tokenizer?: string;
    };
    top_provider?: {
        max_completion_tokens?: number;
    };
}

interface NormalizedModel {
    id: string;
    name: string;
    provider: string;
    description?: string;
    context_window: number;
    max_output_tokens: number;
    pricing: {
        input_per_1k: number;
        output_per_1k: number;
    };
    capabilities: string[];
}

export async function GET(req: NextRequest) {
    try {
        // Check cache first
        let cachedData: string | null = null;
        try {
            cachedData = await redis.get(CACHE_KEY);
        } catch {
            // Redis not available, continue without cache
        }

        if (cachedData) {
            const models = JSON.parse(cachedData);
            return NextResponse.json({
                object: 'list',
                data: models,
                source: 'cache',
                cached_at: new Date().toISOString(),
                provider: 'openrouter'
            });
        }

        // Fetch from OpenRouter
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                object: 'list',
                data: [],
                error: 'OpenRouter API key not configured'
            }, { status: 503 });
        }

        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://p402.io',
                'X-Title': 'P402 AI Orchestration'
            }
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const models = normalizeModels(data.data || []);

        // Cache the result
        try {
            await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(models));
        } catch {
            // Cache write failed, continue anyway
        }

        return NextResponse.json({
            object: 'list',
            data: models,
            source: 'openrouter',
            fetched_at: new Date().toISOString(),
            provider: 'openrouter',
            total: models.length
        });

    } catch (error: any) {
        console.error('[V2/models] Error:', error);
        return NextResponse.json({
            error: {
                type: 'internal_error',
                message: error.message || 'Failed to fetch models'
            }
        }, { status: 500 });
    }
}

function normalizeModels(rawModels: OpenRouterModel[]): NormalizedModel[] {
    return rawModels
        .filter(m => m.id && m.pricing)
        .map(m => {
            const [provider, ...modelParts] = m.id.split('/');
            return {
                id: m.id,
                name: m.name || modelParts.join('/'),
                provider: provider || 'unknown',
                description: m.description,
                context_window: m.context_length || 0,
                max_output_tokens: m.top_provider?.max_completion_tokens || 4096,
                pricing: {
                    input_per_1k: parseFloat(m.pricing.prompt) * 1000,
                    output_per_1k: parseFloat(m.pricing.completion) * 1000
                },
                capabilities: extractCapabilities(m)
            };
        })
        .sort((a, b) => a.provider.localeCompare(b.provider));
}

function extractCapabilities(model: OpenRouterModel): string[] {
    const caps: string[] = ['chat'];
    const name = model.name?.toLowerCase() || '';
    const id = model.id.toLowerCase();

    if (name.includes('vision') || id.includes('vision')) caps.push('vision');
    if (name.includes('code') || id.includes('code') || id.includes('deepseek')) caps.push('code');
    if (id.includes('gpt') || id.includes('claude') || id.includes('gemini')) caps.push('function_calling');
    if (model.context_length > 100000) caps.push('long_context');
    if (id.includes('o3') || id.includes('r1') || name.includes('reason')) caps.push('reasoning');

    return caps;
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        }
    });
}
