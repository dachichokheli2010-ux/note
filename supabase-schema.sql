create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  tags text[] not null default '{}',
  content text not null default '',
  updated_at timestamptz not null default now(),
  archived boolean not null default false
);

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
