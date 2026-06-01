'use client'

import { useState, useEffect, useActionState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { handleAuth, getGoogleAuthUrl, requestPasswordReset } from './actions'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import Link from 'next/link'

type Mode = 'signin' | 'signup' | 'forgot'

interface AuthFormProps {
  siteKey: string
}

export default function AuthForm({ siteKey }: AuthFormProps) {
  const params = useSearchParams()
  const [mode, setMode] = useState<Mode>(
    params.get('mode') === 'signup' ? 'signup' : 'signin'
  )
  const urlError = params.get('error') === 'confirmation_failed'
    ? 'El link de confirmación expiró o no es válido. Intentá registrarte de nuevo.'
    : null
  const [authState, authAction, authPending] = useActionState(handleAuth, null)
  const [forgotState, forgotAction, forgotPending] = useActionState(requestPasswordReset, null)
  const [googlePending, setGooglePending] = useState(false)

  const authCaptchaRef = useRef<HCaptcha>(null)
  const forgotCaptchaRef = useRef<HCaptcha>(null)
  const [authCaptchaToken, setAuthCaptchaToken] = useState('')
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState('')

  const handleGoogleAuth = async () => {
    setGooglePending(true)
    const url = await getGoogleAuthUrl()
    if (url) window.location.href = url
    else setGooglePending(false)
  }

  useEffect(() => {
    setMode(params.get('mode') === 'signup' ? 'signup' : 'signin')
  }, [params])

  useEffect(() => {
    if (authState?.error) {
      setAuthCaptchaToken('')
      authCaptchaRef.current?.resetCaptcha()
    }
  }, [authState])

  useEffect(() => {
    if (forgotState?.error) {
      setForgotCaptchaToken('')
      forgotCaptchaRef.current?.resetCaptcha()
    }
  }, [forgotState])

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setAuthCaptchaToken('')
    setForgotCaptchaToken('')
    authCaptchaRef.current?.resetCaptcha()
    forgotCaptchaRef.current?.resetCaptcha()
  }

  const headings: Record<Mode, React.ReactNode> = {
    signin:  <><span className="rg-em">HOLA</span><br />OTRA VEZ.</>,
    signup:  <>ARMÁ TU<br /><span className="rg-em">CUENTA.</span></>,
    forgot:  <>¿OLVIDASTE<br /><span className="rg-em">TU CLAVE?</span></>,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <nav style={{
        padding: '16px 28px', borderBottom: '2px solid var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--paper)',
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: -0.5,
          color: 'var(--ink)', textDecoration: 'none',
        }}>
          regala<span style={{ color: 'var(--red)' }}>.</span>me
        </Link>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* ── Signup email-sent confirmation ── */}
          {mode !== 'forgot' && authState?.success ? (
            <>
              <h1 className="rg-display" style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', marginBottom: 6 }}>
                REVISÁ TU<br /><span className="rg-em">EMAIL.</span>
              </h1>
              <div className="rg-card" style={{ padding: 24, marginTop: 24 }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{authState.success}</p>
              </div>
              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'rgba(15,15,15,0.65)' }}>
                ¿Ya confirmaste?{' '}
                <button onClick={() => switchMode('signin')} style={linkStyle}>Ingresá</button>
              </div>
            </>

          /* ── Forgot: reset-link sent confirmation ── */
          ) : mode === 'forgot' && forgotState?.success ? (
            <>
              <h1 className="rg-display" style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', marginBottom: 6 }}>
                REVISÁ TU<br /><span className="rg-em">EMAIL.</span>
              </h1>
              <div className="rg-card" style={{ padding: 24, marginTop: 24 }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{forgotState.success}</p>
              </div>
              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'rgba(15,15,15,0.65)' }}>
                <button onClick={() => switchMode('signin')} style={linkStyle}>← Volver al login</button>
              </div>
            </>

          /* ── Forgot password form ── */
          ) : mode === 'forgot' ? (
            <>
              <h1 className="rg-display" style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', marginBottom: 6 }}>
                {headings.forgot}
              </h1>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(15,15,15,0.75)', marginBottom: 28 }}>
                Ingresá tu email y te mandamos un link para crear una nueva contraseña.
              </p>
              <div className="rg-card" style={{ padding: 24 }}>
                <form action={forgotAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input type="hidden" name="captchaToken" value={forgotCaptchaToken} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 }}>
                      EMAIL
                    </div>
                    <input className="rg-input" type="email" name="email"
                      placeholder="vos@email.com" required />
                  </div>
                  {siteKey && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <HCaptcha
                        ref={forgotCaptchaRef}
                        sitekey={siteKey}
                        onVerify={setForgotCaptchaToken}
                        onExpire={() => setForgotCaptchaToken('')}
                      />
                    </div>
                  )}
                  {forgotState?.error && <ErrorBox>{forgotState.error}</ErrorBox>}
                  <button className="rg-btn rg-btn-primary" type="submit"
                    disabled={forgotPending || (!!siteKey && !forgotCaptchaToken)}
                    style={{ width: '100%', padding: '14px', marginTop: 4, opacity: (forgotPending || (!!siteKey && !forgotCaptchaToken)) ? 0.6 : 1 }}>
                    {forgotPending ? '...' : 'ENVIAR LINK →'}
                  </button>
                </form>
              </div>
              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'rgba(15,15,15,0.65)' }}>
                <button onClick={() => switchMode('signin')} style={linkStyle}>← Volver al login</button>
              </div>
            </>

          /* ── Sign in / Sign up ── */
          ) : (
            <>
              <h1 className="rg-display" style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', marginBottom: 6 }}>
                {headings[mode]}
              </h1>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(15,15,15,0.75)', marginBottom: 28 }}>
                {mode === 'signup'
                  ? 'Para crear, gestionar y compartir tus listas. Tus amigos no necesitan cuenta.'
                  : 'Ingresá para ver y gestionar tus listas.'}
              </p>

              <div className="rg-card" style={{ padding: 24 }}>
                <form action={authAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input type="hidden" name="mode" value={mode} />
                  <input type="hidden" name="captchaToken" value={authCaptchaToken} />
                  {mode === 'signup' && (
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 }}>
                        TU NOMBRE
                      </div>
                      <input className="rg-input" type="text" name="name"
                        placeholder="Sofía García" required />
                    </div>
                  )}
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 }}>
                      EMAIL
                    </div>
                    <input className="rg-input" type="email" name="email"
                      placeholder="vos@email.com" required />
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5,
                      marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      CONTRASEÑA
                      {mode === 'signin' && (
                        <button type="button" onClick={() => switchMode('forgot')} style={{
                          ...linkStyle, fontSize: 9, letterSpacing: 0.5,
                        }}>
                          ¿OLVIDASTE LA CLAVE?
                        </button>
                      )}
                    </div>
                    <input className="rg-input" type="password" name="password"
                      placeholder={mode === 'signup' ? 'Mínimo 6 caracteres, letras y números' : 'Tu contraseña'}
                      minLength={6} required />
                  </div>

                  {siteKey && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <HCaptcha
                        ref={authCaptchaRef}
                        sitekey={siteKey}
                        onVerify={setAuthCaptchaToken}
                        onExpire={() => setAuthCaptchaToken('')}
                      />
                    </div>
                  )}

                  {(authState?.error || urlError) && <ErrorBox>{authState?.error ?? urlError}</ErrorBox>}

                  <button className="rg-btn rg-btn-primary" type="submit"
                    disabled={authPending || (!!siteKey && !authCaptchaToken)}
                    style={{ width: '100%', padding: '14px', marginTop: 4, opacity: (authPending || (!!siteKey && !authCaptchaToken)) ? 0.6 : 1 }}>
                    {authPending ? '...' : mode === 'signup' ? 'CREAR CUENTA →' : 'INGRESAR →'}
                  </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 0' }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.15 }} />
                  <span className="rg-mono" style={{ fontSize: 9, color: 'rgba(15,15,15,0.5)' }}>O TAMBIÉN</span>
                  <div style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.15 }} />
                </div>

                <button
                  className="rg-btn rg-btn-ghost"
                  onClick={handleGoogleAuth}
                  disabled={googlePending}
                  style={{
                    width: '100%', padding: '12px', marginTop: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    opacity: googlePending ? 0.6 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googlePending ? '...' : 'CONTINUAR CON GOOGLE'}
                </button>
              </div>

              {mode === 'signup' && (
                <div style={{
                  marginTop: 12, padding: '12px 16px',
                  background: 'var(--yellow)', border: '2px solid var(--ink)',
                  boxShadow: 'var(--shadow-sm)', fontSize: 12, lineHeight: 1.5,
                }}>
                  <strong>Tus amigos no necesitan cuenta.</strong>{' '}
                  Para reclamar un regalo solo abren el link y ponen su nombre.
                </div>
              )}

              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'rgba(15,15,15,0.65)' }}>
                {mode === 'signup' ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
                <button
                  onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
                  style={linkStyle}>
                  {mode === 'signup' ? 'Ingresá' : 'Crear una'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontWeight: 800, color: 'var(--red)', textDecoration: 'underline',
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '10px 14px', background: 'rgba(230,51,34,0.08)',
      border: '2px solid var(--red)', borderRadius: '4px',
      fontSize: 12, color: 'var(--red)', fontWeight: 700,
    }}>
      {children}
    </div>
  )
}
