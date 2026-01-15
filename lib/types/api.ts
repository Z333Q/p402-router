/**
 * P402 Router V2 API Types
 * =========================
 * TypeScript definitions for V2 API endpoints.
 */

// ============================================
// SESSION TYPES
// ============================================

export interface P402Session {
    session_id: string;
    tenant_id: string;
    agent_identifier?: string;
    /** Current available balance (budget_remaining) */
    balance_usdc: number;
    /** Total budget ever allocated */
    budget_total: number;
    /** Total amount spent */
    budget_spent: number;
    /** Legacy budget object for backward compatibility */
    budget: {
        total_usd: number;
        used_usd: number;
        remaining_usd: number;
    };
    policy?: Record<string, unknown>;
    status: 'active' | 'exhausted' | 'expired' | 'ended' | 'revoked';
    created_at: string;
    expires_at: string;
    ended_at?: string;
}

export interface CreateSessionRequest {
    agent_identifier?: string;
    budget_usd?: number;
    expires_in_hours?: number;
    policy?: Record<string, unknown>;
}

export interface FundSessionRequest {
    session_id: string;
    amount: string | number;
    tx_hash?: string;
    source?: 'base_pay' | 'direct' | 'test';
    network?: 'base' | 'base_sepolia';
}

export interface FundSessionResponse {
    success: boolean;
    session: P402Session;
    amount_credited: number;
    tx_hash: string | null;
}

// ============================================
// CHAT TYPES
// ============================================

export interface ChatCompletionRequest {
    model?: string;
    messages: ChatMessage[];
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
    tools?: any[];
    tool_choice?: any;
    response_format?: { type: 'text' | 'json_object' };
    user?: string;
    p402?: P402Options;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | Array<{ type: string; text?: string; image_url?: any }>;
    name?: string;
    tool_calls?: any[];
    tool_call_id?: string;
}

export interface P402Options {
    mode?: 'cost' | 'quality' | 'speed' | 'balanced';
    prefer_providers?: string[];
    exclude_providers?: string[];
    require_capabilities?: string[];
    max_cost?: number;
    session_id?: string;
    cache?: boolean;
    cache_ttl?: number;
    failover?: boolean;
    tenant_id?: string;
}

export interface ChatCompletionResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: ChatChoice[];
    usage: UsageInfo;
    p402_metadata: P402Metadata;
}

export interface ChatChoice {
    index: number;
    message: {
        role: 'assistant';
        content: string;
        tool_calls?: any[];
    };
    finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
}

export interface UsageInfo {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface P402Metadata {
    request_id: string;
    tenant_id: string;
    provider?: string;
    model?: string;
    cost_usd?: number;
    latency_ms: number;
    provider_latency_ms?: number;
    cached: boolean;
    routing_mode?: string;
}

// ============================================
// PROVIDER TYPES
// ============================================

export interface Provider {
    id: string;
    name: string;
    models: Model[];
    health?: ProviderHealth;
}

export interface Model {
    id: string;
    name: string;
    tier: 'premium' | 'mid' | 'budget';
    context_window: number;
    max_output_tokens?: number;
    input_cost_per_1k: number;
    output_cost_per_1k: number;
    capabilities: string[];
    supports_streaming: boolean;
}

export interface ProviderHealth {
    status: 'healthy' | 'degraded' | 'down';
    latency_p95?: number;
    uptime_30d?: number;
    error_rate?: number;
}

export interface CompareRequest {
    input_tokens: number;
    output_tokens: number;
    capabilities?: string[];
    exclude_providers?: string[];
    tier?: string;
}

export interface CompareResult {
    rank: number;
    model: string;
    model_name: string;
    provider: string;
    provider_name: string;
    tier: string;
    cost: number;
    cost_breakdown: {
        input: number;
        output: number;
    };
    quality_score: number;
    context_window: number;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface SpendSummary {
    period: string;
    total_spent: number;
    total_saved: number;
    savings_percent: number;
    request_count: number;
    cache_hit_rate: number;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    top_models: TopModel[];
}

export interface TopModel {
    model: string;
    provider: string;
    spend: number;
    requests: number;
}

// ============================================
// ERROR TYPES
// ============================================

export interface APIError {
    error: {
        type: string;
        message: string;
        code: ErrorCode;
        provider?: string;
        retry_after_ms?: number;
    };
}

export type ErrorCode =
    | 'MISSING_SESSION'
    | 'INVALID_SESSION'
    | 'SESSION_NOT_FOUND'
    | 'SESSION_NOT_ACTIVE'
    | 'SESSION_EXPIRED'
    | 'INSUFFICIENT_BALANCE'
    | 'MISSING_WALLET'
    | 'INVALID_WALLET'
    | 'MISSING_AMOUNT'
    | 'INVALID_AMOUNT'
    | 'AMOUNT_TOO_HIGH'
    | 'DUPLICATE_TX'
    | 'INVALID_TX_HASH'
    | 'MODEL_NOT_FOUND'
    | 'PROVIDER_ERROR'
    | 'RATE_LIMITED'
    | 'TIMEOUT'
    | 'INTERNAL_ERROR'
    | 'UPDATE_FAILED'
    | 'INVALID_INPUT_TOKENS'
    | 'INVALID_OUTPUT_TOKENS';
