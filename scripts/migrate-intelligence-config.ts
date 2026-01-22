import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Running Intelligence Configuration migration...');

        // 1. Model Substitutions (Overrides)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS intelligence_model_overrides (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                rule_name TEXT NOT NULL,
                task_pattern TEXT, -- Regex for task match
                original_model TEXT,
                substitute_model TEXT NOT NULL,
                enabled BOOLEAN DEFAULT TRUE,
                priority INTEGER DEFAULT 10,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_model_overrides_tenant ON intelligence_model_overrides(tenant_id);
        `);

        // 2. Routing Mode Weights
        await pool.query(`
            CREATE TABLE IF NOT EXISTS intelligence_routing_weights (
                tenant_id TEXT PRIMARY KEY,
                cost_weight DECIMAL(3,2) DEFAULT 0.33,
                speed_weight DECIMAL(3,2) DEFAULT 0.33,
                quality_weight DECIMAL(3,2) DEFAULT 0.34,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 3. Cache Config (Global or Tenant Specific)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS intelligence_cache_config (
                tenant_id TEXT PRIMARY KEY,
                similarity_threshold DECIMAL(3,2) DEFAULT 0.85,
                ttl_hours INTEGER DEFAULT 24,
                max_tokens_to_cache INTEGER DEFAULT 4096,
                enabled BOOLEAN DEFAULT TRUE,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('Migration successful: Intelligence configuration tables created.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
