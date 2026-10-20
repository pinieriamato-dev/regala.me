-- Editable profile fields (dashboard /dashboard/profile). Instagram lives on profiles and is shown
-- on the public profile. Phone is private: it goes in profile_contacts, readable only by its owner.
-- profiles is readable by anyone (public profile pages), so phone must not be a column there.
-- Applied by the Supabase GitHub integration from supabase/migrations/ on merge to main.

alter table public.profiles
  add column if not exists instagram text;

create table if not exists public.profile_contacts (
  id    uuid primary key references public.profiles(id) on delete cascade,
  phone text
);

alter table public.profile_contacts enable row level security;
revoke all on public.profile_contacts from anon;

drop policy if exists "profile_contacts_owner_select" on public.profile_contacts;
create policy "profile_contacts_owner_select" on public.profile_contacts
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profile_contacts_owner_insert" on public.profile_contacts;
create policy "profile_contacts_owner_insert" on public.profile_contacts
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profile_contacts_owner_update" on public.profile_contacts;
create policy "profile_contacts_owner_update" on public.profile_contacts
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
