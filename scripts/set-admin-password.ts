/**
 * Set or reset the admin password for an admin user.
 *
 * Usage:
 *   npx tsx scripts/set-admin-password.ts <email> "<password>" [--role <role>]
 *
 * Examples:
 *   npx tsx scripts/set-admin-password.ts zeshan@p402.io "YourPassword"
 *   npx tsx scripts/set-admin-password.ts qa-claude-admin@p402.internal "$PWD_ENV" --role ops_admin
 *
 * This script:
 *  1. Checks if the admin_users row exists (and shows its current state)
 *  2. Upserts the row with is_active=TRUE and the chosen role (default: super_admin)
 *  3. Sets the password_hash using the same scrypt params as lib/admin/crypto.ts
 *
 * Safe to run multiple times — idempotent.
 *
 * The script never prints the password or the password hash. Only a fixed,
 * non-secret summary is emitted: id, email, role, is_active, totp_enabled.
 */

import crypto from 'crypto';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { parseArgs, type AdminRole } from './admin-password-utils';

// Load .env.local from project root
const root = path.resolve(import.meta.dirname, '..');
for (const f of ['.env.local', '.env']) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
}

const { Pool } = pg;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, dkLen: 64 };

async function hashPassword(plain: string): Promise<string> {
    const salt = crypto.randomBytes(32).toString('hex');
    return new Promise((resolve, reject) => {
        crypto.scrypt(plain, salt, SCRYPT_PARAMS.dkLen, SCRYPT_PARAMS, (err, derived) => {
            if (err) reject(err);
            else resolve(`v1:${salt}:${derived.toString('hex')}`);
        });
    });
}

async function main() {
    let email: string;
    let secret: string;
    let role: AdminRole;
    try {
        const parsed = parseArgs(process.argv.slice(2));
        email = parsed.email;
        secret = parsed.password;
        role = parsed.role;
    } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not set. Make sure .env.local is present.');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    const normalizedEmail = email.toLowerCase().trim();

    try {
        // 1. Show current state (no secrets)
        const check = await pool.query(
            `SELECT id::text AS id, email, role, is_active, totp_enabled,
                    password_hash IS NOT NULL AS has_hash,
                    created_at
             FROM admin_users WHERE email = $1`,
            [normalizedEmail]
        );

        if (check.rows.length === 0) {
            console.log(`No row found for ${normalizedEmail} — will INSERT new admin with role=${role}.`);
        } else {
            const r = check.rows[0];
            console.log('\nCurrent DB state:');
            console.log(`  id:           ${r.id}`);
            console.log(`  email:        ${r.email}`);
            console.log(`  role:         ${r.role}`);
            console.log(`  is_active:    ${r.is_active}`);
            console.log(`  totp_enabled: ${r.totp_enabled}`);
            console.log(`  has_hash:     ${r.has_hash}`);
            console.log(`  created_at:   ${r.created_at}\n`);
        }

        // 2. Compute scrypt digest (silent)
        const digest = await hashPassword(secret);

        // 3. Upsert with the requested role
        await pool.query(
            `INSERT INTO admin_users (email, role, is_active, password_hash)
             VALUES ($1, $2, TRUE, $3)
             ON CONFLICT (email) DO UPDATE
             SET role          = $2,
                 is_active     = TRUE,
                 password_hash = $3,
                 updated_at    = NOW()`,
            [normalizedEmail, role, digest]
        );

        // 4. Verify — print only non-secret fields
        const verify = await pool.query(
            `SELECT id::text AS id, email, role, is_active, totp_enabled
             FROM admin_users WHERE email = $1`,
            [normalizedEmail]
        );
        const r = verify.rows[0];
        console.log('\nDone. Row now in DB:');
        console.log(`  id:           ${r?.id}`);
        console.log(`  email:        ${r?.email}`);
        console.log(`  role:         ${r?.role}`);
        console.log(`  is_active:    ${r?.is_active}`);
        console.log(`  totp_enabled: ${r?.totp_enabled}`);
        console.log('\nYou can now log in at /admin/login with those credentials.\n');
    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
});
