/**
 * Deploy both P402 contracts to Base (or Base Sepolia).
 *
 * Usage:
 *   npx tsx scripts/deploy-contracts.ts                  # Base mainnet
 *   npx tsx scripts/deploy-contracts.ts --network=base-sepolia
 *
 * Required env (in .env.local):
 *   DEPLOYER_PRIVATE_KEY   — deployer wallet key (without 0x is fine)
 *   P402_TREASURY_ADDRESS  — treasury that receives subscription fees
 *   BASE_USDC_ADDRESS or use the hardcoded mainnet constant below
 */

import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

// ── USDC addresses ────────────────────────────────────────────────────────────
const USDC = {
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const;

async function deployContract(
    walletClient: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    artifactPath: string,
    constructorArgs: readonly unknown[],
    label: string
): Promise<`0x${string}`> {
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Missing artifact: ${artifactPath}\nRun: npx hardhat compile`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    console.log(`\n📦 Deploying ${label}...`);
    const hash = await walletClient.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: constructorArgs,
        chain: walletClient.chain!,
    });

    console.log(`   Tx: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
        throw new Error(`${label} deployment failed`);
    }

    const address = receipt.contractAddress!;
    console.log(`   ✅ ${label} → ${address}`);
    console.log(`   Block: ${receipt.blockNumber}`);

    return address;
}

async function main() {
    // ── Config ────────────────────────────────────────────────────────────────
    let pk = (process.env.DEPLOYER_PRIVATE_KEY || '').trim();
    if (pk && !pk.startsWith('0x')) pk = `0x${pk}`;
    if (!pk || pk === '0x') {
        console.error('❌ Missing DEPLOYER_PRIVATE_KEY');
        process.exit(1);
    }

    const treasury = process.env.P402_TREASURY_ADDRESS;
    if (!treasury || !treasury.startsWith('0x')) {
        console.error('❌ Missing P402_TREASURY_ADDRESS');
        process.exit(1);
    }

    const args = process.argv.slice(2);
    const networkArg = args.find(a => a.startsWith('--network='))?.split('=')[1] ?? 'base';
    const chain = networkArg === 'base-sepolia' ? baseSepolia : base;
    const usdcAddress = USDC[networkArg as keyof typeof USDC] ?? USDC.base;

    const account = privateKeyToAccount(pk as `0x${string}`);

    const publicClient = createPublicClient({ chain, transport: http() });
    const walletClient = createWalletClient({ account, chain, transport: http() });

    // ── Pre-flight ────────────────────────────────────────────────────────────
    console.log(`\n🚀 P402 Contract Deployment`);
    console.log(`   Network:   ${chain.name} (${chain.id})`);
    console.log(`   Deployer:  ${account.address}`);
    console.log(`   Treasury:  ${treasury}`);
    console.log(`   USDC:      ${usdcAddress}`);

    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`   ETH bal:   ${formatEther(balance)} ETH`);

    if (balance === 0n) {
        console.error('❌ Deployer has zero ETH — cannot pay gas');
        process.exit(1);
    }

    // ── Deploy ────────────────────────────────────────────────────────────────
    const settlementAddress = await deployContract(
        walletClient,
        publicClient,
        path.join(process.cwd(), 'artifacts/contracts/P402Settlement.sol/P402Settlement.json'),
        [treasury] as const,
        'P402Settlement'
    );

    const facilitatorAddress = await deployContract(
        walletClient,
        publicClient,
        path.join(process.cwd(), 'artifacts/contracts/SubscriptionFacilitator.sol/SubscriptionFacilitator.json'),
        [treasury, usdcAddress] as const,
        'SubscriptionFacilitator'
    );

    // ── Save deployment record ────────────────────────────────────────────────
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    fs.mkdirSync(deploymentsDir, { recursive: true });

    const record = {
        network: chain.name,
        chainId: chain.id,
        deployedAt: new Date().toISOString(),
        deployer: account.address,
        treasury,
        usdc: usdcAddress,
        contracts: {
            P402Settlement: settlementAddress,
            SubscriptionFacilitator: facilitatorAddress,
        },
    };

    const outFile = path.join(deploymentsDir, `${networkArg}.json`);
    fs.writeFileSync(outFile, JSON.stringify(record, null, 2));

    const explorer = chain.blockExplorers?.default.url ?? 'https://basescan.org';

    console.log(`\n✅ Both contracts deployed`);
    console.log(`\n📋 Add these to your .env.local and Vercel dashboard:`);
    console.log(`\nP402_SETTLEMENT_ADDRESS=${settlementAddress}`);
    console.log(`SUBSCRIPTION_FACILITATOR_ADDRESS=${facilitatorAddress}`);
    console.log(`\n🔍 Verify on Basescan:`);
    console.log(`npx hardhat verify --network ${networkArg} ${settlementAddress} "${treasury}"`);
    console.log(`npx hardhat verify --network ${networkArg} ${facilitatorAddress} "${treasury}" "${usdcAddress}"`);
    console.log(`\n🧭 Explorer:`);
    console.log(`${explorer}/address/${settlementAddress}`);
    console.log(`${explorer}/address/${facilitatorAddress}`);
    console.log(`\n💾 Deployment saved to: ${outFile}`);
}

main().catch((err) => {
    console.error('❌ Deploy failed:', err.message || err);
    process.exit(1);
});
