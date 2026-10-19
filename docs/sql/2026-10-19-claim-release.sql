-- ROADMAP N2: undo / release a claim.
-- Run once in the Supabase SQL editor (project esyybmnwalscpnzfeowh). Safe to re-run.
-- Until it runs, claims keep working but the "DESHACER" / "LIBERAR" buttons report an error.

-- Gifters get a random token when they claim (kept in their browser); only its SHA-256 is stored.
alter table public.claims add column if not exists release_token_hash text;

-- Gifter undo: deletes the claim only if the caller holds the raw token.
-- Takes the raw token (not the hash) because the hash column is readable by anyone.
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
     and release_token_hash is not null
     and release_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  get diagnostics n = row_count;
  return n > 0;
end
$$;

-- Owner release: deletes the claim only if the item belongs to one of the caller's lists.
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
     and i.id = c.item_id
     and w.id = i.wishlist_id
     and w.owner_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end
$$;

revoke all on function public.release_claim(uuid, text) from public;
grant execute on function public.release_claim(uuid, text) to anon, authenticated;

revoke all on function public.release_claim_as_owner(uuid) from public, anon;
grant execute on function public.release_claim_as_owner(uuid) to authenticated;
