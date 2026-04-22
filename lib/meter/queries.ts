// lib/meter/queries.ts
// Typed DB helpers for meter tables

import db from '@/lib/db';
import type { WorkOrder, PacketAsset, LedgerEvent } from './types';
import crypto from 'crypto';

// ============================================================================
// Work orders
// ============================================================================

export async function insertWorkOrder(
  wo: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WorkOrder> {
  const result = await db.query(
    `INSERT INTO meter_work_orders (
      tenant_id, session_id, request_id, workflow_type, packet_format,
      packet_summary, policy_summary, budget_cap_usd, approval_required,
      deidentified, review_mode, execution_mode, tool_trace, healthcare_extract, status, gemini_model
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *`,
    [
      wo.tenantId,
      wo.sessionId ?? null,
      wo.requestId,
      wo.workflowType,
      wo.packetFormat,
      wo.packetSummary ?? null,
      wo.policySummary ?? null,
      wo.budgetCapUsd,
      wo.approvalRequired,
      wo.deidentified,
      wo.reviewMode,
      wo.executionMode,
      JSON.stringify(wo.toolTrace),
      wo.healthcareExtract ? JSON.stringify(wo.healthcareExtract) : null,
      wo.status,
      wo.geminiModel ?? null,
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error('insertWorkOrder: no row returned');
  return mapWorkOrderRow(row);
}

export async function getWorkOrder(id: string): Promise<WorkOrder | null> {
  const result = await db.query(
    'SELECT * FROM meter_work_orders WHERE id = $1',
    [id]
  );
  const row = result.rows[0];
  return row ? mapWorkOrderRow(row) : null;
}

export async function updateWorkOrderStatus(
  id: string,
  status: WorkOrder['status'],
  sessionId?: string
): Promise<void> {
  await db.query(
    `UPDATE meter_work_orders SET status = $1, session_id = COALESCE($2, session_id), updated_at = NOW() WHERE id = $3`,
    [status, sessionId ?? null, id]
  );
}

function mapWorkOrderRow(row: Record<string, unknown>): WorkOrder {
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    sessionId: row['session_id'] as string | undefined,
    requestId: row['request_id'] as string,
    workflowType: row['workflow_type'] as WorkOrder['workflowType'],
    packetFormat: row['packet_format'] as WorkOrder['packetFormat'],
    packetSummary: row['packet_summary'] as string | undefined,
    policySummary: row['policy_summary'] as string | undefined,
    budgetCapUsd: Number(row['budget_cap_usd']),
    approvalRequired: Boolean(row['approval_required']),
    deidentified: Boolean(row['deidentified']),
    reviewMode: row['review_mode'] as WorkOrder['reviewMode'],
    executionMode: row['execution_mode'] as WorkOrder['executionMode'],
    toolTrace: Array.isArray(row['tool_trace'])
      ? (row['tool_trace'] as string[])
      : (JSON.parse(row['tool_trace'] as string) as string[]),
    status: row['status'] as WorkOrder['status'],
    geminiModel: row['gemini_model'] as string | undefined,
    healthcareExtract: row['healthcare_extract']
      ? (typeof row['healthcare_extract'] === 'string'
          ? JSON.parse(row['healthcare_extract'] as string)
          : row['healthcare_extract']) as WorkOrder['healthcareExtract']
      : undefined,
    createdAt: String(row['created_at']),
    updatedAt: String(row['updated_at']),
  };
}

// ============================================================================
// Packet assets
// ============================================================================

export async function insertPacketAsset(
  pa: Omit<PacketAsset, 'id' | 'createdAt'>
): Promise<PacketAsset> {
  const result = await db.query(
    `INSERT INTO meter_packet_assets (
      tenant_id, session_id, work_order_id, asset_type,
      storage_url, inline_content, sha256, source_label, deidentified, packet_type
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      pa.tenantId,
      pa.sessionId ?? null,
      pa.workOrderId ?? null,
      pa.assetType,
      pa.storageUrl ?? null,
      pa.inlineContent ?? null,
      pa.sha256 ?? null,
      pa.sourceLabel,
      pa.deidentified,
      pa.packetType,
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error('insertPacketAsset: no row returned');
  return {
    id: row['id'] as string,
    tenantId: row['tenant_id'] as string,
    sessionId: row['session_id'] as string | undefined,
    workOrderId: row['work_order_id'] as string | undefined,
    assetType: row['asset_type'] as PacketAsset['assetType'],
    storageUrl: row['storage_url'] as string | undefined,
    inlineContent: row['inline_content'] as string | undefined,
    sha256: row['sha256'] as string | undefined,
    sourceLabel: row['source_label'] as string,
    deidentified: Boolean(row['deidentified']),
    packetType: row['packet_type'] as PacketAsset['packetType'],
    createdAt: String(row['created_at']),
  };
}

// ============================================================================
// Nanopayment events
// ============================================================================

export async function insertLedgerEvent(
  event: Omit<LedgerEvent, 'id' | 'createdAt'>
): Promise<LedgerEvent> {
  const id = crypto.randomUUID();
  const costUsdcE6 = Math.round(event.costUsd * 1_000_000);
  const result = await db.query(
    `INSERT INTO nanopayment_events (
      id, session_id, work_order_id, tenant_id, event_kind,
      chunk_index, tokens_estimate, cost_usd, cost_usdc_e6, provisional,
      arc_tx_hash, arc_batch_id, arc_block, proof_ref
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      id,
      event.sessionId,
      event.workOrderId ?? null,
      event.sessionId, // tenant_id fallback; real impl passes tenantId
      event.eventKind,
      event.chunkIndex ?? null,
      event.tokensEstimate ?? null,
      event.costUsd,
      costUsdcE6,
      event.provisional,
      event.arcTxHash ?? null,
      event.arcBatchId ?? null,
      event.arcBlock ?? null,
      event.proofRef ?? null,
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error('insertLedgerEvent: no row returned');
  return {
    id: row['id'] as string,
    sessionId: row['session_id'] as string,
    workOrderId: row['work_order_id'] as string | undefined,
    eventKind: row['event_kind'] as LedgerEvent['eventKind'],
    chunkIndex: row['chunk_index'] as number | undefined,
    tokensEstimate: row['tokens_estimate'] as number | undefined,
    costUsd: Number(row['cost_usd']),
    costUsdcE6: Number(row['cost_usdc_e6']),
    provisional: Boolean(row['provisional']),
    arcTxHash: row['arc_tx_hash'] as string | undefined,
    arcBatchId: row['arc_batch_id'] as string | undefined,
    arcBlock: row['arc_block'] as number | undefined,
    proofRef: row['proof_ref'] as string | undefined,
    createdAt: String(row['created_at']),
  };
}

export async function getSessionLedgerEvents(sessionId: string): Promise<LedgerEvent[]> {
  const result = await db.query(
    'SELECT * FROM nanopayment_events WHERE session_id = $1 ORDER BY created_at ASC',
    [sessionId]
  );
  return result.rows.map((row) => ({
    id: row['id'] as string,
    sessionId: row['session_id'] as string,
    workOrderId: row['work_order_id'] as string | undefined,
    eventKind: row['event_kind'] as LedgerEvent['eventKind'],
    chunkIndex: row['chunk_index'] as number | undefined,
    tokensEstimate: row['tokens_estimate'] as number | undefined,
    costUsd: Number(row['cost_usd']),
    costUsdcE6: Number(row['cost_usdc_e6']),
    provisional: Boolean(row['provisional']),
    arcTxHash: row['arc_tx_hash'] as string | undefined,
    arcBatchId: row['arc_batch_id'] as string | undefined,
    arcBlock: row['arc_block'] as number | undefined,
    proofRef: row['proof_ref'] as string | undefined,
    createdAt: String(row['created_at']),
  }));
}
