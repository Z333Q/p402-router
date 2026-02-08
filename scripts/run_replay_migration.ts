import { Client } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
    console.log("🔌 Connecting to database...");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        const migrationFile = path.join(process.cwd(), 'scripts', 'migrations', '003_replay_protection.sql');
        console.log(`📂 Reading migration file: ${migrationFile}`);

        if (!fs.existsSync(migrationFile)) {
            throw new Error(`Migration file not found at ${migrationFile}`);
        }

        const sql = fs.readFileSync(migrationFile, 'utf-8');

        console.log("🚀 Executing Replay Protection Migration...");
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
        console.log("✅ Migration Successful.");

    } catch (e) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed:", e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
