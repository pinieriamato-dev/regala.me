-- "Solo amigos" privacy: a list that only accepted friends of its owner can see in the app.
-- Applied by the Supabase GitHub integration from supabase/migrations/ on deploy.
-- The app selects privacy_level = 'friends', so this must be applied before that code ships.

-- Allow the new value. The constraint name is the Postgres default; if the column never had one, this is a no-op.
alter table public.wishlists drop constraint if exists wishlists_privacy_level_check;
alter table public.wishlists
  add constraint wishlists_privacy_level_check
  check (privacy_level in ('public', 'link_only', 'private', 'friends'));

-- Permissive policies add to the existing ones, so public and link_only visibility is unchanged.
-- Only accepted friends (either direction) get extra access to a 'friends' list and its items.
drop policy if exists "friends_read_friends_lists" on public.wishlists;
create policy "friends_read_friends_lists" on public.wishlists
  for select to authenticated
  using (
    privacy_level = 'friends'
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = owner_id)
          or (f.addressee_id = auth.uid() and f.requester_id = owner_id))
    )
  );

drop policy if exists "friends_read_friends_items" on public.items;
create policy "friends_read_friends_items" on public.items
  for select to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.friendships f
        on f.status = 'accepted'
       and ((f.requester_id = auth.uid() and f.addressee_id = w.owner_id)
         or (f.addressee_id = auth.uid() and f.requester_id = w.owner_id))
      where w.id = items.wishlist_id
        and w.privacy_level = 'friends'
    )
  );
