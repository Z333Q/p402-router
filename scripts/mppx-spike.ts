/**
 * mppx SDK spike — Phase 2.0
 * ==========================
 * Throwaway script. Goal: validate SDK behavior against docs before
 * committing to Phase 2.1 schemas.
 *
 * Run: npx tsx scripts/mppx-spike.ts
 * Does NOT touch any production code or submit mainnet transactions.
 */

import { Mppx, tempo } from 'mppx/server';
import { Method, type z } from 'mppx';
import { privateKeyToAccount } from 'viem/accounts';

// --------------------------------------------------------------------------
// Spike constants — NOT production values
// --------------------------------------------------------------------------
const SPIKE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
const USDC_E = '0x20C000000000000000000000b9537d11c60E8b50' as const;
const TREASURY = '0xe00DD502FF571F3C721f22B3F9E525312d21D797' as const;
const SECRET = 'spike-test-secret-key-32-chars-min';

// --------------------------------------------------------------------------
// Phase A · SDK Introspection (no network)
// --------------------------------------------------------------------------
console.log('\n=== Phase A · SDK Introspection ===\n');

// Confirm imports from correct sub-paths
const account = privateKeyToAccount(SPIKE_KEY);
console.log('✓  privateKeyToAccount works:', account.address);

console.log('✓  tempo import (from mppx/server): function?', typeof tempo === 'function');
console.log('✓  Mppx import (from mppx/server): keys:', Object.keys(Mppx).join(', '));
console.log('✓  Method import (from mppx): type:', typeof Method.from);

// tempo() returns an ARRAY of two methods: [charge, session]
const methods = tempo({ currency: USDC_E, recipient: TREASURY, account });
console.log(`✓  tempo({ currency, recipient, account }) → array of ${(methods as unknown[]).length} methods`);
console.log('   methods[0]:', `name=${(methods as Array<{name:string;intent:string}>)[0]?.name}, intent=${(methods as Array<{name:string;intent:string}>)[0]?.intent}`);
console.log('   methods[1]:', `name=${(methods as Array<{name:string;intent:string}>)[1]?.name}, intent=${(methods as Array<{name:string;intent:string}>)[1]?.intent}`);
console.log('   NOTE: docs show tempo() → single method; actual: array of [charge, session]');

// Mppx.create requires secretKey — NOT optional, unlike what the quickstart implies
const app = Mppx.create({ methods, secretKey: SECRET });
console.log('✓  Mppx.create keys:', Object.keys(app).join(', '));
console.log('   Named intents available: app.charge, app.session, app["tempo/charge"]');

// Method.from — custom method skeleton
const customMethod = Method.from({
    name: 'p402',
    intent: 'charge',
    schema: {
        credential: { payload: { _zod: {} } as unknown as ReturnType<typeof import('mppx')['z']['string']> },
        request: { _zod: {} } as unknown as ReturnType<typeof import('mppx')['z']['object']>,
    },
});
console.log('✓  Method.from returns:', typeof customMethod, '— name:', customMethod.name, 'intent:', customMethod.intent);

// --------------------------------------------------------------------------
// Phase B · Mock server flow (no network)
// --------------------------------------------------------------------------
console.log('\n=== Phase B · Mock Server Flow (no network) ===\n');

const handler = app.charge({ amount: '0.000001' }); // $0.000001 = 1 raw USDC.e
const req = new Request('https://example.com/test', { method: 'GET' });
const result = await handler(req);

console.log('result keys:', Object.keys(result).join(', '));
console.log('result.status:', result.status);

// When status is 402, result.challenge is the Response
const challenge = (result as { challenge: Response; status: 402 }).challenge;
console.log('challenge type / status:', challenge.constructor?.name, challenge.status);

const wwwAuth = challenge.headers.get('www-authenticate')!;
const body = await challenge.clone().json() as Record<string, unknown>;

console.log('\n--- 402 Challenge Response ---');
console.log('Status:', challenge.status);
console.log('Cache-Control:', challenge.headers.get('cache-control'));
console.log('Content-Type:', challenge.headers.get('content-type'));
console.log('WWW-Authenticate:', wwwAuth);
console.log('Body:', JSON.stringify(body));

// Decode the request parameter
const requestB64 = wwwAuth.match(/request="([^"]+)"/)?.[1] ?? '';
const decodedRequest = JSON.parse(Buffer.from(requestB64, 'base64url').toString()) as Record<string, unknown>;
console.log('\nDecoded challenge request:');
console.log(JSON.stringify(decodedRequest, null, 2));

// Amount verification: mppx uses human-readable input, converts to raw
console.log('\n--- Amount Encoding ---');
console.log(`charge({ amount: '0.000001' }) → challenge amount: "${decodedRequest.amount}"`);
console.log(`  Expected: "1" (1 raw unit). Got: "${decodedRequest.amount}". Match: ${decodedRequest.amount === '1' ? '✓' : '✗ UNEXPECTED'}`);
console.log('  NOTE: mppx input is human-readable ($), challenge encodes raw atomic units');

// withReceipt only exists on success result (not on 402)
console.log('\n--- withReceipt availability ---');
console.log('withReceipt on 402 result:', typeof (result as Record<string, unknown>).withReceipt, '← undefined on 402 is correct');

// --------------------------------------------------------------------------
// Phase C · CLI test (skip — requires live server + terminal interaction)
// --------------------------------------------------------------------------
console.log('\n=== Phase C · CLI Test ===');
console.log('  Skipped: npx mppx requires an interactive terminal.');
console.log('  CLI command would be: npx mppx <serverUrl>/<route>');
console.log('  --inspect mode not present in 0.6.14; CLI makes actual payment.');

// --------------------------------------------------------------------------
// Phase D · Comparison — mppx vs P402 onchain
// --------------------------------------------------------------------------
console.log('\n=== Phase D · mppx vs P402 Onchain Comparison ===\n');

console.log('| Aspect                | mppx tempo hash mode                         | P402 onchain scheme                      |');
console.log('|-----------------------|----------------------------------------------|------------------------------------------|');
console.log('| 402 response shape    | WWW-Authenticate: Payment + problem+json body| X-PAYMENT-REQUIRED header (x402 format)  |');
console.log('| Amount input          | Human-readable: "0.000001" = $0.000001       | Raw atomic: "1" = 1 raw unit             |');
console.log('| Amount in challenge   | Raw atomic: "1" (converted via parseUnits)   | maxAmountRequired: "1" (already raw)     |');
console.log('| Credential header     | Authorization: Payment <base64url JSON>      | X-PAYMENT: <base64 JSON>                 |');
console.log('| Credential format     | { challenge, payload: { hash, type }, source}| { paymentPayload: { txHash } }           |');
console.log('| Tx memo constraint    | challengeId-bound memo REQUIRED (keccak256)  | No memo required — plain ERC-20 transfer |');
console.log('| Verification          | mppx verifies Transfer event internally      | P402 /api/v1/facilitator/verify endpoint |');
console.log('| Settlement            | mppx reads receipt from chain (push mode)    | P402 /api/v1/facilitator/settle endpoint |');
console.log('| Receipt header        | Payment-Receipt: <base64url JSON>            | JSON body: { success, transaction, payer}|');
console.log('| Replay protection     | mppx Store (in-memory default, NOT shared!)  | DB unique constraint + claimTxHash()     |');
console.log('| Multi-instance safe   | NO — in-memory store loses state on restart  | YES — DB-backed                          |');

console.log('\n=== Spike Complete ===');
console.log('See scripts/mppx-spike-findings.md for full findings and Phase 2.1 recommendations.');
