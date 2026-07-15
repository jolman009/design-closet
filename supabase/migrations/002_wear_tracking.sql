-- ============================================================================
-- Design Closet — Migration 002: Wear tracking
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor AFTER schema.sql. Idempotent.
--
-- Adds:
--   * closet_items.worn_count  — how many times a piece has been worn
--   * closet_items.last_worn   — when it was last worn (drives rotation)
--   * closet_wears             — a per-wear log (for history + analytics)
-- The outfit generator uses last_worn to rotate suggestions and resurface
-- neglected pieces.
-- ============================================================================

alter table public.closet_items
  add column if not exists worn_count int not null default 0;
alter table public.closet_items
  add column if not exists last_worn timestamptz;

-- Per-wear log: one row each time an outfit or item is marked worn.
create table if not exists public.closet_wears (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete cascade default auth.uid(),
  item_ids    uuid[] not null default '{}',
  outfit_id   uuid,
  worn_on     date not null default current_date
);
create index if not exists closet_wears_user_idx on public.closet_wears (user_id);
create index if not exists closet_wears_worn_on_idx on public.closet_wears (worn_on);

alter table public.closet_wears enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname='public' and tablename='closet_wears'
  loop
    execute format('drop policy if exists %I on public.closet_wears', p.policyname);
  end loop;
end $$;

create policy "own_select" on public.closet_wears for select
  using (user_id = auth.uid());
create policy "own_insert" on public.closet_wears for insert
  with check (user_id = auth.uid());
create policy "own_delete" on public.closet_wears for delete
  using (user_id = auth.uid());
