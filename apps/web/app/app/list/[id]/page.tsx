import { createServerSupabase } from '@/src/lib/supabase/server';
import ItemCard from '@/src/components/ItemCard';
import Link from 'next/link';

export default async function ListEditor({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const { data: list } = await supabase.from('wishlists').select('*').eq('id', params.id).single();
  const { data: items } = await supabase.from('items').select('*').eq('wishlist_id', params.id).order('sort_order');
  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">{list?.title}</h1>
      <div className="space-y-2">
        {items?.map((i: any) => <ItemCard key={i.id} item={i} />)}
      </div>
      <Link href="#" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded">Agregar ítem</Link>
    </div>
  );
}

export const dynamic = 'force-dynamic';
