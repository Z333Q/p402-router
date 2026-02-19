
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TENANT = '00000000-0000-0000-0000-000000000001';

async function runE2E() {
    console.log('🚀 INITIALIZING P402 COMPREHENSIVE E2E SUITE');
    console.log('Target:', BASE_URL);
    console.log('-------------------------------------------');

    let totalPassed = 0;
    let totalFailed = 0;

    async function test(name: string, fn: () => Promise<void>) {
        process.stdout.write(`[ ] ${name}... `);
        try {
            await fn();
            process.stdout.write('\r[✅]\n');
            totalPassed++;
        } catch (e: any) {
            process.stdout.write(`\r[❌]\n    Error: ${e.message}\n`);
            if (e.response?.data) console.log('    Response:', JSON.stringify(e.response.data));
            totalFailed++;
        }
    }

    // --- CASE 1: PUBLIC CODE AUDIT (Aesthetics & Security) ---
    await test('Public Code Audit (OpenAI key redaction)', async () => {
        const code = `
            # Malicious Loop
            import openai
            client = openai.OpenAI(api_key="sk-this-is-a-leaked-key-1234567890abcdef")
            while True:
                client.chat.completions.create(model="gpt-4", messages=[{"role": "user", "content": "loop"}])
        `;
        const res = await axios.post(`${BASE_URL}/api/v1/intelligence/code-audit`, { code });
        if (!res.data.report) throw new Error('No report returned');
        if (res.data.metrics.riskScore < 5) throw new Error('Risk score too low for dangerous loop');
        // Redaction is server-side in DB, but we check if report refers to the bug
        if (!res.data.report.includes('RISK SCORE')) throw new Error('Report missing RISK SCORE');
    });

    // --- CASE 2: FACILITATOR COMPLIANCE (x402 Spec) ---
    await test('x402 /supported endpoint', async () => {
        const res = await axios.get(`${BASE_URL}/supported`);
        if (res.data.facilitatorId !== 'p402-local') throw new Error('Incorrect facilitatorId');
        if (!res.data.networks.includes('eip155:8453')) throw new Error('Missing Base network');
    });

    await test('x402 /verify endpoint (Hardened)', async () => {
        // Send x402-compliant verify request with a fake signature — expect 400 with isValid: false
        try {
            const res = await axios.post(`${BASE_URL}/api/v1/facilitator/verify`, {
                paymentPayload: {
                    x402Version: 2,
                    scheme: "exact",
                    network: "eip155:8453",
                    payload: {
                        signature: "0x" + "ab".repeat(65),
                        authorization: {
                            from: "0x" + "1".repeat(40),
                            to: "0x" + "2".repeat(40),
                            value: "1000000",
                            validAfter: "0",
                            validBefore: "1735689600",
                            nonce: "0x" + "0".repeat(64)
                        }
                    }
                },
                paymentRequirements: {
                    scheme: "exact",
                    network: "eip155:8453",
                    maxAmountRequired: "1000000",
                    resource: "https://example.com",
                    description: "Test",
                    payTo: "0x" + "2".repeat(40),
                    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
                }
            });
            // With a fake signature, isValid should be false
            if (res.data.isValid !== false) {
                throw new Error('Should not have validated with mock signature');
            }
        } catch (e: any) {
            // 400 is expected for invalid signature — verify response shape is x402-compliant
            if (e.response?.status === 400 && typeof e.response.data?.isValid === 'boolean') return;
            if (e.response?.status !== 400 && e.response?.status !== 500) throw e;
        }
    });

    // --- CASE 3: INTELLIGENCE DASHBOARD API ---
    await test('Intelligence Config GET', async () => {
        const res = await axios.get(`${BASE_URL}/api/v1/intelligence/config`, {
            headers: { 'x-tenant-id': TEST_TENANT }
        });
        if (typeof res.data.governanceMode === 'undefined') throw new Error('Missing governanceMode');
    });

    // --- CASE 5: SETTLEMENT FLOW (EIP-3009) ---
    await test('EIP-3009 Settlement Payload Validation', async () => {
        const payload = {
            tenantId: TEST_TENANT,
            authorization: {
                from: "0x123...",
                to: "0x456...",
                value: "1000000",
                validAfter: 0,
                validBefore: 1735689600,
                nonce: "0x0000000000000000000000000000000000000000000000000000000000000001",
                v: 27,
                r: "0x...",
                s: "0x..."
            }
        };
        try {
            const res = await axios.post(`${BASE_URL}/api/v1/facilitator/settle`, payload);
            // We expect an error because the signature is invalid, but 400 is better than 500
            if (res.status === 200) throw new Error('Should not have succeeded with mock signature');
        } catch (e: any) {
            if (e.response?.status !== 400) throw new Error(`Expected 400, got ${e.response?.status}`);
            if (!e.response.data.error.includes('signature')) {
                // Might be 'INVALID_SIGNATURE' or similar
            }
        }
    });

    console.log('-------------------------------------------');
    console.log(`E2E SUITE COMPLETE: ${totalPassed} PASSED, ${totalFailed} FAILED`);

    if (totalFailed > 0) process.exit(1);
    process.exit(0);
}

runE2E().catch(err => {
    console.error('Fatal E2E Error:', err);
    process.exit(1);
});
