import { AnomalyDetection } from '../lib/intelligence/anomaly-detection'
import { OptimizationEngine } from '../lib/intelligence/optimization'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

async function main() {
    console.log('🧪 Starting Intelligence Layer Standalone Test...');
    const tenantId = '00000000-0000-0000-0000-000000000001';

    console.log('\n1. Checking for Anomalies...');
    const anomaly = await AnomalyDetection.checkSpendAnomaly(tenantId);
    if (anomaly) {
        console.log('🚨 ANOMALY DETECTED:', anomaly.message);
        console.log('Details:', JSON.stringify(anomaly.details));
    } else {
        console.log('✅ No anomalies detected (Normal spend).');
    }

    console.log('\n2. Generating Optimization Recommendations...');
    const recommendations = await OptimizationEngine.generateRecommendations(tenantId);
    if (recommendations.length > 0) {
        console.log(`💡 Found ${recommendations.length} recommendations:`);
        recommendations.forEach((r, i) => {
            console.log(`   [${i + 1}] ${r.message} (Potential Savings: $${r.potentialSavingsUsd.toFixed(2)})`);
        });
    } else {
        console.log('✅ No recommendations found at this time.');
    }

    process.exit(0);
}

main().catch(console.error);
