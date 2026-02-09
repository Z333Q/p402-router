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
        exclude: ['node_modules/**', 'cloudflare-facilitator/**', '__tests__/build-smoke.test.ts'],
        testTimeout: 10_000,
        coverage: {
            reporter: ['text', 'json', 'html'],
        },
        alias: {
            '@': path.resolve(__dirname, './')
        }
    },
})
