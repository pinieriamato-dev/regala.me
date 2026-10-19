-- P1: derive profiles.display_name and username from the signup name,
-- not from the email local part. Run by hand in the Supabase SQL editor
-- AFTER Gian has reviewed it (not applied yet).
--
-- Before running: compare with the live trigger function on auth.users
-- (pg_get_functiondef) and adjust names if they differ.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  v_base text;
  v_username text;
begin
  -- Base for the public username: signup name, lowercased, ASCII-ish, dashes.
  -- Falls back to the email local part only when no name was typed.
  v_base := lower(coalesce(v_name, split_part(new.email, '@', 1)));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  v_base := left(coalesce(nullif(v_base, ''), 'usuario'), 30);

  -- Random suffix keeps usernames unique without exposing the email.
  v_username := v_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 4);

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, coalesce(v_name, split_part(new.email, '@', 1)));

  return new;
end;
$$;

-- Trigger name is a guess; check the live one before running.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
