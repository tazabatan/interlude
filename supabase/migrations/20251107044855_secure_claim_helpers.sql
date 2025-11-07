create or replace function public.current_role_claim()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  with vals as (
    select coalesce(
      nullif(auth.jwt() ->> 'role', ''),
      nullif(current_setting('request.jwt.claim.role', true), '')
    ) as role
  )
  select case
    when vals.role is null then 'member'
    when vals.role = 'authenticated' then 'member'
    else vals.role
  end
  from vals;
$$;

create or replace function public.current_venue_claim()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'venue_id', '')::uuid,
    nullif(current_setting('request.jwt.claim.venue_id', true), '')::uuid
  );
$$;
