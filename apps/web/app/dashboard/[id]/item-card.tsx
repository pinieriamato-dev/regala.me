'use client'

import { useState, useTransition } from 'react'
import { deleteItem, editItem, moveItem, releaseClaim } from '@/app/dashboard/actions'
import { formatPrice, type Item, type Priority } from 'shared'
import { Field } from '@/components/Field'
import ItemImageField from './item-image-field'

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 1, label: 'OPCIONAL' },
  { value: 2, label: 'ME GUSTA' },
  { value: 3, label: 'ESENCIAL' },
]

type Props = {
  item: Item
  claimer: string | null
  listId: string
  currency: string
  isSurprise: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}

export default function ItemCard({ item, claimer, listId, currency, isSurprise, canMoveUp, canMoveDown }: Props) {
  const [hidden,  setHidden]  = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState<'delete' | 'release' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [releasePending, startReleaseTransition] = useTransition()

  if (hidden) return null

  // Surprise lists: the page doesn't fetch claims at all, so `claimer` is already null; this is a backstop.
  const displayedClaimer = isSurprise ? null : claimer
  const isClaimed        = !!displayedClaimer

  const handleDelete = () => {
    setConfirming(null)
    setHidden(true)
    startDeleteTransition(async () => {
      await deleteItem(item.id, listId)
    })
  }

  const handleRelease = () => {
    setConfirming(null)
    setActionError(null)
    startReleaseTransition(async () => {
      const res = await releaseClaim(item.id, listId)
      if (res.error) setActionError(res.error)
    })
  }

  if (editing) {
    return (
      <EditForm
        item={item}
        listId={listId}
        currency={currency}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    )
  }

  return (
    <div
      className="rg-card"
      style={{
        padding: '14px 16px',
        opacity: isClaimed ? 0.7 : 1,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}
    >
      {/^https?:\/\//i.test(item.image_url ?? '') && (
        <img
          src={item.image_url!}
          alt=""
          style={{ width: 56, height: 56, objectFit: 'cover', border: '2px solid var(--ink)', flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <p style={{
            fontWeight: 800, fontSize: 14, margin: 0,
            textDecoration: isClaimed ? 'line-through' : 'none',
            color: isClaimed ? 'var(--ink-muted)' : 'var(--ink)',
          }}>
            {item.title}
          </p>
          {isClaimed && (
            <span className="rg-sticker rg-sticker-green">✓ {displayedClaimer}</span>
          )}
          {isClaimed && (
            <button
              type="button"
              onClick={() => setConfirming('release')}
              disabled={releasePending}
              className="rg-mono"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 9,
                color: 'var(--ink-muted)', padding: '4px 2px', textDecoration: 'underline',
              }}
            >
              {releasePending ? '...' : 'LIBERAR'}
            </button>
          )}
          {!isClaimed && item.priority === 3 && (
            <span className="rg-sticker rg-sticker-red">ESENCIAL</span>
          )}
          {!isClaimed && item.priority === 2 && (
            <span className="rg-sticker">ME GUSTA</span>
          )}
        </div>
        {item.description && (
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
            {item.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {item.price && (
            <span className="rg-mono" style={{ fontSize: 10 }}>
              ~{currency} {formatPrice(item.price, currency)}
            </span>
          )}
          {/^https?:\/\//i.test(item.url ?? '') && (
            <a href={item.url!} target="_blank" rel="noopener noreferrer"
              className="rg-mono" style={{ fontSize: 10, color: 'var(--red-ink)', textDecoration: 'none' }}>
              VER PRODUCTO →
            </a>
          )}
        </div>
        {confirming && (
          <div
            role="alertdialog"
            aria-label={confirming === 'delete' ? 'Confirmar borrado' : 'Confirmar liberar'}
            style={{
              marginTop: 10, padding: '10px 12px', background: 'var(--yellow)',
              border: '2px solid var(--ink)', display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <span className="rg-mono" style={{ fontSize: 9, color: 'var(--ink)' }}>
              {confirming === 'delete'
                ? isClaimed
                  ? `¿BORRAR ESTE ÍTEM? ${displayedClaimer?.toUpperCase()} YA LO RECLAMÓ.`
                  : isSurprise
                    ? '¿BORRAR ESTE ÍTEM? SI ALGUIEN LO RECLAMÓ, SE PIERDE.'
                    : '¿BORRAR ESTE ÍTEM? NO SE PUEDE DESHACER.'
                : `¿LIBERAR? ${displayedClaimer?.toUpperCase()} YA NO LO VA A TENER RECLAMADO.`}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={confirming === 'delete' ? handleDelete : handleRelease}
                className="rg-btn rg-btn-primary"
                style={{ flex: 1, padding: '8px', fontSize: 10, minHeight: 36 }}
              >
                {confirming === 'delete' ? 'SÍ, BORRAR' : 'SÍ, LIBERAR'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rg-btn rg-btn-ghost"
                style={{ flex: 1, padding: '8px', fontSize: 10, minHeight: 36 }}
              >
                CANCELAR
              </button>
            </div>
          </div>
        )}
        {actionError && (
          <p style={{ fontSize: 11, color: 'var(--red-ink)', fontWeight: 700, margin: '6px 0 0' }}>{actionError}</p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(['up', 'down'] as const).map((direction) => {
            const enabled = direction === 'up' ? canMoveUp : canMoveDown
            return (
              <button
                key={direction}
                type="button"
                disabled={!enabled}
                onClick={() => moveItem(item.id, listId, direction)}
                aria-label={direction === 'up' ? `Subir ${item.title}` : `Bajar ${item.title}`}
                style={{
                  background: 'none', border: 'none', padding: '2px 6px',
                  cursor: enabled ? 'pointer' : 'default',
                  fontSize: 12, lineHeight: 1,
                  color: enabled ? 'var(--ink-muted)' : 'rgba(15,15,15,0.12)',
                }}
              >
                {direction === 'up' ? '▲' : '▼'}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rg-mono"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 9,
            color: 'var(--ink-muted)', padding: '4px 6px', letterSpacing: 0.5,
          }}
        >
          EDITAR
        </button>
        <button
          onClick={() => setConfirming('delete')}
          disabled={deletePending}
          aria-label={`Borrar ${item.title}`}
          style={{
            background: 'none', border: 'none',
            cursor: deletePending ? 'default' : 'pointer',
            fontFamily: 'var(--font-display)', fontSize: 18,
            color: deletePending ? 'rgba(15,15,15,0.15)' : 'var(--ink-muted)',
            lineHeight: 1, padding: '4px 6px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

function EditForm({
  item,
  listId,
  currency,
  onCancel,
  onSaved,
}: {
  item: Item
  listId: string
  currency: string
  onCancel: () => void
  onSaved: () => void
}) {
  const [priority, setPriority] = useState(item.priority ?? 1)
  const [formError, setFormError] = useState('')
  const [pending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('priority', String(priority))
    setFormError('')
    startTransition(async () => {
      const res = await editItem(item.id, listId, fd)
      // Stay in edit mode with the typed values if the save failed.
      if (res?.error) { setFormError(res.error); return }
      onSaved()
    })
  }

  return (
    <div
      className="rg-card"
      style={{ padding: '14px 16px', borderColor: 'var(--yellow)', boxShadow: '3px 3px 0 0 var(--yellow)' }}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="rg-mono" style={{ fontSize: 9, marginBottom: 2, color: 'var(--ink-muted)' }}>
          EDITANDO ÍTEM
        </div>
        <Field label="Nombre del regalo">
          <input
            name="title"
            type="text"
            defaultValue={item.title}
            required
            autoComplete="off"
            autoCapitalize="sentences"
            className="rg-input"
            style={{ fontSize: 13 }}
            placeholder="Nombre del regalo *"
          />
        </Field>
        <Field label="Descripción">
          <input
            name="description"
            type="text"
            defaultValue={item.description ?? ''}
            autoComplete="off"
            className="rg-input"
            style={{ fontSize: 13 }}
            placeholder="Descripción (opcional)"
          />
        </Field>
        <Field label="Precio">
          <input
            name="price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            // es-AR decimal comma so addItemSchema parses it back unchanged (12345.5 → "12345,5")
            defaultValue={item.price ? String(item.price).replace('.', ',') : ''}
            className="rg-input"
            style={{ fontSize: 13 }}
            placeholder={`Precio en ${currency} (opcional)`}
          />
        </Field>
        <Field label="Link al producto">
          <input
            name="url"
            type="url"
            inputMode="url"
            enterKeyHint="next"
            autoComplete="off"
            autoCapitalize="none"
            defaultValue={item.url ?? ''}
            className="rg-input"
            style={{ fontSize: 13 }}
            placeholder="Link al producto (opcional)"
          />
        </Field>
        <ItemImageField defaultValue={item.image_url} />
        <div>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 6, color: 'var(--ink-muted)' }}>
            PRIORIDAD
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className="rg-btn"
                style={{
                  flex: 1, padding: '6px', fontSize: 9,
                  background: priority === p.value ? 'var(--ink)' : 'var(--paper)',
                  color: priority === p.value ? 'var(--paper)' : 'var(--ink)',
                  border: '2px solid var(--ink)',
                  boxShadow: priority === p.value ? '2px 2px 0 0 var(--ink)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {formError && <p role="alert" className="rg-error" style={{ margin: 0 }}>{formError}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            className="rg-btn rg-btn-ghost"
            style={{ flex: 1, padding: '10px', fontSize: 11 }}
          >
            CANCELAR
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rg-btn rg-btn-primary"
            style={{ flex: 1, padding: '10px', fontSize: 11, opacity: pending ? 0.6 : 1 }}
          >
            {pending ? '...' : 'GUARDAR'}
          </button>
        </div>
      </form>
    </div>
  )
}
