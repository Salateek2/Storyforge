-- StoryForge migration 001
-- Moves chapter info + user settings off per-device localStorage and into the DB
-- so they sync across devices. Safe to run more than once (idempotent).

-- 1) Chapter info columns (summary / POV / characters appearing / TODO).
--    These inherit the existing row-level security on the chapters table.
alter table public.chapters add column if not exists summary              text default '';
alter table public.chapters add column if not exists pov                  text default '';
alter table public.chapters add column if not exists characters_appearing text default '';
alter table public.chapters add column if not exists todo                 text default '';

-- 2) Per-user settings (theme / word goal / pinned novel), one row per user.
create table if not exists public.user_settings (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  theme           text default 'light',
  word_goal       integer default 0,
  pinned_novel_id uuid references public.novels (id) on delete set null,
  updated_at      timestamptz default now()
);

-- Row-level security: each user can only see and edit their own settings row.
alter table public.user_settings enable row level security;

drop policy if exists "user_settings owner select" on public.user_settings;
drop policy if exists "user_settings owner insert" on public.user_settings;
drop policy if exists "user_settings owner update" on public.user_settings;
drop policy if exists "user_settings owner delete" on public.user_settings;

create policy "user_settings owner select" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "user_settings owner insert" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "user_settings owner update" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings owner delete" on public.user_settings
  for delete using (auth.uid() = user_id);
