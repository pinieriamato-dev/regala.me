-- P1: derive profiles.display_name and username from the signup name,
-- not from the email local part. Run by hand in the Supabase SQL editor
-- AFTER Gian has approved it (not applied yet).
--
-- Based on the live definition read on 2026-10-19 (handle_new_user +
-- on_auth_user_created on auth.users). Changes vs live:
--   * display_name reads user_metadata.display_name (what /auth/actions sends),
--     falling back to full_name, then the email local part.
--   * username is built from that name, with the same id-based suffix the
--     live trigger uses. An explicit username in metadata still wins.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_name text := nullif(trim(coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name'
  )), '');
  v_local text := split_part(new.email, '@', 1);
  v_base text;
begin
  -- Username base: signup name lowercased, non-alphanumerics to dashes.
  v_base := lower(coalesce(v_name, v_local));
  v_base := trim(both '-' from regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'));
  v_base := left(coalesce(nullif(v_base, ''), 'usuario'), 30);

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      v_base || '-' || substr(new.id::text, 1, 4)
    ),
    coalesce(v_name, v_local)
  );
  return new;
end;
$$;

-- Trigger already exists with this name; recreate so it points at the function above.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
