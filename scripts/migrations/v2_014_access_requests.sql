-- v2_014_access_requests.sql
-- Creates the access_requests table used by /api/v1/access-request (beta signup form).
--
-- This table was previously only defined in schema.sql and DEPLOYMENT.md manual SQL.
-- This migration brings it into the numbered chain so it runs automatically.
--
-- Safe to run on DBs where the table already exists (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS access_requests (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email      TEXT        NOT NULL,
    company    TEXT,
    role       TEXT,
    rpd        TEXT,
    status     TEXT        NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_email
    ON access_requests (email);

CREATE INDEX IF NOT EXISTS idx_access_requests_status
    ON access_requests (status, created_at DESC);
