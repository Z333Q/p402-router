/**
 * Tool Registry Types — Phase 3
 */

export interface ToolDefinition {
    id: string;
    tenantId: string | null;   // null = built-in (global)
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    isBuiltin: boolean;
    enabled: boolean;
    config: Record<string, unknown>;
}

export interface ToolResult {
    success: boolean;
    output: unknown;
    /** Text representation of the output, used for context packing */
    text: string;
    latencyMs: number;
    error?: string;
}

export type ToolHandler = (
    args: Record<string, unknown>,
    config: Record<string, unknown>
) => Promise<ToolResult>;

export interface RegisteredTool {
    definition: Omit<ToolDefinition, 'id'>;
    handler: ToolHandler;
}
