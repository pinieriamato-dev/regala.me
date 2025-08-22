import Link from 'next/link';
import { Item } from 'shared/types';

export default function ItemCard({ item }: { item: Item }) {
  return (
    <div className="p-2 border rounded flex justify-between">
      <span>{item.title}</span>
      <div className="space-x-2">
        <button className="text-green-600">Reservar</button>
        {item.url && (
          <Link href={`/r/${item.id}`} className="text-blue-600">Comprar</Link>
        )}
      </div>
    </div>
  );
}
