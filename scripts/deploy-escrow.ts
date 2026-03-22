/**
 * Deploy P402Escrow.sol to Base (or Base Sepolia).
 *
 * Usage:
 *   npx tsx scripts/deploy-escrow.ts                  # Base mainnet
 *   npx tsx scripts/deploy-escrow.ts --network=base-sepolia
 *
 * Prerequisites:
 *   npx hardhat compile   (generates artifacts/contracts/P402Escrow.sol/P402Escrow.json)
 *
 * Required env:
 *   DEPLOYER_PRIVATE_KEY   — deployer wallet private key
 *   P402_TREASURY_ADDRESS  — treasury that receives 1% escrow fees
 */

import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const network = process.argv.includes('--network=base-sepolia') ? 'base-sepolia' : 'base';
const chain = network === 'base-sepolia' ? baseSepolia : base;
const rpcUrl = network === 'base-sepolia'
    ? (process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org')
    : (process.env.BASE_RPC_URL ?? 'https://mainnet.base.org');

async function main() {
    const pk = process.env.DEPLOYER_PRIVATE_KEY;
    const treasury = process.env.P402_TREASURY_ADDRESS;

    if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set');
    if (!treasury) throw new Error('P402_TREASURY_ADDRESS not set');

    const account = privateKeyToAccount(
        (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`
    );

    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`\n🔑 Deployer:  ${account.address}`);
    console.log(`💰 Balance:   ${formatEther(balance)} ETH`);
    console.log(`🌐 Network:   ${network}`);
    console.log(`🏦 Treasury:  ${treasury}`);

    if (balance === 0n) throw new Error('Deployer has zero balance — fund before deploying');

    // Load artifact
    const artifactPath = path.resolve(
        'artifacts/contracts/P402Escrow.sol/P402Escrow.json'
    );
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found: ${artifactPath}\nRun: npx hardhat compile`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    console.log('\n📦 Deploying P402Escrow.sol...');
    const hash = await walletClient.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode as `0x${string}`,
        args: [treasury as `0x${string}`],
        chain,
    });

    console.log(`⏳ Tx submitted: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const address = receipt.contractAddress!;

    console.log(`\n✅ P402Escrow deployed!`);
    console.log(`   Address:  ${address}`);
    console.log(`   Tx hash:  ${receipt.transactionHash}`);
    console.log(`   Block:    ${receipt.blockNumber}`);
    console.log(`\nAdd to .env.local:\n  P402_ESCROW_ADDRESS=${address}`);

    // Save deployment record
    const deploymentPath = path.resolve('deployments');
    fs.mkdirSync(deploymentPath, { recursive: true });
    const record = {
        network,
        chainId: chain.id,
        P402Escrow: {
            address,
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber.toString(),
            deployedAt: new Date().toISOString(),
            treasury,
        },
    };

    const outPath = path.join(deploymentPath, `${network}-escrow.json`);
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
    console.log(`\n📝 Saved deployment record to ${outPath}`);
}

main().catch(err => {
    console.error('Deploy failed:', err);
    process.exit(1);
});
