-- Ensure role/venue helpers read from auth metadata claims

create or replace function public.current_role_claim()
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_claims jsonb := auth.jwt();
  v_role text;
begin
  v_role := coalesce(
    nullif(v_claims -> 'user_metadata' ->> 'app_role', ''),
    nullif(v_claims -> 'app_metadata' ->> 'app_role', ''),
    nullif(v_claims ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), '')
  );

  if v_role is null or v_role = '' then
    return 'member';
  end if;

  if v_role = 'authenticated' then
    return 'member';
  end if;

  return v_role;
end;
$$;

create or replace function public.current_venue_claim()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  with claims as (
    select auth.jwt() as jwt
  ), resolved as (
    select coalesce(
      nullif(jwt ->> 'venue_id', ''),
      nullif(jwt -> 'user_metadata' ->> 'venue_id', ''),
      nullif(jwt -> 'app_metadata' ->> 'venue_id', ''),
      nullif(current_setting('request.jwt.claim.venue_id', true), '')
    ) as venue_id
    from claims
  )
  select resolved.venue_id::uuid
  from resolved
  where resolved.venue_id is not null;
$$;
