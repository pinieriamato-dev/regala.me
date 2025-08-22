import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabase } from '@/src/lib/supabase/server';

export async function POST(_req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const token = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await supabase.from('api_tokens').insert({ user_id: user.id, token_hash: hash });
  return NextResponse.json({ token });
}
