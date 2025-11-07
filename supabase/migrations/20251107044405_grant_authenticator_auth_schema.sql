-- Deprecated migration. Access to auth.* helpers is now handled via
-- security definer wrappers (see 20251107044855_secure_claim_helpers.sql).
-- Keeping this file so timestamp ordering stays intact.
select 1;
