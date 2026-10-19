'use client'

import type { CSSProperties, ReactNode } from 'react'
import { trackLinkClick } from '@/app/track-actions'

type Props = {
  href: string
  listId: string
  event: 'list_shared' | 'signup_from_gifter_footer'
  target?: string
  rel?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}

// A link that reports its click to analytics. Navigation never waits on the report.
export default function TrackedLink({ href, listId, event, ...rest }: Props) {
  return (
    <a
      href={href}
      onClick={() => {
        trackLinkClick(event, listId).catch(() => {})
      }}
      {...rest}
    />
  )
}
