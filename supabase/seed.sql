-- Seed venue & venue manager for local dev
insert into public.venues (id, name, tz, is_test_venue)
values ('11111111-2222-3333-4444-555555555555', 'Belmond Cap Juluca', 'America/Anguilla', true)
on conflict (id) do update set name = excluded.name, tz = excluded.tz;

do $$
declare
  v_admin_id uuid := '99999999-aaaa-bbbb-cccc-dddddddddddd';
  v_admin_email text := 'Daniel@admin.com';
  v_manager_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_manager_email text := 'd.abatan@rivalcontent.co.uk';
  v_member_id uuid := 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  v_member_email text := 'd.o.abatan@gmail.com';
begin
  -- Admin user
  delete from auth.identities where provider = 'email' and provider_id = v_admin_email;
  delete from auth.users where id = v_admin_id;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    last_sign_in_at,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  )
  values (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_admin_email,
    crypt('1Westbourne!', gen_salt('bf')),
    now(),
    now(),
    '',
    now(),
    now(),
    '',
    '',
    '',
    '',
    null,
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('app_role', 'admin'),
    false,
    now(),
    now()
  );

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_admin_email,
    v_admin_id,
    jsonb_build_object('email', v_admin_email),
    'email',
    now(),
    now(),
    now()
  );

  -- Venue manager
  delete from auth.identities where provider = 'email' and provider_id = v_manager_email;
  delete from auth.users where id = v_manager_id;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    last_sign_in_at,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  )
  values (
    v_manager_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_manager_email,
    crypt('1Westbourne!', gen_salt('bf')),
    now(),
    now(),
    '',
    now(),
    now(),
    '',
    '',
    '',
    '',
    null,
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('app_role', 'venue_manager', 'venue_id', '11111111-2222-3333-4444-555555555555'),
    false,
    now(),
    now()
  );

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_manager_email,
    v_manager_id,
    jsonb_build_object('email', v_manager_email),
    'email',
    now(),
    now(),
    now()
  );

  -- Permanent member
  delete from auth.identities where provider = 'email' and provider_id = v_member_email;
  delete from auth.users where id = v_member_id;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    last_sign_in_at,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  )
  values (
    v_member_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_member_email,
    crypt('1Westbourne!', gen_salt('bf')),
    now(),
    now(),
    '',
    now(),
    now(),
    '',
    '',
    '',
    '',
    null,
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('app_role', 'member'),
    false,
    now(),
    now()
  );

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_member_email,
    v_member_id,
    jsonb_build_object('email', v_member_email),
    'email',
    now(),
    now(),
    now()
  );
end;
$$;

insert into public.passes (
  id,
  venue_id,
  kind,
  pricing_mode,
  currency,
  min_spend_amount,
  display_price_text,
  no_show_amount_per_person,
  requires_hold,
  status,
  visibility,
  auto_approve_enabled,
  default_arrival_window_minutes,
  default_arrival_start_local,
  default_daily_cap
)
values (
  '5d0ba2c3-e1f2-42c2-9d77-c6a13d90e517',
  '11111111-2222-3333-4444-555555555555',
  'DAY_PASS',
  'HOLD_ONLY',
  'USD',
  5000,
  '$50',
  5000,
  true,
  'active',
  'members',
  true,
  90,
  '11:00',
  30
)
on conflict (id) do update set
  venue_id = excluded.venue_id,
  kind = excluded.kind,
  pricing_mode = excluded.pricing_mode,
  currency = excluded.currency,
  min_spend_amount = excluded.min_spend_amount,
  display_price_text = excluded.display_price_text,
  no_show_amount_per_person = excluded.no_show_amount_per_person,
  requires_hold = excluded.requires_hold,
  status = excluded.status,
  visibility = excluded.visibility,
  auto_approve_enabled = excluded.auto_approve_enabled,
  default_arrival_window_minutes = excluded.default_arrival_window_minutes,
  default_arrival_start_local = excluded.default_arrival_start_local,
  default_daily_cap = excluded.default_daily_cap;

insert into public.pass_inventory (id, pass_id, date, cap, paused)
select
  gen_random_uuid(),
  '5d0ba2c3-e1f2-42c2-9d77-c6a13d90e517',
  (current_date + (g.day_offset * interval '1 day'))::date,
  30,
  false
from generate_series(0, 6) as g(day_offset)
on conflict (pass_id, date) do update set
  cap = excluded.cap,
  paused = excluded.paused;
