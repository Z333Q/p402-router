-- v2_022_model_prices.sql
-- Persistent model pricing table (synced hourly from OpenRouter)
-- Survives Redis restarts; enables price history and trend queries.

CREATE TABLE IF NOT EXISTS model_prices (
    id                  SERIAL PRIMARY KEY,
    model_id            TEXT NOT NULL,
    provider            TEXT NOT NULL,
    model_name          TEXT NOT NULL,
    description         TEXT,
    context_window      INTEGER NOT NULL DEFAULT 0,
    max_output_tokens   INTEGER NOT NULL DEFAULT 4096,
    input_per_1k        NUMERIC(12, 8) NOT NULL DEFAULT 0,
    output_per_1k       NUMERIC(12, 8) NOT NULL DEFAULT 0,
    capabilities        TEXT[] NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (model_id)
);

CREATE INDEX IF NOT EXISTS idx_model_prices_provider ON model_prices (provider);
CREATE INDEX IF NOT EXISTS idx_model_prices_input_cost ON model_prices (input_per_1k);
CREATE INDEX IF NOT EXISTS idx_model_prices_is_active ON model_prices (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_model_prices_synced_at ON model_prices (synced_at DESC);

-- Price history for trend tracking
CREATE TABLE IF NOT EXISTS model_price_history (
    id              SERIAL PRIMARY KEY,
    model_id        TEXT NOT NULL,
    input_per_1k    NUMERIC(12, 8) NOT NULL,
    output_per_1k   NUMERIC(12, 8) NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_price_history_model ON model_price_history (model_id, recorded_at DESC);
