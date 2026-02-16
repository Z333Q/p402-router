#!/usr/bin/env npx tsx
/**
 * ERC-8004 Agent Registration Script
 *
 * One-time script to register P402 as an agent on the ERC-8004 Identity Registry.
 *
 * Usage:
 *   npx tsx scripts/register-erc8004.ts
 *
 * Environment:
 *   P402_FACILITATOR_PRIVATE_KEY - Wallet private key (pays gas)
 *   ERC8004_TESTNET=true         - Use Base Sepolia (default: mainnet)
 *   ERC8004_AGENT_URI            - Agent registration JSON URL
 *
 * After running, set the printed agent ID in your .env:
 *   ERC8004_AGENT_ID=<printed value>
 */

import {
  registerAgent,
  setAgentWalletOnChain,
  setAgentMetadata,
  verifyAgentIdentity,
} from '../lib/erc8004/identity-client';
import { P402_CONFIG } from '../lib/constants';

async function main() {
  const agentURI =
    process.env.ERC8004_AGENT_URI || 'https://p402.io/.well-known/erc8004.json';
  const isTestnet = process.env.ERC8004_TESTNET === 'true';

  console.log('=== ERC-8004 Agent Registration ===');
  console.log(`Network: ${isTestnet ? 'Base Sepolia (testnet)' : 'Base Mainnet'}`);
  console.log(`Agent URI: ${agentURI}`);
  console.log('');

  // Step 1: Register
  console.log('Step 1: Registering agent...');
  const agentId = await registerAgent(agentURI);
  console.log(`  Agent registered with ID: ${agentId}`);

  // Step 2: Set agent wallet to treasury
  console.log('Step 2: Linking treasury wallet...');
  const treasuryAddress = P402_CONFIG.TREASURY_ADDRESS as `0x${string}`;
  const walletTx = await setAgentWalletOnChain(agentId, treasuryAddress);
  console.log(`  Wallet linked: ${walletTx}`);

  // Step 3: Set metadata
  console.log('Step 3: Setting protocol metadata...');
  const protocolTx = await setAgentMetadata(agentId, 'protocol', 'x402');
  console.log(`  protocol=x402: ${protocolTx}`);

  const versionTx = await setAgentMetadata(agentId, 'version', '3.0.0');
  console.log(`  version=3.0.0: ${versionTx}`);

  const networkTx = await setAgentMetadata(agentId, 'network', 'eip155:8453');
  console.log(`  network=eip155:8453: ${networkTx}`);

  // Step 4: Verify
  console.log('Step 4: Verifying registration...');
  const identity = await verifyAgentIdentity(agentId);
  if (identity) {
    console.log('  Verification successful:');
    console.log(`    Owner: ${identity.owner}`);
    console.log(`    URI: ${identity.agentURI}`);
    console.log(`    Wallet: ${identity.wallet}`);
  } else {
    console.error('  Verification FAILED - agent not found on-chain');
    process.exit(1);
  }

  console.log('');
  console.log('=== Registration Complete ===');
  console.log('');
  console.log('Add this to your .env file:');
  console.log(`  ERC8004_AGENT_ID=${agentId}`);
}

main().catch((err) => {
  console.error('Registration failed:', err);
  process.exit(1);
});
