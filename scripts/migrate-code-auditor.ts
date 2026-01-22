import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Running Code Auditor migration...');

        // table to track public audits (anonymous + tenant based)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public_code_audits (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id TEXT, -- Optional, if user is logged in
                ip_address TEXT, -- For rate limiting anonymous users
                prompt_preview TEXT,
                report_md TEXT,
                risk_score INTEGER,
                burn_rate_usd NUMERIC(10, 2),
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_audit_ip ON public_code_audits(ip_address);
            CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public_code_audits(tenant_id);
        `);

        console.log('Migration successful: Code Auditor tracking added.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
