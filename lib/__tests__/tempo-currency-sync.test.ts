/**
 * Tempo currency sync test
 * ========================
 * Asserts that TEMPO_SUPPORTED_CURRENCIES in lib/constants/tempo.ts
 * matches the supported_currencies JSONB stored in the DB for the
 * Tempo Mainnet Direct facilitator row.
 *
 * Fails loudly if code and DB drift apart. Run after every migration
 * that touches the Tempo facilitator row or the constants file.
 *
 * Gating: this test requires a real DB connection. vitest.config.ts hardcodes
 * DATABASE_URL to a localhost placeholder (no Postgres running), so we use a
 * separate env var that isn't clobbered by the Vitest environment config:
 *
 *   TEMPO_SYNC_TEST=true \
 *   TEMPO_SYNC_DATABASE_URL="postgresql://..." \
 *   npx vitest run lib/__tests__/tempo-currency-sync.test.ts
 *
 * Uses a raw pg.Pool directly — bypasses lib/db.ts so the vitest.config.ts
 * DATABASE_URL override has no effect.
 *
 * To enable in CI: add a real Postgres service, set both env vars, and the
 * test becomes load-bearing drift detection.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { TEMPO_SUPPORTED_CURRENCIES } from '../constants/tempo';

const TEMPO_FACILITATOR_ID = '20000000-0000-0000-0000-000000000008';

// Two-part gate: explicit opt-in AND a real connection string.
// TEMPO_SYNC_DATABASE_URL is intentionally separate from DATABASE_URL so
// vitest.config.ts's localhost placeholder can't shadow it.
const shouldRun =
    process.env.TEMPO_SYNC_TEST === 'true' &&
    !!process.env.TEMPO_SYNC_DATABASE_URL;

describe.skipIf(!shouldRun)('Tempo currency sync — constants vs DB', () => {
    let pool: Pool;
    let dbRows: Array<{
        symbol: string;
        contract: string;
        decimals: number;
        isDefault: boolean;
        verified: boolean;
    }> = [];

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.TEMPO_SYNC_DATABASE_URL });
        const result = await pool.query(
            `SELECT supported_currencies FROM facilitators WHERE id = $1`,
            [TEMPO_FACILITATOR_ID]
        );
        const row = result.rows[0] as { supported_currencies: typeof dbRows } | undefined;
        if (!row) throw new Error(`Tempo facilitator row not found (id: ${TEMPO_FACILITATOR_ID}). Run migrations v2_037 and v2_038 first.`);
        dbRows = row.supported_currencies;
    });

    afterAll(async () => {
        await pool?.end();
    });

    it('has the same number of currencies as the constants file', () => {
        expect(dbRows.length).toBe(TEMPO_SUPPORTED_CURRENCIES.length);
    });

    it('each constant entry matches the corresponding DB entry', () => {
        for (const expected of TEMPO_SUPPORTED_CURRENCIES) {
            const actual = dbRows.find((r) => r.symbol === expected.symbol);
            expect(
                actual,
                `Currency "${expected.symbol}" is in constants but missing from DB supported_currencies`
            ).toBeDefined();
            if (!actual) continue;

            expect(actual.contract.toLowerCase(), `Contract mismatch for ${expected.symbol}`)
                .toBe(expected.contract.toLowerCase());
            expect(actual.decimals, `Decimals mismatch for ${expected.symbol}`)
                .toBe(expected.decimals);
            expect(actual.isDefault, `isDefault mismatch for ${expected.symbol}`)
                .toBe(expected.isDefault);
            expect(actual.verified, `verified mismatch for ${expected.symbol}`)
                .toBe(expected.verified);
        }
    });

    it('DB has no extra entries not present in constants', () => {
        for (const dbRow of dbRows) {
            const inConstants = TEMPO_SUPPORTED_CURRENCIES.some((c) => c.symbol === dbRow.symbol);
            expect(
                inConstants,
                `DB has currency "${dbRow.symbol}" that is not in TEMPO_SUPPORTED_CURRENCIES`
            ).toBe(true);
        }
    });

    it('exactly one currency is marked isDefault in constants', () => {
        const defaults = TEMPO_SUPPORTED_CURRENCIES.filter((c) => c.isDefault);
        expect(defaults.length).toBe(1);
        expect(defaults[0]?.symbol).toBe('USDC.e');
    });

    it('exactly one currency is marked isDefault in DB', () => {
        const defaults = dbRows.filter((r) => r.isDefault);
        expect(defaults.length).toBe(1);
        expect(defaults[0]?.symbol).toBe('USDC.e');
    });
});
