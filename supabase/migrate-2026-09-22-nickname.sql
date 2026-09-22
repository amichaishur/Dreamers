-- ============================================================================
-- Migration · 2026-09-22 · A nickname for anonymous sharing
--
-- Run ONCE in the Supabase SQL editor, BEFORE the code that uses it is deployed.
-- Additive only: two new empty columns and three functions redefined. No row is
-- updated or deleted. The code live today ignores all of it, so anonymous
-- shares keep reading "shared anonymously" until the new code arrives.
-- ============================================================================

-- ---------- 1 · Where the nickname lives ----------
-- The default a person keeps between shares, and the one a given memory was
-- shared under. Kept separately so changing your nickname tomorrow does not
-- rename, and so link, everything you shared under the old one.
alter table public.profiles add column if not exists nickname text;
alter table public.entries  add column if not exists shared_nickname text;

alter table public.profiles drop constraint if exists profiles_nickname_len;
alter table public.profiles add constraint profiles_nickname_len
  check (nickname is null or char_length(btrim(nickname)) between 2 and 24);
alter table public.entries drop constraint if exists entries_shared_nickname_len;
alter table public.entries add constraint entries_shared_nickname_len
  check (shared_nickname is null or char_length(btrim(shared_nickname)) between 2 and 24);

-- ---------- 2 · The feed and the single page show it ----------
-- Same columns, same types as today: only what fills author_name changes, so
-- `create or replace` is enough and nothing that calls them notices.
create or replace function public.list_shared_entries()
returns table (
  id uuid, type text, title text, body text, lucidity text,
  shared_media_url text, created_at timestamptz, shared_anonymous boolean,
  author_name text, kind text, awareness text, meta jsonb
)
language sql security definer stable set search_path = public as $$
  select e.id, e.type, e.title, e.body, e.lucidity,
         e.shared_media_url, e.created_at, e.shared_anonymous,
         case when e.shared_anonymous then nullif(btrim(e.shared_nickname), '')
              else p.display_name end,
         e.kind, e.awareness, e.meta
  from public.entries e
  left join public.profiles p on p.id = e.user_id
  where e.visibility = 'public' and public.is_active()
  order by e.created_at desc;
$$;

create or replace function public.get_shared_entry(p_id uuid)
returns table (
  id uuid, type text, title text, body text, lucidity text,
  shared_media_url text, created_at timestamptz, shared_anonymous boolean,
  author_name text, kind text, awareness text, meta jsonb
)
language sql security definer stable set search_path = public as $$
  select e.id, e.type, e.title, e.body, e.lucidity,
         e.shared_media_url, e.created_at, e.shared_anonymous,
         case when e.shared_anonymous then nullif(btrim(e.shared_nickname), '')
              else p.display_name end,
         e.kind, e.awareness, e.meta
  from public.entries e
  left join public.profiles p on p.id = e.user_id
  where e.id = p_id and e.visibility = 'public';
$$;

grant execute on function public.list_shared_entries() to authenticated;
grant execute on function public.get_shared_entry(uuid) to anon, authenticated;

-- ---------- 3 · The author answering their own anonymous memory ----------
-- A reply used to carry the replier's real name, so answering your own
-- anonymous dream told the whole thread who wrote it. On an anonymous memory
-- the author's replies now carry the nickname, or no name at all, and a flag
-- so the page can say "the author" rather than guess. The return type grows,
-- so drop and recreate; one transaction means no caller ever finds it missing.
drop function if exists public.list_reactions(uuid);
create function public.list_reactions(p_entry uuid)
returns table (
  id uuid, kind text, body text, created_at timestamptz, author_name text,
  mine boolean, anon_author boolean
)
language sql security definer stable set search_path = public as $$
  select r.id, r.kind, r.body, r.created_at,
         case when e.shared_anonymous and r.user_id = e.user_id
              then nullif(btrim(e.shared_nickname), '')
              else coalesce(p.display_name, split_part(p.email, '@', 1)) end,
         (r.user_id = auth.uid()),
         (e.shared_anonymous and r.user_id = e.user_id)
  from public.entry_reactions r
  join public.entries e on e.id = r.entry_id
  left join public.profiles p on p.id = r.user_id
  where r.entry_id = p_entry and e.visibility = 'public' and public.is_active()
  order by r.created_at asc;
$$;
grant execute on function public.list_reactions(uuid) to authenticated;

-- ---------- 4 · Verify ----------
-- Expect: 2 · 3
select
  (select count(*) from information_schema.columns
     where table_schema = 'public'
       and ((table_name = 'profiles' and column_name = 'nickname')
         or (table_name = 'entries'  and column_name = 'shared_nickname'))) as new_columns,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('list_shared_entries', 'get_shared_entry', 'list_reactions')) as functions;
