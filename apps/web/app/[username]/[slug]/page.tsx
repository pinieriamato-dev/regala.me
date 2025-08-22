import { createServerSupabase } from '@/src/lib/supabase/server';
import ItemCard from '@/src/components/ItemCard';
import ShareButtons from '@/src/components/ShareButtons';

export const revalidate = 60;

export default async function PublicList({ params }: { params: { username: string; slug: string } }) {
  const supabase = createServerSupabase();
  const { data: list } = await supabase
    .from('wishlists')
    .select('*, profiles!inner(username)')
    .eq('slug', params.slug)
    .eq('profiles.username', params.username)
    .single();
  if (!list) return <div className="p-4">Lista no encontrada</div>;
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('wishlist_id', list.id)
    .order('sort_order');
  const url = `https://regala.me/${params.username}/${params.slug}`;
  return (
    <div className="p-4">
      <h1 className="text-xl mb-2">{list.title}</h1>
      <ShareButtons url={url} />
      <div className="space-y-2 mt-4">
        {items?.map((i: any) => <ItemCard key={i.id} item={i} />)}
      </div>
    </div>
  );
}
