-- v2_037_tempo_mpp_facilitator.sql
-- Adds MPP-aware columns to the facilitators table, backfills existing rows,
-- and inserts the Tempo Mainnet Direct facilitator.
-- Run with: psql $DATABASE_URL -f scripts/migrations/v2_037_tempo_mpp_facilitator.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add new columns to facilitators
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    -- protocol_support: list of protocols this facilitator supports (e.g. 'x402', 'mpp').
    -- Defaults to ['x402'] so all existing rows are correctly backfilled.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'facilitators' AND column_name = 'protocol_support'
    ) THEN
        ALTER TABLE facilitators ADD COLUMN protocol_support TEXT[] NOT NULL DEFAULT ARRAY['x402'];
    END IF;

    -- mpp_method_id: the MPP method identifier when this facilitator is exposed via MPP
    -- (e.g. 'tempo', 'p402'). NULL until @p402/mpp-method ships (Phase 2/3).
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'facilitators' AND column_name = 'mpp_method_id'
    ) THEN
        ALTER TABLE facilitators ADD COLUMN mpp_method_id TEXT NULL;
    END IF;

    -- chain_id: EVM chain ID. NULL for non-EVM rails or multi-chain bridges.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'facilitators' AND column_name = 'chain_id'
    ) THEN
        ALTER TABLE facilitators ADD COLUMN chain_id INTEGER NULL;
    END IF;

    -- settlement_scheme: x402 scheme used by this facilitator ('exact', 'onchain', 'receipt').
    -- NULL for bridge/discovery rows that do not settle directly.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'facilitators' AND column_name = 'settlement_scheme'
    ) THEN
        ALTER TABLE facilitators ADD COLUMN settlement_scheme TEXT NULL;
    END IF;

    -- treasury_address: on-chain address that receives settled funds.
    -- NULL for bridge rows, CDP-managed facilitators, and discovery sources.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'facilitators' AND column_name = 'treasury_address'
    ) THEN
        ALTER TABLE facilitators ADD COLUMN treasury_address TEXT NULL;
    END IF;

    -- currency_contract: ERC-20 / TIP-20 contract used for settlement.
    -- NULL for bridge rows and discovery sources that don't settle directly.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'facilitators' AND column_name = 'currency_contract'
    ) THEN
        ALTER TABLE facilitators ADD COLUMN currency_contract TEXT NULL;
    END IF;

    -- gas_model: how gas is paid for settlement transactions.
    -- 'native'      = gas in chain native token (e.g. ETH on Base)
    -- 'sponsored'   = facilitator pays gas on behalf of the user (EIP-3009 model)
    -- 'stablecoin'  = user pays gas in stablecoin via FeeAMM (Tempo model)
    -- 'n/a'         = row does not settle directly (bridge or discovery source)
    -- Default 'native' covers most new EVM settler rows.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'facilitators' AND column_name = 'gas_model'
    ) THEN
        ALTER TABLE facilitators ADD COLUMN gas_model TEXT NOT NULL DEFAULT 'native';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Backfill existing rows
-- ---------------------------------------------------------------------------

-- P402 Base Direct
-- EIP-3009 exact scheme on Base mainnet; facilitator wallet sponsors gas.
UPDATE facilitators SET
    protocol_support  = ARRAY['x402'],
    chain_id          = 8453,
    settlement_scheme = 'exact',
    treasury_address  = '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6',
    currency_contract = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    gas_model         = 'sponsored'
WHERE facilitator_id = 'fac_p402_base_direct';

-- P402 Base Sepolia Direct
-- EIP-3009 exact scheme on Base Sepolia testnet.
-- TODO Phase 1 Prompt 1 review: treasury_address is NULL pending confirmation that
-- 0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6 is funded on Base Sepolia, or that a
-- dedicated testnet treasury exists. Backfill in Prompt 2 once confirmed.
UPDATE facilitators SET
    protocol_support  = ARRAY['x402'],
    chain_id          = 84532,
    settlement_scheme = 'exact',
    treasury_address  = NULL,
    currency_contract = '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    gas_model         = 'sponsored'
WHERE facilitator_id = 'fac_p402_base_sepolia_direct';

-- x402 Bazaar Discovery Source
-- Bridge/discovery row, no direct settlement — treasury_address and currency_contract intentionally NULL.
UPDATE facilitators SET
    protocol_support  = ARRAY['x402'],
    chain_id          = 8453,
    settlement_scheme = NULL,
    treasury_address  = NULL,
    currency_contract = NULL,
    gas_model         = 'n/a'
WHERE facilitator_id = 'fac_x402_bazaar_source';

-- Coinbase CDP x402
-- treasury_address NULL: CDP-managed, no fixed treasury.
UPDATE facilitators SET
    protocol_support  = ARRAY['x402'],
    chain_id          = 8453,
    settlement_scheme = 'exact',
    treasury_address  = NULL,
    currency_contract = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    gas_model         = 'sponsored'
WHERE facilitator_id = 'fac_coinbase_cdp_x402';

-- Circle CCTP Bridge
-- Bridge/discovery row, no direct settlement — treasury_address and currency_contract intentionally NULL.
UPDATE facilitators SET
    protocol_support  = ARRAY['x402'],
    chain_id          = 8453,
    settlement_scheme = NULL,
    treasury_address  = NULL,
    currency_contract = NULL,
    gas_model         = 'n/a'
WHERE facilitator_id = 'fac_circle_cctp';

-- Chainlink CCIP Bridge
-- Multi-chain bridge (Ethereum + Base); chain_id NULL because no single chain.
-- Bridge/discovery row, no direct settlement — treasury_address and currency_contract intentionally NULL.
UPDATE facilitators SET
    protocol_support  = ARRAY['x402'],
    chain_id          = NULL,
    settlement_scheme = NULL,
    treasury_address  = NULL,
    currency_contract = NULL,
    gas_model         = 'n/a'
WHERE facilitator_id = 'fac_chainlink_ccip';

-- Private Facilitator Node
-- User-configured; settlement details unknown at seed time.
UPDATE facilitators SET
    protocol_support  = ARRAY['x402'],
    chain_id          = 8453,
    settlement_scheme = NULL,
    treasury_address  = NULL,
    currency_contract = NULL,
    gas_model         = 'native'
WHERE facilitator_id = 'fac_private_node';

-- ---------------------------------------------------------------------------
-- 3. Insert Tempo Mainnet Direct facilitator
-- ---------------------------------------------------------------------------
--
-- currency_contract: pathUSD (0x20c0000000000000000000000000000000000000) is Tempo's
-- native TIP-20 stablecoin and the canonical example in the Stripe+Tempo MPP docs at
-- https://mpp.dev/guides/upgrade-x402. Circle has not published a canonical USDC contract
-- address for Tempo mainnet as of 2026-04-30 (verified at
-- https://developers.circle.com/stablecoins/usdc-contract-addresses).
--
-- ⚠ TRANSFER RESTRICTION: pathUSD has payment-channel transfer restrictions per
-- https://medium.com/@organmo/tempo-architecture-analysis-2-stablecoin-gas-and-the-payment-only-lane-134f2150b9ae
-- Phase 1 Prompt 2 (Tempo adapter) must verify against the TIP-20 spec at
-- https://docs.tempo.xyz/learn/stablecoins that user-initiated transfer() calls to settle
-- charges are permitted via the payment-only lane. If restricted, pivot to bridged USDC
-- and rerun this migration with a corrected contract address.
--
-- settlement_scheme 'onchain': user submits transfer(treasury, amount) to pathUSD contract;
-- facilitator watches for confirmed Transfer events and credits the session (no EIP-3009).
--
-- gas_model 'stablecoin': Tempo's FeeAMM pays gas from the user's pathUSD balance.
-- No ETH or native token required; no relayer needed.
--
-- mpp_method_id NULL: set when @p402/mpp-method ships (Phase 2/3).

INSERT INTO facilitators (
    id,
    facilitator_id,
    tenant_id,
    name,
    endpoint,
    auth_config,
    networks,
    status,
    type,
    reputation_score,
    capabilities,
    protocol_support,
    mpp_method_id,
    chain_id,
    settlement_scheme,
    treasury_address,
    currency_contract,
    gas_model
) VALUES (
    '20000000-0000-0000-0000-000000000008',
    'fac_tempo_mainnet_direct',
    (SELECT id FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001' LIMIT 1),
    'Tempo Mainnet Direct',
    'rpc:tempo',
    '{"mode":"onchain_verify","rpcEnvVar":"TEMPO_RPC_URL","stablecoin":{"asset":"pathUSD","network":"eip155:4217","address":"0x20c0000000000000000000000000000000000000"}}'::jsonb,
    ARRAY['eip155:4217'],
    'active',
    'onchain_verify',
    100,
    '{}'::jsonb,
    ARRAY['x402'],
    NULL,
    4217,
    'onchain',
    '0xe00DD502FF571F3C721f22B3F9E525312d21D797',
    '0x20c0000000000000000000000000000000000000',
    'stablecoin'
)
ON CONFLICT (facilitator_id) DO UPDATE SET
    name              = EXCLUDED.name,
    endpoint          = EXCLUDED.endpoint,
    auth_config       = EXCLUDED.auth_config,
    networks          = EXCLUDED.networks,
    status            = EXCLUDED.status,
    type              = EXCLUDED.type,
    reputation_score  = EXCLUDED.reputation_score,
    capabilities      = EXCLUDED.capabilities,
    protocol_support  = EXCLUDED.protocol_support,
    mpp_method_id     = EXCLUDED.mpp_method_id,
    chain_id          = EXCLUDED.chain_id,
    settlement_scheme = EXCLUDED.settlement_scheme,
    treasury_address  = EXCLUDED.treasury_address,
    currency_contract = EXCLUDED.currency_contract,
    gas_model         = EXCLUDED.gas_model;

COMMIT;
