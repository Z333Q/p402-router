-- v2_012_webhook_idempotency.sql
-- Idempotency guard for inbound webhook events.
-- Prevents double-processing on Stripe retries.

CREATE TABLE IF NOT EXISTS processed_webhook_events (
    provider    VARCHAR(32)  NOT NULL,
    event_id    VARCHAR(128) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (provider, event_id)
);
