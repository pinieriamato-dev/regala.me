import type { FC, ReactNode } from 'react'

// Next.js 15 bundles React's experimental View Transition component. The published @types/react 18 doesn't declare it yet.
declare module 'react' {
  export const unstable_ViewTransition: FC<{ name?: string; children?: ReactNode }>
}
