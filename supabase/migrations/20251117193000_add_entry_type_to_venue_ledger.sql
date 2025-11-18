alter table public.venue_ledger
  add column if not exists entry_type public.ledger_entry_type;

update public.venue_ledger
  set entry_type = entry_kind
  where entry_type is null;

alter table public.venue_ledger
  drop column if exists entry_kind;
