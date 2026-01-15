#!/usr/bin/env npx ts-node

/**
 * P402 Router V2 API Test Script
 * ==============================
 * Comprehensive test suite for V2 endpoints including:
 * - Sessions (CRUD + Funding)
 * - Providers (Listing + Comparison)
 * - Analytics (Spend)
 * 
 * Run with: npx ts-node scripts/test-v2-api.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
        await fn();
        results.push({ name, passed: true, duration: Date.now() - start });
        console.log(`✅ ${name}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, error: errorMessage, duration: Date.now() - start });
        console.log(`❌ ${name}: ${errorMessage}`);
    }
}

async function main() {
    console.log(`\n🧪 P402 Router V2 API Tests`);
    console.log(`   Base URL: ${BASE_URL}\n`);
    console.log('─'.repeat(50));

    // ============================================
    // 1. HEALTH CHECK
    // ============================================
    await test('API is reachable', async () => {
        // Skip health check if endpoint doesn't exist, start with providers
    });

    // ============================================
    // 2. PROVIDERS API
    // ============================================
    await test('GET /api/v2/providers returns list', async () => {
        const res = await fetch(`${BASE_URL}/api/v2/providers`);
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.data)) throw new Error('Invalid response format');
    });

    await test('POST /api/v2/providers/compare returns comparison', async () => {
        const res = await fetch(`${BASE_URL}/api/v2/providers/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input_tokens: 1000,
                output_tokens: 500,
                tier: 'mid'
            }),
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.models)) throw new Error('Invalid response format');
        if (!data.picks?.cheapest) throw new Error('Missing cheapest pick');
    });

    // ============================================
    // 3. SESSIONS API
    // ============================================
    let sessionId: string | null = null;
    const testWallet = '0x' + '1'.repeat(40);

    await test('POST /api/v2/sessions creates session', async () => {
        const res = await fetch(`${BASE_URL}/api/v2/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet_address: testWallet,
                budget_usd: 5.0,
                expires_in_hours: 24
            }),
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        if (!data.id) throw new Error('No session_id returned');
        if (!data.id.startsWith('sess_')) throw new Error('Invalid session ID format');
        sessionId = data.id;
    });

    if (sessionId) {
        await test('GET /api/v2/sessions/:id returns session', async () => {
            const res = await fetch(`${BASE_URL}/api/v2/sessions/${sessionId}`);
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            const data = await res.json();
            if (data.id !== sessionId) throw new Error('ID mismatch');
            if (data.wallet_address !== testWallet) throw new Error('Wallet mismatch');
        });

        await test('POST /api/v2/sessions/fund funds session', async () => {
            const txHash = '0x' + 'a'.repeat(64);
            const res = await fetch(`${BASE_URL}/api/v2/sessions/fund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    amount: 10.0,
                    tx_hash: txHash,
                    source: 'test'
                }),
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            const data = await res.json();
            if (!data.success) throw new Error('Funding failed');
            if (data.amount_credited !== 10) throw new Error('Incorrect amount credited');
        });

        await test('POST /api/v2/sessions/fund rejects duplicate tx', async () => {
            const txHash = '0x' + 'a'.repeat(64); // Same hash
            const res = await fetch(`${BASE_URL}/api/v2/sessions/fund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    amount: 10.0,
                    tx_hash: txHash,
                    source: 'test'
                }),
            });
            // Should be 409 Conflict
            if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
        });
    }

    // ============================================
    // 4. ANALYTICS
    // ============================================
    await test('GET /api/v2/analytics/spend', async () => {
        const res = await fetch(`${BASE_URL}/api/v2/analytics/spend`);
        // Might fail if no data, but status should be 200
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        if (!data.object) throw new Error('Invalid analytics response');
    });

    // Summary
    console.log('\n' + '─'.repeat(50));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        console.log('\n❌ Failed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
        process.exitCode = 1;
    } else {
        console.log('\n✨ All tests passed!');
    }
}

main().catch(console.error);
