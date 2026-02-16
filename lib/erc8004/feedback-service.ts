/**
 * ERC-8004 Feedback Service
 *
 * Orchestrates post-settlement reputation feedback.
 * Feedback is queued in PostgreSQL and batch-submitted on-chain by cron.
 */

import db from '../db';
import { giveFeedback, buildSettlementFeedback } from './reputation-client';

/**
 * Calculate a feedback score (0-100) from settlement metrics.
 *
 * Success settlements score 70-100 based on speed:
 *   - < 500ms:  100
 *   - < 1000ms: 90
 *   - < 2000ms: 80
 *   - >= 2000ms: 70
 *
 * Failed settlements score 0-30 based on error severity.
 */
export function calculateFeedbackValue(
  settled: boolean,
  latencyMs?: number,
  errorCode?: string
): number {
  if (!settled) {
    if (errorCode === 'REPLAY_DETECTED') return 30; // User error, not facilitator fault
    if (errorCode === 'VERIFICATION_FAILED') return 10;
    return 0;
  }

  if (!latencyMs || latencyMs < 500) return 100;
  if (latencyMs < 1000) return 90;
  if (latencyMs < 2000) return 80;
  return 70;
}

/**
 * Queue reputation feedback after a settlement.
 * Non-blocking — errors are logged but don't affect the settlement.
 */
export async function queueFeedback(params: {
  settled: boolean;
  facilitatorId: string;
  eventId?: string;
  agentId?: string;
  latencyMs?: number;
  errorCode?: string;
}): Promise<void> {
  const { settled, facilitatorId, eventId, latencyMs, errorCode } = params;

  // Look up the facilitator's ERC-8004 agent ID
  let agentId = params.agentId;
  if (!agentId) {
    const res = await db.query(
      'SELECT erc8004_agent_id FROM facilitators WHERE facilitator_id = $1',
      [facilitatorId]
    );
    agentId = res.rows[0]?.erc8004_agent_id;
  }

  if (!agentId) {
    // Facilitator doesn't have an ERC-8004 identity — skip
    return;
  }

  const value = calculateFeedbackValue(settled, latencyMs, errorCode);
  const tag1 = 'settlement';
  const tag2 = settled ? 'success' : 'failure';

  await db.query(
    `INSERT INTO erc8004_feedback (
      settlement_event_id, facilitator_id, agent_id, value, tag1, tag2, status
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [eventId || null, facilitatorId, agentId, value, tag1, tag2]
  );
}

/**
 * Process all pending feedback submissions.
 * Called by the cron job — submits feedback on-chain and updates status.
 */
export async function processPendingFeedback(): Promise<{
  submitted: number;
  failed: number;
}> {
  const pending = await db.query(
    `SELECT id, agent_id, value, tag1, tag2, feedback_uri
     FROM erc8004_feedback
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT 20`
  );

  let submitted = 0;
  let failed = 0;

  for (const row of pending.rows) {
    try {
      const feedbackUri = row.feedback_uri || '';
      const feedback = buildSettlementFeedback(
        BigInt(row.agent_id),
        row.value,
        row.tag1,
        row.tag2 || '',
        feedbackUri
      );

      const txHash = await giveFeedback(feedback);

      await db.query(
        `UPDATE erc8004_feedback
         SET status = 'submitted', tx_hash = $1, submitted_at = NOW()
         WHERE id = $2`,
        [txHash, row.id]
      );

      submitted++;
    } catch (err) {
      console.error(`[ERC8004] Feedback submission failed for ${row.id}:`, err);

      await db.query(
        `UPDATE erc8004_feedback SET status = 'failed' WHERE id = $1`,
        [row.id]
      );

      failed++;
    }
  }

  return { submitted, failed };
}
