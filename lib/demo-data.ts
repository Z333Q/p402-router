// Mock Data for the UI
export const REQUEST_DATA = {
    method: 'POST',
    url: 'https://api.p402.io/v1/agent/inference',
    headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'X-Agent-ID', value: 'did:p402:agent:1234...' },
    ],
    body: '{\n  "task": "complex_reasoning",\n  "model": "llama-3-70b-instruct",\n  "max_tokens": 1024\n}'
};

export const RESPONSE_402 = {
    status: '402 Payment Required',
    headers: [
        { key: 'WWW-Authenticate', value: 'P402 token="base:0x123..."' },
        { key: 'X-P402-Cost', value: '0.05 USDC' },
        { key: 'X-P402-Chain', value: '8453 (Base)' },
    ],
    body: '{\n  "error": "payment_required",\n  "mandate": {\n    "chain_id": 8453,\n    "token": "USDC",\n    "amount": 0.05,\n    "recipient": "0xFacilitator..."\n  }\n}'
};

export const RESPONSE_200 = {
    status: '200 OK',
    headers: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'X-P402-Balance', value: '4.95 USDC' },
    ],
    body: '{\n  "result": "Analysis complete...",\n  "usage": {\n    "prompt_tokens": 150,\n    "completion_tokens": 85,\n    "cost": "0.05 USDC"\n  }\n}'
};

export const RECEIPT_DATA = {
    id: "rcpt_base_0x9f8e...",
    chain: "Base Mainnet",
    token: "USDC",
    amount: 0.05,
    status: "settled",
    tx_hash: "0x7d3c2b1a..."
};

export const LOGS_DATA = [
    "POST /v1/agent/inference",
    "Gateway: 402 Payment Required (0.05 USDC)",
    "Agent: Signing EIP-712 Mandate...",
    "Wallet: Signature generated (0xabc...)",
    "P402: Verifying payment capability...",
    "Settlement: Gasless USDC transfer on Base",
    "Retry: POST with P402-Authorization",
    "Success: 200 OK"
];

export const AUDIT_FINDINGS = [
    { rule: "P402-SIG-EIP712", severity: "HIGH", status: "FAIL", evidence: "Invalid domain separator" },
    { rule: "P402-COST-LIMIT", severity: "MEDIUM", status: "PASS", evidence: "0.05 < 1.00 USDC" },
    { rule: "P402-CHAIN-ID", severity: "LOW", status: "PASS", evidence: "Chain 8453 (Base)" },
];

export const AUDIT_DETAILS = {
    rule_id: "P402-SIG-EIP712",
    request_id: "req_base_9f8e7d6c",
    tx_hash: "0x1a2b3c4d...",
    deny_code: "SIG_INVALID"
};
