/**
 * Admin crypto utilities.
 * - Password hashing: Node.js crypto.scrypt (OWASP recommended, no external deps)
 * - TOTP secret encryption: AES-256-GCM with ADMIN_ENCRYPTION_KEY env var
 *   Format: v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Password hashing (scrypt)
// ---------------------------------------------------------------------------

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, dkLen: 64 };

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(32).toString('hex');
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, SCRYPT_PARAMS.dkLen, SCRYPT_PARAMS, (err, derived) => {
            if (err) reject(err);
            else resolve(`v1:${salt}:${derived.toString('hex')}`);
        });
    });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'v1') return false;
    const [, salt, hash] = parts;
    if (!salt || !hash) return false;
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, SCRYPT_PARAMS.dkLen, SCRYPT_PARAMS, (err, derived) => {
            if (err) reject(err);
            else resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived));
        });
    });
}

// ---------------------------------------------------------------------------
// TOTP secret encryption (AES-256-GCM)
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
    const key = process.env.ADMIN_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('ADMIN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}

export function encryptTOTPSecret(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTOTPSecret(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid TOTP ciphertext format');
    const [, ivHex, tagHex, encHex] = parts;
    if (!ivHex || !tagHex || !encHex) throw new Error('Malformed TOTP ciphertext');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8');
}

// ---------------------------------------------------------------------------
// Session token (raw token → SHA-256 hash for DB storage)
// ---------------------------------------------------------------------------

export function generateSessionToken(): string {
    return crypto.randomBytes(48).toString('hex'); // 96 hex chars
}

export function hashSessionToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

// ---------------------------------------------------------------------------
// Invite token
// ---------------------------------------------------------------------------

export function generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function hashInviteToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
}
