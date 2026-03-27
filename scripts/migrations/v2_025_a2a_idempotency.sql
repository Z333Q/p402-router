-- A2A idempotency key support
-- Prevents duplicate task creation on retried requests.
-- Clients should set the Idempotency-Key header; the key is scoped per tenant.

ALTER TABLE a2a_tasks
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

-- Unique per (tenant_id, idempotency_key) — NULL values are excluded from the constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_a2a_tasks_idempotency
    ON a2a_tasks (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
