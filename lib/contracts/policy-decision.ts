/**
 * Policy Decision Contract
 * Structured record of every allow/deny/fallback decision.
 */

import { z } from 'zod';

export const PolicyDecisionReasonSchema = z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().optional(),
});

export const PolicyDecisionSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    request_id: z.string().uuid(),
    node_id: z.string().uuid().nullable().optional(),
    mandate_id: z.string().uuid().nullable().optional(),
    decision: z.enum(['allow', 'deny', 'fallback']),
    reasons: z.array(PolicyDecisionReasonSchema).default([]),
    decision_hash: z.string().nullable().optional(),
    created_at: z.string().datetime().optional(),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
