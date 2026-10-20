'use client'

import { useActionState, useRef, useState } from 'react'
import { updateProfile } from '@/app/dashboard/actions'
import { Field } from '@/components/Field'
import { Toast } from '@/components/Toast'

type Profile = {
  username: string | null
  display_name: string | null
  bio: string | null
  birthday: string | null
  avatar_url: string | null
  instagram: string | null
  phone: string | null
}

export default function ProfileForm({ profile, email }: { profile: Profile | null; email: string }) {
  const [state, action, pending]  = useActionState(updateProfile, null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = (profile?.display_name ?? profile?.username ?? '?').slice(0, 2).toUpperCase()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadErr('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/upload-avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setUploadErr(data.error ?? 'Error al subir'); return }
      setAvatarUrl(data.url)
    } catch {
      setUploadErr('No se pudo subir la imagen.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hidden field so the form always submits the latest avatar URL */}
      <input type="hidden" name="avatar_url" value={avatarUrl} />

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 80, height: 80, flexShrink: 0,
          border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)',
          background: 'var(--yellow)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {avatarUrl && /^https?:\/\//i.test(avatarUrl)
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setAvatarUrl('')} />
            : <span className="rg-display" style={{ fontSize: 28 }}>{initials}</span>
          }
          {uploading && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(15,15,15,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="rg-mono" style={{ fontSize: 9, color: 'var(--paper)' }}>...</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rg-btn rg-btn-ghost"
            style={{ padding: '10px 16px', fontSize: 11, opacity: uploading ? 0.5 : 1 }}
          >
            {uploading ? 'SUBIENDO...' : '↑ SUBIR FOTO'}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl('')}
              className="rg-mono"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: 'var(--ink-muted)', padding: 0 }}
            >
              ELIMINAR FOTO
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {uploadErr && (
        <p role="alert" className="rg-error" style={{ margin: '-12px 0 0' }}>{uploadErr}</p>
      )}

      <div className="rg-divider" />

      <Field label="Nombre">
        <input
          name="display_name"
          type="text"
          maxLength={80}
          autoComplete="name"
          autoCapitalize="words"
          defaultValue={profile?.display_name ?? ''}
          placeholder="Tu nombre"
          className="rg-input"
          style={{ fontSize: 14, fontWeight: 700 }}
        />
      </Field>

      <div>
        <label htmlFor="profile-username" className="rg-label" style={{ marginBottom: 6 }}>Nombre de usuario</label>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <span className="rg-mono" style={{
            display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11,
            border: '2px solid var(--ink)', borderRight: 'none', background: 'var(--bg)', whiteSpace: 'nowrap',
          }}>
            regala.me/
          </span>
          <input
            id="profile-username"
            name="username"
            type="text"
            maxLength={30}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby="profile-username-hint"
            defaultValue={profile?.username ?? ''}
            placeholder="tu-usuario"
            className="rg-input"
            style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0 }}
          />
        </div>
        <p id="profile-username-hint" className="rg-hint">
          Es la dirección de tu perfil. Si la cambiás, los links viejos a tus listas dejan de funcionar.
        </p>
      </div>

      <Field label="Mail" hint="Si lo cambiás, te mandamos un mail para confirmar la dirección nueva.">
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          defaultValue={email}
          className="rg-input"
          style={{ fontSize: 13 }}
        />
      </Field>

      <Field label="Instagram">
        <input
          name="instagram"
          type="text"
          maxLength={100}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={profile?.instagram ? `@${profile.instagram}` : ''}
          placeholder="@tuusuario"
          className="rg-input"
          style={{ fontSize: 13 }}
        />
      </Field>

      <Field label="Teléfono" hint="No se muestra en tu perfil público.">
        <input
          name="phone"
          type="tel"
          maxLength={25}
          autoComplete="tel"
          defaultValue={profile?.phone ?? ''}
          placeholder="+54 11 1234 5678"
          className="rg-input"
          style={{ fontSize: 13 }}
        />
      </Field>

      <Field label="Bio">
        <textarea
          name="bio"
          maxLength={160}
          autoComplete="off"
          defaultValue={profile?.bio ?? ''}
          placeholder="Una línea sobre vos (opcional)"
          className="rg-input"
          style={{ fontSize: 13, resize: 'vertical', minHeight: 72 }}
        />
      </Field>

      <Field label="Cumpleaños" hint="Solo se muestra el día y mes en tu perfil público. El año queda privado.">
        <input
          name="birthday"
          type="date"
          autoComplete="bday"
          defaultValue={profile?.birthday ?? ''}
          className="rg-input"
          style={{ fontSize: 13 }}
        />
      </Field>

      {/* Errors stay inline above the button; the success confirmation is a toast. */}
      {state?.error && (
        <p role="alert" style={{ fontSize: 12, color: 'var(--paper)', background: 'var(--red-ink)', border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)', padding: '12px 14px', fontWeight: 700, margin: 0 }}>
          ! {state.error}
        </p>
      )}
      <Toast message={state?.notice} token={state} />

      <button
        type="submit"
        disabled={pending || uploading}
        className="rg-btn rg-btn-primary"
        style={{ padding: '14px', fontSize: 13, opacity: (pending || uploading) ? 0.6 : 1 }}
      >
        {pending ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
      </button>
    </form>
  )
}
