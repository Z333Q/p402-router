import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Running Semantic Cache Vector migration...');

        // 1. Enable pgvector
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');

        // 2. Add embedding column to semantic_cache
        await pool.query(`
            ALTER TABLE semantic_cache 
            ADD COLUMN IF NOT EXISTS request_embedding vector(768); -- Gemini text-embedding-004 is 768d
        `);

        // 3. Create HNSW index for fast similarity search
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_semantic_cache_embedding 
            ON semantic_cache USING hnsw (request_embedding vector_cosine_ops);
        `);

        console.log('Migration successful: Vector support added to semantic_cache.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
