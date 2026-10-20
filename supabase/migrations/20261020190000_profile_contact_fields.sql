-- Editable profile fields (dashboard /dashboard/profile). Instagram is shown on the public profile;
-- phone is only stored and never rendered publicly.
-- Applied by the Supabase GitHub integration from supabase/migrations/ on merge to main.

alter table public.profiles
  add column if not exists instagram text,
  add column if not exists phone text;
