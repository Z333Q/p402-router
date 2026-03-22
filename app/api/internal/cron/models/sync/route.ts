/**
 * POST /api/internal/cron/models/sync
 *
 * Hourly cron: fetch model list from OpenRouter, upsert into model_prices,
 * record price changes in model_price_history, and refresh Redis cache.
 *
 * Protected by x-cron-secret header.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import redis from '@/lib/redis';

const CACHE_KEY = 'p402:models:openrouter';
const CACHE_TTL = 3600;

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
    };
    top_provider?: {
        max_completion_tokens?: number;
    };
}

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-cron-secret');
    if (!secret || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 503 });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://p402.io',
                'X-Title': 'P402 AI Orchestration',
            },
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json() as { data?: OpenRouterModel[] };
        const rawModels = data.data ?? [];

        let upserted = 0;
        let priceChanges = 0;

        for (const m of rawModels) {
            if (!m.id || !m.pricing) continue;

            const [provider] = m.id.split('/');
            const inputPer1k = parseFloat(m.pricing.prompt) * 1000 * 1.01;
            const outputPer1k = parseFloat(m.pricing.completion) * 1000 * 1.01;
            const caps = extractCapabilities(m);

            // Check existing price for change detection
            const existing = await db.query(
                'SELECT input_per_1k, output_per_1k FROM model_prices WHERE model_id = $1',
                [m.id]
            );
            const prev = existing.rows[0] as { input_per_1k: string; output_per_1k: string } | undefined;

            // Upsert
            await db.query(
                `INSERT INTO model_prices
                    (model_id, provider, model_name, description, context_window, max_output_tokens,
                     input_per_1k, output_per_1k, capabilities, is_active, synced_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,NOW())
                 ON CONFLICT (model_id) DO UPDATE SET
                     model_name       = EXCLUDED.model_name,
                     description      = EXCLUDED.description,
                     context_window   = EXCLUDED.context_window,
                     max_output_tokens= EXCLUDED.max_output_tokens,
                     input_per_1k     = EXCLUDED.input_per_1k,
                     output_per_1k    = EXCLUDED.output_per_1k,
                     capabilities     = EXCLUDED.capabilities,
                     is_active        = TRUE,
                     synced_at        = NOW()`,
                [
                    m.id,
                    provider ?? 'unknown',
                    m.name || m.id,
                    m.description ?? null,
                    m.context_length ?? 0,
                    m.top_provider?.max_completion_tokens ?? 4096,
                    inputPer1k,
                    outputPer1k,
                    caps,
                ]
            );
            upserted++;

            // Record price history if price changed
            const prevInput = prev ? parseFloat(prev.input_per_1k) : null;
            const prevOutput = prev ? parseFloat(prev.output_per_1k) : null;
            if (prevInput === null || Math.abs(prevInput - inputPer1k) > 0.000001 || Math.abs((prevOutput ?? 0) - outputPer1k) > 0.000001) {
                await db.query(
                    `INSERT INTO model_price_history (model_id, input_per_1k, output_per_1k)
                     VALUES ($1, $2, $3)`,
                    [m.id, inputPer1k, outputPer1k]
                );
                priceChanges++;
            }
        }

        // Mark models no longer returned as inactive
        const activeIds = rawModels.map(m => m.id).filter(Boolean);
        if (activeIds.length > 0) {
            await db.query(
                `UPDATE model_prices SET is_active = FALSE WHERE model_id != ALL($1::text[])`,
                [activeIds]
            );
        }

        // Refresh Redis cache with normalized list
        const normalized = rawModels
            .filter(m => m.id && m.pricing)
            .map(m => {
                const [prov] = m.id.split('/');
                return {
                    id: m.id,
                    name: m.name || m.id,
                    provider: prov ?? 'unknown',
                    description: m.description,
                    context_window: m.context_length ?? 0,
                    max_output_tokens: m.top_provider?.max_completion_tokens ?? 4096,
                    pricing: {
                        input_per_1k: parseFloat(m.pricing.prompt) * 1000 * 1.01,
                        output_per_1k: parseFloat(m.pricing.completion) * 1000 * 1.01,
                    },
                    capabilities: extractCapabilities(m),
                };
            });

        try {
            await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(normalized));
        } catch { /* Redis optional */ }

        return NextResponse.json({
            success: true,
            synced: upserted,
            price_changes: priceChanges,
            timestamp: new Date().toISOString(),
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Cron/models/sync] Error:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

function extractCapabilities(model: OpenRouterModel): string[] {
    const caps = ['chat'];
    const name = (model.name ?? '').toLowerCase();
    const id = model.id.toLowerCase();
    if (name.includes('vision') || id.includes('vision')) caps.push('vision');
    if (name.includes('code') || id.includes('code') || id.includes('deepseek')) caps.push('code');
    if (id.includes('gpt') || id.includes('claude') || id.includes('gemini')) caps.push('function_calling');
    if ((model.context_length ?? 0) > 100000) caps.push('long_context');
    if (id.includes('o3') || id.includes('r1') || name.includes('reason')) caps.push('reasoning');
    return caps;
}
