-- ROADMAP L2 (reworked): shared gifts. Several gifters pledge a part of one item; payment is coordinated outside the app.
-- Run once in the Supabase SQL editor (project esyybmnwalscpnzfeowh). Safe to re-run.
-- Until it runs, shared gifts can't take a second pledge (the old one-row-per-item unique blocks it).

-- Existing rows become whole-item claims. The app filters on is_group_gift, so it must never be null.
update public.claims set is_group_gift = false where is_group_gift is null;
alter table public.claims alter column is_group_gift set default false;
alter table public.claims alter column is_group_gift set not null;

-- Replace "one row per item" with "one whole-item claim per item": pledges may stack.
do $$
declare
  r record;
  item_attnum int2 := (select attnum from pg_attribute
                        where attrelid = 'public.claims'::regclass and attname = 'item_id');
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.claims'::regclass and contype = 'u'
       and conkey = array[item_attnum]
  loop
    execute format('alter table public.claims drop constraint %I', r.conname);
  end loop;

  for r in
    select c.relname
      from pg_index x
      join pg_class c on c.oid = x.indexrelid
     where x.indrelid = 'public.claims'::regclass
       and x.indisunique and not x.indisprimary
       and x.indnatts = 1 and x.indpred is null
       and x.indkey[0] = item_attnum
  loop
    execute format('drop index public.%I', r.relname);
  end loop;
end
$$;

create unique index if not exists claims_item_whole_claim_key
  on public.claims (item_id) where is_group_gift = false;
