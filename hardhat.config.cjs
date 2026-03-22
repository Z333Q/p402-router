/* eslint-disable */
// CJS wrapper for Hardhat in an ESM project (package.json has "type":"module")
// Hardhat requires a .cjs config when the project is ESM.
require('dotenv').config({ path: '.env.local' });

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = DEPLOYER_KEY
    ? [DEPLOYER_KEY.startsWith('0x') ? DEPLOYER_KEY : `0x${DEPLOYER_KEY}`]
    : [];

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
    solidity: {
        version: '0.8.20',
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
    networks: {
        baseSepolia: {
            url: 'https://sepolia.base.org',
            accounts,
            chainId: 84532,
        },
        base: {
            url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
            accounts,
            chainId: 8453,
        },
    },
    paths: {
        sources: './contracts',
        tests: './test',
        cache: './cache',
        artifacts: './artifacts',
    },
};

module.exports = config;
