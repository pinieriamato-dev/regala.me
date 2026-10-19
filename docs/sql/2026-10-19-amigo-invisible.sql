-- ROADMAP X1: amigo invisible.
-- Run once in the Supabase SQL editor (project esyybmnwalscpnzfeowh). Not safe to skip: until it runs,
-- the /dashboard/amigo pages and /amigo/[code] report an error. Additive only (new tables and functions).

-- A group = one draw. Members are the participants; each one gets their own wishlist when they join.
create table if not exists public.secret_santa_groups (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  drawn_at    timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.secret_santa_members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.secret_santa_groups(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  wishlist_id  uuid references public.wishlists(id) on delete set null,
  assigned_to  uuid references public.secret_santa_members(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (group_id, user_id)
);

-- Assignments must never be readable directly: RLS on with no policies, and every read/write goes
-- through the security definer functions below, which only return what the caller is allowed to see.
alter table public.secret_santa_groups  enable row level security;
alter table public.secret_santa_members enable row level security;
revoke all on public.secret_santa_groups  from anon, authenticated;
revoke all on public.secret_santa_members from anon, authenticated;

-- Create a group. The organizer is not a participant unless they join like anyone else.
create or replace function public.sa_create_group(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  g public.secret_santa_groups;
  v_name text := btrim(p_name);
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 80 then raise exception 'invalid_name'; end if;

  insert into public.secret_santa_groups (owner_id, name) values (uid, v_name) returning * into g;
  return jsonb_build_object('id', g.id, 'invite_code', g.invite_code);
end
$$;

-- Join with the invite link. Creates the participant's own wishlist in the same transaction.
create or replace function public.sa_join_group(p_invite_code text, p_display_name text, p_title text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  g public.secret_santa_groups;
  v_wishlist_id uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  select * into g from public.secret_santa_groups where invite_code = p_invite_code for update;
  if not found then raise exception 'group_not_found'; end if;
  if exists (select 1 from public.secret_santa_members m where m.group_id = g.id and m.user_id = uid) then
    return g.id;
  end if;
  if g.drawn_at is not null then raise exception 'already_drawn'; end if;

  -- Surprise + link_only: the participant's own list must not show who claimed what, and stays out of
  -- the profile and sitemap. The gifter reaches it through the giver's link only.
  insert into public.wishlists (owner_id, title, slug, occasion, privacy_level, is_surprise)
  values (uid, p_title, p_slug, 'other', 'link_only', true)
  returning id into v_wishlist_id;

  insert into public.secret_santa_members (group_id, user_id, display_name, wishlist_id)
  values (g.id, uid, btrim(p_display_name), v_wishlist_id);

  return g.id;
end
$$;

-- Preview for the invite page: what the caller needs before joining, without member names.
create or replace function public.sa_preview_invite(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  g public.secret_santa_groups;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  select * into g from public.secret_santa_groups where invite_code = p_invite_code;
  if not found then raise exception 'group_not_found'; end if;

  return jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'drawn', g.drawn_at is not null,
    'member_count', (select count(*) from public.secret_santa_members m where m.group_id = g.id),
    'is_member', exists (select 1 from public.secret_santa_members m where m.group_id = g.id and m.user_id = uid)
  );
end
$$;

-- Draw names. Shuffle the members and give each one the next person in the order: a single cycle,
-- so nobody gets themselves and everybody gives and receives exactly once. Needs at least 3 people.
create or replace function public.sa_draw(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  g public.secret_santa_groups;
  ids uuid[];
  n int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  select * into g from public.secret_santa_groups where id = p_group_id and owner_id = uid for update;
  if not found then raise exception 'not_owner'; end if;
  if g.drawn_at is not null then raise exception 'already_drawn'; end if;

  select array_agg(m.id order by random()) into ids from public.secret_santa_members m where m.group_id = g.id;
  n := coalesce(array_length(ids, 1), 0);
  if n < 3 then raise exception 'not_enough_members'; end if;

  for i in 1..n loop
    update public.secret_santa_members set assigned_to = ids[(i % n) + 1] where id = ids[i];
  end loop;

  update public.secret_santa_groups set drawn_at = now() where id = g.id;
  return true;
end
$$;

-- Group page. Organizer and members see the invite code and who has joined, but never the
-- assignments of other people. The caller's own assignment is returned only after the draw.
create or replace function public.sa_get_group(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  g public.secret_santa_groups;
  me public.secret_santa_members;
  v_is_owner boolean;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  select * into g from public.secret_santa_groups where id = p_group_id;
  if not found then raise exception 'group_not_found'; end if;
  v_is_owner := g.owner_id = uid;

  select * into me from public.secret_santa_members m where m.group_id = g.id and m.user_id = uid;
  if not v_is_owner and not found then raise exception 'not_member'; end if;

  return jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'invite_code', g.invite_code,
    'drawn', g.drawn_at is not null,
    'is_owner', v_is_owner,
    'is_member', me.id is not null,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('display_name', m.display_name, 'has_list', m.wishlist_id is not null)
                       order by m.created_at)
        from public.secret_santa_members m
       where m.group_id = g.id
    ), '[]'::jsonb),
    'assignment', case when me.assigned_to is null then null else (
      select jsonb_build_object('display_name', a.display_name, 'username', p.username, 'slug', w.slug)
        from public.secret_santa_members a
        left join public.profiles p on p.id = a.user_id
        left join public.wishlists w on w.id = a.wishlist_id
       where a.id = me.assigned_to
    ) end
  );
end
$$;

-- Groups the caller organizes or takes part in, for the dashboard list.
create or replace function public.sa_list_my_groups()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'drawn', g.drawn_at is not null,
                                        'is_owner', g.owner_id = uid) order by g.created_at desc)
      from public.secret_santa_groups g
     where g.owner_id = uid
        or exists (select 1 from public.secret_santa_members m where m.group_id = g.id and m.user_id = uid)
  ), '[]'::jsonb);
end
$$;

revoke all on function public.sa_create_group(text) from public, anon;
revoke all on function public.sa_join_group(text, text, text, text) from public, anon;
revoke all on function public.sa_preview_invite(text) from public, anon;
revoke all on function public.sa_draw(uuid) from public, anon;
revoke all on function public.sa_get_group(uuid) from public, anon;
revoke all on function public.sa_list_my_groups() from public, anon;

grant execute on function public.sa_create_group(text) to authenticated;
grant execute on function public.sa_join_group(text, text, text, text) to authenticated;
grant execute on function public.sa_preview_invite(text) to authenticated;
grant execute on function public.sa_draw(uuid) to authenticated;
grant execute on function public.sa_get_group(uuid) to authenticated;
grant execute on function public.sa_list_my_groups() to authenticated;
