-- ============================================================================
-- Design Closet — production schema & Row Level Security
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (Project: design-closet).
-- It is IDEMPOTENT: safe to run more than once.
--
-- What it does:
--   1. Ensures the four closet tables exist with the columns the app uses.
--   2. Adds a `user_id` column (default auth.uid()) so every row is owned.
--   3. Enables RLS and replaces the old permissive anon policies with
--      per-user policies, so each signed-in user only sees their own closet.
--   4. Locks down the `closet-photos` storage bucket to authenticated writes.
--
-- NOTE ON EXISTING DATA: rows created before auth was added have user_id = NULL
-- and will become invisible under RLS. Either delete them, or claim them by
-- setting user_id to your account's UUID (see the bottom of this file).
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------- Tables ----------
create table if not exists public.closet_items (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  brand       text,
  category    text not null default 'top',
  colors      text[] not null default '{}',
  season      text not null default 'all',
  fabric      text,
  formality   int  not null default 3,
  warmth      int  not null default 3,
  style       text not null default 'both',
  favorite    boolean not null default false,
  photo_url   text
);

create table if not exists public.closet_events (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  title           text not null,
  event_at        timestamptz not null,
  event_type      text not null default 'casual',
  location        text,
  planned_outfit  uuid
);

create table if not exists public.closet_outfits (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  occasion    text,
  note        text,
  item_ids    uuid[] not null default '{}'
);

create table if not exists public.closet_profile (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text default 'You',
  location    text,
  persona     text,
  palette     text[] not null default '{}',
  sizes       jsonb  not null default '{}',
  goals       jsonb  not null default '[]',
  theme_pref  text   not null default 'feminine'
);

-- ---------- Ownership column: user_id ----------
do $$
declare t text;
begin
  foreach t in array array['closet_items','closet_events','closet_outfits','closet_profile']
  loop
    execute format(
      'alter table public.%I add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid()',
      t
    );
    execute format('create index if not exists %I on public.%I (user_id)', t||'_user_idx', t);
  end loop;
end $$;

-- One profile per user.
create unique index if not exists closet_profile_user_uidx on public.closet_profile (user_id);

-- ---------- Enable RLS ----------
alter table public.closet_items   enable row level security;
alter table public.closet_events  enable row level security;
alter table public.closet_outfits enable row level security;
alter table public.closet_profile enable row level security;

-- ---------- Replace policies (drop old permissive ones, add per-user) ----------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['closet_items','closet_events','closet_outfits','closet_profile']
  loop
    -- Drop every existing policy on the table for a clean slate.
    for p in select policyname from pg_policies where schemaname='public' and tablename=t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    -- Per-user CRUD: a row is yours when user_id = auth.uid().
    execute format($f$
      create policy "own_select" on public.%I for select
        using (user_id = auth.uid());
    $f$, t);
    execute format($f$
      create policy "own_insert" on public.%I for insert
        with check (user_id = auth.uid());
    $f$, t);
    execute format($f$
      create policy "own_update" on public.%I for update
        using (user_id = auth.uid()) with check (user_id = auth.uid());
    $f$, t);
    execute format($f$
      create policy "own_delete" on public.%I for delete
        using (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- ============================================================================
-- Storage: closet-photos bucket
-- ----------------------------------------------------------------------------
-- Public READ (so <img> tags work), but only authenticated users may write.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('closet-photos', 'closet-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "closet_photos_read"   on storage.objects;
drop policy if exists "closet_photos_write"  on storage.objects;
drop policy if exists "closet_photos_update" on storage.objects;
drop policy if exists "closet_photos_delete" on storage.objects;

create policy "closet_photos_read" on storage.objects
  for select using (bucket_id = 'closet-photos');

create policy "closet_photos_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'closet-photos');

create policy "closet_photos_update" on storage.objects
  for update to authenticated using (bucket_id = 'closet-photos');

create policy "closet_photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'closet-photos');

-- ============================================================================
-- OPTIONAL: claim pre-auth sample data for your own account.
-- Find your UUID in Supabase → Authentication → Users, then run:
--
--   update public.closet_items   set user_id = '<YOUR-UUID>' where user_id is null;
--   update public.closet_events  set user_id = '<YOUR-UUID>' where user_id is null;
--   update public.closet_outfits set user_id = '<YOUR-UUID>' where user_id is null;
--   update public.closet_profile set user_id = '<YOUR-UUID>' where user_id is null;
--
-- ...or delete the orphaned rows:
--   delete from public.closet_items   where user_id is null;
--   delete from public.closet_events  where user_id is null;
--   delete from public.closet_outfits where user_id is null;
--   delete from public.closet_profile where user_id is null;
-- ============================================================================
