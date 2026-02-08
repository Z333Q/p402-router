import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
// dotenv.config(); // fallback

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// Ensure accounts are formatted correctly with 0x prefix if needed
const accounts = DEPLOYER_KEY ? [DEPLOYER_KEY.startsWith("0x") ? DEPLOYER_KEY : `0x${DEPLOYER_KEY}`] : [];

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        baseSepolia: {
            // @ts-ignore
            type: "http",
            url: "https://sepolia.base.org",
            accounts,
            chainId: 84532
        },
        base: {
            // @ts-ignore
            type: "http",
            url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
            accounts,
            chainId: 8453
        }
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};

export default config;
