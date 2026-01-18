
import { NextRequest } from 'next/server';
import { POST as postA2A } from '../app/api/a2a/route';
import { query } from '../lib/db';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function runX402Verification() {
    console.log('🚀 Starting A2A x402 Extension E2E Audit...');

    // 1. Setup Test Data (Pre-check x402_payments table)
    const tableCheck = await query("SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'x402_payments'");
    if (tableCheck.rowCount === 0) {
        throw new Error('x402_payments table not found. Run migrations first.');
    }
    console.log('✅ Database Schema Verified: x402_payments exists.');

    // 2. Identify/Create Tenant for Test
    const tRes = await query('SELECT id FROM tenants LIMIT 1');
    if (!tRes || tRes.rowCount === 0) {
        console.warn('⚠️ No tenants found. Verification might fail on authorization.');
    }
    const tenantId = tRes.rows[0]?.id;
    console.log(`✅ Using Tenant ID: ${tenantId}`);

    // 3. Mock a required payment record (since currently handleMessageSend doesn't 402 yet, we test the x402 endpoint directly)
    const mockPaymentId = `pay_${uuidv4().substring(0, 8)}`;
    console.log(`\n--- Stage 1: Simulating Payment Setup (${mockPaymentId}) ---`);

    await query(`
        INSERT INTO x402_payments (
            payment_id, tenant_id, status, amount_usd, amount_raw, currency, payment_details
        ) VALUES ($1, $2, 'pending', 0.50, '500000', 'USDC', $3)
    `, [mockPaymentId, tenantId, JSON.stringify({ note: 'Verification test' })]);
    console.log(`✅ Mock Payment Record Created.`);

    // 4. Test payment-submitted flow
    console.log(`\n--- Stage 2: Testing 'x402/payment-submitted' Method ---`);
    const submitReq = new NextRequest(`${BASE_URL}/api/a2a`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-P402-Tenant': tenantId
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "x402/payment-submitted",
            params: {
                payment_id: mockPaymentId,
                scheme: 'exact',
                tx_hash: `0x_verifier_${uuidv4()}`
            },
            id: "verify_123"
        })
    });

    const submitRes = await postA2A(submitReq);
    const submitJson = await submitRes.json();

    console.log('JSON-RPC Response:', JSON.stringify(submitJson, null, 2));

    if (submitJson.error) {
        throw new Error(`x402/payment-submitted failed: ${submitJson.error.message}`);
    }

    if (submitJson.result.status !== 'completed') {
        throw new Error(`Payment status expected 'completed', got '${submitJson.result.status}'`);
    }

    if (!submitJson.result.receipt?.receipt_id) {
        throw new Error('Payment completed but no receipt returned');
    }

    console.log(`✅ Payment Workflow Successful. Receipt Issued: ${submitJson.result.receipt.receipt_id}`);

    // 5. Audit Database State
    console.log(`\n--- Stage 3: Database Integrity Audit ---`);

    const auditPayment = await query('SELECT status, tx_hash, settled_at FROM x402_payments WHERE payment_id = $1', [mockPaymentId]);
    console.log('Payment Status in DB:', auditPayment.rows[0].status);
    if (auditPayment.rows[0].status !== 'completed') throw new Error('DB Status mismatch');

    const auditReceipt = await query('SELECT * FROM x402_receipts WHERE payment_id = $1', [mockPaymentId]);
    console.log('Receipt Count for Payment:', auditReceipt.rowCount);
    if (auditReceipt.rowCount !== 1) throw new Error('Receipt not found in DB');

    console.log(`\n✨ E2E VERIFICATION SUCCESSFUL: P402 A2A x402 Extension is compliant and operational.`);
}

runX402Verification().catch(e => {
    console.error('\n❌ VERIFICATION FAILED:', e);
    process.exit(1);
});
