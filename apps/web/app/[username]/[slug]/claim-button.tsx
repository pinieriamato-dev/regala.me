'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function ClaimButton({ itemId }: { itemId: string; listIsSurprise: boolean }) {
  const [step, setStep]       = useState<'idle' | 'asking' | 'loading' | 'done'>('idle')
  const [name, setName]       = useState('')
  const [error, setError]     = useState('')
  const [timedOut, setTimedOut] = useState(false)

  const handleClaim = async () => {
    if (!name.trim()) { setError('Poné tu nombre'); return }
    setStep('loading')
    setTimedOut(false)

    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
      setTimedOut(true)
      setStep('asking')
    }, 5000)

    try {
      const { error: err } = await supabase.from('claims').insert({
        item_id: itemId,
        claimer_name: name.trim(),
      })
      clearTimeout(timer)
      if (err) { setError(err.message); setStep('asking'); return }
      setStep('done')
    } catch {
      clearTimeout(timer)
      if (!timedOut) { setError('Error de conexión'); setStep('asking') }
    }
  }

  if (step === 'done') {
    return (
      <span className="rg-sticker rg-sticker-green" style={{ fontSize: 11, padding: '5px 12px' }}>
        ✓ ¡GRACIAS!
      </span>
    )
  }

  if (step === 'asking' || step === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>
        {timedOut && (
          <span className="rg-sticker rg-sticker-red" style={{ fontSize: 9, alignSelf: 'flex-start' }}>
            UY, SIN SEÑAL. TOCÁ DE NUEVO.
          </span>
        )}
        <input
          className="rg-input"
          placeholder="Tu nombre"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setName((e.target as HTMLInputElement).value); setError('') }}
          autoFocus
          style={{ fontSize: 13, padding: '10px 12px' }}
        />
        {error && !timedOut && <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleClaim}
            disabled={step === 'loading'}
            className="rg-btn rg-btn-primary"
            style={{ flex: 1, padding: '12px 16px', fontSize: 12, minHeight: 44, opacity: step === 'loading' ? 0.6 : 1 }}
          >
            {step === 'loading' ? '...' : 'ME ENCARGO →'}
          </button>
          <button
            onClick={() => { setStep('idle'); setTimedOut(false); setError('') }}
            style={{
              background: 'none', border: '2px solid var(--ink)', cursor: 'pointer',
              fontSize: 16, color: 'rgba(15,15,15,0.55)',
              padding: '8px 12px', minWidth: 44, borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(15,15,15,0.45)', textAlign: 'center', margin: 0 }}>
          NO HACE FALTA CREAR CUENTA
        </p>
      </div>
    )
  }

  return (
    <button
      onClick={() => setStep('asking')}
      className="rg-btn rg-btn-primary"
      style={{ padding: '12px 16px', fontSize: 12, minHeight: 44 }}
    >
      ME ENCARGO →
    </button>
  )
}
