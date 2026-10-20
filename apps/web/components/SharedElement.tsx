'use client'

import { unstable_ViewTransition as ViewTransition, type ReactNode } from 'react'

// Names an element so it animates between the list card and the list header.
// Reduced motion is handled in globals.css; browsers without the View Transitions API show no animation.
export default function SharedElement({ name, children }: { name: string; children: ReactNode }) {
  return <ViewTransition name={name}>{children}</ViewTransition>
}
