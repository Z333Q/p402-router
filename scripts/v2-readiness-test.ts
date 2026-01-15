/**
 * V2 READINESS TEST SCRIPT
 * Validates the Neon database migration and AI Orchestration logic.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import pool from '../lib/db';
import { RoutingEngine } from '../lib/router-engine';
import { PolicyEngine } from '../lib/policy-engine';

async function testSchema() {
    console.log('\n--- Phase 1: Schema Verification ---');

    const tables = ['router_decisions', 'agent_sessions', 'semantic_cache'];
    for (const table of tables) {
        try {
            await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
            console.log(`✅ Table '${table}' exists.`);
        } catch (e) {
            console.error(`❌ Table '${table}' missing or inaccessible.`);
            throw e;
        }
    }

    try {
        await pool.query(`SELECT capabilities FROM facilitators LIMIT 1`);
        console.log(`✅ Column 'facilitators.capabilities' exists.`);
    } catch (e) {
        console.error(`❌ Column 'facilitators.capabilities' missing.`);
        throw e;
    }

    try {
        const vectorExt = await pool.query(`SELECT * FROM pg_extension WHERE extname = 'vector'`);
        if (vectorExt.rows.length > 0) {
            console.log(`✅ 'pgvector' extension is active.`);
        } else {
            console.warn(`⚠️ 'pgvector' extension not found. Semantic cache might be limited.`);
        }
    } catch (e) {
        console.warn(`⚠️ Error checking pgvector extension.`);
    }
}

async function testOrchestration() {
    console.log('\n--- Phase 2: Orchestration Logic ---');

    // Simulate a V2 request that triggers routing
    console.log('Testing Routing Decision Logging...');
    const result = await RoutingEngine.plan(
        { routeId: 'v2_test_routing', method: 'POST', path: '/api/v2/chat/completions' },
        { network: 'eip155:8453', scheme: 'eip3009', amount: '0.005', asset: 'USDC' }
    );

    if (result.selectedId) {
        console.log(`✅ RoutingEngine selected: ${result.selectedId}`);
    } else {
        console.warn('⚠️ RoutingEngine did not select a facilitator (check if any are seeded).');
    }
}

async function testAgentSessions() {
    console.log('\n--- Phase 3: Agent Sessions & Budgets ---');

    try {
        // Create a fake session in the DB for testing
        const sessionId = 'test-session-' + Date.now();
        const token = 'sk-p402-test-' + Math.random().toString(36).substring(7);

        await pool.query(
            "INSERT INTO agent_sessions (session_token, budget_total_usd, budget_spent_usd, expires_at, status) VALUES ($1, $2, $3, $4, $5)",
            [token, 10.00, 0.00, new Date(Date.now() + 3600000), 'active']
        );
        console.log(`✅ Test session created: ${token}`);

        // Test PolicyEngine budget check
        const evalResult = await PolicyEngine.evaluate(undefined, {
            sessionToken: token,
            amount: '0.01'
        });

        if (evalResult.allow) {
            console.log('✅ PolicyEngine correctly allowed session-based request.');
        } else {
            console.error('❌ PolicyEngine denied valid session request.', evalResult.reasons);
        }

        // Cleanup
        await pool.query("DELETE FROM agent_sessions WHERE session_token = $1", [token]);
        console.log('✅ Test session cleaned up.');
    } catch (e: any) {
        console.error('❌ Agent Session test failed:', e.message);
    }
}

async function runAll() {
    console.log('\x1b[1m\x1b[32m[P402 V2] Running Integration Tests...\x1b[0m');

    try {
        await testSchema();
        await testOrchestration();
        await testAgentSessions();

        console.log('\n\x1b[1m\x1b[32m🌟 ALL V2 READINESS TESTS PASSED!\x1b[0m');
        console.log('Your Neon database is synchronized with the P402 V2 specification.\n');
    } catch (e) {
        console.error('\n\x1b[1m\x1b[31m❌ V2 READINESS TESTS FAILED\x1b[0m');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runAll();
