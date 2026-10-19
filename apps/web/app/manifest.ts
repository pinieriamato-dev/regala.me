import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'regala.me — Tu lista de regalos, sin dramas.',
    short_name: 'regala.me',
    description: 'Compartí una lista, tus amigos eligen lo que traen, nadie llega con la misma cosa.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#F2F0E6',
    theme_color: '#0F0F0F',
    lang: 'es',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
