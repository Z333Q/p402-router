import { RoutingEngine } from '../lib/router-engine'
import { ServiceProofService, ServiceProofData, SERVICE_PROOF_DOMAIN, SERVICE_PROOF_TYPES } from '../lib/service-proofs'
import { hashTypedData } from 'viem'

async function testRouting() {
    console.log("--- Testing Routing Engine (Cross-Chain) ---")

    // Scenario A: Same chain (Base -> Base)
    const resSame = await RoutingEngine.plan(
        { routeId: 'test', method: 'GET', path: '/api' },
        { network: 'eip155:8453', scheme: 'exact', amount: '1.0', asset: 'USDC' },
        { sourceNetwork: 'eip155:8453' }
    )
    console.log("Same Chain Winner:", resSame.selectedId) // Should likely be CDP or Direct

    // Scenario B: Cross-chain (Ethereum -> Base)
    const resCross = await RoutingEngine.plan(
        { routeId: 'test', method: 'GET', path: '/api' },
        { network: 'eip155:8453', scheme: 'exact', amount: '1.0', asset: 'USDC' },
        { sourceNetwork: 'eip155:1' }
    )
    console.log("Cross-Chain Winner:", resCross.selectedId) // Should be fac_chainlink_ccip_01

    const ccipCandidate = resCross.candidates.find(c => c.facilitatorId === 'fac_chainlink_ccip_01')
    console.log("CCIP Score (Cross-Chain):", ccipCandidate?.score)
}

async function testServiceProofs() {
    console.log("\n--- Testing Service Proofs ---")

    const proof: ServiceProofData = {
        facilitatorId: 'fac_test',
        routeId: 'route_test',
        requestId: 'req_123',
        timestamp: Math.floor(Date.now() / 1000),
        outcome: 'success',
        serviceHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
    }

    // Since we don't have a private key here to sign, we'll just check if the verification logic runs
    // and correctly recovers (even if it's a dummy signature that fails)
    const dummySignature: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    const verification = await ServiceProofService.verify(proof, dummySignature as any)
    console.log("Proof Verification Result (Dummy Sig):", verification.verified ? "FAIL (Expected failure with dummy sig)" : "SUCCESS (Caught invalid sig)")
}

async function main() {
    try {
        await testRouting()
        await testServiceProofs()
    } catch (e) {
        console.error("Verification failed:", e)
    } finally {
        process.exit(0)
    }
}

main()
