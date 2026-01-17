
import fs from 'fs';
import path from 'path';
import { query } from '../lib/db';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

async function runMigration() {
    console.log('Starting A2A Migration...');

    const migrationPath = path.join(process.cwd(), 'scripts/migrations/a2a_001_task_model.sql');

    try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log(`Read migration file from ${migrationPath}, length: ${sql.length} bytes`);

        // Execute the SQL
        // Note: pg might not support multiple statements in one query() call depending on configuration,
        // but typically it does or we might need to split. The SQL I wrote uses ; terminators.
        // Let's try running it as one block.

        await query(sql);
        console.log('Migration applied successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    // We should exit
    process.exit(0);
}

runMigration();
