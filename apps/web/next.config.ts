import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['shared'],
  // View Transitions between list cards and list headers. Browsers without the API just skip the animation.
  experimental: {
    viewTransition: true,
  },
}

export default config
