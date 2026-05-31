'use client'

import { useState, useEffect, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { handleAuth } from './actions'
import Link from 'next/link'

export default function AuthForm() {
  const params = useSearchParams()
  const [mode, setMode] = useState<'signin' | 'signup'>(
    params.get('mode') === 'signup' ? 'signup' : 'signin'
  )
  const [state, action, pending] = useActionState(handleAuth, null)

  useEffect(() => {
    setMode(params.get('mode') === 'signup' ? 'signup' : 'signin')
  }, [params])

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
          <h1 className="rg-display" style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', marginBottom: 6 }}>
            {mode === 'signup' ? <>ARMÁ TU<br /><span className="rg-em">CUENTA.</span></> : <>HOLA<br /><span className="rg-em">OTRA VEZ.</span></>}
          </h1>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(15,15,15,0.75)', marginBottom: 28 }}>
            {mode === 'signup'
              ? 'Para crear, gestionar y compartir tus listas. Tus amigos no necesitan cuenta.'
              : 'Ingresá para ver y gestionar tus listas.'}
          </p>

          <div className="rg-card" style={{ padding: 24 }}>
            <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="hidden" name="mode" value={mode} />
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
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 }}>
                  CONTRASEÑA
                </div>
                <input className="rg-input" type="password" name="password"
                  placeholder="Mínimo 6 caracteres" minLength={6} required />
              </div>

              {state?.error && (
                <div style={{
                  padding: '10px 14px', background: 'rgba(230,51,34,0.08)',
                  border: '2px solid var(--red)', borderRadius: '4px',
                  fontSize: 12, color: 'var(--red)', fontWeight: 700,
                }}>
                  {state.error}
                </div>
              )}
              {state?.success && (
                <div style={{
                  padding: '10px 14px', background: 'var(--yellow)',
                  border: '2px solid var(--ink)', borderRadius: '4px',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {state.success}
                </div>
              )}

              <button className="rg-btn rg-btn-primary" type="submit" disabled={pending}
                style={{ width: '100%', padding: '14px', marginTop: 4, opacity: pending ? 0.6 : 1 }}>
                {pending ? '...' : mode === 'signup' ? 'CREAR CUENTA →' : 'INGRESAR →'}
              </button>
            </form>
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
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontWeight: 800, color: 'var(--red)', textDecoration: 'underline',
              }}>
              {mode === 'signup' ? 'Ingresá' : 'Crear una'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
