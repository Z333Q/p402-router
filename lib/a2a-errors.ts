export const A2A_ERRORS = {
    PARSE_ERROR: { code: -32700, message: 'Parse error' },
    INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
    METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
    INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
    INTERNAL_ERROR: { code: -32603, message: 'Internal error' },

    // Application Errors
    TASK_NOT_FOUND: { code: -32001, message: 'Task not found' },
    UNAUTHORIZED: { code: -32004, message: 'Unauthorized' },
    BUDGET_EXCEEDED: { code: -32005, message: 'Budget exceeded' },
    PROVIDER_ERROR: { code: -32006, message: 'Provider error' },
    PAYMENT_REQUIRED: { code: -32007, message: 'Payment required' },
};

export class A2AError extends Error {
    code: number;
    data?: any;

    constructor(err: { code: number, message: string }, data?: any) {
        super(err.message);
        this.code = err.code;
        this.data = data;
    }

    toJSON(id: string | number | null = null) {
        return {
            jsonrpc: '2.0',
            error: {
                code: this.code,
                message: this.message,
                data: this.data
            },
            id
        };
    }
}
