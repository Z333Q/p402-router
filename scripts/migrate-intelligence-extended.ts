import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Running Intelligence Extended Tools migration...');

        // 1. Rate Limits table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS intelligence_rate_limits (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id TEXT NOT NULL,
                model_pattern TEXT NOT NULL,
                requests_per_minute INTEGER,
                tokens_per_minute INTEGER,
                enabled BOOLEAN DEFAULT true,
                status TEXT DEFAULT 'active', -- 'active', 'pending'
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_int_rate_limits_tenant ON intelligence_rate_limits(tenant_id);
        `);

        // 2. Failover Chains table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS intelligence_failover_chains (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id TEXT NOT NULL,
                primary_model TEXT NOT NULL,
                fallback_models TEXT[], -- Ordered list
                trigger_on_status INTEGER[], -- e.g. [429, 500, 503]
                enabled BOOLEAN DEFAULT true,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_int_failover_tenant ON intelligence_failover_chains(tenant_id);
        `);

        // 3. Alerts table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS intelligence_alerts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id TEXT NOT NULL,
                metric TEXT NOT NULL, -- 'cost', 'error_rate', 'latency'
                threshold NUMERIC(10, 4) NOT NULL,
                time_window_mins INTEGER DEFAULT 60,
                notification_channel TEXT DEFAULT 'dashboard', -- 'dashboard', 'webhook', 'email'
                enabled BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_int_alerts_tenant ON intelligence_alerts(tenant_id);
        `);

        console.log('Migration successful: Extended Intelligence tools added.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
