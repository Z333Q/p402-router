
import { getProviderRegistry } from '../lib/ai-providers/registry';

async function test() {
    try {
        console.log("Initializing registry...");
        const reg = getProviderRegistry();

        console.log("Providers registered:", reg.getAll().length);
        const stats = reg.getStats();
        console.log("Total models:", stats.totalModels);
        console.log("Models by tier:", stats.modelsByTier);

        console.log("\nTop 5 cheapest models:");
        const cheapest = reg.compareCosts(1000, 1000);
        cheapest.slice(0, 5).forEach(m => {
            console.log(`- ${m.provider}/${m.model}: $${m.costUsd.toFixed(6)}`);
        });

        console.log("\nTesting Routing Decision (mode: quality, capability: vision):");
        const decision = await reg.route({
            messages: [{ role: 'user', content: 'Describe this image' }],
        }, {
            mode: 'quality',
            requiredCapabilities: ['vision' as any]
        });

        console.log(`Winner: ${decision.provider.id}/${decision.model.id}`);
        console.log(`Reason: ${decision.reason}`);
        console.log(`Total Score: ${decision.scores.total}`);
        console.log("Alternatives:", decision.alternatives.length);

        process.exit(0);
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

test();
