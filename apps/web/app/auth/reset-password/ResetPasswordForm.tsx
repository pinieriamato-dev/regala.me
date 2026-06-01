'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/app/auth/actions'
import Link from 'next/link'

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null)

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
            NUEVA<br /><span className="rg-em">CLAVE.</span>
          </h1>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(15,15,15,0.75)', marginBottom: 28 }}>
            Elegí una contraseña nueva para tu cuenta.
          </p>

          <div className="rg-card" style={{ padding: 24 }}>
            <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 }}>
                  NUEVA CONTRASEÑA
                </div>
                <input className="rg-input" type="password" name="password"
                  placeholder="Mínimo 6 caracteres, letras y números" minLength={6} required />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 }}>
                  CONFIRMAR CONTRASEÑA
                </div>
                <input className="rg-input" type="password" name="confirm"
                  placeholder="Repetí la contraseña" minLength={6} required />
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

              <button className="rg-btn rg-btn-primary" type="submit" disabled={pending}
                style={{ width: '100%', padding: '14px', marginTop: 4, opacity: pending ? 0.6 : 1 }}>
                {pending ? '...' : 'GUARDAR CONTRASEÑA →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
