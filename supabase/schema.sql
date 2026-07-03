-- ============================================================
-- Dreamers · Supabase schema (auth + data + RLS + invite-gate)
-- Run this once in the Supabase SQL editor.
-- Bootstrap admin: amichaishur@gmail.com
-- ============================================================

-- ---------- Tables ----------

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  role         text not null default 'user'    check (role in ('user','admin')),
  status       text not null default 'pending'  check (status in ('pending','active','suspended')),
  language     text not null default 'he'       check (language in ('he','en')),
  created_at   timestamptz not null default now()
);

create table if not exists public.invitations (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  single_use  boolean not null default true,
  max_uses    int,
  used_count  int not null default 0,
  expires_at  timestamptz,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.code_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code_id     uuid not null references public.invite_codes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('creation','dream','idea','reality')),
  title      text not null,
  body       text not null default '',
  lucidity   text check (lucidity in ('low','med','high')),
  media_url  text,
  visibility text not null default 'private' check (visibility in ('private','public','custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entry_versions (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references public.entries(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.entry_shares (
  id                uuid primary key default gen_random_uuid(),
  entry_id          uuid not null references public.entries(id) on delete cascade,
  shared_with_email text not null
);

create table if not exists public.connections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  from_entry uuid not null references public.entries(id) on delete cascade,
  to_entry   uuid not null references public.entries(id) on delete cascade
);

-- ---------- Helper functions ----------

-- Am I an admin? (security definer avoids RLS recursion)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- My email (from auth.users)
create or replace function public.my_email()
returns text language sql security definer stable set search_path = public, auth as $$
  select email from auth.users where id = auth.uid();
$$;

-- Can the current user view an entry? (security definer avoids entries<->shares recursion)
create or replace function public.can_view_entry(p_entry uuid, p_visibility text, p_owner uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select p_owner = auth.uid()
    or p_visibility = 'public'
    or (p_visibility = 'custom' and exists (
         select 1 from public.entry_shares s
         where s.entry_id = p_entry and lower(s.shared_with_email) = lower(public.my_email())));
$$;

-- On new signup: create the profile. Auto-approve if bootstrap admin or invited.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_boot   boolean := (new.email = 'amichaishur@gmail.com');
  invited   boolean := exists (select 1 from public.invitations where lower(email) = lower(new.email));
begin
  insert into public.profiles (id, email, display_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    case when is_boot then 'admin' else 'user' end,
    case when is_boot or invited then 'active' else 'pending' end
  )
  on conflict (id) do nothing;

  if invited then
    update public.invitations set status = 'accepted' where lower(email) = lower(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Redeem an invite code from the pending screen. Returns true on success.
create or replace function public.redeem_code(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c public.invite_codes%rowtype;
begin
  select * into c from public.invite_codes where upper(code) = upper(p_code);
  if c.id is null then return false; end if;
  if c.expires_at is not null and c.expires_at < now() then return false; end if;
  if c.single_use and c.used_count >= 1 then return false; end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then return false; end if;

  insert into public.code_redemptions (code_id, user_id) values (c.id, auth.uid());
  update public.invite_codes set used_count = used_count + 1 where id = c.id;
  update public.profiles set status = 'active' where id = auth.uid() and status <> 'suspended';
  return true;
end;
$$;

-- Keep entries.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists entries_touch on public.entries;
create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------

alter table public.profiles        enable row level security;
alter table public.invitations     enable row level security;
alter table public.invite_codes    enable row level security;
alter table public.code_redemptions enable row level security;
alter table public.entries         enable row level security;
alter table public.entry_versions  enable row level security;
alter table public.entry_shares    enable row level security;
alter table public.connections     enable row level security;

-- profiles: read/update own; admins read all + can update role/status
create policy profiles_select_self on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update using (id = auth.uid());
create policy profiles_admin_update on public.profiles for update using (public.is_admin());
create policy profiles_admin_delete on public.profiles for delete using (public.is_admin());

-- entries: owner full; others only if public or explicitly shared with their email
create policy entries_select on public.entries for select
  using (public.can_view_entry(id, visibility, user_id));
create policy entries_insert on public.entries for insert with check (user_id = auth.uid());
create policy entries_update on public.entries for update using (user_id = auth.uid());
create policy entries_delete on public.entries for delete using (user_id = auth.uid());

-- entry_versions / shares / connections: gated by owning the parent entry
create policy versions_all on public.entry_versions for all
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid()));
create policy shares_all on public.entry_shares for all
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid()));
create policy connections_all on public.connections for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- invitations & codes: admin-only manage. (Access checks happen server-side via functions.)
create policy invitations_admin on public.invitations for all using (public.is_admin()) with check (public.is_admin());
create policy codes_admin on public.invite_codes for all using (public.is_admin()) with check (public.is_admin());
create policy redemptions_own on public.code_redemptions for select using (user_id = auth.uid() or public.is_admin());

-- Admin dashboard counts WITHOUT exposing entry content
create or replace function public.admin_stats()
returns table (total_users int, active_users int, pending_users int, total_entries int)
language sql security definer stable set search_path = public as $$
  select
    (select count(*)::int from public.profiles),
    (select count(*)::int from public.profiles where status = 'active'),
    (select count(*)::int from public.profiles where status = 'pending'),
    (select count(*)::int from public.entries)
  where public.is_admin();
$$;

-- ---------- Community sharing (opt-in per entry) ----------
-- Sharer chooses name-or-anonymous; images get a stored long-lived signed URL
-- so the public page/feed can load them without touching the private bucket.
alter table public.entries add column if not exists shared_anonymous boolean not null default false;
alter table public.entries add column if not exists shared_media_url text;

-- All publicly shared dreams, with author name (NULL when shared anonymously).
-- security definer so it can read profiles.display_name without loosening profiles RLS.
create or replace function public.list_shared_entries()
returns table (
  id uuid, type text, title text, body text, lucidity text,
  shared_media_url text, created_at timestamptz, shared_anonymous boolean,
  author_name text
)
language sql security definer stable set search_path = public as $$
  select e.id, e.type, e.title, e.body, e.lucidity,
         e.shared_media_url, e.created_at, e.shared_anonymous,
         case when e.shared_anonymous then null else p.display_name end
  from public.entries e
  left join public.profiles p on p.id = e.user_id
  where e.visibility = 'public'
  order by e.created_at desc;
$$;

-- One publicly shared dream (for the /d/[id] public page). Anon-callable.
create or replace function public.get_shared_entry(p_id uuid)
returns table (
  id uuid, type text, title text, body text, lucidity text,
  shared_media_url text, created_at timestamptz, shared_anonymous boolean,
  author_name text
)
language sql security definer stable set search_path = public as $$
  select e.id, e.type, e.title, e.body, e.lucidity,
         e.shared_media_url, e.created_at, e.shared_anonymous,
         case when e.shared_anonymous then null else p.display_name end
  from public.entries e
  left join public.profiles p on p.id = e.user_id
  where e.id = p_id and e.visibility = 'public';
$$;

grant execute on function public.list_shared_entries() to authenticated;
grant execute on function public.get_shared_entry(uuid) to anon, authenticated;

-- ---------- Storage (media bucket, private, owner-only) ----------
insert into storage.buckets (id, name, public) values ('media','media', false)
  on conflict (id) do nothing;

create policy media_owner_read on storage.objects for select
  using (bucket_id = 'media' and owner = auth.uid());
create policy media_owner_write on storage.objects for insert
  with check (bucket_id = 'media' and owner = auth.uid());
create policy media_owner_delete on storage.objects for delete
  using (bucket_id = 'media' and owner = auth.uid());

-- ---------- Seed: pre-approve the owner ----------
insert into public.invitations (email, status) values ('amichaishur@gmail.com','pending')
  on conflict (email) do nothing;
