import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });

    const schemaPath = path.join(process.cwd(), "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    const client = await pool.connect();
    try {
        console.log("Applying schema...");
        await client.query(schema);
        console.log("Schema applied successfully.");
    } catch (e) {
        console.error("Failed to apply schema:", e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
