import AuthFormLoader from './AuthFormLoader'

// Read the captcha key per request: a prerendered page would bake in whatever
// value the build saw, while the server action checks the runtime value.
export const dynamic = 'force-dynamic'

export default function AuthPage() {
  const siteKey = process.env.HCAPTCHA_SITE_KEY ?? ''
  return <AuthFormLoader siteKey={siteKey} />
}
