-- Backfill/align order_links.created_at for legacy environments
-- Safe to run multiple times.

begin;

alter table if exists public.order_links
  add column if not exists created_at timestamptz;

-- Backfill rows when the column existed but was nullable and empty.
update public.order_links
set created_at = coalesce(created_at, last_used_at, expires_at, now())
where created_at is null;

alter table if exists public.order_links
  alter column created_at set default now();

commit;

