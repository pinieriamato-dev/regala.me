'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AuthPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'signin' | 'signup'>(
    params.get('mode') === 'signup' ? 'signup' : 'signin'
  )
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  useEffect(() => {
    setMode(params.get('mode') === 'signup' ? 'signup' : 'signin')
    setError('')
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({
        email, password, options: { data: { display_name: name } },
      })
      if (err) { setError(err.message); setLoading(false); return }
      setSuccess('¡Cuenta creada! Revisá tu email para confirmar.')
      setLoading(false)
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      router.push('/dashboard'); router.refresh()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Nav */}
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
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'signup' && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 }}>
                    TU NOMBRE
                  </div>
                  <input className="rg-input" type="text" value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder="Sofía García" required />
                </div>
              )}
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 }}>
                  EMAIL
                </div>
                <input className="rg-input" type="email" value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="vos@email.com" required />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.5, marginBottom: 5 }}>
                  CONTRASEÑA
                </div>
                <input className="rg-input" type="password" value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" minLength={6} required />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', background: 'rgba(230,51,34,0.08)',
                  border: '2px solid var(--red)', borderRadius: '4px',
                  fontSize: 12, color: 'var(--red)', fontWeight: 700,
                }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{
                  padding: '10px 14px', background: 'var(--yellow)',
                  border: '2px solid var(--ink)', borderRadius: '4px',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {success}
                </div>
              )}

              <button className="rg-btn rg-btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', padding: '14px', marginTop: 4, opacity: loading ? 0.6 : 1 }}>
                {loading ? '...' : mode === 'signup' ? 'CREAR CUENTA →' : 'INGRESAR →'}
              </button>
            </form>
          </div>

          {/* Yellow info box */}
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
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setSuccess('') }}
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
