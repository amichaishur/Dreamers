-- ============================================================================
-- Migration · 2026-08-11 · Community reactions, per-journal fields, inbox
--
-- Run ONCE in the Supabase SQL editor (single script = single transaction).
-- STRICTLY ADDITIVE: no drops of tables or columns, no updates, no deletes.
-- Existing customer data is not touched. The code currently in production
-- ignores everything added here, so this is safe to run BEFORE the deploy —
-- and it must run before, or the new build's entry form breaks on insert.
-- ============================================================================

-- ---------- 1 · Per-journal fields on entries ----------
-- Nullable / defaulted, so every existing row stays valid as it is.
alter table public.entries add column if not exists awareness text;
alter table public.entries add column if not exists kind text;
alter table public.entries add column if not exists meta jsonb not null default '{}'::jsonb;

-- ---------- 2 · How the community answers a shared memory ----------
create table if not exists public.entry_reactions (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references public.entries(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('love','comment','reflection','sync')),
  body       text not null default '',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists entry_reactions_one_love
  on public.entry_reactions (entry_id, user_id) where kind = 'love';
create index if not exists entry_reactions_by_entry
  on public.entry_reactions (entry_id, created_at desc);

alter table public.entry_reactions enable row level security;

drop policy if exists reactions_own on public.entry_reactions;
create policy reactions_own on public.entry_reactions
  for select using (user_id = auth.uid());

drop policy if exists reactions_insert on public.entry_reactions;
create policy reactions_insert on public.entry_reactions
  for insert with check (user_id = auth.uid() and public.is_active());

drop policy if exists reactions_delete on public.entry_reactions;
create policy reactions_delete on public.entry_reactions
  for delete using (user_id = auth.uid());

-- The memory's owner may read what the community said on it. This is also what
-- lets Realtime deliver the "someone answered you" event: with row security on,
-- a subscriber only receives rows their policies let them SELECT, and without
-- this policy the owner would never hear about anyone else's response.
drop policy if exists reactions_on_my_entries on public.entry_reactions;
create policy reactions_on_my_entries on public.entry_reactions
  for select using (exists (
    select 1 from public.entries e
    where e.id = entry_id and e.user_id = auth.uid()
  ));

-- ---------- 3 · Shared-entry RPCs learn the new fields ----------
-- Their return type grows, and Postgres refuses to replace a function whose
-- return type changed — so drop and recreate. Inside one transaction there is
-- no moment when a caller finds them missing.
drop function if exists public.list_shared_entries();
create function public.list_shared_entries()
returns table (
  id uuid, type text, title text, body text, lucidity text,
  shared_media_url text, created_at timestamptz, shared_anonymous boolean,
  author_name text, kind text, awareness text, meta jsonb
)
language sql security definer stable set search_path = public as $$
  select e.id, e.type, e.title, e.body, e.lucidity,
         e.shared_media_url, e.created_at, e.shared_anonymous,
         case when e.shared_anonymous then null else p.display_name end,
         e.kind, e.awareness, e.meta
  from public.entries e
  left join public.profiles p on p.id = e.user_id
  where e.visibility = 'public' and public.is_active()
  order by e.created_at desc;
$$;

drop function if exists public.get_shared_entry(uuid);
create function public.get_shared_entry(p_id uuid)
returns table (
  id uuid, type text, title text, body text, lucidity text,
  shared_media_url text, created_at timestamptz, shared_anonymous boolean,
  author_name text, kind text, awareness text, meta jsonb
)
language sql security definer stable set search_path = public as $$
  select e.id, e.type, e.title, e.body, e.lucidity,
         e.shared_media_url, e.created_at, e.shared_anonymous,
         case when e.shared_anonymous then null else p.display_name end,
         e.kind, e.awareness, e.meta
  from public.entries e
  left join public.profiles p on p.id = e.user_id
  where e.id = p_id and e.visibility = 'public';
$$;

grant execute on function public.list_shared_entries() to authenticated;
grant execute on function public.get_shared_entry(uuid) to anon, authenticated;

-- ---------- 4 · Reaction RPCs ----------
create or replace function public.list_reactions(p_entry uuid)
returns table (id uuid, kind text, body text, created_at timestamptz, author_name text, mine boolean)
language sql security definer stable set search_path = public as $$
  select r.id, r.kind, r.body, r.created_at,
         coalesce(p.display_name, split_part(p.email, '@', 1)),
         (r.user_id = auth.uid())
  from public.entry_reactions r
  join public.entries e on e.id = r.entry_id
  left join public.profiles p on p.id = r.user_id
  where r.entry_id = p_entry and e.visibility = 'public' and public.is_active()
  order by r.created_at asc;
$$;
grant execute on function public.list_reactions(uuid) to authenticated;

create or replace function public.react(p_entry uuid, p_kind text, p_body text default '')
returns void language plpgsql security definer set search_path = public as $$
declare shared boolean;
begin
  if not public.is_active() then raise exception 'Members only'; end if;
  select (visibility = 'public') into shared from public.entries where id = p_entry;
  if not coalesce(shared, false) then raise exception 'That memory is not shared'; end if;

  if p_kind = 'love' then
    if exists (select 1 from public.entry_reactions
               where entry_id = p_entry and user_id = auth.uid() and kind = 'love') then
      delete from public.entry_reactions
        where entry_id = p_entry and user_id = auth.uid() and kind = 'love';
      return;
    end if;
  end if;

  insert into public.entry_reactions (entry_id, user_id, kind, body)
  values (p_entry, auth.uid(), p_kind, coalesce(p_body, ''));
end;
$$;
grant execute on function public.react(uuid, text, text) to authenticated;

create or replace function public.reaction_counts()
returns table (entry_id uuid, loves int, comments int, reflections int, syncs int, i_loved boolean)
language sql security definer stable set search_path = public as $$
  select r.entry_id,
         count(*) filter (where r.kind = 'love')::int,
         count(*) filter (where r.kind = 'comment')::int,
         count(*) filter (where r.kind = 'reflection')::int,
         count(*) filter (where r.kind = 'sync')::int,
         bool_or(r.kind = 'love' and r.user_id = auth.uid())
  from public.entry_reactions r
  join public.entries e on e.id = r.entry_id
  where e.visibility = 'public' and public.is_active()
  group by r.entry_id;
$$;
grant execute on function public.reaction_counts() to authenticated;

create or replace function public.my_inbox()
returns table (
  id uuid, entry_id uuid, entry_title text, entry_type text,
  kind text, body text, created_at timestamptz, author_name text, unread boolean
)
language sql security definer stable set search_path = public as $$
  select r.id, e.id, e.title, e.type, r.kind, r.body, r.created_at,
         coalesce(p.display_name, split_part(p.email, '@', 1)),
         (r.read_at is null)
  from public.entry_reactions r
  join public.entries e on e.id = r.entry_id
  left join public.profiles p on p.id = r.user_id
  where e.user_id = auth.uid() and r.user_id <> auth.uid()
  order by r.created_at desc
  limit 100;
$$;
grant execute on function public.my_inbox() to authenticated;

create or replace function public.mark_inbox_read()
returns void language sql security definer set search_path = public as $$
  update public.entry_reactions r set read_at = now()
  from public.entries e
  where e.id = r.entry_id and e.user_id = auth.uid() and r.read_at is null;
$$;
grant execute on function public.mark_inbox_read() to authenticated;

-- ---------- 5 · Realtime ----------
-- The in-app "someone answered you" card listens for inserts on this table.
-- Nothing arrives unless the table is in the realtime publication.
do $$ begin
  alter publication supabase_realtime add table public.entry_reactions;
exception when duplicate_object then null;
end $$;

-- ---------- 6 · Verify ----------
-- Expect: 3 columns · 1 table · 4 policies · 7 functions · 1 publication row.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'entries'
      and column_name in ('awareness','kind','meta'))            as new_columns,
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'entry_reactions') as reactions_table,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'entry_reactions')    as policies,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in
      ('list_shared_entries','get_shared_entry','list_reactions','react',
       'reaction_counts','my_inbox','mark_inbox_read'))               as functions,
  (select count(*) from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'entry_reactions') as realtime;
