import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['shared'],
  // Experimental View Transitions between list cards and list headers. Off by default.
  experimental: {
    viewTransition: process.env.NEXT_PUBLIC_VIEW_TRANSITIONS === '1',
  },
}

export default config
