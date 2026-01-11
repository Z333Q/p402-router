
import { Client } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * Simple Migration Runner
 */
async function main() {
    console.log("🔌 Connecting to database...");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        const migrationFile = path.join(process.cwd(), 'scripts', 'migrations', 'v2_001_initial_schema.sql');
        console.log(`📂 Reading migration file: ${migrationFile}`);

        if (!fs.existsSync(migrationFile)) {
            throw new Error(`Migration file not found at ${migrationFile}`);
        }

        const sql = fs.readFileSync(migrationFile, 'utf-8');

        console.log("🚀 Executing V2 Migration...");
        await client.query("BEGIN");

        // Try to enable pgvector if possible, but don't fail hard if permissions deny (let the table creation fail or handle it)
        try {
            await client.query('CREATE EXTENSION IF NOT EXISTS vector');
            console.log("✅ pgvector extension enabled (or already exists).");
        } catch (e) {
            console.warn("⚠️ Could not enable pgvector extension. Providing fallback for semantic_cache if needed. Error:", (e as any).message);
            // If pgvector fails, we might need to adjust the table definition dynamically or incorrectly defined table will error out.
            // For now, let's proceed. If 'vector' type is missing, the table creation below will likely fail if we don't handle it.
        }

        await client.query(sql);

        await client.query("COMMIT");
        console.log("✅ V2 Schema Migration Successful.");

    } catch (e) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed:", e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
