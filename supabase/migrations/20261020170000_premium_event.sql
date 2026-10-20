-- ROADMAP L3: premium per event (cover image + custom list URL + invitation with QR).
-- Applied by the Supabase GitHub integration from supabase/migrations/ on deploy.
-- The app selects is_premium and cover_url, so this must be applied before the code that reads them.

alter table public.wishlists
  add column if not exists is_premium boolean not null default false,
  add column if not exists cover_url text;

-- Owners can update their own lists through RLS, so without this trigger they could flip
-- is_premium on themselves through the REST API. Only the SQL editor / service role may change it.
create or replace function public.guard_wishlist_premium()
returns trigger
language plpgsql
as $$
begin
  if new.is_premium is distinct from old.is_premium
     and current_user in ('anon', 'authenticated') then
    raise exception 'is_premium can only be changed by the team';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_wishlist_premium on public.wishlists;
create trigger guard_wishlist_premium
  before update on public.wishlists
  for each row execute function public.guard_wishlist_premium();

-- Activating premium is manual until payments (ROADMAP L2) exist. Run in the SQL editor:
-- update public.wishlists set is_premium = true where id = '<list id>';
