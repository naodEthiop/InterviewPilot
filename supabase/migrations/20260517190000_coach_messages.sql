-- AI Coach chat messages (floating panel)
create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.coach_messages enable row level security;

create policy "coach_messages_all_own" on public.coach_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_coach_messages_user_created on public.coach_messages(user_id, created_at);
