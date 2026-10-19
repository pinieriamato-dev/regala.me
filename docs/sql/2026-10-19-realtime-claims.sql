-- ROADMAP X6: live claimed state on the gifter page (Supabase Realtime).
-- Run once in the Supabase SQL editor (project esyybmnwalscpnzfeowh). Safe to re-run.
-- Until it runs the gifter page still works; it just doesn't update live.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'claims'
  ) then
    alter publication supabase_realtime add table public.claims;
  end if;
end $$;
