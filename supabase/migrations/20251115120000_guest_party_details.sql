alter table if exists public.bookings
  add column if not exists guest_ages int[],
  add column if not exists guest_adult_count int,
  add column if not exists guest_child_count int;

create or replace function public.fn_request_booking(
  _pass_id uuid,
  _date date,
  _party_size int,
  _arrival_time time default null,
  _guest_ages text default null
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
begin
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
    guest_child_count
  )
  select
    _booking_id,
    auth.uid(),
    p.venue_id,
    _pass_id,
    _date,
    _party_size,
    'requested'::booking_status,
    _arrival_time,
    _ages,
    _adult_count,
    _child_count
  from public.passes p
  where p.id = _pass_id;

  if not found then
    raise exception 'Unknown pass %', _pass_id;
  end if;

  return _booking_id;
end;
$$;
