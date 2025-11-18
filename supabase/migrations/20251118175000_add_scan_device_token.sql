alter table public.venues
  add column if not exists scan_device_token text,
  add column if not exists scan_device_token_generated_at timestamptz;
