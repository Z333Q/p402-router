import pool from '../lib/db'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

async function main() {
    console.log('🚀 Triggering Cost Anomaly for Demo Tenant...');
    const tenantId = '00000000-0000-0000-0000-000000000001';

    // Insert 50 high-cost decisions in the last 10 minutes
    for (let i = 0; i < 50; i++) {
        await pool.query(`
            INSERT INTO router_decisions (
                request_id, tenant_id, task, requested_mode, 
                selected_provider_id, selected_model, cost_usd, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
            crypto.randomUUID(),
            tenantId,
            'code_gen',
            'quality',
            'fac_coinbase_01',
            'claude-3-opus',
            1.50 // High cost per call
        ]);
    }

    console.log('✅ 50 high-cost decisions inserted. Total spend spike: $75.00');
    console.log('Run the dashboard and check the alerts section!');
    process.exit(0);
}

main().catch(console.error);
