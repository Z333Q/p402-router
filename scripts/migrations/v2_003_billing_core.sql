-- Note: Static Constants (Like the Free/Pro/Enterprise plan definitions) 
-- are managed in TypeScript (lib/billing/plans.ts) to avoid DB synchronization 
-- lag and to allow strict typing across the app.

-- This file is reserved for seeding initial foundational rows if necessary
-- (e.g. creating the default 'system' tenant). 

INSERT INTO tenants (id, name, tenant_plan)
VALUES ('default', 'System Default Tenant', 'free')
ON CONFLICT (id) DO NOTHING;
