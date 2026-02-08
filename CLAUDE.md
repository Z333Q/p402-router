# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build and Development:**
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production (standalone output)
- `npm start` - Start production server
- `npm run lint` - Run ESLint (note: build ignores ESLint, but development should address issues)

**Testing:**
- `npm test` - Run Vitest test suite
- `npm run test:run` - Run tests once (non-watch mode)
- `npm run test:coverage` - Generate test coverage report
- `npm run test:a2a` - Run specific A2A protocol tests

**Database and Seeding:**
- `npm run seed` - Populate database with initial data

## Architecture Overview

P402 is an AI-powered payment router and agent-to-agent (A2A) communication platform built on Next.js 15 with TypeScript. The system combines intelligent routing, semantic caching, payment settlement, and autonomous AI oversight.

### Core Components

**1. A2A Protocol Implementation (`/lib/a2a-*`):**
- JSON-RPC 2.0 based agent communication protocol
- Task management with state tracking (pending → processing → completed/failed)
- Agent discovery via `/.well-known/agent.json`
- Payment integration with x402 protocol for settlement

**2. Intelligent Routing Engine (`/lib/router-engine.ts`):**
- Multi-modal routing (cost, quality, speed, balanced)
- Semantic cache integration for cost optimization
- AI-powered anomaly detection via Gemini 3
- Dynamic facilitator scoring with health monitoring
- Cross-chain bridge detection and routing

**3. Payment and Settlement:**
- x402 payment protocol with EIP-3009 gasless transfers
- AP2 mandates for policy-driven spending controls
- Multi-network support (Base L2, USDC)
- Settlement verification with replay protection

**4. Intelligence Layer (`/lib/intelligence/`):**
- Gemini 3 Pro: Protocol Economist for ledger analysis
- Gemini 3 Flash: Real-time Sentinel monitoring
- Semantic vector cache with text-embedding-004
- Autonomous optimization and decision logging

### Database Architecture

- PostgreSQL with connection pooling via `lib/db.ts`
- Key tables: `facilitators`, `facilitator_health`, `a2a_tasks`, `x402_payments`, `intelligence_*`
- Multi-tenant architecture with tenant isolation

### API Structure

**Main Endpoints:**
- `/api/a2a/route.ts` - Core A2A JSON-RPC endpoint
- `/api/v1/facilitator/*` - Payment facilitator management
- `/api/v2/chat/completions` - OpenAI-compatible AI routing
- `/api/v1/intelligence/*` - AI analysis and audit endpoints

### Key Libraries and Integrations

- **Next.js 15** with standalone output for deployment
- **Viem/Wagmi** for Web3 blockchain interactions
- **@google/generative-ai** for Gemini integration
- **@p402/sdk** (local package) for protocol types
- **Vitest** for testing with React Testing Library
- **PostgreSQL** with native connection pooling

### Development Notes

- TypeScript strict mode enabled (ignoreBuildErrors: false)
- Husky git hooks with lint-staged for code quality
- Tailwind CSS for styling
- React Native modules aliased away for web builds
- ESLint disabled during builds but should be addressed in development

### Testing Strategy

- Unit tests for utilities in `lib/__tests__/`
- Integration tests for API routes in `app/api/*/route.test.ts`
- Focus on A2A protocol compliance and payment verification
- Coverage reports available via Vitest

### Intelligence and AI Integration

The system features autonomous AI governance through:
- Real-time cost anomaly detection
- Automatic model substitution based on performance
- Semantic similarity caching to reduce API costs
- Live decision tracing via SSE streams

When working with intelligence features, ensure Gemini API keys are properly configured and respect rate limits for real-time monitoring.