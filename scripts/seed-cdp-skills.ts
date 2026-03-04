/**
 * Seed CDP AgentKit skills into the Bazaar.
 * Run with: npx tsx scripts/seed-cdp-skills.ts
 */

import { seedCdpAgentKitSkills } from '../lib/cdp-agentkit-skills';
import pool from '../lib/db';

async function main() {
    console.log('[seed-cdp-skills] Seeding CDP AgentKit skills into bazaar_agents…');
    await seedCdpAgentKitSkills();
    console.log('[seed-cdp-skills] Done.');
    await pool.end();
}

main().catch(err => {
    console.error('[seed-cdp-skills] Error:', err);
    process.exit(1);
});
