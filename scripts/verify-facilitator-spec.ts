
import axios from 'axios';

async function testEndpoints() {
    const baseUrl = 'http://localhost:3000';

    console.log("Testing /supported...");
    try {
        const res = await axios.get(`${baseUrl}/supported`);
        console.log("/supported Response:", JSON.stringify(res.data, null, 2));
        if (res.data.success !== true) throw new Error("Missing 'success: true'");
    } catch (e: any) {
        console.error("/supported failed:", e.message);
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
    } catch (e: any) {
        console.error("/verify failed:", e.message);
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
        if (res.data.details?.message?.includes("demo mode")) throw new Error("Still has 'demo mode' message");
    } catch (e: any) {
        console.error("/settle failed:", e.message);
    }
}

testEndpoints();
