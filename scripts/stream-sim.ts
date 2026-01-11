import { RouterService } from '../lib/services/router-service';
import pool from '../lib/db';
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
    console.log("🚀 Starting P402 Live Stream Simulator...");
    console.log("This will generate 20 realistic routing decisions over 60 seconds.");

    const prompts = [
        { task: 'summarization', prompt: 'Summarize the attached financial report for Q3.', amount: '0.015' },
        { task: 'translation', prompt: 'Translate this legal contract to Spanish.', amount: '0.042' },
        { task: 'inference', prompt: 'What is the current gas price on Base?', amount: '0.002' },
        { task: 'code_gen', prompt: 'Write a smart contract for a token swap.', amount: '0.085' },
        { task: 'agent_task', prompt: 'Book a flight from London to Paris.', amount: '0.12' },
    ];

    const tenantId = '00000000-0000-0000-0000-000000000000'; // Default demo tenant

    // Ensure we have a tenant
    await pool.query("INSERT INTO tenants (id, name) VALUES ($1, 'Demo Co') ON CONFLICT DO NOTHING", [tenantId]);

    for (let i = 0; i < 20; i++) {
        const item = prompts[Math.floor(Math.random() * prompts.length)];
        if (!item) continue;
        const requestId = `req_sim_${Date.now()}_${i}`;

        console.log(`[${i + 1}/20] Planning: ${item.task} | Prompt: "${item.prompt.slice(0, 30)}..."`);

        try {
            const res = await RouterService.plan(requestId, {
                routeId: 'route_discovery_v1',
                payment: {
                    network: '8453', // Base
                    scheme: 'p402_v1',
                    amount: item.amount,
                    asset: 'USDC'
                },
                prompt: item.prompt,
                task: item.task,
                tenantId: tenantId
            });

            console.log(`   ✅ Selected: ${res.candidates[0]?.facilitatorId || 'None'} | Cache: ${res.candidates.length === 0 ? 'HIT' : 'MISS'}`);
        } catch (e: any) {
            console.error(`   ❌ Failed: ${e.message}`);
        }

        // Wait between 1 and 4 seconds
        const wait = Math.floor(Math.random() * 3000) + 1000;
        await new Promise(resolve => setTimeout(resolve, wait));
    }

    console.log("\n🏁 Simulation complete. Check your P402 Dashboard for real-time updates.");
    process.exit(0);
}

main().catch(console.error);
