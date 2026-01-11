
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

async function runMigration() {
    console.log('🔌 Connecting to database...');

    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ Missing DATABASE_URL or POSTGRES_URL');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected.');

        console.log('🔄 Renaming columns...');

        // Check if type column exists first (idempotency)
        const checkType = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='facilitators' AND column_name='type'");
        if (checkType.rows.length === 0) {
            await client.query("ALTER TABLE facilitators ADD COLUMN type VARCHAR(50) DEFAULT 'Private'");
            console.log("Added 'type' column.");
        }

        // Check if endpoint_url exists before renaming
        const checkEndpoint = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='facilitators' AND column_name='endpoint_url'");
        if (checkEndpoint.rows.length > 0) {
            await client.query("ALTER TABLE facilitators RENAME COLUMN endpoint_url TO endpoint");
            console.log("Renamed 'endpoint_url' to 'endpoint'.");
        }

        // Check if supported_networks exists before renaming
        const checkNetworks = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='facilitators' AND column_name='supported_networks'");
        if (checkNetworks.rows.length > 0) {
            await client.query("ALTER TABLE facilitators RENAME COLUMN supported_networks TO networks");
            console.log("Renamed 'supported_networks' to 'networks'.");
        }

        // Infer type for existing rows
        await client.query("UPDATE facilitators SET type = 'Global' WHERE tenant_id IS NULL");

        console.log('🎉 Migration v2 successful!');
        client.release();
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
