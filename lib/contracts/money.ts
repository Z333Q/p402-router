/**
 * Money and Budget Contracts
 * Zod schemas for monetary values and budget constraints.
 */

import { z } from 'zod';

export const MoneySchema = z.object({
    amount: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Amount must be a decimal string with up to 8 decimal places'),
    currency: z.enum(['USDC', 'USD']).default('USDC'),
});
export type Money = z.infer<typeof MoneySchema>;

export const BudgetConstraintSchema = z.object({
    cap: z.union([z.string(), z.number()])
        .transform((v) => String(v))
        .refine((v) => /^\d+(\.\d{1,8})?$/.test(v), 'Budget cap must be a positive decimal'),
    currency: z.enum(['USDC', 'USD']).default('USDC'),
}).optional();
export type BudgetConstraint = z.infer<typeof BudgetConstraintSchema>;

export const DEFAULT_BUDGET_CAP = '10.00';
export const MAX_BUDGET_CAP = '1000.00';
