-- "Solo amigos" privacy: a list that only accepted friends of its owner can see in the app.
-- Applied by the Supabase GitHub integration from supabase/migrations/ on deploy.
-- The app selects privacy_level = 'friends', so this must be applied before that code ships.

-- Allow the new value without guessing the constraint name: drop every CHECK on wishlists that
-- mentions privacy_level, then add one that includes 'friends'. If privacy_level is an enum
-- type instead, add the value to the enum.
do $$
declare
  c record;
  col_udt text;
begin
  select udt_name into col_udt
  from information_schema.columns
  where table_schema = 'public' and table_name = 'wishlists' and column_name = 'privacy_level';

  if col_udt is not null and exists (select 1 from pg_type where typname = col_udt and typtype = 'e') then
    execute format('alter type public.%I add value if not exists %L', col_udt, 'friends');
  else
    for c in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where nsp.nspname = 'public'
        and rel.relname = 'wishlists'
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) like '%privacy_level%'
    loop
      execute format('alter table public.wishlists drop constraint %I', c.conname);
    end loop;

    alter table public.wishlists
      add constraint wishlists_privacy_level_check
      check (privacy_level in ('public', 'link_only', 'private', 'friends'));
  end if;
end
$$;

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
