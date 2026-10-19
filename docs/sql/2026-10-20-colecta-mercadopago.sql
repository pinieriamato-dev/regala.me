-- ROADMAP L2: group gift / colecta via Mercado Pago.
-- Run once in the Supabase SQL editor (project esyybmnwalscpnzfeowh). Safe to re-run.
-- Until it runs, the Mercado Pago webhook answers 5xx (Mercado Pago retries) and no colecta share is recorded.

-- Each confirmed colecta payment is one claims row with is_group_gift = true; the webhook dedupes on this id.
alter table public.claims add column if not exists mp_payment_id text;
create unique index if not exists claims_mp_payment_id_key on public.claims (mp_payment_id);

-- Existing rows become whole-item claims. The app filters on is_group_gift = false, so it can't be null.
update public.claims set is_group_gift = false where is_group_gift is null;
alter table public.claims alter column is_group_gift set default false;
alter table public.claims alter column is_group_gift set not null;

-- Replace "one claim per item" with "one whole-item claim per item": colecta shares may stack.
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

-- Owner and gifter release only ever touch whole-item claims: a colecta share is money already paid.
create or replace function public.release_claim(p_item_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from claims
   where item_id = p_item_id
     and is_group_gift = false
     and release_token_hash is not null
     and release_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  get diagnostics n = row_count;
  return n > 0;
end
$$;

create or replace function public.release_claim_as_owner(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from claims c
   using items i, wishlists w
   where c.item_id = p_item_id
     and c.is_group_gift = false
     and i.id = c.item_id
     and w.id = i.wishlist_id
     and w.owner_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end
$$;
