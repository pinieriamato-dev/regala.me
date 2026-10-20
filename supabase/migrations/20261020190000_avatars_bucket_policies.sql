-- Storage for profile avatars, item photos and event covers (all in the "avatars" bucket,
-- under the owner's folder: <user_id>/...). The app uploads with the user's session, so these
-- policies are what let uploads through. Without them, /api/upload-avatar and
-- /api/upload-item-image fail with "No se pudo subir la imagen".
-- Re-runnable: the bucket upsert and the drop-if-exists policies make it safe to apply twice.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Public reads go through the public bucket URL, so no SELECT policy for anonymous users is needed.
-- Owners get their own folder only, for upload, upsert (needs select + update), list and delete.

drop policy if exists "avatars owner select" on storage.objects;
create policy "avatars owner select" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
