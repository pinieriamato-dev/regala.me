import AuthFormLoader from './AuthFormLoader'

export default function AuthPage() {
  const siteKey = process.env.HCAPTCHA_SITE_KEY ?? ''
  return <AuthFormLoader siteKey={siteKey} />
}
