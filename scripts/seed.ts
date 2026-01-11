// scripts/seed.ts
import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * P402 Operational Seed Script
 * ----------------------------
 * Seeds the database with production-ready defaults, a demo tenant,
 * and high-fidelity facilitators including Direct RPC, CDP, and Bazaar Discovery sources.
 */

type FacilitatorSeed = {
    id: string;
    facilitator_id: string;
    tenant_id: string;
    name: string;
    endpoint: string;
    auth_config: any;
    networks: string[];
    status: string;
    type: string;
    reputation_score: number;
    capabilities?: any;
};

const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const POLICY_ID = "11111111-1111-1111-1111-111111111112";

const facilitators: FacilitatorSeed[] = [
    {
        id: "20000000-0000-0000-0000-000000000001",
        facilitator_id: "fac_p402_base_direct",
        tenant_id: DEMO_TENANT_ID,
        name: "P402 Base Direct",
        endpoint: "rpc:base",
        auth_config: {
            mode: "direct_onchain",
            rpcEnvVar: "BASE_RPC_URL",
            usdc: {
                asset: "USDC",
                network: "eip155:8453",
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
            }
        },
        networks: ["eip155:8453"],
        status: "active",
        type: "direct_onchain",
        reputation_score: 100,
        capabilities: { inference: 0.8, summarization: 0.7 }
    },
    {
        id: "20000000-0000-0000-0000-000000000002",
        facilitator_id: "fac_p402_base_sepolia_direct",
        tenant_id: DEMO_TENANT_ID,
        name: "P402 Base Sepolia Direct",
        endpoint: "rpc:base-sepolia",
        auth_config: {
            mode: "direct_onchain",
            rpcEnvVar: "BASE_SEPOLIA_RPC_URL",
            usdc: {
                asset: "USDC",
                network: "eip155:84532",
                address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
            }
        },
        networks: ["eip155:84532"],
        status: "active",
        type: "direct_onchain",
        reputation_score: 100,
        capabilities: { inference: 0.8, translation: 0.9 }
    },
    {
        id: "20000000-0000-0000-0000-000000000003",
        facilitator_id: "fac_x402_bazaar_source",
        tenant_id: DEMO_TENANT_ID,
        name: "x402 Bazaar Discovery Source",
        endpoint: "https://x402.org",
        auth_config: {
            mode: "discovery_source",
            discoveryPath: "/discovery/resources"
        },
        networks: ["eip155:8453"],
        status: "active",
        type: "discovery_source",
        reputation_score: 90
    },
    {
        id: "20000000-0000-0000-0000-000000000004",
        facilitator_id: "fac_coinbase_cdp_x402",
        tenant_id: DEMO_TENANT_ID,
        name: "Coinbase CDP x402",
        endpoint: "https://api.cdp.coinbase.com",
        auth_config: {
            mode: "x402_facilitator",
            requiredEnvVars: ["COINBASE_CDP_API_KEY"],
            healthPath: "/health"
        },
        networks: ["eip155:8453"],
        status: "active",
        type: "x402_facilitator",
        reputation_score: 95,
        capabilities: { inference: 1.0, agent_task: 0.9, code_gen: 0.6 }
    },
    {
        id: "20000000-0000-0000-0000-000000000005",
        facilitator_id: "fac_circle_cctp",
        tenant_id: DEMO_TENANT_ID,
        name: "Circle CCTP Bridge",
        endpoint: "https://api.circle.com",
        auth_config: {
            mode: "bridge",
            requiredEnvVars: ["CIRCLE_API_KEY"],
            bridge: "cctp"
        },
        networks: ["eip155:8453"],
        status: "inactive",
        type: "bridge",
        reputation_score: 95,
        capabilities: { settlement: 1.0 }
    },
    {
        id: "20000000-0000-0000-0000-000000000006",
        facilitator_id: "fac_chainlink_ccip",
        tenant_id: DEMO_TENANT_ID,
        name: "Chainlink CCIP Bridge",
        endpoint: "onchain:ccip",
        auth_config: {
            mode: "bridge",
            bridge: "ccip",
            requiredEnvVars: ["CCIP_ROUTER_ADDRESS", "CCIP_SOURCE_RPC_URL", "CCIP_DEST_RPC_URL"]
        },
        networks: ["eip155:1", "eip155:8453"],
        status: "inactive",
        type: "bridge",
        reputation_score: 95,
        capabilities: { settlement: 0.9 }
    },
    {
        id: "20000000-0000-0000-0000-000000000007",
        facilitator_id: "fac_private_node",
        tenant_id: DEMO_TENANT_ID,
        name: "Private Facilitator Node",
        endpoint: "https://localhost:8443",
        auth_config: {
            mode: "private_node",
            setup: "User supplies endpoint and auth"
        },
        networks: ["eip155:8453"],
        status: "inactive",
        type: "private_node",
        reputation_score: 80,
        capabilities: { inference: 0.5 }
    }
];

async function upsertTenant(client: Client) {
    const q = `
        INSERT INTO tenants (id, name, owner_email, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            owner_email = EXCLUDED.owner_email,
            status = EXCLUDED.status
    `;
    await client.query(q, [DEMO_TENANT_ID, "P402 Demo Tenant", "demo@p402.io", "active"]);
}

async function upsertPolicy(client: Client) {
    const q = `
        INSERT INTO policies (id, policy_id, tenant_id, name, rules, status, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (policy_id) DO UPDATE
        SET rules = EXCLUDED.rules,
            updated_at = NOW(),
            version = EXCLUDED.version
    `;
    const rules = {
        deny: {
            legacyXPayment: true,
            missingPaymentSignature: false
        },
        budgets: {
            perBuyerDailyUsd: "25.00",
            perRouteDailyUsd: "50.00"
        },
        routing: {
            preferHealthy: true,
            maxP95VerifyMs: 250,
            maxP95SettleMs: 1500
        }
    };
    await client.query(q, [POLICY_ID, "pol_default", DEMO_TENANT_ID, "Default Start", JSON.stringify(rules), "active", "1.1.0"]);
}

async function upsertFacilitators(client: Client) {
    const q = `
        INSERT INTO facilitators (
            id, facilitator_id, tenant_id, name, endpoint, auth_config, networks, status, type, reputation_score, capabilities
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (facilitator_id) DO UPDATE
        SET name = EXCLUDED.name,
            endpoint = EXCLUDED.endpoint,
            auth_config = EXCLUDED.auth_config,
            networks = EXCLUDED.networks,
            status = EXCLUDED.status,
            type = EXCLUDED.type,
            reputation_score = EXCLUDED.reputation_score,
            capabilities = EXCLUDED.capabilities
    `;
    for (const f of facilitators) {
        await client.query(q, [
            f.id,
            f.facilitator_id,
            f.tenant_id,
            f.name,
            f.endpoint,
            JSON.stringify(f.auth_config),
            f.networks,
            f.status,
            f.type,
            f.reputation_score,
            JSON.stringify(f.capabilities || {})
        ]);
    }
}

async function upsertRoutes(client: Client) {
    const routes = [
        { id: 'route_weather', path: '/api/v1/weather', method: 'GET', title: 'Global Weather API' },
        { id: 'route_quotes', path: '/api/v1/quotes', method: 'GET', title: 'Daily Inspiration' },
        { id: 'route_translate', path: '/api/v1/translate', method: 'POST', title: 'Neural Translation' }
    ];

    const q = `
        INSERT INTO routes (route_id, tenant_id, method, path_pattern, bazaar_metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (route_id) DO UPDATE SET
        method = EXCLUDED.method,
        path_pattern = EXCLUDED.path_pattern,
        bazaar_metadata = EXCLUDED.bazaar_metadata
    `;

    for (const r of routes) {
        await client.query(q, [
            r.id,
            DEMO_TENANT_ID,
            r.method,
            r.path,
            JSON.stringify({ title: r.title, source: 'seed' })
        ]);
    }
}

async function upsertEvents(client: Client) {
    const outcomes = ['settled', 'settled', 'settled', 'denied', 'denied', 'error'];
    const routes = ['route_weather', 'route_quotes', 'route_translate'];
    const facilitators = ['fac_p402_base_direct', 'fac_coinbase_cdp_x402'];

    const q = `
        INSERT INTO events (event_id, tenant_id, route_id, outcome, network, amount, asset, facilitator_id, steps)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (event_id) DO NOTHING
    `;

    for (let i = 0; i < 25; i++) {
        const eventId = `evt_demo_${i}`;
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        const routeId = routes[Math.floor(Math.random() * routes.length)];
        const facId = facilitators[Math.floor(Math.random() * facilitators.length)];
        const amount = (Math.random() * 5).toFixed(2);

        await client.query(q, [
            eventId,
            DEMO_TENANT_ID,
            routeId,
            outcome,
            'eip155:8453',
            amount,
            'USDC',
            facId,
            JSON.stringify([
                { type: 'plan', at: new Date().toISOString() },
                { type: outcome === 'settled' ? 'verify' : 'deny', at: new Date().toISOString() }
            ])
        ]);
    }
}

async function upsertRouterDecisions(client: Client) {
    console.log("Seeding Router Decisions...");
    const q = `
        INSERT INTO router_decisions (
            request_id, tenant_id, task, requested_mode, 
            selected_provider_id, reason, alternatives, 
            success, cost_usd, timestamp, route_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const mockRoutes = ['route_weather_pro', 'route_translation', 'route_storage', 'route_sms_notify'];

    // Generate 100 fake decisions over last 30 days
    for (let i = 0; i < 100; i++) {
        const isSuccess = Math.random() > 0.1;
        const provider = Math.random() > 0.6 ? 'fac_anthropic' : (Math.random() > 0.3 ? 'fac_openai' : 'fac_google');
        const cost = (Math.random() * 0.5); // $0.00 - $0.50
        const daysAgo = Math.floor(Math.random() * 30);
        const time = new Date();
        time.setDate(time.getDate() - daysAgo);
        const routeId = mockRoutes[Math.floor(Math.random() * mockRoutes.length)];

        await client.query(q, [
            `req_mock_${i}`,
            DEMO_TENANT_ID,
            'summarization',
            'cost',
            provider,
            'scored_optimal',
            JSON.stringify([]),
            isSuccess,
            cost,
            time.toISOString(),
            routeId
        ]);
    }
}

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        await client.query("BEGIN");
        await upsertTenant(client);
        await upsertPolicy(client);
        await upsertFacilitators(client);
        await upsertRoutes(client);
        await upsertBazaarResources(client);
        await upsertEvents(client);
        await upsertRouterDecisions(client);
        await client.query("COMMIT");
        console.log("Seed complete: Demo Environment Operational with Sample Traffic.");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Seed failed:", e);
        process.exit(1);
    } finally {
        await client.end();
    }
}


async function upsertBazaarResources(client: Client) {
    const resources = [
        {
            id: 'res_weather_pro',
            title: 'Weather API Pro',
            description: 'High-precision global weather data with hourly forecasts.',
            rank: 99.0, // High Utility
            route_path: '/api/v1/weather',
            facilitator: 'fac_x402_bazaar_source'
        },
        {
            id: 'res_translation',
            title: 'Translation Service',
            description: 'Neural machine translation for 50+ languages.',
            rank: 95.0, // High Utility
            route_path: '/api/v1/translate',
            facilitator: 'fac_x402_bazaar_source'
        },
        {
            id: 'res_storage',
            title: 'Storage Gateway',
            description: 'Decentralized storage gateway with S3-compatible API.',
            rank: 88.0, // Medium Utility
            route_path: '/api/v1/storage',
            facilitator: 'fac_x402_bazaar_source'
        },
        {
            id: 'res_sms_notify',
            title: 'SMS Notification',
            description: 'Send operational SMS alerts globally.',
            rank: 82.0, // Niche
            route_path: '/api/v1/sms',
            facilitator: 'fac_x402_bazaar_source'
        },
        {
            id: 'res_llm_70b',
            title: 'LLM Inference (Llama 3)',
            description: 'Hosted Llama 3 70B inference endpoint.',
            rank: 75.0, // Niche/High Cost
            route_path: '/api/v1/llm',
            facilitator: 'fac_x402_bazaar_source'
        },
        {
            id: 'res_indexer',
            title: 'Blockchain Indexer',
            description: 'Real-time EVM event indexing and query service.',
            rank: 60.0, // Niche
            route_path: '/api/v1/indexer',
            facilitator: 'fac_x402_bazaar_source'
        }
    ];

    const q = `
        INSERT INTO bazaar_resources (
            resource_id, source_facilitator_id, canonical_route_id, 
            provider_base_url, route_path, methods, 
            title, description, rank_score, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
        ON CONFLICT (resource_id) DO UPDATE
        SET title = EXCLUDED.title,
            description = EXCLUDED.description,
            rank_score = EXCLUDED.rank_score,
            updated_at = NOW()
    `;

    for (const r of resources) {
        await client.query(q, [
            r.id,
            r.facilitator,
            `route_${r.id}`, // Canonical route ID
            'https://api.provider.com',
            r.route_path,
            ['POST', 'GET'],
            r.title,
            r.description,
            r.rank
        ]);
    }
}

main().catch((e) => {
    process.stderr.write(String(e) + "\n");
    process.exit(1);
});
