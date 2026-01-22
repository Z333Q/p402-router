import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Running Guardian Governance migration...');

        // 1. Add governance settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS intelligence_settings (
                tenant_id TEXT PRIMARY KEY,
                governance_mode TEXT DEFAULT 'autonomous' CHECK (governance_mode IN ('autonomous', 'approval')),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 2. Add status to model overrides
        await pool.query(`
            ALTER TABLE intelligence_model_overrides 
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected'));
        `);

        // 3. Add status to routing weights (if we want to approve weights too)
        await pool.query(`
            ALTER TABLE intelligence_routing_weights
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected')),
            ADD COLUMN IF NOT EXISTS proposed_weights JSONB;
        `);

        console.log('Migration successful: Guardian Governance support added.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
