insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow public read profile photos'
  ) then
    create policy "Allow public read profile photos"
      on storage.objects
      for select
      using (bucket_id = 'profile-photos');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow users upload profile photos'
  ) then
    create policy "Allow users upload profile photos"
      on storage.objects
      for insert
      with check (
        bucket_id = 'profile-photos'
        and auth.role() = 'authenticated'
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow users update profile photos'
  ) then
    create policy "Allow users update profile photos"
      on storage.objects
      for update
      using (
        bucket_id = 'profile-photos'
        and auth.uid()::text = split_part(name, '/', 1)
      )
      with check (
        bucket_id = 'profile-photos'
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow users delete profile photos'
  ) then
    create policy "Allow users delete profile photos"
      on storage.objects
      for delete
      using (
        bucket_id = 'profile-photos'
        and auth.uid()::text = split_part(name, '/', 1)
      );
  end if;
end
$$;

