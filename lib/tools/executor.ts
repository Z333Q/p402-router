/**
 * Tool Executor — Phase 3
 * ========================
 * Resolves a tool by name, calls its handler, and writes an audit row
 * to tool_executions.
 */

import db from '@/lib/db';
import { getToolHandler, getToolDefinition } from './registry';
import type { ToolResult } from './types';
import { ApiError } from '@/lib/errors';

export interface ToolCallContext {
    tenantId: string;
    requestId: string;
    traceNodeId?: string;
}

/**
 * Execute a named tool with the given args.
 * Writes an audit row to tool_executions (non-blocking on failure).
 */
export async function callTool(
    toolName: string,
    args: Record<string, unknown>,
    ctx: ToolCallContext
): Promise<ToolResult> {
    const { tenantId, requestId } = ctx;

    // Resolve handler: check tenant-scoped key first, then global
    const tenantKey = `${tenantId}:${toolName}`;
    const handler = getToolHandler(tenantKey) ?? getToolHandler(toolName);

    if (!handler) {
        throw new ApiError({
            code: 'EXECUTION_FAILED',
            status: 422,
            message: `Tool not found: ${toolName}`,
            requestId,
        });
    }

    // Load config from DB (for timeout, model, etc.)
    const definition = await getToolDefinition(toolName, tenantId).catch(() => null);
    const config = definition?.config ?? {};

    // Create audit row in running state
    const auditRow = await db.query(
        `INSERT INTO tool_executions
            (tenant_id, request_id, trace_node_id, tool_name, tool_definition_id,
             input_args, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'running')
         RETURNING id`,
        [
            tenantId,
            requestId,
            ctx.traceNodeId ?? null,
            toolName,
            definition?.id ?? null,
            JSON.stringify(args),
        ]
    );

    const executionId = (auditRow.rows as Array<{ id: string }>)[0]?.id;

    // Execute
    const result = await handler(args, config);

    // Update audit row (non-blocking)
    if (executionId) {
        db.query(
            `UPDATE tool_executions
             SET status = $1, output = $2, latency_ms = $3, error_message = $4
             WHERE id = $5`,
            [
                result.success ? 'completed' : 'failed',
                JSON.stringify(result.output),
                result.latencyMs,
                result.error ?? null,
                executionId,
            ]
        ).catch(() => null);
    }

    return result;
}
