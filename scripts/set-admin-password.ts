/**
 * Set or reset the admin password for a super admin user.
 *
 * Usage:
 *   npx tsx scripts/set-admin-password.ts zeshan@p402.io "YourNewPassword"
 *
 * This script:
 *  1. Checks if the admin_users row exists (and shows its current state)
 *  2. Upserts the row with is_active=TRUE, role=super_admin
 *  3. Sets the password_hash using the same scrypt params as lib/admin/crypto.ts
 *
 * Safe to run multiple times — idempotent.
 */

import crypto from 'crypto';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local from project root
const root = path.resolve(import.meta.dirname, '..');
for (const f of ['.env.local', '.env']) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
}

const { Pool } = pg;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, dkLen: 64 };

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(32).toString('hex');
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, SCRYPT_PARAMS.dkLen, SCRYPT_PARAMS, (err, derived) => {
            if (err) reject(err);
            else resolve(`v1:${salt}:${derived.toString('hex')}`);
        });
    });
}

async function main() {
    const [, , email, password] = process.argv;

    if (!email || !password) {
        console.error('Usage: npx tsx scripts/set-admin-password.ts <email> "<password>"');
        process.exit(1);
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌  DATABASE_URL not set. Make sure .env.local is present.');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
        // 1. Show current state
        const check = await pool.query(
            `SELECT email, role, is_active,
                    password_hash IS NOT NULL        AS has_hash,
                    LEFT(password_hash, 15)          AS hash_prefix,
                    created_at
             FROM admin_users WHERE email = $1`,
            [email.toLowerCase().trim()]
        );

        if (check.rows.length === 0) {
            console.log(`ℹ️  No row found for ${email} — will INSERT a new super_admin.`);
        } else {
            const r = check.rows[0];
            console.log('\nCurrent DB state:');
            console.log(`  email:        ${r.email}`);
            console.log(`  role:         ${r.role}`);
            console.log(`  is_active:    ${r.is_active}`);
            console.log(`  has_hash:     ${r.has_hash}`);
            console.log(`  hash_prefix:  ${r.hash_prefix ?? '(null)'}`);
            console.log(`  created_at:   ${r.created_at}\n`);
        }

        // 2. Hash the password
        console.log('Hashing password (this takes ~1s)...');
        const hash = await hashPassword(password);
        console.log(`Hash prefix: ${hash.substring(0, 15)}...`);

        // 3. Upsert
        await pool.query(
            `INSERT INTO admin_users (email, role, is_active, password_hash)
             VALUES ($1, 'super_admin', TRUE, $2)
             ON CONFLICT (email) DO UPDATE
             SET role         = 'super_admin',
                 is_active    = TRUE,
                 password_hash = $2,
                 updated_at   = NOW()`,
            [email.toLowerCase().trim(), hash]
        );

        // 4. Verify
        const verify = await pool.query(
            `SELECT email, role, is_active,
                    password_hash IS NOT NULL AS has_hash,
                    LEFT(password_hash, 15)   AS hash_prefix
             FROM admin_users WHERE email = $1`,
            [email.toLowerCase().trim()]
        );
        const r = verify.rows[0];
        console.log('\n✅  Done. Row now in DB:');
        console.log(`  email:       ${r?.email}`);
        console.log(`  role:        ${r?.role}`);
        console.log(`  is_active:   ${r?.is_active}`);
        console.log(`  has_hash:    ${r?.has_hash}`);
        console.log(`  hash_prefix: ${r?.hash_prefix}`);
        console.log('\nYou can now log in at /admin/login with those credentials.\n');
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
