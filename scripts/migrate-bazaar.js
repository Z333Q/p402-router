
import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

async function runMigration() {
    console.log('🔌 Connecting to database...');

    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
        console.error('❌ Missing DATABASE_URL or POSTGRES_URL');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected.');

        const sqlPath = path.join(process.cwd(), 'schema_bazaar.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📜 Running schema_bazaar.sql...');
        await client.query(sql);

        console.log('🎉 Migration successful! Table `bazaar_resources` created.');
        client.release();
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
