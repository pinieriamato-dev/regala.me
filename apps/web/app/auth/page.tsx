import dynamic from 'next/dynamic'

const AuthForm = dynamic(() => import('./AuthForm'), { ssr: false })

export default function AuthPage() {
  const siteKey = process.env.HCAPTCHA_SITE_KEY ?? ''
  return <AuthForm siteKey={siteKey} />
}
