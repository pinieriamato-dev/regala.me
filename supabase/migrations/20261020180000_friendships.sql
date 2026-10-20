-- Friends: mutual connections between two regala.me accounts, so people can see each other's
-- public lists inside the app without someone sending them a link.
-- Applied by the Supabase GitHub integration from supabase/migrations/ on deploy.
-- The app reads this table, so it must be applied before the code that uses it.

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- One row per pair, whichever side sent the request.
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

-- Only the two people in a friendship can see it.
drop policy if exists "friendships_select_participants" on public.friendships;
create policy "friendships_select_participants" on public.friendships
  for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

-- You can only send a request as yourself.
drop policy if exists "friendships_insert_requester" on public.friendships;
create policy "friendships_insert_requester" on public.friendships
  for insert to authenticated
  with check (auth.uid() = requester_id and status = 'pending');

-- Only the person who received the request can accept it.
drop policy if exists "friendships_update_addressee" on public.friendships;
create policy "friendships_update_addressee" on public.friendships
  for update to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id and status = 'accepted');

-- Either side can cancel a request, decline it, or unfriend.
drop policy if exists "friendships_delete_participants" on public.friendships;
create policy "friendships_delete_participants" on public.friendships
  for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));
