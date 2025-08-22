import Link from 'next/link';
import { Wishlist } from 'shared/types';

export default function ListCard({ wishlist }: { wishlist: Wishlist }) {
  return (
    <Link href={`/app/list/${wishlist.id}`} className="block border p-4 rounded">
      {wishlist.title}
    </Link>
  );
}
