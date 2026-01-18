/**
 * Test script for OpenRouter-First routing logic and 402 Fee verification
 */
import { getProviderRegistry } from '../lib/ai-providers/registry';
import { ModelInfo } from '../lib/ai-providers/types';

async function testRouting() {
    const registry = getProviderRegistry();

    console.log('--- 402 SPECIALIST VERIFICATION ---');

    // 1. Verify 1% P402 Platform Fee
    console.log('\n[1] Verifying 1% P402 Platform Fee...');
    const testModel: ModelInfo = {
        id: 'test-model',
        name: 'Test Model',
        tier: 'mid',
        contextWindow: 1000,
        inputCostPer1k: 0.001, // $1.00 per 1M tokens = $0.001 per 1K
        outputCostPer1k: 0.002, // $2.00 per 1M tokens = $0.002 per 1K
        capabilities: ['chat'],
        supportsStreaming: true
    };

    // We need to access the provider to call estimateCost
    const provider = registry.get('openai');
    if (provider) {
        const modelId = 'gpt-4o'; // Existing model in OpenAI adapter
        const model = (provider as any).getModel(modelId);
        if (model) {
            const inputTokens = 1000;
            const outputTokens = 500;
            const baseCost = (inputTokens / 1000 * model.inputCostPer1k) + (outputTokens / 1000 * model.outputCostPer1k);
            const estimated = provider.estimateCost(modelId, inputTokens, outputTokens);

            const expected = baseCost * 1.01;
            const diff = Math.abs(estimated - expected);

            console.log(`Model: ${modelId}`);
            console.log(`Base Cost: $${baseCost.toFixed(6)}`);
            console.log(`With 1% Fee (Expected): $${expected.toFixed(6)}`);
            console.log(`With 1% Fee (Got): $${estimated.toFixed(6)}`);

            if (diff < 0.00001) {
                console.log('✅ 1% Fee Verification: SUCCESS');
            } else {
                console.log('❌ 1% Fee Verification: FAILED');
            }
        }
    }

    // 2. OpenRouter-First Routing Logic
    console.log('\n[2] Verifying OpenRouter-First Routing...');

    // Simulate NO keys except OpenRouter
    process.env.OPENROUTER_API_KEY = 'mock-key';
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;

    console.log('Environment: Only OPENROUTER_API_KEY is set.');

    const testCases = [
        { model: 'gpt-4o', expectedProvider: 'openrouter', expectedResolvedModel: 'openai/gpt-4o' },
        { model: 'claude-3.5-sonnet', expectedProvider: 'openrouter', expectedResolvedModel: 'anthropic/claude-3.5-sonnet' },
    ];

    for (const test of testCases) {
        try {
            const decision = await registry.route({
                messages: [{ role: 'user', content: 'hello' }],
                model: test.model
            });

            console.log(`Request [${test.model}] -> Resolves to [${decision.provider.id}:${decision.model.id}]`);

            if (decision.provider.id === test.expectedProvider && decision.model.id === test.expectedResolvedModel) {
                console.log('✅ PASS');
            } else {
                console.log('❌ FAIL');
            }
        } catch (e: any) {
            console.log(`Error: ${e.message}`);
            console.log('❌ FAIL');
        }
    }
}

testRouting().catch(console.error);
