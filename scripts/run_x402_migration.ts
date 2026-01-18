
import fs from 'fs';
import path from 'path';
import { query } from '../lib/db';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

async function runX402Migration() {
    console.log('Starting A2A x402 Extension Migration...');

    const migrationPath = path.join(process.cwd(), 'scripts/migrations/a2a_003_x402_payments.sql');

    try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log(`Read migration file from ${migrationPath}, length: ${sql.length} bytes`);

        // Execute the SQL
        await query(sql);
        console.log('✅ Migration applied successfully.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

runX402Migration();
