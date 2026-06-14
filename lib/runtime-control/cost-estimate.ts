/**
 * Slice 3Y-Shadow-Wireup — pure pre-routing cost estimator for the
 * runtime shadow path.
 *
 * The chat route needs a per-request cost number BEFORE the provider
 * call so the shadow path can evaluate `max_cost_per_request_usd` and
 * `monthly_budget_usd`. The true cost is only known after the provider
 * returns token usage; this helper returns an explicitly approximate
 * estimate based on:
 *   - message content LENGTH (chars), never the content itself
 *   - the caller-supplied max_tokens (or a 1024 default)
 *   - the registry's per-model inputCostPer1k / outputCostPer1k
 *
 * Hard rules:
 *   1. Never throws. Every failure returns 0.
 *   2. Returns 0 when the model is unknown to the registry. The shadow
 *      module's filter then suppresses the budget / per-request hits
 *      for that request — better silence than a false positive.
 *   3. Does NOT inspect content beyond `String.length`. No prompts,
 *      no responses, no text is logged or stored by this helper.
 *   4. Returns a finite non-negative number.
 *
 * This is intentionally a coarse approximation. Shadow mode tolerates
 * imprecision: `would_have_denied` is a directional signal, not a bill.
 */

interface ModelCostLike {
    id: string;
    inputCostPer1k?: number;
    outputCostPer1k?: number;
}

export interface CostRegistryLike {
    getAllModels(): Array<{ provider: string; model: ModelCostLike }>;
}

const DEFAULT_OUTPUT_TOKENS = 1024;
const CHARS_PER_TOKEN_APPROX = 4;

export function estimateModelCostUsd(
    model: unknown,
    messages: unknown,
    maxTokens: unknown,
    registry?: CostRegistryLike,
): number {
    try {
        if (typeof model !== 'string' || model.length === 0) return 0;

        // Input token estimate from chars-only. We never read the
        // content as text beyond .length.
        let inputChars = 0;
        if (Array.isArray(messages)) {
            for (const m of messages) {
                if (m && typeof m === 'object') {
                    const c = (m as { content?: unknown }).content;
                    if (typeof c === 'string') {
                        inputChars += c.length;
                    } else if (Array.isArray(c)) {
                        // OpenAI-style content parts: [{type:'text', text:'...'}, ...]
                        // We only sum .text length per safe metadata-only contract.
                        for (const part of c) {
                            if (part && typeof part === 'object') {
                                const t = (part as { text?: unknown }).text;
                                if (typeof t === 'string') inputChars += t.length;
                            }
                        }
                    }
                }
            }
        }
        const inputTokens = Math.max(1, Math.ceil(inputChars / CHARS_PER_TOKEN_APPROX));

        const outputTokens = typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0
            ? Math.floor(maxTokens)
            : DEFAULT_OUTPUT_TOKENS;

        const reg = registry ?? loadRegistryDefault();
        if (!reg) return 0;

        const candidates = reg.getAllModels();
        if (!Array.isArray(candidates)) return 0;
        const found = candidates.find((c) => c && c.model && c.model.id === model);
        if (!found) return 0;

        const inputCostPer1k  = Number(found.model.inputCostPer1k  ?? 0);
        const outputCostPer1k = Number(found.model.outputCostPer1k ?? 0);
        if (!Number.isFinite(inputCostPer1k)  || inputCostPer1k  < 0) return 0;
        if (!Number.isFinite(outputCostPer1k) || outputCostPer1k < 0) return 0;

        const cost = (inputTokens / 1000) * inputCostPer1k + (outputTokens / 1000) * outputCostPer1k;
        if (!Number.isFinite(cost) || cost < 0) return 0;
        return cost;
    } catch {
        return 0;
    }
}

/**
 * Default registry loader. Imported lazily so unit tests of this helper
 * don't transitively pull in the provider catalogs unless explicitly
 * exercising the registry path.
 */
function loadRegistryDefault(): CostRegistryLike | null {
    try {
        // Lazy require so tests can inject a fake without paying the
        // module-load cost of the real registry. eslint-disable: this is
        // intentional dynamic import for testability.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('@/lib/ai-providers') as { getProviderRegistry?: () => CostRegistryLike };
        return typeof mod.getProviderRegistry === 'function' ? mod.getProviderRegistry() : null;
    } catch {
        return null;
    }
}
