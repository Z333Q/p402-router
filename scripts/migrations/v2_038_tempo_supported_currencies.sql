-- Migration v2_038: Add supported_currencies JSONB column to facilitators
-- and sync Tempo Mainnet Direct row to reflect all 10 TIP-20 stablecoins.
--
-- Changes:
--   1. Add supported_currencies JSONB column (default empty array)
--   2. Populate Tempo Mainnet Direct with all 10 TIP-20 stablecoins
--   3. Update currency_contract to USDC.e (was pathUSD — pathUSD transfer
--      restrictions make it unsuitable as the default settlement currency)
--   4. Back-fill all other active facilitators with a single-entry array
--      mirroring their existing currency_contract value

BEGIN;

-- 1. Add supported_currencies column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'facilitators' AND column_name = 'supported_currencies'
    ) THEN
        ALTER TABLE facilitators
            ADD COLUMN supported_currencies JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END;
$$;

-- 2. Populate Tempo Mainnet Direct with all 10 TIP-20 stablecoins
--    and switch currency_contract to USDC.e (the default, verified=true currency)
UPDATE facilitators
SET
    currency_contract = '0x20C000000000000000000000b9537d11c60E8b50',
    supported_currencies = '[
        {"symbol":"USDC.e",  "contract":"0x20C000000000000000000000b9537d11c60E8b50","decimals":6,"isDefault":true, "verified":true},
        {"symbol":"USDT0",   "contract":"0x20c00000000000000000000014f22ca97301eb73","decimals":6,"isDefault":false,"verified":true},
        {"symbol":"cUSD",    "contract":"0x20c0000000000000000000000520792dcccccccc","decimals":6,"isDefault":false,"verified":true},
        {"symbol":"EURC.e",  "contract":"0x20c0000000000000000000001621e21F71CF12fb","decimals":6,"isDefault":false,"verified":false},
        {"symbol":"frxUSD",  "contract":"0x20c0000000000000000000003554d28269e0f3c2","decimals":6,"isDefault":false,"verified":false},
        {"symbol":"stcUSD",  "contract":"0x20c0000000000000000000008ee4fcff88888888","decimals":6,"isDefault":false,"verified":false},
        {"symbol":"GUSD",    "contract":"0x20c0000000000000000000005c0bac7cef389a11","decimals":6,"isDefault":false,"verified":false},
        {"symbol":"rUSD",    "contract":"0x20c0000000000000000000007f7ba549dd0251b9","decimals":6,"isDefault":false,"verified":false},
        {"symbol":"wsrUSD",  "contract":"0x20c000000000000000000000aeed2ec36a54d0e5","decimals":6,"isDefault":false,"verified":false},
        {"symbol":"pathUSD", "contract":"0x20c0000000000000000000000000000000000000","decimals":6,"isDefault":false,"verified":false}
    ]'::jsonb
WHERE id = '20000000-0000-0000-0000-000000000008';

-- 3. Back-fill single-entry arrays for other facilitators that have a currency_contract set.
--    Rows with NULL currency_contract are bridges/discovery entries — leave as empty array.
--    This is a best-effort back-fill; operators should review and expand as needed.
UPDATE facilitators
SET supported_currencies = jsonb_build_array(
    jsonb_build_object(
        'symbol',    CASE
                         WHEN currency_contract = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' THEN 'USDC'
                         WHEN currency_contract = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' THEN 'USDT'
                         WHEN currency_contract = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' THEN 'USDC'
                         ELSE 'USDC'
                     END,
        'contract',  currency_contract,
        'decimals',  6,
        'isDefault', true,
        'verified',  true
    )
)
WHERE id != '20000000-0000-0000-0000-000000000008'
  AND currency_contract IS NOT NULL
  AND supported_currencies = '[]'::jsonb;

COMMIT;
