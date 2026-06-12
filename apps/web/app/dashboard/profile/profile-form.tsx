'use client'

import { useActionState, useEffect, useRef } from 'react'
import { updateProfile } from '@/app/dashboard/actions'

type Profile = {
  username: string | null
  display_name: string | null
  bio: string | null
  birthday: string | null
  avatar_url: string | null
}

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(updateProfile, null)
  const formRef = useRef<HTMLFormElement>(null)
  const saved = state === null && !pending

  const avatarUrl = profile?.avatar_url
  const initials  = (profile?.display_name ?? profile?.username ?? '?')
    .slice(0, 2).toUpperCase()

  return (
    <form ref={formRef} action={action} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Avatar preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 72, height: 72, flexShrink: 0,
          border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)',
          background: 'var(--yellow)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {avatarUrl && /^https?:\/\//i.test(avatarUrl)
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : <span className="rg-display" style={{ fontSize: 24 }}>{initials}</span>
          }
        </div>
        <div style={{ flex: 1 }}>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 6, color: 'rgba(15,15,15,0.6)' }}>
            LINK DE FOTO DE PERFIL
          </div>
          <input
            name="avatar_url"
            type="url"
            defaultValue={profile?.avatar_url ?? ''}
            placeholder="https://... (opcional)"
            className="rg-input"
            style={{ fontSize: 12 }}
          />
        </div>
      </div>

      <div className="rg-divider" />

      <div>
        <div className="rg-mono" style={{ fontSize: 9, marginBottom: 6, color: 'rgba(15,15,15,0.6)' }}>NOMBRE</div>
        <input
          name="display_name"
          type="text"
          maxLength={80}
          defaultValue={profile?.display_name ?? ''}
          placeholder="Tu nombre"
          className="rg-input"
          style={{ fontSize: 14, fontWeight: 700 }}
        />
      </div>

      <div>
        <div className="rg-mono" style={{ fontSize: 9, marginBottom: 6, color: 'rgba(15,15,15,0.6)' }}>BIO</div>
        <textarea
          name="bio"
          maxLength={160}
          defaultValue={profile?.bio ?? ''}
          placeholder="Una línea sobre vos (opcional)"
          className="rg-input"
          style={{ fontSize: 13, resize: 'vertical', minHeight: 72 }}
        />
      </div>

      <div>
        <div className="rg-mono" style={{ fontSize: 9, marginBottom: 6, color: 'rgba(15,15,15,0.6)' }}>CUMPLEAÑOS</div>
        <input
          name="birthday"
          type="date"
          defaultValue={profile?.birthday ?? ''}
          className="rg-input"
          style={{ fontSize: 13 }}
        />
        <div className="rg-mono" style={{ fontSize: 8, marginTop: 4, color: 'rgba(15,15,15,0.4)' }}>
          Solo se muestra el día y mes en tu perfil público. El año queda privado.
        </div>
      </div>

      {state?.error && (
        <p style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, margin: 0 }}>{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rg-btn rg-btn-primary"
        style={{ padding: '14px', fontSize: 13, opacity: pending ? 0.6 : 1 }}
      >
        {pending ? '...' : saved ? '✓ GUARDADO' : 'GUARDAR CAMBIOS'}
      </button>
    </form>
  )
}
