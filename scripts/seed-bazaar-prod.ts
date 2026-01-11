import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function main() {
    const client = await pool.connect();
    const sourceFacilitatorId = '11111111-1111-1111-1111-111111111111'; // Local Facilitator

    const resources = [
        {
            resource_id: 'res_openai_mcp',
            canonical_route_id: 'openai-gpt4o',
            provider_base_url: 'https://api.openai.com/v1',
            route_path: '/chat/completions',
            methods: ['POST'],
            title: 'OpenAI GPT-4o (MCP Ready)',
            description: 'The world\'s most capable model, now accessible via the P402 Decision Layer for AI Agents.',
            tags: ['AI', 'LLM', 'MCP', 'OpenAI'],
            pricing: { type: 'usage', cost_per_1k_tokens: '0.005', asset: 'USDC' },
            rank_score: 0.99
        },
        {
            resource_id: 'res_coinbase_market',
            canonical_route_id: 'coinbase-market-data',
            provider_base_url: 'https://api.exchange.coinbase.com',
            route_path: '/products/BTC-USD/ticker',
            methods: ['GET'],
            title: 'Coinbase Real-time Market Intel',
            description: 'Direct, low-latency market data from the largest US exchange. Verified for high-frequency strategies.',
            tags: ['Finance', 'Crypto', 'Market Data'],
            pricing: { type: 'subscription', cost_per_month: '50', asset: 'USDC' },
            rank_score: 0.95
        },
        {
            resource_id: 'res_perigon_news',
            canonical_route_id: 'perigon-news-api',
            provider_base_url: 'https://api.goperigon.com/v1',
            route_path: '/all',
            methods: ['GET'],
            title: 'Perigon Global News Intelligence',
            description: 'Structured, real-time news data from 100k+ global sources. Built for AI training and sentiment analysis.',
            tags: ['News', 'AI', 'Intelligence'],
            pricing: { type: 'usage', cost_per_req: '0.01', asset: 'USDC' },
            rank_score: 0.92
        },
        {
            resource_id: 'res_tomorrow_weather',
            canonical_route_id: 'tomorrow-weather-api',
            provider_base_url: 'https://api.tomorrow.io/v4',
            route_path: '/weather/realtime',
            methods: ['GET'],
            title: 'Tomorrow.io Weather Intel',
            description: 'The highest precision weather intelligence available. hyper-local data for commercial logistics.',
            tags: ['Weather', 'Logistics', 'Data'],
            pricing: { type: 'usage', cost_per_req: '0.005', asset: 'USDC' },
            rank_score: 0.88
        },
        {
            resource_id: 'res_chainlink_oracle',
            canonical_route_id: 'chainlink-price-feed',
            provider_base_url: 'https://api.chain.link/v1',
            route_path: '/feeds/mainnet',
            methods: ['GET'],
            title: 'Chainlink Price Feed Oracle',
            description: 'Decentralized oracle data for DeFi. The industry standard for on-chain asset pricing.',
            tags: ['DeFi', 'Oracle', 'Blockchain'],
            pricing: { type: 'flat', cost: '0.1', asset: 'USDC' },
            rank_score: 0.97
        },
        {
            resource_id: 'res_anthropic_claude',
            canonical_route_id: 'anthropic-claude-mcp',
            provider_base_url: 'https://api.anthropic.com/v1',
            route_path: '/messages',
            methods: ['POST'],
            title: 'Anthropic Claude 3.5 Sonnet',
            description: 'Superior reasoning and coding capabilities. Perfectly integrated for AI-to-AI transactions.',
            tags: ['AI', 'LLM', 'MCP', 'Anthropic'],
            pricing: { type: 'usage', cost_per_1k_tokens: '0.015', asset: 'USDC' },
            rank_score: 0.98
        }
    ];

    try {
        console.log('Seeding Production Bazaar resources...');
        for (const res of resources) {
            await client.query(`
                INSERT INTO bazaar_resources (
                    resource_id, source_facilitator_id, canonical_route_id, 
                    provider_base_url, route_path, methods, title, 
                    description, tags, pricing, rank_score
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (resource_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    tags = EXCLUDED.tags,
                    pricing = EXCLUDED.pricing,
                    rank_score = EXCLUDED.rank_score
            `, [
                res.resource_id, sourceFacilitatorId, res.canonical_route_id,
                res.provider_base_url, res.route_path, res.methods, res.title,
                res.description, res.tags, JSON.stringify(res.pricing), res.rank_score
            ]);
        }
        console.log('Success: Bazaar seeded with high-quality resources.');
    } catch (e) {
        console.error('Bazaar seeding failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
