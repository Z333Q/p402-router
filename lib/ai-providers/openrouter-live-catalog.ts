/**
 * Slice 3Z-B — OpenRouter live catalog helpers.
 *
 * Pure functions that:
 *   1. Fetch the live model list from https://openrouter.ai/api/v1/models
 *   2. Map each row into the internal ModelInfo shape used by the registry.
 *
 * The static catalog in openrouter.ts remains the fallback. The hybrid
 * design lives in the adapter: refreshLiveCatalog() replaces models on
 * a successful fetch and leaves the static catalog in place on failure.
 *
 * Hard rules:
 *   - Pure helpers. No singletons, no module-level fetch trigger.
 *   - Defensive: never throws on malformed rows. Bad rows are dropped;
 *     the result is whatever rows DO map cleanly.
 *   - Pricing: OpenRouter returns USD per token as strings.
 *     ModelInfo carries USD per 1k tokens. Conversion is x1000.
 *   - Tier is inferred from completion cost per 1k tokens (no signal
 *     in the live response, so we pick thresholds that match the
 *     existing static catalog).
 */

import type { ModelInfo, ModelCapability, ModelTier } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Raw OpenRouter shape
// ─────────────────────────────────────────────────────────────────────────────

export interface RawOpenRouterModel {
    id?: unknown;
    name?: unknown;
    context_length?: unknown;
    pricing?: {
        prompt?: unknown;
        completion?: unknown;
    };
    architecture?: {
        modality?: unknown;
        input_modalities?: unknown;
        output_modalities?: unknown;
    };
    top_provider?: {
        max_completion_tokens?: unknown;
    };
}

interface OpenRouterListResponse {
    data?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier thresholds (per 1k output tokens). Match the existing static catalog:
//   budget: < $0.0005     (gemini flash, deepseek-chat)
//   mid:    $0.0005 - $0.005 (sonnet, deepseek-r1, llama, mistral-small)
//   premium: >= $0.005   (opus, gpt-5.2, mistral-large)
// ─────────────────────────────────────────────────────────────────────────────

const TIER_BUDGET_MAX_PER_1K  = 0.0005;
const TIER_PREMIUM_MIN_PER_1K = 0.005;

export function inferTier(outputCostPer1k: number): ModelTier {
    if (!Number.isFinite(outputCostPer1k)) return 'mid';
    if (outputCostPer1k < TIER_BUDGET_MAX_PER_1K) return 'budget';
    if (outputCostPer1k >= TIER_PREMIUM_MIN_PER_1K) return 'premium';
    return 'mid';
}

// ─────────────────────────────────────────────────────────────────────────────
// Capabilities inference. The /models response carries `architecture.modality`
// and a top-level `supported_parameters` array; we map a minimal set.
// ─────────────────────────────────────────────────────────────────────────────

function asStringArray(v: unknown): string[] {
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function inferCapabilities(raw: RawOpenRouterModel): ModelCapability[] {
    const caps = new Set<ModelCapability>(['chat']);
    // Streaming: OpenRouter supports streaming for essentially all chat models.
    caps.add('streaming');

    const modality = typeof raw.architecture?.modality === 'string' ? raw.architecture.modality : '';
    const inputModalities = asStringArray(raw.architecture?.input_modalities);
    const outputModalities = asStringArray(raw.architecture?.output_modalities);

    const hasImageIn = modality.includes('image') || inputModalities.includes('image');
    if (hasImageIn) caps.add('vision');

    // Long-context heuristic — context_length >= 200k.
    const ctx = Number(raw.context_length);
    if (Number.isFinite(ctx) && ctx >= 200_000) caps.add('long_context');

    // Output modalities (code/reasoning are not directly exposed; skip).
    void outputModalities;

    return Array.from(caps);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────────────────────────────────────

function parseNumericPriceToPer1k(raw: unknown): number {
    // OpenRouter pricing is dollars per single token, expressed as a string.
    // ModelInfo carries dollars per 1k tokens → multiply by 1000.
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw * 1000;
    if (typeof raw === 'string') {
        const n = Number(raw);
        if (Number.isFinite(n)) return n * 1000;
    }
    return 0;
}

export function mapToModelInfo(raw: RawOpenRouterModel): ModelInfo | null {
    try {
        if (!raw || typeof raw !== 'object') return null;
        const id = typeof raw.id === 'string' ? raw.id : '';
        if (id.length === 0) return null;

        const inputCostPer1k  = parseNumericPriceToPer1k(raw.pricing?.prompt);
        const outputCostPer1k = parseNumericPriceToPer1k(raw.pricing?.completion);
        if (!Number.isFinite(inputCostPer1k)  || inputCostPer1k  < 0) return null;
        if (!Number.isFinite(outputCostPer1k) || outputCostPer1k < 0) return null;

        const ctxRaw = Number(raw.context_length);
        const contextWindow = Number.isFinite(ctxRaw) && ctxRaw > 0 ? Math.floor(ctxRaw) : 8192;

        const maxOutTokens = Number(raw.top_provider?.max_completion_tokens);
        const maxOutputTokens = Number.isFinite(maxOutTokens) && maxOutTokens > 0
            ? Math.floor(maxOutTokens)
            : 4096;

        const name = typeof raw.name === 'string' && raw.name.length > 0
            ? raw.name
            : id;

        return {
            id,
            name,
            tier:             inferTier(outputCostPer1k),
            contextWindow,
            inputCostPer1k,
            outputCostPer1k,
            capabilities:     inferCapabilities(raw),
            supportsStreaming: true,
            maxOutputTokens,
        };
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetcher (injectable for tests)
// ─────────────────────────────────────────────────────────────────────────────

export interface FetcherLike {
    (input: string, init?: { method?: string; headers?: Record<string, string> }): Promise<{
        ok: boolean;
        status: number;
        json(): Promise<unknown>;
    }>;
}

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

/**
 * Returns the raw rows from /api/v1/models. Throws on HTTP or parse failure
 * so the caller can decide whether to fall back to the static catalog.
 *
 * The apiKey is optional — OpenRouter's /models endpoint is publicly
 * readable. We forward it when present for higher rate limits.
 */
export async function fetchOpenRouterModels(
    opts: { apiKey?: string; referer?: string; fetchImpl?: FetcherLike } = {},
): Promise<RawOpenRouterModel[]> {
    const f = opts.fetchImpl ?? (globalThis.fetch as unknown as FetcherLike);
    if (typeof f !== 'function') {
        throw new Error('No fetch implementation available');
    }
    const headers: Record<string, string> = {
        'Accept': 'application/json',
    };
    if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`;
    if (opts.referer) headers['HTTP-Referer'] = opts.referer;

    const res = await f(OPENROUTER_MODELS_URL, { method: 'GET', headers });
    if (!res.ok) {
        throw new Error(`OpenRouter /models returned HTTP ${res.status}`);
    }
    const body = await res.json() as OpenRouterListResponse;
    if (!body || typeof body !== 'object' || !Array.isArray(body.data)) {
        throw new Error('OpenRouter /models returned an unexpected shape');
    }
    return body.data as RawOpenRouterModel[];
}

/**
 * Convenience wrapper: fetch + map + drop unmappable rows.
 */
export async function loadLiveCatalog(
    opts: { apiKey?: string; referer?: string; fetchImpl?: FetcherLike } = {},
): Promise<ModelInfo[]> {
    const rows = await fetchOpenRouterModels(opts);
    const mapped: ModelInfo[] = [];
    for (const r of rows) {
        const m = mapToModelInfo(r);
        if (m !== null) mapped.push(m);
    }
    return mapped;
}
