import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Running migration...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS intelligence_audits (
                audit_id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                findings_count INTEGER,
                actions_executed INTEGER,
                total_savings_usd DECIMAL(10,4),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Migration successful: intelligence_audits table created.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
