import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { P402_CONFIG, validateP402Config } from '../lib/constants';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    // Validate P402 configuration first
    try {
        validateP402Config();
    } catch (error: any) {
        console.error("❌ P402 configuration error:", error.message);
        process.exit(1);
    }

    let pk = (process.env.DEPLOYER_PRIVATE_KEY || '').trim();
    if (pk && !pk.startsWith('0x')) pk = `0x${pk}`;

    const treasury = P402_CONFIG.TREASURY_ADDRESS;

    if (!pk || pk === '0x') {
        console.error("❌ Missing DEPLOYER_PRIVATE_KEY in env");
        process.exit(1);
    }

    const account = privateKeyToAccount(pk as `0x${string}`);

    // Determine network
    const args = process.argv.slice(2);
    const networkArg = args.find(a => a.startsWith('--network='))?.split('=')[1] || 'base';
    const chain = networkArg === 'base-sepolia' ? baseSepolia : base;

    console.log(`🚀 Deploying to ${chain.name} (${networkArg})...`);

    const publicClient = createPublicClient({
        chain,
        transport: http()
    });

    const walletClient = createWalletClient({
        account,
        chain,
        transport: http()
    });

    console.log(`   Account: ${account.address}`);
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`   Balance: ${formatEther(balance)} ETH`);

    // Load Artifact from Hardhat compilation
    const artifactPath = path.join(process.cwd(), 'artifacts/contracts/P402Settlement.sol/P402Settlement.json');
    if (!fs.existsSync(artifactPath)) {
        console.error("❌ Missing contract artifact. Run 'npx hardhat compile' first.");
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    console.log("   Deploying P402Settlement...");
    const hash = await walletClient.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [treasury as `0x${string}`],
        chain
    });

    console.log(`⌛ Transaction sent: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
        console.error("❌ Deployment failed!");
        process.exit(1);
    }

    console.log(`✅ Contract deployed at: ${receipt.contractAddress}`);
    console.log(`   Treasury configured: ${treasury}`);
    console.log(`   Network: ${chain.name} (${chain.id})`);
    console.log(`   Explorer: ${chain.blockExplorers?.default.url}/address/${receipt.contractAddress}`);

    console.log(`\n📋 Next steps:`);
    console.log(`1. Update P402_SETTLEMENT_ADDRESS=${receipt.contractAddress} in .env.local`);
    console.log(`2. Verify contract on Basescan (if mainnet):`);
    console.log(`   npx hardhat verify --network base ${receipt.contractAddress} "${treasury}"`);
    console.log(`3. Test small payment to verify functionality`);
    console.log(`4. Update facilitator configuration in database`);

    // Save deployment info
    const deploymentInfo = {
        contractAddress: receipt.contractAddress,
        treasury,
        network: chain.name,
        chainId: chain.id,
        deployedAt: new Date().toISOString(),
        txHash: hash,
        blockNumber: receipt.blockNumber.toString()
    };

    const deploymentsDir = path.join(process.cwd(), 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentFile = path.join(deploymentsDir, `${networkArg}-deployment.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
}

main().catch(console.error);
