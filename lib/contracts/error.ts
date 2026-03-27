/**
 * Structured Error Response Contract
 * Machine-readable error shapes for the /v1/execute surface.
 */

import { z } from 'zod';

export const ExecuteErrorSchema = z.object({
    type: z.enum(['validation_error', 'policy_error', 'budget_error', 'execution_error', 'internal_error']),
    code: z.string(),
    message: z.string(),
    request_id: z.string().uuid().optional(),
    details: z.unknown().optional(),
    // For budget errors
    budget_required: z.string().optional(),
    budget_available: z.string().optional(),
    // For policy errors
    policy_reasons: z.array(z.object({
        code: z.string(),
        message: z.string(),
    })).optional(),
});
export type ExecuteError = z.infer<typeof ExecuteErrorSchema>;
