
/**
 * Live test for OpenRouter model fetching
 */
import { OpenRouterAdapter } from './lib/ai-providers/openrouter';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testOpenRouter() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('❌ OPENROUTER_API_KEY not found in .env.local');
        return;
    }

    console.log('--- LIVE OPENROUTER VERIFICATION ---');
    console.log(`Using Key: ${apiKey.substring(0, 10)}...`);

    const adapter = new OpenRouterAdapter({ apiKey });

    try {
        console.log('Fetching live models...');
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://p402.io',
                'X-Title': 'P402 AI Orchestration'
            }
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const models = data.data || [];

        console.log(`✅ Success! Found ${models.length} models.`);

        // Find GPT-5.2 or fallback to latest GPT
        const gpt5 = models.find((m: any) => m.id.includes('gpt-5'));
        if (gpt5) {
            console.log(`Found Latest: ${gpt5.id} - ${gpt5.name}`);
        } else {
            console.log('No GPT-5 found yet (limited release?), latest available:');
            console.log(models.slice(0, 5).map((m: any) => `- ${m.id}`).join('\n'));
        }

        console.log('\n--- VERIFICATION COMPLETE ---');
    } catch (e: any) {
        console.error(`❌ Error during live test: ${e.message}`);
    }
}

testOpenRouter();
