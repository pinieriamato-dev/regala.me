import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { ReserveItemSchema } from 'shared/schemas';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const json = await req.json();
  const data = ReserveItemSchema.parse(json);
  const { error } = await supabase
    .from('item_reservations')
    .insert({ item_id: params.id, email: data.email });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
