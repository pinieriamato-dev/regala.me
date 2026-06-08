'use client'

import dynamic from 'next/dynamic'

const AuthFormDynamic = dynamic(() => import('./AuthForm'), { ssr: false })

export default function AuthFormLoader({ siteKey }: { siteKey: string }) {
  return <AuthFormDynamic siteKey={siteKey} />
}
