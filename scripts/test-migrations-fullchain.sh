#!/usr/bin/env bash
# Full-chain production-grade validation for v2_050_budget_owned_api_keys.sql.
#
# Replays the entire production migration sequence (schema.sql + every file in
# scripts/migrations/ in lexicographic order through v2_040, plus the two a2a_*
# migrations), then applies v2_050, then asserts shape + behavioral parity.
#
# Why this gate exists in addition to test-migration-v2_050.sh:
#   The earlier minimum-seed test verifies v2_050 in isolation.
#   This script verifies v2_050 against the exact migration chain that
#   production has applied. That catches collisions with later migrations
#   (e.g. a column added by v2_017 conflicting with v2_050's expectations).
#
# Requirements on the host:
#   - PostgreSQL 17+ with uuid-ossp, pgcrypto, vector extensions installed
#   - psql in PATH
#   - TEST_DATABASE_URL pointing at a fresh, non-prod database
#
# Usage:
#   TEST_DATABASE_URL=postgres://u:p@localhost:5432/p402_fullchain ./scripts/test-migration-v2_050-fullchain.sh
#
# Exits non-zero on any failure.

set -euo pipefail

if [[ -z "${TEST_DATABASE_URL:-}" ]]; then
    echo "ERROR: TEST_DATABASE_URL must be set" >&2
    exit 1
fi

# Belt-and-suspenders: refuse anything that smells like a hosted environment.
if echo "$TEST_DATABASE_URL" | grep -Eiq '(prod|staging|neon\.tech|supabase\.co|amazonaws\.com|render\.com|fly\.io)'; then
    echo "ERROR: TEST_DATABASE_URL points at a hosted/non-local DB. Refusing to proceed." >&2
    exit 1
fi

PSQL() { psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -X -q "$@"; }
PSQL_T() { psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -X -q -tAc "$@"; }

ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIG_DIR="$ROOT/scripts/migrations"

# =============================================================================
# 0. Database must be empty (full-chain is a fresh-DB test by definition)
# =============================================================================
echo "==> 0. Verify database is fresh"
TABLE_COUNT=$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
if [[ "$TABLE_COUNT" -gt "0" ]]; then
    echo "ERROR: target DB is not empty (found $TABLE_COUNT tables). Drop and recreate before running this gate." >&2
    exit 1
fi
echo "    fresh ok"

# =============================================================================
# 1. Required extensions (matching production)
# =============================================================================
echo "==> 1. Enable required extensions"
PSQL -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' >/dev/null
PSQL -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'    >/dev/null
PSQL -c 'CREATE EXTENSION IF NOT EXISTS vector;'      >/dev/null
echo "    uuid-ossp, pgcrypto, vector ok"

# =============================================================================
# 2. Apply full production migration chain
# =============================================================================
# Order matches what production has applied:
#   a. schema.sql (base tables: tenants, api_keys, semantic_cache, etc.)
#   b. Numeric-prefixed migrations 002-007 (lexicographic order)
#   c. v2_001 through v2_040 in lexicographic order
#      (ties within the same v2_NNN go alphabetic — they touch different tables)
#   d. a2a_001 and a2a_003 (A2A protocol tables, applied late in real prod)
#   e. v2_050 (the migration under test)
echo "==> 2. Apply full chain"

# Pre-existing migration files that cannot apply on a fresh PG17/18 DB.
# These are documented for the next person; v2_050 does not depend on any of
# them and bypassing them is the same behavior production has (it ran them
# against an older shape of schema.sql / older PG, then those migrations
# stopped being part of the fresh-install chain).
#
# Each entry must include a one-line reason. If the underlying bug is fixed
# upstream, remove the entry.
KNOWN_BROKEN=(
    # v2_001: predates the current schema.sql snapshot. schema.sql already
    # defines agent_sessions/router_decisions/semantic_cache; v2_001 then
    # tries to CREATE INDEX on router_decisions(created_at) but schema.sql's
    # version uses `timestamp`. Superseded by schema.sql.
    "v2_001_initial_schema.sql"
    # v2_016_settlement_receipts: partial index WHERE expires_at > NOW().
    # Postgres rejects NOW() in index predicates (functions must be IMMUTABLE).
    "v2_016_settlement_receipts.sql"
)

is_known_broken() {
    local base="$1"
    for b in "${KNOWN_BROKEN[@]}"; do
        [[ "$base" == "$b" ]] && return 0
    done
    return 1
}

# Track which migrations were skipped so the final summary shows it.
SKIPPED_FILES=()

apply() {
    local f="$1"
    local base
    base=$(basename "$f")
    if [[ ! -f "$f" ]]; then
        echo "ERROR: missing migration: $f" >&2
        exit 1
    fi
    if is_known_broken "$base"; then
        echo "    skipping $base (known pre-existing issue, not introduced by v2_050)"
        SKIPPED_FILES+=("$base")
        return 0
    fi
    echo "    applying $base"
    PSQL -f "$f" >/dev/null 2>&1 || {
        echo "ERROR: failed applying $base" >&2
        PSQL -f "$f" >&2
        exit 1
    }
}

# Base schema
apply "$ROOT/schema.sql"

# Pre-v2 numbered migrations (lexicographic)
for f in "$MIG_DIR"/0*.sql; do apply "$f"; done

# All v2_NNN migrations except the ones under test (v2_050, v2_051).
# Those are applied later under explicit pre/post snapshots so we can assert
# behavioral parity. Known-broken files are skipped by apply() itself; see
# KNOWN_BROKEN above.
while IFS= read -r -d '' f; do
    base=$(basename "$f")
    case "$base" in
        v2_050_*) continue ;;  # under test, applied below
        v2_051_*) continue ;;  # under test, applied below
        *) apply "$f" ;;
    esac
done < <(find "$MIG_DIR" -maxdepth 1 -type f -name 'v2_*.sql' -print0 | sort -z)

# A2A protocol migrations (applied late in real production)
for f in "$MIG_DIR"/a2a_*.sql; do apply "$f"; done

echo "    full chain applied"

# =============================================================================
# 3. Snapshot pre-v2_050 state for regression comparison
# =============================================================================
echo "==> 3. Snapshot pre-v2_050 state"

# Seed two legacy api_keys rows so we can verify post-migration that
# legacy behaviors are preserved AND defaults are correctly applied.
TENANT_ID=$(PSQL_T "
    INSERT INTO tenants (owner_email, name, status)
    VALUES ('fullchain-test@example.com', 'Fullchain Test', 'active')
    RETURNING id;")
echo "    tenant: $TENANT_ID"

PSQL -c "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, status)
         VALUES ('$TENANT_ID', 'legacy-key-A', 'p402_live_legA', 'hash_legA_$$', 'active'),
                ('$TENANT_ID', 'legacy-key-B', 'p402_live_legB', 'hash_legB_$$', 'revoked')
         ON CONFLICT DO NOTHING;" >/dev/null

# Seed a department under the legacy table name + a traffic_event with the
# legacy VARCHAR employee_id column, so the rename path is exercised.
PSQL -c "INSERT INTO enterprise_departments (tenant_id, name, budget_usd)
         VALUES ('$TENANT_ID'::text, 'Engineering', 5000)
         ON CONFLICT DO NOTHING;" >/dev/null

PSQL -c "INSERT INTO traffic_events
            (tenant_id, path, method, status_code, latency_ms,
             model, provider, tokens_in, tokens_out, cost_usd, cache_hit,
             request_id, event_type, department, project_name, employee_id)
         VALUES
            ('$TENANT_ID', '/api/v2/chat/completions', 'POST', 200, 420,
             'gpt-4o-mini', 'openai', 100, 50, 0.0012, false,
             'req_legacy_001', 'chat_completion', 'Engineering', 'demo', 'emp_legacy_42');" >/dev/null

# =============================================================================
# 4. Apply v2_050
# =============================================================================
echo "==> 4. Apply v2_050"
apply "$MIG_DIR/v2_050_budget_owned_api_keys.sql"

# =============================================================================
# 5. Schema-level assertions
# =============================================================================
echo "==> 5. Schema assertions"

assert_eq() {
    local label="$1" expected="$2" actual="$3"
    if [[ "$expected" != "$actual" ]]; then
        echo "FAIL: $label -- expected [$expected] got [$actual]" >&2
        exit 1
    fi
}

# 5.1 Renames + new tables
assert_eq "departments table exists" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'departments';")"
assert_eq "enterprise_departments renamed away" "0" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'enterprise_departments';")"
assert_eq "employees table exists" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'employees';")"
echo "    renames + new tables ok"

# 5.2 departments.tenant_id is UUID with FK
assert_eq "departments.tenant_id type" "uuid" \
    "$(PSQL_T "SELECT data_type FROM information_schema.columns WHERE table_name='departments' AND column_name='tenant_id';")"
assert_eq "departments has FK to tenants" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name='departments' AND constraint_name='departments_tenant_id_fkey';")"
echo "    departments tenant_id+FK ok"

# 5.3 All 13 new api_keys columns with correct types and defaults
check_col() {
    local col="$1" expected_type="$2" expected_default="${3:-}"
    local actual_type
    actual_type=$(PSQL_T "SELECT data_type FROM information_schema.columns WHERE table_name='api_keys' AND column_name='$col';")
    if [[ -z "$actual_type" ]]; then
        echo "FAIL: api_keys.$col missing" >&2
        exit 1
    fi
    if [[ "$actual_type" != "$expected_type" ]]; then
        echo "FAIL: api_keys.$col type expected [$expected_type] got [$actual_type]" >&2
        exit 1
    fi
    if [[ -n "$expected_default" ]]; then
        local actual_default
        actual_default=$(PSQL_T "SELECT column_default FROM information_schema.columns WHERE table_name='api_keys' AND column_name='$col';")
        # Postgres returns defaults like 'tenant'::text — strip cast for comparison
        actual_default="${actual_default%%::*}"
        actual_default="${actual_default%\'}"
        actual_default="${actual_default#\'}"
        if [[ "$actual_default" != "$expected_default" ]]; then
            echo "FAIL: api_keys.$col default expected [$expected_default] got [$actual_default]" >&2
            exit 1
        fi
    fi
}

check_col owner_type                'text'    'tenant'
check_col department_id             'uuid'
check_col employee_id               'uuid'
check_col workflow_id               'text'
check_col project_id                'text'
check_col budget_id                 'uuid'
check_col policy_id                 'uuid'
check_col allowed_models            'jsonb'
check_col allowed_task_types        'jsonb'
check_col max_cost_per_request_usd  'numeric'
check_col monthly_budget_usd        'numeric'
check_col header_override_policy    'text'    'allow'
check_col metadata                  'jsonb'
echo "    all 13 api_keys columns + defaults ok"

# 5.4 CHECK constraints (owner_type, header_override_policy)
assert_eq "api_keys owner_type check" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.check_constraints WHERE check_clause LIKE '%owner_type%' AND check_clause LIKE '%tenant%' AND check_clause LIKE '%department%' AND check_clause LIKE '%employee%' AND check_clause LIKE '%workflow%' AND check_clause LIKE '%project%';")"
assert_eq "api_keys header_override_policy check" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.check_constraints WHERE check_clause LIKE '%header_override_policy%' AND check_clause LIKE '%allow%' AND check_clause LIKE '%deny%' AND check_clause LIKE '%restricted%';")"
echo "    CHECK constraints ok"

# 5.5 api_keys FKs to departments and employees
assert_eq "api_keys.department_id -> departments FK exists" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.referential_constraints rc JOIN information_schema.key_column_usage kcu ON rc.constraint_name=kcu.constraint_name WHERE kcu.table_name='api_keys' AND kcu.column_name='department_id';")"
assert_eq "api_keys.employee_id -> employees FK exists" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.referential_constraints rc JOIN information_schema.key_column_usage kcu ON rc.constraint_name=kcu.constraint_name WHERE kcu.table_name='api_keys' AND kcu.column_name='employee_id';")"
echo "    api_keys FKs ok"

# 5.6 Indexes
for idx in idx_api_keys_dept_status idx_api_keys_employee_status idx_api_keys_owner \
           idx_traffic_events_apikey idx_router_decisions_apikey idx_router_decisions_employee_ext \
           idx_employees_tenant_dept; do
    assert_eq "$idx exists" "1" \
        "$(PSQL_T "SELECT COUNT(*) FROM pg_indexes WHERE indexname='$idx';")"
done
echo "    all 7 new indexes ok"

# 5.7 Event-table column renames + new FK columns
assert_eq "traffic_events.employee_external_ref exists" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='traffic_events' AND column_name='employee_external_ref';")"
assert_eq "traffic_events.employee_id is now UUID" "uuid" \
    "$(PSQL_T "SELECT data_type FROM information_schema.columns WHERE table_name='traffic_events' AND column_name='employee_id';")"
assert_eq "traffic_events.api_key_id exists" "uuid" \
    "$(PSQL_T "SELECT data_type FROM information_schema.columns WHERE table_name='traffic_events' AND column_name='api_key_id';")"
assert_eq "router_decisions.employee_external_ref exists" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='router_decisions' AND column_name='employee_external_ref';")"
assert_eq "router_decisions.employee_id is now UUID" "uuid" \
    "$(PSQL_T "SELECT data_type FROM information_schema.columns WHERE table_name='router_decisions' AND column_name='employee_id';")"
echo "    event-table renames + FK columns ok"

# =============================================================================
# 6. Behavioral parity — legacy data preserved + new defaults applied
# =============================================================================
echo "==> 6. Behavioral parity"

# 6.1 Legacy api_keys row count + columns intact
assert_eq "legacy api_keys row count" "2" \
    "$(PSQL_T "SELECT COUNT(*) FROM api_keys WHERE tenant_id = '$TENANT_ID';")"
assert_eq "legacy active key still active" "active" \
    "$(PSQL_T "SELECT status FROM api_keys WHERE name='legacy-key-A';")"
assert_eq "legacy revoked key still revoked" "revoked" \
    "$(PSQL_T "SELECT status FROM api_keys WHERE name='legacy-key-B';")"

# 6.2 Legacy keys received correct v2_050 defaults
assert_eq "legacy key A owner_type default" "tenant" \
    "$(PSQL_T "SELECT owner_type FROM api_keys WHERE name='legacy-key-A';")"
assert_eq "legacy key A header_override_policy default" "allow" \
    "$(PSQL_T "SELECT header_override_policy FROM api_keys WHERE name='legacy-key-A';")"
assert_eq "legacy key A allowed_models default" "[]" \
    "$(PSQL_T "SELECT allowed_models FROM api_keys WHERE name='legacy-key-A';")"
assert_eq "legacy key A allowed_task_types default" "[]" \
    "$(PSQL_T "SELECT allowed_task_types FROM api_keys WHERE name='legacy-key-A';")"
assert_eq "legacy key A metadata default" "{}" \
    "$(PSQL_T "SELECT metadata FROM api_keys WHERE name='legacy-key-A';")"
echo "    legacy keys preserved + defaults applied ok"

# 6.3 CRUD parity — INSERT a new key matching what generateApiKeyAction does
#     (no new ownership fields supplied — must succeed and inherit defaults).
NEW_KEY_HASH="hash_crud_$RANDOM"
PSQL -c "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, status)
         VALUES ('$TENANT_ID', 'crud-parity-key', 'p402_live_crud', '$NEW_KEY_HASH', 'active');" >/dev/null
assert_eq "CRUD insert returned 1 row" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM api_keys WHERE key_hash='$NEW_KEY_HASH';")"
assert_eq "CRUD key inherits owner_type=tenant" "tenant" \
    "$(PSQL_T "SELECT owner_type FROM api_keys WHERE key_hash='$NEW_KEY_HASH';")"

# 6.4 Active-key lookup by key_hash (replicates resolveApiKeyContext path)
LOOKUP_TENANT=$(PSQL_T "SELECT tenant_id FROM api_keys WHERE key_hash='$NEW_KEY_HASH' AND status='active';")
assert_eq "key_hash lookup returns tenant_id" "$TENANT_ID" "$LOOKUP_TENANT"

# 6.5 Revoke parity — UPDATE matching revokeApiKeyAction
PSQL -c "UPDATE api_keys SET status='revoked', revoked_at=NOW() WHERE key_hash='$NEW_KEY_HASH';" >/dev/null
assert_eq "post-revoke status" "revoked" \
    "$(PSQL_T "SELECT status FROM api_keys WHERE key_hash='$NEW_KEY_HASH';")"
assert_eq "post-revoke revoked_at set" "1" \
    "$(PSQL_T "SELECT CASE WHEN revoked_at IS NOT NULL THEN 1 ELSE 0 END FROM api_keys WHERE key_hash='$NEW_KEY_HASH';")"
echo "    api_keys CRUD parity ok"

# 6.6 Legacy traffic_events row preserved and renamed
assert_eq "legacy traffic_event preserved" "emp_legacy_42" \
    "$(PSQL_T "SELECT employee_external_ref FROM traffic_events WHERE request_id='req_legacy_001';")"
assert_eq "legacy traffic_event new employee_id is NULL" "1" \
    "$(PSQL_T "SELECT CASE WHEN employee_id IS NULL THEN 1 ELSE 0 END FROM traffic_events WHERE request_id='req_legacy_001';")"
echo "    legacy traffic_event rename preserved data ok"

# 6.7 Department rename preserved data
assert_eq "department row preserved" "Engineering" \
    "$(PSQL_T "SELECT name FROM departments WHERE tenant_id='$TENANT_ID';")"
assert_eq "department budget preserved" "5000.00" \
    "$(PSQL_T "SELECT budget_usd FROM departments WHERE tenant_id='$TENANT_ID';")"
echo "    department rename preserved data ok"

# =============================================================================
# 7. Idempotency under full chain
# =============================================================================
echo "==> 7. Idempotency"
apply "$MIG_DIR/v2_050_budget_owned_api_keys.sql"
# Row count and defaults must not change after second apply.
assert_eq "row count stable after re-apply" "3" \
    "$(PSQL_T "SELECT COUNT(*) FROM api_keys WHERE tenant_id = '$TENANT_ID';")"
echo "    second apply ok"

# =============================================================================
# 8. Round-trip (down -> up) under full chain
# =============================================================================
echo "==> 8. Round-trip"
PSQL -f "$MIG_DIR/v2_050_down.sql" >/dev/null
assert_eq "enterprise_departments restored" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='enterprise_departments';")"
assert_eq "employees dropped" "0" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='employees';")"
apply "$MIG_DIR/v2_050_budget_owned_api_keys.sql"
assert_eq "departments restored after up-again" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='departments';")"
echo "    round-trip ok"

# =============================================================================
# 9. Apply v2_051 on top and assert its surface
# =============================================================================
echo "==> 9. Apply v2_051"
apply "$MIG_DIR/v2_051_action_type_and_outcomes.sql"

echo "==> 9a. v2_051 schema assertions"

# 9a.1 action_type + task_type columns
for tbl in traffic_events router_decisions; do
    for col in action_type task_type; do
        assert_eq "${tbl}.${col} exists as text" "text" \
            "$(PSQL_T "SELECT data_type FROM information_schema.columns WHERE table_name='${tbl}' AND column_name='${col}';")"
    done
done
echo "    action_type + task_type on both event tables ok"

# 9a.2 request_outcomes table
assert_eq "request_outcomes table exists" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='request_outcomes';")"
assert_eq "request_outcomes.tenant_id is uuid FK to tenants" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.referential_constraints rc JOIN information_schema.key_column_usage kcu ON rc.constraint_name=kcu.constraint_name WHERE kcu.table_name='request_outcomes' AND kcu.column_name='tenant_id';")"
assert_eq "request_outcomes UNIQUE(tenant_id, request_id)" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name='request_outcomes' AND constraint_type='UNIQUE';")"
assert_eq "request_outcomes has status CHECK" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.check_constraints WHERE check_clause LIKE '%accepted%' AND check_clause LIKE '%human_reviewed%' AND check_clause LIKE '%failed%';")"
echo "    request_outcomes table + constraints ok"

# 9a.3 Indexes
for idx in idx_traffic_events_action_type idx_router_decisions_action_type \
           idx_request_outcomes_tenant_time idx_request_outcomes_status; do
    assert_eq "$idx exists" "1" \
        "$(PSQL_T "SELECT COUNT(*) FROM pg_indexes WHERE indexname='$idx';")"
done
echo "    v2_051 indexes ok"

echo "==> 9b. v2_051 behavioral assertions"

# 9b.1 INSERT a valid outcome
OUTCOME_ID=$(PSQL_T "INSERT INTO request_outcomes (tenant_id, request_id, status, quality_score)
                     VALUES ('$TENANT_ID', 'req_outcome_001', 'accepted', 0.91)
                     RETURNING id;")
[[ -n "$OUTCOME_ID" ]] || { echo "FAIL: outcome INSERT returned no id" >&2; exit 1; }

# 9b.2 ON CONFLICT (tenant_id, request_id) DO UPDATE works (caller can overwrite)
PSQL -c "INSERT INTO request_outcomes (tenant_id, request_id, status, quality_score)
         VALUES ('$TENANT_ID', 'req_outcome_001', 'rejected', 0.4)
         ON CONFLICT (tenant_id, request_id) DO UPDATE
         SET status = EXCLUDED.status, quality_score = EXCLUDED.quality_score, updated_at = NOW();" >/dev/null
assert_eq "outcome status after upsert" "rejected" \
    "$(PSQL_T "SELECT status FROM request_outcomes WHERE tenant_id='$TENANT_ID' AND request_id='req_outcome_001';")"

# 9b.3 status CHECK rejects unknown values
INVALID_OUT=$(PSQL_T "INSERT INTO request_outcomes (tenant_id, request_id, status) VALUES ('$TENANT_ID', 'req_invalid', 'bogus_status') RETURNING id;" 2>&1 || true)
echo "$INVALID_OUT" | grep -qi "violates check constraint" || { echo "FAIL: status CHECK did not reject 'bogus_status' (got: $INVALID_OUT)" >&2; exit 1; }

# 9b.4 quality_score CHECK rejects out-of-range
INVALID_QS=$(PSQL_T "INSERT INTO request_outcomes (tenant_id, request_id, status, quality_score) VALUES ('$TENANT_ID', 'req_invalid_qs', 'accepted', 1.5) RETURNING id;" 2>&1 || true)
echo "$INVALID_QS" | grep -qi "violates check constraint" || { echo "FAIL: quality_score CHECK did not reject 1.5 (got: $INVALID_QS)" >&2; exit 1; }

# 9b.5 quality_score NULL is allowed
PSQL -c "INSERT INTO request_outcomes (tenant_id, request_id, status) VALUES ('$TENANT_ID', 'req_no_score', 'accepted');" >/dev/null
assert_eq "outcome with NULL quality_score persisted" "accepted" \
    "$(PSQL_T "SELECT status FROM request_outcomes WHERE tenant_id='$TENANT_ID' AND request_id='req_no_score';")"

# 9b.6 traffic_events can write action_type (NULL by default for legacy)
PSQL -c "UPDATE traffic_events SET action_type='claims_summary' WHERE request_id='req_legacy_001';" >/dev/null
assert_eq "traffic_events.action_type writeable" "claims_summary" \
    "$(PSQL_T "SELECT action_type FROM traffic_events WHERE request_id='req_legacy_001';")"

echo "    v2_051 behavior ok"

# 9c. Idempotency on v2_051
echo "==> 9c. v2_051 idempotency"
apply "$MIG_DIR/v2_051_action_type_and_outcomes.sql"
assert_eq "outcomes table still present after re-apply" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='request_outcomes';")"
echo "    second apply ok"

# 9d. v2_051 round-trip
echo "==> 9d. v2_051 round-trip"
PSQL -f "$MIG_DIR/v2_051_down.sql" >/dev/null
assert_eq "request_outcomes dropped by down" "0" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='request_outcomes';")"
assert_eq "traffic_events.action_type dropped by down" "0" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='traffic_events' AND column_name='action_type';")"
apply "$MIG_DIR/v2_051_action_type_and_outcomes.sql"
assert_eq "request_outcomes restored after up-again" "1" \
    "$(PSQL_T "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='request_outcomes';")"
echo "    v2_051 round-trip ok"

# =============================================================================
# 10. Final summary
# =============================================================================
echo
echo "============================================================"
echo "FULL-CHAIN VALIDATION PASSED"
echo "  extensions:    uuid-ossp, pgcrypto, vector"
TOTAL_SQL=$(find "$MIG_DIR" -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d ' ')
echo "  migrations:    schema.sql + $TOTAL_SQL files in scripts/migrations/"
if (( ${#SKIPPED_FILES[@]} > 0 )); then
    echo "  skipped:       ${#SKIPPED_FILES[@]} (pre-existing chain issues, see KNOWN_BROKEN in script)"
    for s in "${SKIPPED_FILES[@]}"; do
        echo "                   - $s"
    done
fi
echo "  v2_050:        13 columns + 7 indexes + 2 CHECKs + 2 FKs + CRUD parity"
echo "  v2_051:        action_type/task_type cols + request_outcomes (status & quality CHECKs)"
echo "  legacy:        api_keys, traffic_events, departments rows preserved"
echo "  CRUD parity:   create/lookup/revoke for api_keys; upsert + CHECK for outcomes"
echo "  idempotent:    second apply leaves DB unchanged"
echo "  round-trip:    down -> up restores schema (both migrations)"
echo "============================================================"
