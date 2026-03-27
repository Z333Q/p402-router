/**
 * Tool Registry — Phase 3
 * ========================
 * Maintains an in-process map of tool name → handler.
 * Built-ins are registered at module load time.
 * Tenant-custom tools are registered from DB rows on first use.
 */

import db from '@/lib/db';
import type { ToolDefinition, ToolHandler, RegisteredTool } from './types';
import { webSearchHandler, httpFetchHandler } from './built-ins';

// ── In-process registry ───────────────────────────────────────────────────────

const handlers = new Map<string, ToolHandler>();

// Register all built-ins at module load
handlers.set('web_search', webSearchHandler);
handlers.set('http_fetch', httpFetchHandler);

export function getToolHandler(name: string): ToolHandler | undefined {
    return handlers.get(name);
}

export function registerTool(name: string, handler: ToolHandler): void {
    handlers.set(name, handler);
}

export function listRegisteredNames(): string[] {
    return Array.from(handlers.keys());
}

// ── DB-backed operations ──────────────────────────────────────────────────────

/** Returns all tools available to a tenant (built-ins + their custom tools). */
export async function listAvailableTools(tenantId: string): Promise<ToolDefinition[]> {
    const result = await db.query(
        `SELECT id, tenant_id, name, description, input_schema,
                is_builtin, enabled, config
         FROM tool_definitions
         WHERE enabled = true
           AND (tenant_id IS NULL OR tenant_id = $1)
         ORDER BY is_builtin DESC, name ASC`,
        [tenantId]
    );

    return (result.rows as Array<{
        id: string;
        tenant_id: string | null;
        name: string;
        description: string;
        input_schema: Record<string, unknown>;
        is_builtin: boolean;
        enabled: boolean;
        config: Record<string, unknown>;
    }>).map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        inputSchema: row.input_schema,
        isBuiltin: row.is_builtin,
        enabled: row.enabled,
        config: row.config,
    }));
}

/** Returns a single tool definition (built-in or tenant-scoped). */
export async function getToolDefinition(
    name: string,
    tenantId: string
): Promise<ToolDefinition | null> {
    const result = await db.query(
        `SELECT id, tenant_id, name, description, input_schema,
                is_builtin, enabled, config
         FROM tool_definitions
         WHERE name = $1
           AND enabled = true
           AND (tenant_id IS NULL OR tenant_id = $2)
         ORDER BY tenant_id NULLS LAST
         LIMIT 1`,
        [name, tenantId]
    );

    const row = (result.rows as Array<{
        id: string;
        tenant_id: string | null;
        name: string;
        description: string;
        input_schema: Record<string, unknown>;
        is_builtin: boolean;
        enabled: boolean;
        config: Record<string, unknown>;
    }>)[0];

    if (!row) return null;

    return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        inputSchema: row.input_schema,
        isBuiltin: row.is_builtin,
        enabled: row.enabled,
        config: row.config,
    };
}

/** Create a new tenant-custom tool. */
export async function createCustomTool(
    tenantId: string,
    tool: Omit<RegisteredTool['definition'], 'tenantId' | 'isBuiltin'>,
    handler?: ToolHandler
): Promise<ToolDefinition> {
    const result = await db.query(
        `INSERT INTO tool_definitions
            (tenant_id, name, description, input_schema, is_builtin, enabled, config)
         VALUES ($1, $2, $3, $4, false, $5, $6)
         RETURNING id, tenant_id, name, description, input_schema, is_builtin, enabled, config`,
        [
            tenantId,
            tool.name,
            tool.description,
            JSON.stringify(tool.inputSchema),
            tool.enabled ?? true,
            JSON.stringify(tool.config ?? {}),
        ]
    );

    const row = (result.rows as Array<{
        id: string;
        tenant_id: string | null;
        name: string;
        description: string;
        input_schema: Record<string, unknown>;
        is_builtin: boolean;
        enabled: boolean;
        config: Record<string, unknown>;
    }>)[0];

    if (!row) throw new Error('Insert returned no row');

    if (handler) {
        handlers.set(`${tenantId}:${tool.name}`, handler);
    }

    return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        inputSchema: row.input_schema,
        isBuiltin: row.is_builtin,
        enabled: row.enabled,
        config: row.config,
    };
}
