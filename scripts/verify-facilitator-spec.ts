
import axios from 'axios';

async function testEndpoints() {
    const baseUrl = 'http://localhost:3000';

    console.log("Testing /supported...");
    try {
        const res = await axios.get(`${baseUrl}/supported`);
        console.log("/supported Response:", JSON.stringify(res.data, null, 2));
        if (res.data.success !== true) throw new Error("Missing 'success: true'");

        // x402 spec fields
        if (!Array.isArray(res.data.kinds)) throw new Error("Missing 'kinds' array");
        if (!Array.isArray(res.data.extensions)) throw new Error("Missing 'extensions' array");
        if (!res.data.signers || typeof res.data.signers !== 'object') throw new Error("Missing 'signers' object");

        // Validate kinds structure
        const kind = res.data.kinds[0];
        if (!kind?.x402Version || !kind?.scheme || !kind?.network) {
            throw new Error("Invalid 'kinds' structure: missing x402Version, scheme, or network");
        }

        // Legacy fields still present
        if (!Array.isArray(res.data.networks)) throw new Error("Missing legacy 'networks' array");
        if (!Array.isArray(res.data.assets)) throw new Error("Missing legacy 'assets' array");
        if (!res.data.capabilities) throw new Error("Missing legacy 'capabilities' object");

        console.log("✅ /supported passed all x402 spec checks");
    } catch (e: any) {
        console.error("❌ /supported failed:", e.message);
    }

    console.log("\nTesting /api/v1/facilitator/verify...");
    try {
        const res = await axios.post(`${baseUrl}/api/v1/facilitator/verify`, {
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
        console.log("/verify Response:", JSON.stringify(res.data, null, 2));
        // x402 verify returns { isValid, payer?, invalidReason? }
        if (typeof res.data.isValid !== 'boolean') throw new Error("Missing 'isValid' boolean field");
        if (res.data.isValid && !res.data.payer) throw new Error("Missing 'payer' on successful verify");

        // Facilitator should NOT set PAYMENT-RESPONSE header (resource server concern)
        const prHeader = res.headers['payment-response'];
        if (prHeader) throw new Error("Facilitator should NOT set PAYMENT-RESPONSE header");

        console.log("✅ /verify passed all x402 spec checks");
    } catch (e: any) {
        // 400 is expected with a fake signature — check response shape
        if (e.response?.data && typeof e.response.data.isValid === 'boolean') {
            console.log("✅ /verify returned x402-compliant error:", e.response.data.invalidReason);

            // Even on error, facilitator should NOT set PAYMENT-RESPONSE header
            const prHeader = e.response.headers?.['payment-response'];
            if (prHeader) {
                console.error("❌ /verify: Facilitator should NOT set PAYMENT-RESPONSE header");
            } else {
                console.log("✅ /verify: Correctly omits PAYMENT-RESPONSE header");
            }
        } else {
            console.error("❌ /verify failed:", e.message);
        }
    }

    console.log("\nTesting /api/v1/facilitator/settle (legacy format)...");
    try {
        const res = await axios.post(`${baseUrl}/api/v1/facilitator/settle`, {
            txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            amount: "10.0",
            recipient: "0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6"
        });
        console.log("/settle (legacy) Response:", JSON.stringify(res.data, null, 2));

        // x402 SettleResponse fields
        if (typeof res.data.success !== 'boolean') throw new Error("Missing 'success' boolean");
        if (!('transaction' in res.data)) throw new Error("Missing 'transaction' field");
        if (res.data.network !== 'eip155:8453') throw new Error(`Wrong network: expected 'eip155:8453', got '${res.data.network}'`);
        if (!('payer' in res.data)) throw new Error("Missing 'payer' field");

        // Legacy fields
        if (!res.data.facilitatorId) throw new Error("Missing legacy 'facilitatorId' field");
        if (!res.data.receipt) throw new Error("Missing legacy 'receipt' object");

        // Facilitator should NOT set PAYMENT-RESPONSE header
        const settlePrHeader = res.headers['payment-response'];
        if (settlePrHeader) throw new Error("Facilitator should NOT set PAYMENT-RESPONSE header");

        console.log("✅ /settle (legacy) passed all x402 spec checks");
    } catch (e: any) {
        if (e.response?.data?.errorReason) {
            console.log("Response uses x402-compliant 'errorReason':", e.response.data.errorReason);

            // Verify error response shape
            if (typeof e.response.data.success !== 'boolean') {
                console.error("❌ /settle: Error response missing 'success' boolean");
            }
            if (!('transaction' in e.response.data)) {
                console.error("❌ /settle: Error response missing 'transaction' field");
            }
            if (!('payer' in e.response.data)) {
                console.error("❌ /settle: Error response missing 'payer' field");
            }
            if (e.response.data.network !== 'eip155:8453') {
                console.error("❌ /settle: Error response wrong network");
            }

            // Facilitator should NOT set PAYMENT-RESPONSE header
            const prHeader = e.response.headers?.['payment-response'];
            if (prHeader) {
                console.error("❌ /settle: Facilitator should NOT set PAYMENT-RESPONSE header");
            } else {
                console.log("✅ /settle: Correctly omits PAYMENT-RESPONSE header");
            }
        }
        console.error("❌ /settle (legacy) failed:", e.message);
    }

    console.log("\nTesting /api/v1/facilitator/settle (x402 wire format)...");
    try {
        const res = await axios.post(`${baseUrl}/api/v1/facilitator/settle`, {
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
        console.log("/settle (x402) Response:", JSON.stringify(res.data, null, 2));

        // x402 SettleResponse fields
        if (typeof res.data.success !== 'boolean') throw new Error("Missing 'success' boolean");
        if (!('transaction' in res.data)) throw new Error("Missing 'transaction' field");
        if (res.data.network !== 'eip155:8453') throw new Error(`Wrong network: expected 'eip155:8453', got '${res.data.network}'`);
        if (!('payer' in res.data)) throw new Error("Missing 'payer' field");

        // Should NOT have PAYMENT-RESPONSE header
        const prHeader = res.headers['payment-response'];
        if (prHeader) throw new Error("Facilitator should NOT set PAYMENT-RESPONSE header");

        console.log("✅ /settle (x402) passed all x402 spec checks");
    } catch (e: any) {
        if (e.response?.data?.errorReason) {
            console.log("Response uses x402-compliant 'errorReason':", e.response.data.errorReason);
        }
        console.error("❌ /settle (x402) failed:", e.message);
    }
}

testEndpoints();
