import type { MetadataRoute } from 'next'
import { createServerSupabase } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabase()

  const { data: lists } = await supabase
    .from('wishlists')
    .select('slug, created_at, profiles!inner(username)')
    .eq('privacy_level', 'public')
    .order('created_at', { ascending: false })
    .limit(1000)

  const gifterPages: MetadataRoute.Sitemap = (lists ?? []).map((list) => ({
    url: `https://regala.me/${(list.profiles as unknown as { username: string }).username}/${list.slug}`,
    lastModified: new Date(list.created_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [
    { url: 'https://regala.me', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    ...gifterPages,
  ]
}
