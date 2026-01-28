
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
            routeId: "test-route",
            txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        });
        console.log("/verify Response:", JSON.stringify(res.data, null, 2));
        if (res.data.success !== true) throw new Error("Missing 'success: true'");
        if (!res.data.transaction) throw new Error("Missing 'transaction' field");
        if (!res.data.network) throw new Error("Missing 'network' field");
        console.log("✅ /verify passed all checks");
    } catch (e: any) {
        console.error("❌ /verify failed:", e.message);
    }

    console.log("\nTesting /api/v1/facilitator/settle...");
    try {
        const res = await axios.post(`${baseUrl}/api/v1/facilitator/settle`, {
            txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            amount: "10.0",
            recipient: "0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6"
        });
        console.log("/settle Response:", JSON.stringify(res.data, null, 2));
        if (res.data.success !== true) throw new Error("Missing 'success: true'");
        if (!res.data.transaction) throw new Error("Missing 'transaction' field");
        if (!res.data.network) throw new Error("Missing 'network' field");

        // x402 spec: payer field should be present (may be null)
        if (!('payer' in res.data)) throw new Error("Missing 'payer' field");

        // Legacy fields
        if (!res.data.facilitatorId) throw new Error("Missing legacy 'facilitatorId' field");
        if (!res.data.receipt) throw new Error("Missing legacy 'receipt' object");

        if (res.data.details?.message?.includes("demo mode")) throw new Error("Still has 'demo mode' message");
        console.log("✅ /settle passed all x402 spec checks");
    } catch (e: any) {
        // Error response should use 'errorReason' per x402 spec
        if (e.response?.data?.errorReason) {
            console.log("Response uses x402-compliant 'errorReason':", e.response.data.errorReason);
        }
        console.error("❌ /settle failed:", e.message);
    }
}

testEndpoints();

