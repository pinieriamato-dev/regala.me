import Link from 'next/link';

export default function Page() {
  return (
    <main className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">regala.me</h1>
      <Link href="/app" className="bg-blue-600 text-white px-4 py-2 rounded">Crear lista</Link>
    </main>
  );
}
