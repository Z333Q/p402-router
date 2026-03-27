/**
 * Execute Request and Response Contracts
 * Canonical Zod schemas for the /v1/execute endpoint.
 */

import { z } from 'zod';
import { BudgetConstraintSchema } from './money';

// ── Input ─────────────────────────────────────────────────────────────────────

export const ExecuteConstraintsSchema = z.object({
    latency: z.enum(['low', 'medium', 'high']).optional(),
    quality: z.enum(['draft', 'standard', 'high']).optional(),
    tools_allowed: z.boolean().optional(),
    routing_mode: z.enum(['cost', 'quality', 'speed', 'balanced']).optional(),
    prefer_providers: z.array(z.string()).optional(),
    exclude_providers: z.array(z.string()).optional(),
}).optional();

export const ExecuteInputDataSchema = z.object({
    text: z.string().max(100_000).optional(),
    document_uri: z.string().url().optional(),
    file_refs: z.array(z.string()).optional(),
    messages: z.array(z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
    })).optional(),
}).optional();

export const ExecuteInputSchema = z.object({
    task: z.string().min(1).max(10_000),
    input_data: ExecuteInputDataSchema,
    budget: BudgetConstraintSchema,
    mode: z.enum(['auto', 'direct', 'planned']).default('auto'),
    constraints: ExecuteConstraintsSchema,
    session_id: z.string().uuid().optional(),
    policy_profile_id: z.string().uuid().optional(),
    idempotency_key: z.string().max(256).optional(),
});
export type ExecuteInput = z.infer<typeof ExecuteInputSchema>;

// ── Response ──────────────────────────────────────────────────────────────────

export const ExecuteResultCostSchema = z.object({
    actual: z.string(),
    estimated: z.string().optional(),
    currency: z.enum(['USDC', 'USD']).default('USDC'),
    savings: z.string().optional(),
});

export const ExecuteResultOutputSchema = z.object({
    text: z.string().optional(),
    messages: z.array(z.object({
        role: z.string(),
        content: z.string(),
    })).optional(),
    structured: z.unknown().optional(),
});

export const ExecuteExecutionMetaSchema = z.object({
    mode_resolved: z.enum(['direct', 'planned']),
    nodes: z.number().int().min(1),
    cached: z.boolean(),
    provider: z.string().optional(),
    model: z.string().optional(),
    latency_ms: z.number().optional(),
});

export const ExecuteResultSchema = z.object({
    request_id: z.string().uuid(),
    status: z.enum(['completed', 'failed', 'partial']),
    result: ExecuteResultOutputSchema.optional(),
    cost: ExecuteResultCostSchema,
    trace_id: z.string().uuid(),
    confidence: z.number().min(0).max(1).optional(),
    execution: ExecuteExecutionMetaSchema,
    error: z.object({
        code: z.string(),
        message: z.string(),
    }).optional(),
});
export type ExecuteResult = z.infer<typeof ExecuteResultSchema>;
