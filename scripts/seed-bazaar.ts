
import dotenv from 'dotenv';
import pg from 'pg';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

// --- Seed Data ---
// 8 Demo Listings linked to facilitators
// Helper to get random item
const sample = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// IDs from seed.ts (deterministic)
const FACILITATORS = [
    "11111111-1111-1111-1111-111111111111", // CDP
    "44444444-4444-4444-4444-444444444444", // Corbits
    "55555555-5555-5555-5555-555555555555", // Mogami
    "66666666-6666-6666-6666-666666666666"  // Treasure
];

const BAZAAR_SEED = [
    {
        title: "Hyper-Local Weather Engine",
        description: "Precision meteorological telemetry with sub-meter resolution for autonomous drone delivery and agricultural optimization.",
        tags: ["Data", "Weather", "Logistics", "IoT"],
        route_path: "/weather/v1/forecast",
        methods: ["GET"],
        pricing: { model: "per_call", amount: "0.01", asset: "USDC", network: "eip155:8453" },
        provider: "https://weather-api-demo.p402.io"
    },
    {
        title: "Llama 3.1 Citadel (70B)",
        description: "Military-grade inference endpoint for complex reasoning, code generation, and strategic autonomous agent orchestration.",
        tags: ["AI", "Inference", "LLM", "Compute"],
        route_path: "/ai/v1/chat/completions",
        methods: ["POST"],
        pricing: { model: "per_token", amount: "0.0002", unit: "1k_tokens", asset: "USDC", network: "eip155:8453" },
        provider: "https://llm-provider-demo.p402.io"
    },
    {
        title: "Wall Street Flash Feed",
        description: "Ultra-low latency financial primitives for high-frequency trading bots and real-time portfolio rebalancing.",
        tags: ["Finance", "Stocks", "Real-time"],
        route_path: "/finance/v2/quotes",
        methods: ["GET"],
        pricing: { model: "per_call", amount: "0.05", asset: "USDC", network: "eip155:8453" },
        provider: "https://finance-data.p402.io"
    },
    {
        title: "Stable Diffusion XL Turbo",
        description: "Instantaneous high-fidelity image synthesis for dynamic UI personalized asset generation on-the-fly.",
        tags: ["AI", "Image", "Generative", "Creative"],
        route_path: "/ai/v1/images/generate",
        methods: ["POST"],
        pricing: { model: "per_call", amount: "0.04", asset: "USDC", network: "eip155:8453" },
        provider: "https://gen-ai-demo.p402.io"
    },
    {
        title: "Base Sentinel Indexer",
        description: "Real-time blockchain state telemetry and event indexing for complex on-chain autonomous coordination.",
        tags: ["Blockchain", "Data", "Indexer", "Infrastructure"],
        route_path: "/chain/v1/query",
        methods: ["POST"],
        pricing: { model: "per_kb", amount: "0.001", asset: "USDC", network: "eip155:8453" },
        provider: "https://indexer-demo.p402.io"
    },
    {
        title: "Deep-Neural Polyglot",
        description: "Sub-second neural translation for autonomous multi-agent negotiation across 120+ linguistic clusters.",
        tags: ["AI", "Translation", "Language", "B2B"],
        route_path: "/translate/v1",
        methods: ["POST"],
        pricing: { model: "per_char", amount: "0.00001", asset: "USDC", network: "eip155:8453" },
        provider: "https://translate-demo.p402.io"
    },
    {
        title: "Cold Storage S3-Standard",
        description: "Immutable, high-durability object storage gateway for long-term audit trail and agent memory persistence.",
        tags: ["Storage", "Infrastructure", "Persistence"],
        route_path: "/storage/s3",
        methods: ["PUT", "GET"],
        pricing: { model: "per_gb", amount: "0.02", asset: "USDC", network: "eip155:8453" },
        provider: "https://storage-demo.p402.io"
    },
    {
        title: "Global Telco Relay",
        description: "Direct-to-carrier SMS and voice telemetry for out-of-band agent verification and critical system alerts.",
        tags: ["Comms", "SMS", "Alerts", "Infrastructure"],
        route_path: "/comm/v1/sms",
        methods: ["POST"],
        pricing: { model: "per_msg", amount: "0.08", asset: "USDC", network: "eip155:8453" },
        provider: "https://comms-demo.p402.io"
    }
];

async function runSeed() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ Missing DATABASE_URL');
        return;
    }

    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        const client = await pool.connect();

        for (const item of BAZAAR_SEED) {
            const resourceId = `res_${crypto.randomUUID().slice(0, 12)}`;
            const canonicalRouteId = `rt_${crypto.createHash('md5').update(item.title).digest('hex').slice(0, 10)}`;
            const facId = sample(FACILITATORS);

            await client.query(`
                INSERT INTO bazaar_resources 
                (resource_id, source_facilitator_id, canonical_route_id, provider_base_url, route_path, methods, title, description, tags, pricing, rank_score)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (source_facilitator_id, canonical_route_id) DO NOTHING
            `, [
                resourceId,
                facId,
                canonicalRouteId,
                item.provider,
                item.route_path,
                item.methods,
                item.title,
                item.description,
                item.tags,
                JSON.stringify(item.pricing),
                Math.random() * 100 // random rank
            ]);
        }
        console.log(`✅ Seeded ${BAZAAR_SEED.length} Bazaar resources.`);
        client.release();
    } catch (e) {
        console.error("Bazaar Seed Failed", e);
    } finally {
        await pool.end();
    }
}

runSeed();
