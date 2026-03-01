import { defineConfig } from 'vitest/config'
import path from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./__tests__/setup.ts'],
        include: ['**/*.test.{ts,tsx}'],
        exclude: ['**/node_modules/**', 'cloudflare-facilitator/**'],
        testTimeout: 300_000,
        coverage: {
            reporter: ['text', 'json', 'html'],
        },
        alias: {
            '@': path.resolve(__dirname, './')
        },
        // Vitest does not load .env.local. Set vars required by lib/env.ts
        // validateEnv() so module-level imports don't throw during test runs.
        env: {
            DATABASE_URL: 'postgresql://test:test@localhost/testdb',
            NEXTAUTH_SECRET: 'test-secret-for-vitest',
            GOOGLE_CLIENT_ID: 'test-google-client-id',
            GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
            STRIPE_SECRET_KEY: 'sk_test_placeholder_vitest',
            STRIPE_WEBHOOK_SECRET: 'whsec_placeholder_vitest',
            STRIPE_PRICE_ID_PRO: 'price_placeholder_pro',
            STRIPE_PRICE_ID_ENTERPRISE: 'price_placeholder_enterprise',
            // Hardhat account #0 — well-known test key, never holds real funds.
            // P402_SIGNER_ADDRESS must match the address derived from this key.
            P402_FACILITATOR_PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            P402_SIGNER_ADDRESS: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        },
    },
})
