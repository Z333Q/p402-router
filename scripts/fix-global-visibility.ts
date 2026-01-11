
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

async function runFix() {
    console.log('🔌 Connecting to DB...');
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();

        console.log("🛠 Fixing Global Facilitator Visibility...");

        // Update all facilitators marked as 'Global' to have NULL tenant_id
        // This ensures they are visible to ALL users via the left-join/null-check logic
        const res = await client.query(`
            UPDATE facilitators 
            SET tenant_id = NULL 
            WHERE type = 'Global' 
            AND tenant_id IS NOT NULL
        `);

        console.log(`✅ Updated ${res.rowCount} facilitators to be truly Global (tenant_id = NULL).`);

        client.release();
    } catch (e) {
        console.error("Fix failed", e);
    } finally {
        await pool.end();
    }
}

runFix();
