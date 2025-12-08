-- Add concierge pass kinds to pass_kind enum
do $$
begin
  if exists (select 1 from pg_type t join pg_enum e on t.oid = e.enumtypid where t.typname = 'pass_kind' and e.enumlabel = 'BOAT_DAY') then
    null;
  else
    alter type pass_kind add value 'BOAT_DAY';
  end if;
end$$;

do $$
begin
  if exists (select 1 from pg_type t join pg_enum e on t.oid = e.enumtypid where t.typname = 'pass_kind' and e.enumlabel = 'PRIVATE_CHEF') then
    null;
  else
    alter type pass_kind add value 'PRIVATE_CHEF';
  end if;
end$$;
