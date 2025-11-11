create or replace view public.auth_user_profiles as
select id, email, phone, raw_user_meta_data
from auth.users;

grant select on public.auth_user_profiles to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'auth'
      and tablename = 'users'
      and policyname = 'Service role can select users'
  ) then
    execute 'create policy "Service role can select users" on auth.users for select to service_role using (true)';
  end if;
end
$$;
