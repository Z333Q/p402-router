export const ADMIN_ROLES = [
    'super_admin',
    'ops_admin',
    'analytics',
    'safety',
    'finance',
] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export function parseRole(raw: string | undefined, fallback: AdminRole = 'super_admin'): AdminRole {
    if (raw === undefined) return fallback;
    if ((ADMIN_ROLES as readonly string[]).includes(raw)) return raw as AdminRole;
    throw new Error(
        `Invalid --role "${raw}". Allowed values: ${ADMIN_ROLES.join(', ')}.`
    );
}

export function parseArgs(argv: string[]): { email: string; password: string; role: AdminRole } {
    const positional: string[] = [];
    let role: string | undefined;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--role') {
            role = argv[++i];
            continue;
        }
        if (a !== undefined) positional.push(a);
    }
    const [email, password] = positional;
    if (!email || !password) {
        throw new Error('Usage: npx tsx scripts/set-admin-password.ts <email> "<password>" [--role <role>]');
    }
    return { email, password, role: parseRole(role) };
}
