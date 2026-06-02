#!/usr/bin/env bash
# Real-Postgres validation for v2_050_budget_owned_api_keys.sql.
# Run manually against an isolated test DB before applying to staging/prod.
#
# Usage:
#   TEST_DATABASE_URL=postgres://u:p@localhost:5432/p402_test ./scripts/test-migration-v2_050.sh
#
# The script:
#   1. Asserts the test DB is NOT a known prod/staging URL (cheap belt-and-suspenders).
#   2. Applies prerequisite migrations (v2_001..v2_040) if a fresh DB.
#   3. Inserts a legacy-shape row in api_keys + enterprise_departments.
#   4. Runs v2_050.
#   5. Asserts new columns/tables/indexes exist with expected defaults.
#   6. Asserts the legacy row survived with sensible defaults.
#   7. Runs v2_050 again (idempotency check).
#   8. Runs v2_050_down then v2_050 again (round-trip check).

set -euo pipefail

if [[ -z "${TEST_DATABASE_URL:-}" ]]; then
    echo "ERROR: TEST_DATABASE_URL must be set" >&2
    exit 1
fi

# Refuse anything that smells like a real environment.
if echo "$TEST_DATABASE_URL" | grep -Eiq '(prod|staging|neon\.tech|supabase\.co|amazonaws\.com)'; then
    echo "ERROR: TEST_DATABASE_URL points at a hosted/non-local DB. Refusing to proceed." >&2
    exit 1
fi

PSQL() { psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 "$@"; }

ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIG_DIR="$ROOT/scripts/migrations"

echo "==> 0. Ensure required extensions exist"
PSQL -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS pgcrypto;' >/dev/null

echo "==> 1. Seed minimum pre-v2_050 schema"
# v2_050 depends on: tenants, api_keys, traffic_events, router_decisions,
# enterprise_departments. Create the minimum so this test runs without
# pgvector / the full production schema. Production migrations themselves
# are unchanged; this is test scaffolding only.
PSQL <<'EOF' >/dev/null
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(32) NOT NULL,
    key_hash VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'active',
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    department VARCHAR(255),
    project_name VARCHAR(255),
    employee_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS traffic_events (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    path TEXT NOT NULL,
    method VARCHAR(10),
    status_code INTEGER,
    latency_ms INTEGER,
    model TEXT,
    provider TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost_usd NUMERIC(18,8) DEFAULT 0,
    cache_hit BOOLEAN DEFAULT false,
    request_id TEXT,
    event_type TEXT,
    department TEXT,
    project_name TEXT,
    employee_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- router_decisions uses `timestamp` (NOT `created_at`) per schema.sql.
-- Match the production shape so this test catches v2_050 indexes that
-- reference the wrong column. (An earlier version used created_at and
-- masked a real bug in v2_050; that bug was caught by the full-chain
-- test and is fixed in v2_050; this seed now mirrors production.)
CREATE TABLE IF NOT EXISTS router_decisions (
    id BIGSERIAL PRIMARY KEY,
    request_id TEXT,
    tenant_id UUID,
    route_id TEXT,
    task TEXT,
    requested_mode TEXT,
    selected_provider_id TEXT,
    reason TEXT,
    alternatives JSONB,
    success BOOLEAN,
    cost_usd NUMERIC(18,8) DEFAULT 0,
    department TEXT,
    project_name TEXT,
    employee_id VARCHAR(255),
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enterprise_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    name TEXT NOT NULL,
    budget_usd NUMERIC(18,8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_depts_tenant ON enterprise_departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_router_decisions_employee
    ON router_decisions (tenant_id, employee_id)
    WHERE employee_id IS NOT NULL;
EOF
echo "    seed ok"

echo "==> 2. Seed legacy data"
TENANT_ID=$(PSQL -tAc "
    INSERT INTO tenants (owner_email, name, status)
    VALUES ('migration-test@example.com', 'Migration Test', 'active')
    ON CONFLICT DO NOTHING
    RETURNING id;
    SELECT id FROM tenants WHERE owner_email = 'migration-test@example.com';
" | tail -1)
echo "    tenant: $TENANT_ID"

PSQL -c "INSERT INTO enterprise_departments (tenant_id, name, budget_usd)
         VALUES ('$TENANT_ID', 'Engineering', 1000)
         ON CONFLICT DO NOTHING;" >/dev/null

PSQL -c "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, status)
         VALUES ('$TENANT_ID', 'legacy-key', 'p402_live_legacy', 'hash_legacy_$RANDOM', 'active')
         ON CONFLICT DO NOTHING;" >/dev/null

echo "==> 3. Apply v2_050"
PSQL -f "$MIG_DIR/v2_050_budget_owned_api_keys.sql" >/dev/null
echo "    applied"

echo "==> 4. Schema assertions"
PSQL -c "
DO \$\$
BEGIN
    ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments'), 'departments table missing';
    ASSERT NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_departments'), 'enterprise_departments should be renamed';
    ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees'), 'employees table missing';
    ASSERT (SELECT data_type FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'tenant_id') = 'uuid', 'departments.tenant_id should be uuid';
    ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'owner_type'), 'api_keys.owner_type missing';
    ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'monthly_budget_usd'), 'api_keys.monthly_budget_usd missing';
    ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'traffic_events' AND column_name = 'employee_external_ref'), 'traffic_events.employee_external_ref missing';
    ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'traffic_events' AND column_name = 'api_key_id'), 'traffic_events.api_key_id missing';
    ASSERT (SELECT data_type FROM information_schema.columns WHERE table_name = 'traffic_events' AND column_name = 'employee_id') = 'uuid', 'traffic_events.employee_id should be NEW uuid column';
END \$\$;
"
echo "    schema ok"

echo "==> 5. Legacy-row defaults"
LEGACY_OWNER_TYPE=$(PSQL -tAc "SELECT owner_type FROM api_keys WHERE name = 'legacy-key';")
LEGACY_OVERRIDE=$(PSQL -tAc "SELECT header_override_policy FROM api_keys WHERE name = 'legacy-key';")
[[ "$LEGACY_OWNER_TYPE" == "tenant" ]] || { echo "FAIL: legacy key owner_type = $LEGACY_OWNER_TYPE"; exit 1; }
[[ "$LEGACY_OVERRIDE" == "allow" ]]   || { echo "FAIL: legacy key header_override_policy = $LEGACY_OVERRIDE"; exit 1; }
echo "    legacy defaults preserved (owner_type=tenant, header_override_policy=allow)"

echo "==> 6. Idempotency"
PSQL -f "$MIG_DIR/v2_050_budget_owned_api_keys.sql" >/dev/null
echo "    second apply ok"

echo "==> 7. Round-trip (down -> up)"
PSQL -f "$MIG_DIR/v2_050_down.sql" >/dev/null
PSQL -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_departments'" | grep -q '1 row' || { echo "FAIL: down did not restore enterprise_departments"; exit 1; }
PSQL -f "$MIG_DIR/v2_050_budget_owned_api_keys.sql" >/dev/null
echo "    round-trip ok"

echo
echo "ALL CHECKS PASSED"
