-- ─── Habits ──────────────────────────────────────────────────────────────────

create table if not exists habits (
  id          text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null default '',
  color       text        not null default '',
  goal_type   text        not null default '',
  goal        integer,
  completions jsonb       not null default '{}',
  types       jsonb       not null default '[]',
  sort_order  integer     not null default 0,
  primary key (id, user_id)
);

alter table habits enable row level security;

create policy "Users manage own habits" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table habits;

-- ─── Tasks ───────────────────────────────────────────────────────────────────

create table if not exists tasks (
  id          bigint      not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null default '',
  domain      text        not null,
  project     text        not null default '',
  parent      bigint,
  start_date  text,
  due_date    text,
  reward      text        not null default '',
  notes       text        not null default '',
  done        boolean     not null default false,
  done_at     bigint,
  sort_order  integer     not null default 0,
  primary key (id, user_id)
);

alter table tasks enable row level security;

create policy "Users manage own tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table tasks;

-- ─── Home ────────────────────────────────────────────────────────────────────

create table if not exists home (
  user_id            uuid  primary key references auth.users(id) on delete cascade,
  tarot_url          text,
  intention_work     text  not null default '',
  intention_life     text  not null default '',
  intention_creative text  not null default ''
);

alter table home enable row level security;

create policy "Users manage own home" on home
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table home;

-- ─── Storage: tarot card images ──────────────────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('tarot', 'tarot', true)
  on conflict (id) do nothing;

create policy "Owner manages tarot" on storage.objects
  for all
  using  (bucket_id = 'tarot' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'tarot' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public reads tarot" on storage.objects
  for select using (bucket_id = 'tarot');
