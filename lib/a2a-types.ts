export type A2ARole = 'user' | 'agent' | 'system';

export interface A2APart {
    type: 'text' | 'data';
    text?: string;
    data?: any;
}

export interface A2AMessage {
    role: A2ARole;
    parts: A2APart[];
}

export interface A2AConfiguration {
    mode?: 'cost' | 'quality' | 'speed' | 'balanced';
    maxCost?: number;
    provider?: string;
    model?: string;
}

export type A2ATaskState = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TaskState = A2ATaskState; // Alias for compatibility

export interface A2ATaskArtifact {
    id: string;
    name: string;
    parts: A2APart[];
}

export interface A2ATaskStatus {
    state: A2ATaskState;
    message?: A2AMessage;
    timestamp: string; // ISO 8601
}

export interface A2ATask {
    id: string;
    contextId?: string;
    status: A2ATaskStatus;
    artifacts?: A2ATaskArtifact[];
    metadata?: {
        cost_usd?: number;
        latency_ms?: number;
        [key: string]: any;
    };
}

// AP2 Mandates
export type MandateType = 'intent' | 'cart' | 'payment';

export interface MandateConstraints {
    max_amount_usd: number;
    allowed_categories?: string[];
    valid_until?: string; // ISO 8601
}

export interface AP2Mandate {
    id: string;
    tenant_id: string;
    type: MandateType;
    user_did: string;
    agent_did: string;
    constraints: MandateConstraints;
    signature?: string;
    public_key?: string;
    amount_spent_usd: number;
    status: 'active' | 'exhausted' | 'expired' | 'revoked';
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    tags?: string[];
}

export interface Extension {
    uri: string;
    config?: any;
}

export interface AgentCard {
    protocolVersion: string;
    name: string;
    description: string;
    url: string;
    iconUrl?: string;
    version?: string;
    capabilities?: {
        streaming?: boolean;
        pushNotifications?: boolean;
        [key: string]: any;
    };
    skills?: Skill[];
    defaultInputModes?: string[];
    defaultOutputModes?: string[];
    extensions?: Extension[];
    endpoints?: {
        a2a?: {
            jsonrpc?: string;
            stream?: string;
        };
        [key: string]: any;
    };
}

// =============================================================================
// A2A x402 Extension (Payment Flow)
// =============================================================================

export const X402_EXTENSION_URI = 'tag:x402.org,2025:x402-payment';

export type X402PaymentScheme = 'exact' | 'onchain' | 'receipt';

export interface X402SchemeDetails {
    scheme: X402PaymentScheme;
    recipient: string;
    amount: string; // BigInt as string
    asset: string;  // e.g., 'USDC'
    network: string; // e.g., 'base'
    domain?: string; // EIP-3009 domain
    verifyingContract?: string; // EIP-3009
    nonce?: string;
    valid_until?: string;
}

export interface X402PaymentRequired {
    payment_id: string;
    schemes: X402SchemeDetails[];
    service_description: string;
    expires_at: string;
}

export interface X402PaymentSubmitted {
    payment_id: string;
    scheme: X402PaymentScheme;
    signature?: string; // For EIP-3009
    tx_hash?: string;   // For onchain
    receipt_id?: string; // For receipt reuse
}

export interface X402SettlementDetails {
    tx_hash: string;
    block_number?: number;
    amount_settled: string;
    fee_usd?: number;
}

export interface X402Receipt {
    receipt_id: string;
    signature: string;
    valid_until?: string;
}

export interface X402PaymentCompleted {
    payment_id: string;
    settlement?: X402SettlementDetails;
    receipt?: X402Receipt;
    status: 'completed' | 'failed';
}

export type X402MessageContent =
    | { type: 'payment-required'; data: X402PaymentRequired }
    | { type: 'payment-submitted'; data: X402PaymentSubmitted }
    | { type: 'payment-completed'; data: X402PaymentCompleted };

export interface X402Message {
    extension_uri: typeof X402_EXTENSION_URI;
    content: X402MessageContent;
}

// Additional helper types for the database/record
export type X402PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface X402PaymentRecord {
    payment_id: string;
    tenant_id: string;
    status: X402PaymentStatus;
    amount_usd: number;
    scheme: X402PaymentScheme;
    tx_hash?: string;
    receipt_id?: string;
    created_at: string;
    updated_at: string;
}
