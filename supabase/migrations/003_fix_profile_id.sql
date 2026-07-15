-- ============================================================================
-- Design Closet — Migration 003: Fix closet_profile.id auto-generation
-- ----------------------------------------------------------------------------
-- The closet_profile table predates schema.sql (it originally held a single
-- fixed-id row), so its integer `id` primary key has no working default. New
-- users therefore hit a duplicate-key error when the app tries to create their
-- profile row, and their profile silently fails to persist.
--
-- This migration attaches a sequence so `id` auto-increments on insert. Safe to
-- run once; idempotent. Existing rows keep their ids.
-- ============================================================================

-- 1) Drop the legacy single-row CHECK (e.g. id = 1) that limited the whole table
--    to one profile — it blocks every user after the first from having a profile.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.closet_profile'::regclass and contype = 'c'
  loop
    execute format('alter table public.closet_profile drop constraint %I', c.conname);
  end loop;
end $$;

-- 2) Give the integer id a working auto-increment default so inserts succeed.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'closet_profile'
      and column_name = 'id' and data_type in ('integer','bigint','smallint')
  ) then
    create sequence if not exists public.closet_profile_id_seq owned by public.closet_profile.id;
    perform setval('public.closet_profile_id_seq',
                   coalesce((select max(id) from public.closet_profile), 0) + 1, false);
    alter table public.closet_profile
      alter column id set default nextval('public.closet_profile_id_seq');
  end if;
end $$;

-- Optional cleanup: remove any orphaned pre-auth profile row (user_id IS NULL),
-- which is invisible under RLS but occupies the table.
delete from public.closet_profile where user_id is null;
