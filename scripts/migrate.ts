/**
 * QUARANTINED — Slice 3T.
 *
 * This file used to be a migration runner that was hardcoded to apply
 * a single specific schema file, regardless of which migration the
 * operator intended to run. That made it silently wrong for every
 * other migration in scripts/migrations/.
 *
 * It is now a deprecation stub. It does not connect to any database,
 * does not import pg, does not reference any specific .sql file, and
 * exits non-zero with a pointer to the safe runner.
 *
 * To apply a migration, use:
 *   npm run migrate:list
 *   npm run migrate:apply -- --file <name>.sql --target <dev|staging|production>
 *
 * See DEPLOYMENT.md section 1 for the full guidance, including the
 * production confirmation flow and the down-migration guard.
 */

const message = [
    '',
    'scripts/migrate.ts is deprecated and quarantined as of slice 3T.',
    '',
    'It used to be hardcoded to a single migration file, which made it',
    'silently wrong for every other migration in scripts/migrations/.',
    '',
    'Use the safe runner instead:',
    '',
    '  npm run migrate:list',
    '  npm run migrate:apply -- --file <name>.sql --target <dev|staging|production>',
    '',
    'For production:',
    '  npm run migrate:apply -- --file <name>.sql \\',
    '                          --target production \\',
    '                          --confirm-production <name>.sql',
    '',
    'For rollback files (*_down.sql), additionally pass --allow-down.',
    'See DEPLOYMENT.md section 1 for the full guidance.',
    '',
].join('\n');

process.stderr.write(message);
process.exit(2);
