-- Notes ---------------------------------------------------------------------
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  tags text[] not null default '{}',
  content text not null default '',
  updated_at timestamptz not null default now(),
  archived boolean not null default false
);

alter table public.notes add column if not exists favorite boolean not null default false;
alter table public.notes add column if not exists last_opened_at timestamptz;

create index if not exists notes_user_updated_at_idx
  on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "Users can read their own notes" on public.notes;
create policy "Users can read their own notes"
  on public.notes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

-- Version history -----------------------------------------------------------
create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note_id text not null,
  title text not null,
  tags text[] not null default '{}',
  content text not null default '',
  saved_at timestamptz not null default now()
);

create index if not exists note_versions_note_idx
  on public.note_versions (user_id, note_id, saved_at desc);

alter table public.note_versions enable row level security;

drop policy if exists "Users can read their own note versions" on public.note_versions;
create policy "Users can read their own note versions"
  on public.note_versions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own note versions" on public.note_versions;
create policy "Users can insert their own note versions"
  on public.note_versions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own note versions" on public.note_versions;
create policy "Users can delete their own note versions"
  on public.note_versions for delete
  using (auth.uid() = user_id);

-- Preferences ---------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  font text not null default 'sans' check (font in ('sans', 'serif', 'mono', 'rounded', 'slab', 'legible')),
  font_size text not null default 'medium' check (font_size in ('small', 'medium', 'large')),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read their own preferences" on public.user_preferences;
create policy "Users can read their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own preferences" on public.user_preferences;
create policy "Users can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
