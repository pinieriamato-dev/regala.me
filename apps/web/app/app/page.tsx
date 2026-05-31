import { createServerSupabase } from '@/src/lib/supabase/server';
import ListCard from '@/src/components/ListCard';
import Link from 'next/link';

export default async function Dashboard() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="p-4">Debe iniciar sesión.</div>;
  }
  const { data: lists } = await supabase.from('wishlists').select('*').eq('owner', user.id);
  return (
    <div className="p-4">
      <h2 className="text-xl mb-2">Mis listas</h2>
      <div className="space-y-2">
        {lists?.map((l: any) => <ListCard key={l.id} wishlist={l} />)}
      </div>
      <Link href="#" className="mt-4 inline-block bg-green-500 text-white px-4 py-2 rounded">Nueva lista</Link>
    </div>
  );
}
