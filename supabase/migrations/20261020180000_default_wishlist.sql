-- Default list: every user has one "Mi lista" that is created automatically. Event lists (boda, cumple...)
-- become optional. The app selects is_default, so this must be applied before the code that reads it is deployed.

alter table public.wishlists
  add column if not exists is_default boolean not null default false;

-- At most one default list per user. Also makes a concurrent double-create fail instead of duplicating.
create unique index if not exists wishlists_one_default_per_owner
  on public.wishlists (owner_id) where is_default;

-- Owners can update their own lists through RLS, so without this guard they could move the default flag
-- around through the REST API. Only the SQL editor / service role may change it.
create or replace function public.guard_wishlist_default()
returns trigger
language plpgsql
as $$
begin
  if new.is_default is distinct from old.is_default
     and current_user in ('anon', 'authenticated') then
    raise exception 'is_default can only be changed by the team';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_wishlist_default on public.wishlists;
create trigger guard_wishlist_default
  before update on public.wishlists
  for each row execute function public.guard_wishlist_default();

-- Backfill: existing users without a default list get one.
insert into public.wishlists (owner_id, title, slug, is_default)
select p.id, 'Mi lista', 'mi-lista-' || substr(md5(random()::text || p.id::text), 1, 8), true
from public.profiles p
where not exists (
  select 1 from public.wishlists w where w.owner_id = p.id and w.is_default
);

-- New users: create the default list as soon as their profile exists.
create or replace function public.create_default_wishlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wishlists (owner_id, title, slug, is_default)
  values (new.id, 'Mi lista', 'mi-lista-' || substr(md5(random()::text || new.id::text), 1, 8), true);
  return new;
end;
$$;

drop trigger if exists create_default_wishlist on public.profiles;
create trigger create_default_wishlist
  after insert on public.profiles
  for each row execute function public.create_default_wishlist();
