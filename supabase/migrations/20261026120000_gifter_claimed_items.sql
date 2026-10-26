-- Claimed state for the public gifter page. Anonymous viewers can't reliably read claims rows under RLS,
-- so the page asks this function instead. It returns item ids and amounts only, never claimer names or phones.
-- Safe to re-run.

create or replace function public.gifter_claimed_items(p_item_ids uuid[])
returns table (item_id uuid, is_group_gift boolean, contribution_amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select c.item_id, c.is_group_gift, c.contribution_amount
    from public.claims c
   where c.item_id = any(p_item_ids)
$$;

revoke all on function public.gifter_claimed_items(uuid[]) from public;
grant execute on function public.gifter_claimed_items(uuid[]) to anon, authenticated;
