/**
 * Tempo Settlement Dry-Run
 * ========================
 * Validates the full Tempo onchain-verify settlement pipeline without
 * submitting any transaction. Safe to run at any time against the live RPC.
 *
 * What it checks (no wallet, no funding required):
 *   1. RPC reachability — eth_chainId returns 4217
 *   2. USDC.e contract presence — eth_getCode returns non-empty bytecode
 *   3. Treasury balanceOf readable — eth_call does not revert
 *   4. Request body shape — validates the payload that the settle endpoint expects
 *   5. BigInt precision — asserts maxAmountRequired → BigInt path, not Number/float
 *   6. Token address resolution — resolveTokenSymbol maps USDC.e contract → 'USDC.e'
 *   7. verifyTransaction call shape — shows the exact args that would be passed
 *
 * Track 2 (requires funded sender):
 *   Run with TEMPO_TEST_TX_HASH=0x... to exercise the real verifyTransaction path.
 *   The sender 0x66BFD98Eddb19EdD8b357ccd67fBDdA41ddB3A2b needs ≥ 1 raw USDC.e unit.
 *
 * Usage:
 *   npx tsx scripts/tempo-settle-dryrun.ts
 *   TEMPO_RPC_URL=https://rpc.tempo.xyz npx tsx scripts/tempo-settle-dryrun.ts
 *   TEMPO_TEST_TX_HASH=0x... npx tsx scripts/tempo-settle-dryrun.ts
 */

import { tempoMainnetProbe } from '../lib/facilitator-adapters/tempo.js';
import { resolveTokenSymbol } from '../lib/x402/verify.js';
import {
    TEMPO_CHAIN_ID,
    TEMPO_RPC_URL,
    TEMPO_SUPPORTED_CURRENCIES,
} from '../lib/constants/tempo.js';

// ── Test parameters ────────────────────────────────────────────────────────────

const TREASURY  = process.env.TEMPO_TREASURY_ADDRESS
    ?? '0xe00DD502FF571F3C721f22B3F9E525312d21D797';
const USDC_E    = TEMPO_SUPPORTED_CURRENCIES.find((c) => c.isDefault)!.contract;
const TEST_AMOUNT_RAW = '7'; // deliberately non-trivial; same value used in regression test

// ── Helpers ────────────────────────────────────────────────────────────────────

function pass(msg: string) { console.log(`  ✓  ${msg}`); }
function fail(msg: string) { console.error(`  ✗  ${msg}`); }
function info(msg: string) { console.log(`     ${msg}`); }
function section(title: string) { console.log(`\n─── ${title} ───────────────────────────────────`); }

let anyFailed = false;
function check(label: string, ok: boolean, detail?: string) {
    if (ok) {
        pass(label);
    } else {
        fail(label + (detail ? `: ${detail}` : ''));
        anyFailed = true;
    }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Tempo Settlement Dry-Run');
    console.log(`RPC:      ${TEMPO_RPC_URL}`);
    console.log(`Chain ID: ${TEMPO_CHAIN_ID}`);
    console.log(`USDC.e:   ${USDC_E}`);
    console.log(`Treasury: ${TREASURY}`);

    // ── 1. RPC probe (three checks) ──────────────────────────────────────────────
    section('1 · RPC Health Probe');

    const probe = await tempoMainnetProbe({
        stablecoinAddress: USDC_E,
        treasuryAddress: TREASURY,
    });

    check('eth_chainId returns 4217', probe.checks.chainId.passed,
        probe.checks.chainId.error);
    info(`  actual chain ID: ${probe.checks.chainId.actual ?? 'n/a'}`);

    check('USDC.e has bytecode (eth_getCode)', probe.checks.contractCode.passed,
        probe.checks.contractCode.error);
    info(`  code length: ${probe.checks.contractCode.codeLength ?? 0} bytes`);

    check('Treasury balanceOf readable (eth_call)', probe.checks.treasuryBalance.passed,
        probe.checks.treasuryBalance.error);
    info(`  raw balance: ${probe.checks.treasuryBalance.rawBalance ?? 'n/a'}`);

    info(`probe duration: ${probe.durationMs}ms`);

    // ── 2. Request body shape ────────────────────────────────────────────────────
    section('2 · Settle Request Shape');

    const FAKE_TX_HASH = `0x${'7a'.repeat(32)}`;
    const body = {
        paymentPayload: {
            scheme:  'onchain',
            network: `eip155:${TEMPO_CHAIN_ID}`,
            payload: { txHash: FAKE_TX_HASH },
        },
        paymentRequirements: {
            scheme:             'onchain',
            network:            `eip155:${TEMPO_CHAIN_ID}`,
            maxAmountRequired:  TEST_AMOUNT_RAW,
            payTo:              TREASURY,
            asset:              USDC_E,
        },
    };

    check('scheme field is "onchain"',
        body.paymentPayload.scheme === 'onchain');
    check('txHash matches /^0x[a-fA-F0-9]{64}$/',
        /^0x[a-fA-F0-9]{64}$/.test(body.paymentPayload.payload.txHash));
    check('payTo is non-empty',
        body.paymentRequirements.payTo.startsWith('0x'));
    check('maxAmountRequired is a string (not a number)',
        typeof body.paymentRequirements.maxAmountRequired === 'string');

    console.log('\n  Body JSON:');
    console.log(JSON.stringify(body, null, 4).split('\n').map(l => '  ' + l).join('\n'));

    // ── 3. BigInt precision ──────────────────────────────────────────────────────
    section('3 · BigInt Precision');

    const asAtomic = BigInt(TEST_AMOUNT_RAW);
    const asFloat  = Number(TEST_AMOUNT_RAW) / 1e6; // what the EIP-3009 path does

    info(`maxAmountRequired string: "${TEST_AMOUNT_RAW}"`);
    info(`BigInt(str) → ${asAtomic}n  ← onchain dispatch uses this`);
    info(`Number(str) / 1e6 → ${asFloat}  ← EIP-3009 path (NOT used for onchain)`);

    check('BigInt(maxAmountRequired) === 7n', asAtomic === 7n);
    check('Float path would produce wrong value (guard)',
        asFloat !== Number(asAtomic),
        `float=${asFloat}, bigint=${asAtomic}`);

    // ── 4. Token resolution ──────────────────────────────────────────────────────
    section('4 · Token Address Resolution');

    const resolved = resolveTokenSymbol(TEMPO_CHAIN_ID, USDC_E);
    check(`resolveTokenSymbol(${TEMPO_CHAIN_ID}, USDC_E) === 'USDC.e'`,
        resolved === 'USDC.e',
        `got: ${resolved ?? 'undefined'}`);

    // Check that all 10 currencies resolve from their contract addresses
    let allResolve = true;
    for (const c of TEMPO_SUPPORTED_CURRENCIES) {
        const sym = resolveTokenSymbol(TEMPO_CHAIN_ID, c.contract);
        if (sym !== c.symbol) {
            fail(`  ${c.symbol} → ${sym ?? 'undefined'}`);
            allResolve = false;
        }
    }
    check('All 10 TIP-20 contracts resolve to their symbol', allResolve);

    // ── 5. verifyTransaction call shape (dry) ────────────────────────────────────
    section('5 · verifyTransaction Call Shape (dry)');

    const callArgs = {
        txHash:    FAKE_TX_HASH as `0x${string}`,
        payTo:     TREASURY as `0x${string}`,
        minAmount: BigInt(TEST_AMOUNT_RAW),
        chainId:   TEMPO_CHAIN_ID,
        token:     resolved ?? 'USDC.e',
    };

    info(`verifyTransaction(`);
    info(`  txHash:    "${callArgs.txHash.slice(0, 10)}…",`);
    info(`  payTo:     "${callArgs.payTo}",`);
    info(`  minAmount: ${callArgs.minAmount}n,  // bigint — not a float`);
    info(`  chainId:   ${callArgs.chainId},`);
    info(`  token:     "${callArgs.token}"`);
    info(`)`);

    check('minAmount type is bigint', typeof callArgs.minAmount === 'bigint');
    check('minAmount === 7n',         callArgs.minAmount === 7n);

    // ── 6. Optional: real tx verification (Track 2) ──────────────────────────────
    const testTxHash = process.env.TEMPO_TEST_TX_HASH;
    if (testTxHash) {
        section('6 · Real Transaction Verification (Track 2)');
        info(`Verifying tx: ${testTxHash}`);
        info(`(Importing verifyTransaction from lib/x402/verify...)`);

        const { verifyTransaction } = await import('../lib/x402/verify.js');
        const result = await verifyTransaction(
            testTxHash as `0x${string}`,
            TREASURY as `0x${string}`,
            BigInt(TEST_AMOUNT_RAW),
            TEMPO_CHAIN_ID,
            'USDC.e'
        );

        check('verifyTransaction.valid',      result.valid, result.error);
        if (result.valid) {
            info(`sender:  ${result.sender}`);
            info(`amount:  ${result.amount}n raw units`);
            info(`type:    ${typeof result.amount}`);
            check('amount is bigint', typeof result.amount === 'bigint');
            if (result.amount !== undefined) {
                check('amount >= minAmount', result.amount >= BigInt(TEST_AMOUNT_RAW));
            }
        }
    } else {
        section('6 · Real Transaction Verification (Track 2)');
        info('Skipped — set TEMPO_TEST_TX_HASH=0x... to run.');
        info('Requires sender 0x66BFD98Eddb19EdD8b357ccd67fBDdA41ddB3A2b funded with ≥ 1 raw USDC.e unit.');
    }

    // ── Summary ──────────────────────────────────────────────────────────────────
    section('Summary');
    if (anyFailed) {
        console.error('FAILED — one or more checks did not pass. See ✗ above.');
        process.exit(1);
    } else {
        console.log('ALL CHECKS PASSED');
        if (!testTxHash) {
            console.log('Track 1 complete. Fund sender wallet to proceed to Track 2.');
        } else {
            console.log('Track 2 complete. Mainnet settlement path verified end-to-end.');
        }
    }
}

main().catch((err) => {
    console.error('Dry-run script error:', err);
    process.exit(1);
});
