import { createClient } from '@supabase/supabase-js'

// Public client for unauthenticated reads (gifter view)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
