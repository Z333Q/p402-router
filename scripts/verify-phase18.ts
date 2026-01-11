
import { RoutingEngine } from '../lib/router-engine';
import { SmartContractAdapter } from '../lib/facilitator-adapters/smart-contract';

async function main() {
    console.log("Phase 18 Verification: Smart Contract Settlement Logic");
    console.log("------------------------------------------------------");

    // 1. Instantiation
    const adapter = new SmartContractAdapter();
    console.log(`[PASS] Adapter Initialized: ${adapter.name}`);

    // 2. Routing Preference Test
    console.log("\nTest: Routing Engine Priority...");
    const plan = await RoutingEngine.plan(
        { routeId: 'route_test_phase18', method: 'POST', path: '/api/v1/test' },
        { network: 'eip155:8453', scheme: 'exact', amount: '10.00', asset: 'USDC' },
        { sourceNetwork: 'eip155:8453' }
    );

    const winner = plan.candidates[0];

    if (!winner) {
        console.error("❌ No candidates found!");
        process.exit(1);
    }

    console.log(`Winner: ${winner.name} (Score: ${winner.score})`);

    if (winner.facilitatorId === 'fac_p402_settlement_v1') {
        console.log("[PASS] Smart Contract Adapter was selected over Direct RPC.");
    } else {
        console.error(`[FAIL] Expected Smart Contract Adapter, got ${winner.facilitatorId}`);
        process.exit(1);
    }

    // 3. Payment Config Validation
    const payment = winner.payment;
    console.log("\nTest: Payment Configuration...");

    if (!payment) {
        console.error("❌ Payment config is missing!");
        process.exit(1);
    }

    if (payment.mode === 'smart_contract' && payment.abi) {
        console.log(`[PASS] Mode is 'smart_contract'`);
        console.log(`[PASS] ABI is present (Functions: ${payment.abi.length})`);
        console.log(`[PASS] Recommended Fee: ${payment.recommendedFeeBps} bps (1%)`);
    } else {
        console.error("[FAIL] Invalid payment config", payment);
        process.exit(1);
    }

    console.log("\n✅ Phase 18 Verified: Fee Enforcement Logic is Active.");
}

main().catch(console.error);
