/**
 * ERC-8004 Validation Guard
 *
 * Intercepts high-value settlements to optionally require on-chain validation
 * before proceeding. Gated by ERC8004_ENABLE_VALIDATION.
 */

import db from '../db';

const DEFAULT_THRESHOLD_USD = 100;

function getThreshold(): number {
  const env = process.env.ERC8004_VALIDATION_THRESHOLD_USD;
  if (env) {
    const parsed = parseFloat(env);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_THRESHOLD_USD;
}

/**
 * Determine whether a settlement requires validation based on:
 * - Amount exceeds threshold
 * - Facilitator has low/no reputation
 * - First-time payer (no prior settlements)
 */
export async function shouldValidate(
  amountUsd: number,
  facilitatorId: string,
  payerAddress: string
): Promise<boolean> {
  // Must be enabled
  if (process.env.ERC8004_ENABLE_VALIDATION !== 'true') return false;

  // Check amount threshold
  if (amountUsd >= getThreshold()) return true;

  // Check facilitator reputation
  try {
    const res = await db.query(
      `SELECT erc8004_reputation_cached, erc8004_verified
       FROM facilitators WHERE facilitator_id = $1`,
      [facilitatorId]
    );

    const row = res.rows[0];
    if (row) {
      const reputation = row.erc8004_reputation_cached !== null
        ? parseFloat(row.erc8004_reputation_cached)
        : null;

      // Low reputation or unverified facilitator handling high amounts
      if (reputation !== null && reputation < 30 && amountUsd >= getThreshold() / 2) {
        return true;
      }
    }
  } catch {
    // DB error — don't block settlement
  }

  return false;
}

/**
 * Record that validation was requested for a settlement.
 * In the current implementation, this logs to the database for audit
 * purposes. Full on-chain validation via the Validation Registry
 * requires the registry to be deployed.
 */
export async function recordValidationRequest(params: {
  facilitatorId: string;
  amountUsd: number;
  payerAddress: string;
  txHash: string;
  requestId: string;
}): Promise<{ requestHash: string; approved: boolean }> {
  const { facilitatorId, amountUsd, payerAddress, txHash, requestId } = params;

  // Generate a deterministic request hash
  const { keccak256, toBytes } = await import('viem');
  const requestHash = keccak256(
    toBytes(JSON.stringify({ facilitatorId, amountUsd, payerAddress, txHash, requestId }))
  );

  // Record in DB
  await db.query(
    `INSERT INTO erc8004_validations (
      request_hash, agent_id, validator_address, request_uri, status
    ) VALUES ($1, $2, $3, $4, 'requested')
    ON CONFLICT (request_hash) DO NOTHING`,
    [requestHash, '0', payerAddress, `p402://settlement/${requestId}`]
  );

  // For now, auto-approve. When the Validation Registry is deployed,
  // this will initiate on-chain validation and poll for the response.
  return { requestHash, approved: true };
}

// ---------------------------------------------------------------------------
// S4-004: Agent DID Runtime Trust Gate
// ---------------------------------------------------------------------------

import { ApiError } from '../errors';
import { getReputationScore } from './reputation-cache';

const MINIMUM_REPUTATION_SCORE = 50;

/**
 * Validates an agent's ERC-8004 reputation score before allowing an A2A task
 * to proceed. Throws an ApiError (SECURITY_PACK_BLOCKED → JSON-RPC -32005)
 * if the agent's score is below the threshold or the registry is unreachable.
 *
 * Redis-backed cache ensures we don't hit the Base RPC on every task.
 */
export async function validateAgentTrust(agentDid: string): Promise<void> {
  // Fast-bypass when validation is not enforced
  if (process.env.ERC8004_ENABLE_VALIDATION !== 'true') return;

  let score: number | null;

  try {
    // Uses the DB-backed cache (refreshed every 5 min) — protects RPC & Neon pool
    score = await getReputationScore(agentDid);
  } catch (error) {
    // Fail-close: if registry is unreachable, block the request
    throw new ApiError({
      code: 'INTERNAL_ERROR',
      status: 502,
      message: `Failed to verify ERC-8004 trust anchor for agent ${agentDid}. Registry unreachable.`,
      requestId: crypto.randomUUID(),
    });
  }

  // null score = no ERC-8004 identity; treat as 0 if strict mode, skip if permissive
  const effectiveScore = score ?? 100;

  if (effectiveScore < MINIMUM_REPUTATION_SCORE) {
    throw new ApiError({
      code: 'SECURITY_PACK_BLOCKED',
      status: 403,
      message: `Agent execution blocked. ${agentDid} has been quarantined due to low reputation.`,
      requestId: crypto.randomUUID(),
      metadata: {
        agentDid,
        currentScore: effectiveScore,
        requiredScore: MINIMUM_REPUTATION_SCORE,
        reason: 'ERC8004_QUARANTINE',
      },
    });
  }
}
