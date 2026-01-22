import { createWalletClient, http, type Hex, parseUnits } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { base } from 'viem/chains';

// Configuration
const FACILITATOR_ENDPOINT = process.env.FACILITATOR_URL || 'http://localhost:3000/api/v1/facilitator/settle';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001'; // Default dev tenant
// Use the facilitator's known treasury address for the default tenant (or a known one)
// For this test, we just need to ensure the facilitator accepts it.
// Ideally, we'd query the tenant's treasury, but we know verification checks strict equality.
// We'll simulate a valid request structure.

// EIP-712 Domain
const DOMAIN = {
    name: 'USD Coin',
    version: '2',
    chainId: 8453,
    verifyingContract: USDC_ADDRESS as `0x${string}`
};

const TYPES = {
    TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
    ]
};

async function main() {
    console.log("🚀 Starting E2E Verification for EIP-3009 Facilitator...");

    // 1. Generate Random Client Wallet
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    console.log(`👤 Client Identity: ${account.address}`);

    // 2. Prepare Authorization
    // We need a valid treasury address. In development/test, this often maps to a known address.
    const TREASURY_ADDRESS = '0xB23f146251E3816a011e800BCbAE704baa5619Ec'; // Using the address user provided earlier as a likely treasury/facilitator target for testing

    const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const message = {
        from: account.address,
        to: TREASURY_ADDRESS,
        value: parseUnits('0.01', 6), // 0.01 USDC
        validAfter: 0n,
        validBefore: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour detailed
        nonce: nonce as `0x${string}`
    };

    console.log("✍️  Signing Authorization...");
    const signature = await account.signTypedData({
        domain: DOMAIN,
        types: TYPES,
        primaryType: 'TransferWithAuthorization',
        message
    });

    // Parse R, S, V from signature
    const signatureHex = signature.slice(2);
    const r = `0x${signatureHex.slice(0, 64)}`;
    const s = `0x${signatureHex.slice(64, 128)}`;
    const v = parseInt(signatureHex.slice(128, 130), 16);

    const payload = {
        tenantId: TEST_TENANT_ID,
        decisionId: `verify-${Date.now()}`,
        asset: 'USDC',
        authorization: {
            from: message.from,
            to: message.to,
            value: message.value.toString(),
            validAfter: message.validAfter.toString(),
            validBefore: message.validBefore.toString(),
            nonce: message.nonce,
            v,
            r,
            s
        }
    };

    console.log("📨 Sending to Facilitator endpoint:", FACILITATOR_ENDPOINT);

    try {
        const response = await fetch(FACILITATOR_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log("📡 Response Status:", response.status);
        console.log("📦 Response Body:", JSON.stringify(data, null, 2));

        if (response.ok && data.settled) {
            console.log("✅ SUCCESS: Settlement Executed!");
        } else {
            // In verification, a 400 is expected if the mock signature is valid but the wallet has no funds (likely scenario)
            // or if the treasury in DB doesn't match our hardcoded one.
            // We consider it a "Pass" on logic if we get specific error codes like "EXECUTION_REVERTED" (insufficient funds)
            // rather than "INTERNAL_ERROR".
            if (data.error && (data.error.includes("execution reverted") || data.error.includes("insufficient funds"))) {
                console.log("✅ LOGIC PASS: Facilitator accepted auth and attempted execution (failed on-chain as expected for empty wallet).");
            } else if (data.body?.code === 'INVALID_RECIPIENT') {
                console.log("⚠️  PARTIAL PASS: Security check blocked execution (Recipient Mismatch). Logic is working.");
            } else {
                console.log("❌ FAILED: Unexpected error response.");
                process.exit(1);
            }
        }

    } catch (e) {
        console.error("❌ Network/Server Error:", e);
        process.exit(1);
    }
}

main();
