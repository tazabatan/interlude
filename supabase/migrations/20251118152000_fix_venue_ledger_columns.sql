do $column$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'venue_ledger'
      and column_name = 'entry_type'
  ) then
    alter table public.venue_ledger
      add column entry_type text;
  end if;
end
$column$;

do $rename$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'venue_ledger'
      and column_name = 'type'
  ) then
    update public.venue_ledger
      set entry_type = coalesce(entry_type, type::text)
      where entry_type is null;
    alter table public.venue_ledger
      drop column type;
  end if;
end
$rename$;

do $rename_kind$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'venue_ledger'
      and column_name = 'entry_kind'
  ) then
    update public.venue_ledger
      set entry_type = coalesce(entry_type, entry_kind)
      where entry_type is null;
    alter table public.venue_ledger
      drop column entry_kind;
  end if;
end
$rename_kind$;

do $cast$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'venue_ledger'
      and column_name = 'entry_type'
      and udt_name <> 'ledger_entry_type'
  ) then
    alter table public.venue_ledger
      alter column entry_type type public.ledger_entry_type
      using entry_type::public.ledger_entry_type;
  end if;
end
$cast$;

alter table public.venue_ledger
  alter column entry_type set not null;

alter table public.venue_ledger
  add column if not exists description text,
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  alter column id set default gen_random_uuid();

do $constraint$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'venue_ledger'
      and constraint_name = 'venue_ledger_invoice_id_fkey'
  ) then
    alter table public.venue_ledger
      add constraint venue_ledger_invoice_id_fkey
        foreign key (invoice_id) references public.invoices(id) on delete set null;
  end if;
end
$constraint$;

alter table public.venue_ledger
  add column if not exists currency text;

update public.venue_ledger
  set currency = 'USD'
  where currency is null;

alter table public.venue_ledger
  alter column currency set not null,
  alter column currency set default 'USD';

do $drop_type$
begin
  if exists (
    select 1 from pg_type
    where typname = 'ledger_type'
      and typnamespace = 'public'::regnamespace
  ) then
    drop type public.ledger_type;
  end if;
end
$drop_type$;
