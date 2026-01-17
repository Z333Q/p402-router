
import { NextRequest } from 'next/server';
import { GET as getAgentCard } from '../app/.well-known/agent.json/route';
import { POST as postA2A } from '../app/api/a2a/route';
import { POST as postMandate } from '../app/api/a2a/mandates/route';
import { POST as useMandate } from '../app/api/a2a/mandates/[id]/use/route';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function runVerification() {
    console.log('--- Verifying Agent Card ---');
    const cardRes = await getAgentCard();
    const cardJson = await cardRes.json();
    console.log('Agent Card Name:', cardJson.name);
    if (cardJson.name !== 'P402 Payment Router') throw new Error('Agent Card name mismatch');

    console.log('\n--- Verifying A2A Message Send ---');
    const msgReq = new NextRequest(`${BASE_URL}/api/a2a`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'X-P402-Tenant': ... // Let it fallback to first tenant in DB
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "message/send",
            params: {
                message: {
                    role: "user",
                    parts: [{ type: "text", text: "Hello Verification" }]
                }
            },
            id: 1
        })
    });

    // Note: The handler reads body via req.json(). NextRequest body stream in Node env might be tricky if not Polyfilled correctly by Next.js context.
    // However, when running with tsx/node, NextRequest implementations are usually from 'next/server' which relies on Node's native fetch or undici.
    // req.json() should work if body is passed in constructor.

    const sendRes = await postA2A(msgReq);
    const sendJson = await sendRes.json();
    console.log('A2A Send Result:', JSON.stringify(sendJson, null, 2));

    if (sendJson.error) {
        console.warn('A2A Send returned error:', sendJson.error);
        // It might be "Tenant not found" if we didn't seed or use a valid UUID.
        // But our code had a fallback to select limits 1.
    }

    console.log('\n--- Verifying Mandate Creation ---');
    const mndReq = new NextRequest(`${BASE_URL}/api/a2a/mandates`, {
        method: 'POST',
        body: JSON.stringify({
            mandate: {
                user_did: "did:key:test",
                agent_did: "did:key:agent",
                constraints: { max_amount_usd: 100 }
            }
        })
    });

    const mndRes = await postMandate(mndReq);
    const mndJson = await mndRes.json();
    console.log('Mandate Created:', mndJson);

    if (!mndJson.id) throw new Error('Failed to create mandate');

    console.log('\n--- Verifying Mandate Usage ---');
    const useReq = new NextRequest(`${BASE_URL}/api/a2a/mandates/${mndJson.id}/use`, {
        method: 'POST',
        body: JSON.stringify({
            amount_usd: 0.05,
            task_id: "test-task",
            category: "ai"
        })
    });

    // We need to mock params for the route handler [id]
    // The handler signature is (req, { params }).
    const paramsPromise = Promise.resolve({ id: mndJson.id });
    const useRes = await useMandate(useReq, { params: paramsPromise });
    const useJson = await useRes.json();

    console.log('Mandate Usage Result:', useJson);
    if (!useJson.success) throw new Error('Mandate usage failed');

    console.log('\nVerification Successful!');
}

runVerification().catch(e => {
    console.error('Verification Failed:', e);
    process.exit(1);
});
