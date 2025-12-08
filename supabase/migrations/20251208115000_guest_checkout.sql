-- Guest checkout support: store guest contact + notes and allow anonymous inserts with contact info.

alter table if exists public.bookings
  add column if not exists guest_first_name text,
  add column if not exists guest_last_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text,
  add column if not exists guest_notes text;

create or replace function public.fn_request_booking(
  _pass_id uuid,
  _date date,
  _party_size int,
  _arrival_time time default null,
  _guest_ages text default null,
  _guest_contact jsonb default null,
  _guest_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _booking_id uuid := gen_random_uuid();
  _guest_age_list text[];
  _ages int[];
  _adult_count int;
  _child_count int;
  age_text text;
  cleaned text;
  age_value int;
  v_user_id uuid := auth.uid();
  v_first text;
  v_last text;
  v_email text;
  v_phone text;
begin
  -- Extract guest contact
  if _guest_contact is not null then
    v_first := trim((_guest_contact->>'first_name'));
    v_last := trim((_guest_contact->>'last_name'));
    v_email := trim((_guest_contact->>'email'));
    v_phone := trim((_guest_contact->>'phone'));
  end if;

  -- If logged in, prefer user profile details when missing
  if v_user_id is not null then
    select
      coalesce(v_first, trim((raw_user_meta_data->>'first_name'))),
      coalesce(v_last, trim((raw_user_meta_data->>'last_name'))),
      coalesce(v_email, email),
      coalesce(v_phone, trim((raw_user_meta_data->>'phone')))
    into v_first, v_last, v_email, v_phone
    from auth.users
    where id = v_user_id;
  end if;

  -- Require email when guest checkout
  if v_user_id is null and (v_email is null or length(v_email) = 0) then
    raise exception 'Guest email is required';
  end if;

  -- Parse guest ages
  if _guest_ages is not null and length(trim(_guest_ages)) > 0 then
    _guest_age_list := string_to_array(_guest_ages, ',');
    _ages := array[]::int[];
    _adult_count := 0;
    _child_count := 0;
    if _guest_age_list is not null then
      foreach age_text in array _guest_age_list loop
        cleaned := regexp_replace(coalesce(age_text, ''), '[^0-9]', '', 'g');
        if cleaned = '' then
          _ages := array_append(_ages, null);
          continue;
        end if;
        age_value := least(120, greatest(0, cleaned::int));
        _ages := array_append(_ages, age_value);
        if age_value < 13 then
          _child_count := _child_count + 1;
        else
          _adult_count := _adult_count + 1;
        end if;
      end loop;
    end if;
    if array_length(_ages, 1) = 0 then
      _ages := null;
      _adult_count := null;
      _child_count := null;
    end if;
  end if;

  insert into public.bookings (
    id,
    user_id,
    venue_id,
    pass_id,
    date,
    party_size,
    status,
    requested_arrival_time,
    guest_ages,
    guest_adult_count,
    guest_child_count,
    guest_first_name,
    guest_last_name,
    guest_email,
    guest_phone,
    guest_notes
  )
  select
    _booking_id,
    v_user_id,
    p.venue_id,
    _pass_id,
    _date,
    _party_size,
    'requested'::booking_status,
    _arrival_time,
    _ages,
    _adult_count,
    _child_count,
    v_first,
    v_last,
    v_email,
    v_phone,
    nullif(trim(coalesce(_guest_notes, '')), '')
  from public.passes p
  where p.id = _pass_id;

  if not found then
    raise exception 'Unknown pass %', _pass_id;
  end if;

  return _booking_id;
end;
$$;

-- Allow anon inserts with null user_id; keep auth users allowed.
drop policy if exists bookings_members_insert on public.bookings;
create policy bookings_members_insert
on public.bookings
for insert
to authenticated
with check ((user_id is null) or (user_id = auth.uid()));

drop policy if exists bookings_guests_insert on public.bookings;
create policy bookings_guests_insert
on public.bookings
for insert
to anon
with check (user_id is null);

-- Ensure RPC is callable by anon and authenticated roles
grant execute on function public.fn_request_booking(uuid, date, int, time, text, jsonb, text) to anon, authenticated;
