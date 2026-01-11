import { createPublicClient, createWalletClient, http, parseAbi, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * DEPLOYMENT SCRIPT: P402 Settlement Contract
 * -------------------------------------------
 * Deploys the fee-enforcing settlement contract to Base or Base Sepolia.
 * Usage: npx tsx scripts/deploy-settlement.ts --network base-sepolia
 */

// Simple compiler output mocker (In a real setup we'd use Hardhat/Foundry input)
// For this prototype, we'll assume the bytecode is compiled or handled by a tool.
// NOTE: Since we don't have a full Hardhat setup in this file structure, 
// strictly speaking we need the BYTECODE and ABI of the compiled contract.
// I will output a placeholder logic here, but in reality, you need `solc` output.
//
// TODO: For the user's current setup, we need to KNOW if they have Hardhat installed.
// Checking package.json... they do NOT have hardhat.
//
// STRATEGY: We will rely on the user to use Remix or we can add a simple solc compiler here?
// Better: I will Mock the "Deploy" action for now to update the router config, 
// OR I can use a known pre-compiled bytecode if I had it.
//
// DECISION: Since I can't compile solidity in this runtime easily without solc,
// I will create the "Verification" script that assumes the contract exists at a constant address,
// OR I will document that the contract must be deployed via Remix/Hardhat first.

async function main() {
    let pk = (process.env.DEPLOYER_PRIVATE_KEY || '').trim();
    if (pk && !pk.startsWith('0x')) pk = `0x${pk}`;

    const treasury = process.env.P402_TREASURY_ADDRESS;

    if (!pk || pk === '0x') {
        console.error("❌ Missing DEPLOYER_PRIVATE_KEY in env");
        process.exit(1);
    }
    if (!treasury) {
        console.error("❌ Missing P402_TREASURY_ADDRESS in env");
        process.exit(1);
    }

    const account = privateKeyToAccount(pk as `0x${string}`);
    const networkArg = process.argv.find(a => a.startsWith('--network='))?.split('=')[1];
    const chain = networkArg === 'base' ? base : baseSepolia;

    const publicClient = createPublicClient({
        chain,
        transport: http()
    });

    const walletClient = createWalletClient({
        account,
        chain,
        transport: http()
    });

    console.log(`🚀 Deploying P402Settlement to ${chain.name}...`);
    console.log(`   Account: ${account.address}`);
    console.log(`   Treasury: ${treasury}`);

    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`   Balance: ${formatEther(balance)} ETH`);

    if (balance < 1000000000000000n) { // Check for at least 0.001 ETH
        console.error(`❌ Insufficient balance: ${formatEther(balance)} ETH`);
        console.error("   To deploy to Base Mainnet, you need at least 0.001 ETH for gas.");
        process.exit(1);
    }

    const artifactPath = path.join(process.cwd(), 'contracts/P402Settlement.json');
    if (!fs.existsSync(artifactPath)) {
        console.error("❌ Missing contracts/P402Settlement.json artifact. Run 'npx solc' first.");
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    try {
        const hash = await walletClient.deployContract({
            abi: artifact.abi,
            bytecode: artifact.bytecode as `0x${string}`,
            args: [treasury as `0x${string}`],
            gas: 1_000_000n // Conservative buffer for Base deployment
        });

        console.log(`⌛ Transaction sent: ${hash}`);
        console.log("   Waiting for confirmation...");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const address = receipt.contractAddress;

        console.log(`✅ Contract deployed at: ${address}`);
        console.log(`\nNext steps:`);
        console.log(`1. Update P402_SETTLEMENT_ADDRESS=${address} in .env.local`);
        console.log(`2. Run 'vercel deploy --prod' to update the router.`);

    } catch (err: any) {
        console.error("❌ Deployment failed:", err.message);
        process.exit(1);
    }
}

main().catch(console.error);
