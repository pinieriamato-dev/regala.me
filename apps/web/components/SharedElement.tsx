'use client'

import { unstable_ViewTransition as ViewTransition, type ReactNode } from 'react'

// Experimental: names an element so it animates between the list card and the list header.
// Off unless NEXT_PUBLIC_VIEW_TRANSITIONS=1 (also enables experimental.viewTransition in next.config.ts).
export default function SharedElement({ name, children }: { name: string; children: ReactNode }) {
  if (process.env.NEXT_PUBLIC_VIEW_TRANSITIONS !== '1') return <>{children}</>
  return <ViewTransition name={name}>{children}</ViewTransition>
}
