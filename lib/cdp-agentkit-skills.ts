/**
 * cdp-agentkit-skills.ts
 * ======================
 * Registers Coinbase CDP / AgentKit capabilities as Bazaar listings so that
 * A2A orchestration can discover and delegate to CDP-backed agent skills.
 *
 * Skills exposed:
 *  • cdp:wallet-provision  — On-demand agent wallet creation via CDP Server Wallet
 *  • cdp:eip3009-sign      — Sign an EIP-3009 TransferWithAuthorization from a CDP wallet
 *  • cdp:send-usdc         — Transfer USDC on Base (wraps CDP Server Wallet transfer)
 *  • cdp:deploy-token      — Deploy an ERC-20 token via AgentKit (dev tooling)
 *  • x402:auto-settle      — Autonomous x402 payment settlement using session budget
 *
 * These are seeded by running `npx tsx scripts/seed-cdp-skills.ts` (see that file).
 * They can also be ingested at runtime via this module's exported functions.
 */

import pool from '@/lib/db';
import { randomUUID } from 'crypto';

export interface CdpSkillDefinition {
    skill_id: string;
    name: string;
    description: string;
    tags: string[];
    extension_uri?: string;
    input_schema: object;
    output_schema: object;
    pricing_model: 'free' | 'per_call';
    pricing_amount_usd?: number;
}

export const CDP_AGENTKIT_SKILLS: CdpSkillDefinition[] = [
    {
        skill_id: 'cdp:wallet-provision',
        name: 'CDP Agent Wallet Provision',
        description:
            'Provisions a new CDP Server Wallet for an agent ID. Keys are stored in AWS Nitro ' +
            'Enclave (TEE) — no mnemonic or private key is ever exposed. Returns the wallet address.',
        tags: ['wallet', 'cdp', 'onchain', 'identity'],
        input_schema: {
            type: 'object',
            required: ['agent_id'],
            properties: {
                agent_id: { type: 'string', description: 'Unique agent identifier' },
                budget_usd: { type: 'number', description: 'Optional spending cap in USD' },
            },
        },
        output_schema: {
            type: 'object',
            properties: {
                address: { type: 'string' },
                cdp_wallet_name: { type: 'string' },
                policy_id: { type: 'string', nullable: true },
            },
        },
        pricing_model: 'free',
    },
    {
        skill_id: 'cdp:eip3009-sign',
        name: 'CDP EIP-3009 Authorization Signer',
        description:
            'Signs an EIP-3009 TransferWithAuthorization from a previously provisioned CDP Server ' +
            'Wallet. Used to authorize USDC transfers without user gas. Compatible with P402 x402 facilitator.',
        tags: ['wallet', 'cdp', 'eip3009', 'usdc', 'signing'],
        extension_uri: 'tag:x402.org,2025:x402-payment',
        input_schema: {
            type: 'object',
            required: ['wallet_address', 'to', 'value', 'valid_after', 'valid_before', 'nonce'],
            properties: {
                wallet_address: { type: 'string' },
                to: { type: 'string', description: 'Recipient address' },
                value: { type: 'string', description: 'Amount in atomic USDC units (6 decimals)' },
                valid_after: { type: 'string' },
                valid_before: { type: 'string' },
                nonce: { type: 'string', description: 'bytes32 nonce' },
            },
        },
        output_schema: {
            type: 'object',
            properties: {
                signature: { type: 'string' },
                authorization: { type: 'object' },
            },
        },
        pricing_model: 'free',
    },
    {
        skill_id: 'cdp:send-usdc',
        name: 'CDP USDC Transfer',
        description:
            'Transfers USDC on Base Mainnet from an agent CDP wallet to a recipient address. ' +
            'Gas is paid by the CDP facilitator (EIP-3009 gasless). Respects per-session spending caps.',
        tags: ['wallet', 'cdp', 'usdc', 'payment', 'base'],
        extension_uri: 'tag:x402.org,2025:x402-payment',
        input_schema: {
            type: 'object',
            required: ['from_agent_id', 'to', 'amount_usd'],
            properties: {
                from_agent_id: { type: 'string' },
                to: { type: 'string', description: 'Recipient address or ENS' },
                amount_usd: { type: 'number', description: 'Amount in USD' },
                memo: { type: 'string' },
            },
        },
        output_schema: {
            type: 'object',
            properties: {
                tx_hash: { type: 'string' },
                amount_usdc: { type: 'string' },
                gas_paid_by: { type: 'string' },
            },
        },
        pricing_model: 'per_call',
        pricing_amount_usd: 0.001,
    },
    {
        skill_id: 'x402:auto-settle',
        name: 'x402 Autonomous Payment Settlement',
        description:
            'Autonomously settles an x402 payment-required challenge using the agent session budget. ' +
            'Verifies the payment requirement, signs with the session CDP wallet, and settles via ' +
            'P402 facilitator. Emits payment-completed on success.',
        tags: ['x402', 'payment', 'autonomous', 'cdp', 'usdc', 'base'],
        extension_uri: 'tag:x402.org,2025:x402-payment',
        input_schema: {
            type: 'object',
            required: ['payment_required', 'session_id'],
            properties: {
                payment_required: {
                    type: 'object',
                    description: 'The X402PaymentRequired object from the remote agent',
                },
                session_id: { type: 'string' },
                max_amount_usd: { type: 'number', description: 'Guard: refuse if amount exceeds this' },
            },
        },
        output_schema: {
            type: 'object',
            properties: {
                payment_id: { type: 'string' },
                tx_hash: { type: 'string', nullable: true },
                receipt_id: { type: 'string', nullable: true },
                status: { type: 'string', enum: ['completed', 'failed'] },
            },
        },
        pricing_model: 'free',
    },
];

/**
 * Upserts all CDP AgentKit skills into the bazaar_agents table so they are
 * discoverable via GET /api/a2a/agents.
 *
 * This is idempotent — safe to call on every cold start or from a seed script.
 */
export async function seedCdpAgentKitSkills(): Promise<void> {
    const agentId = 'cdp-agentkit-builtin';
    const agentUrl = process.env.NEXTAUTH_URL ?? 'https://p402.io';

    // Upsert the CDP AgentKit agent card entry
    await pool.query(
        `INSERT INTO bazaar_agents (
            id, name, description, url, protocol_version,
            capabilities, skills, extensions, status, trust_score,
            source, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, '1.0', $5, $6, $7, 'active', 1.0, 'cdp-builtin', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
            skills = EXCLUDED.skills,
            capabilities = EXCLUDED.capabilities,
            updated_at = NOW()`,
        [
            agentId,
            'CDP AgentKit Built-in Skills',
            'Native Coinbase CDP wallet provisioning, EIP-3009 signing, and x402 autonomous settlement skills',
            agentUrl,
            JSON.stringify({
                streaming: false,
                pushNotifications: false,
                cdpServerWallet: true,
                x402: true,
            }),
            JSON.stringify(
                CDP_AGENTKIT_SKILLS.map(s => ({
                    id: s.skill_id,
                    name: s.name,
                    description: s.description,
                    tags: s.tags,
                    inputSchema: s.input_schema,
                    outputSchema: s.output_schema,
                    pricing: s.pricing_model === 'free'
                        ? { model: 'free' }
                        : { model: 'per_call', amount: s.pricing_amount_usd, unit: 'USD' },
                }))
            ),
            JSON.stringify([
                { uri: 'tag:x402.org,2025:x402-payment', required: false },
                { uri: 'tag:cdp.coinbase.com,2025:server-wallet', required: false },
            ]),
        ]
    );
}

/**
 * Look up a CDP skill definition by ID.
 */
export function getCdpSkill(skillId: string): CdpSkillDefinition | undefined {
    return CDP_AGENTKIT_SKILLS.find(s => s.skill_id === skillId);
}

/**
 * Returns skill IDs that are safe for autonomous execution
 * (i.e., don't require a new signature from the user).
 */
export const AUTONOMOUS_SKILL_IDS = new Set([
    'x402:auto-settle',
    'cdp:eip3009-sign',
]);
